import React, { useEffect, useRef } from "react";
import { ArrowDown, ArrowUp, Building2, Hotel, Landmark, X } from "lucide-react";
import { CREWS, money, BOARD as DEFAULT_BOARD, DISTRICTS } from "../../shared/board.js";
import { BOARD as LEGACY_BOARD, DISTRICTS as LEGACY_DISTRICTS } from "../../shared/legacy-board.js";
import { HoodFigure } from "../StreetPieces.jsx";
import { Button } from "./common.jsx";
import "./BuildingManagement.css";

const RENT_MULTIPLIERS = [1, 3, 6, 10, 16, 25];
const MANAGE_PHASES = ["roll", "end", "rent", "buy"];

function tileDescription(tile, game) {
  if (tile.group !== undefined) return "";
  if (tile.type === "transit") return "Fare scales with the number of transit lines your side owns.";
  if (tile.type === "utility") return "Rent is based on the dice roll and utility ownership.";
  if (tile.type === "stoppa") return "Spin to send 1–10% of your cash to the Community Plot.";
  if (tile.type === "roulette") return "Six possible outcomes. One free spin.";
  if (tile.type === "card") return "Draw a surprise from the streets.";
  if (tile.type === "start") return "Collect $200 each time you pass Home Base.";
  if (tile.type === "jail") return "Serve two turns, pay $100 bail, or use an escape card.";
  if (tile.type === "raid") return "Go straight to County Jail.";
  if (tile.type === "parking") return game?.settings?.communityCash === false
    ? "Community payouts are off in this room."
    : "Land here to collect the community pot.";
  return "Pay $100 into the Community Plot.";
}

export function DeedCardPopover({
  t,
  game,
  me,
  districts,
  BOARD,
  onClose,
  act,
  mine,
  disabled,
  propertyFocus,
}) {
  const activeBoard = BOARD || game?.board || (game?.schemaVersion === 1 ? LEGACY_BOARD : DEFAULT_BOARD);
  const legacy = game?.schemaVersion === 1;
  const legacyTransitRates = legacy || activeBoard?.length === 28;
  const allDistricts = districts || (legacy ? LEGACY_DISTRICTS : DISTRICTS);
  const props = game?.props || {};
  const q = props[t.id];
  const owner = game?.players?.find((player) => player.id === q?.owner);
  const residents = game?.players?.filter((player) => !player.out && player.pos === t.id) || [];
  const isProperty = t.type === "property";
  const isTransit = t.type === "transit";
  const isUtility = t.type === "utility";
  const isPurchasable = Boolean(t.price);
  const maxLevel = legacy ? 3 : 5;
  const buildCost = t.build || 0;
  const mortgageValue = t.price ? t.price / 2 : 0;
  const redeemCost = t.price ? Math.ceil((t.price * 55) / 100) : 0;
  const districtTiles = t.group === undefined ? [] : activeBoard.filter((tile) => tile.group === t.group);
  const ownsSet = (player) => districtTiles.length > 0 && districtTiles.every((tile) => {
    const tileOwner = game?.players?.find((player) => player.id === props[tile.id]?.owner);
    const allied = player?.id != null && (tileOwner?.id === player.id || Boolean(
      game?.settings?.teams && player?.team != null && tileOwner?.team === player.team,
    ));
    return Boolean(props[tile.id]) && allied && !props[tile.id]?.mortgaged;
  });
  const full = ownsSet(me);
  const rentSetFull = ownsSet(owner);
  const minLevel = districtTiles.length ? Math.min(...districtTiles.map((tile) => props[tile.id]?.level || 0)) : 0;
  const maxDistrictLevel = districtTiles.length ? Math.max(...districtTiles.map((tile) => props[tile.id]?.level || 0)) : 0;
  const managePhase = MANAGE_PHASES.includes(game?.phase);
  const canManage = owner?.id === me?.id;
  const actionBlocked = Boolean(disabled || !managePhase || mine === false);

  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const panel = propertyFocus.current;
    const previous = document.activeElement;
    panel?.focus({ preventScroll: true });
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current?.();
      } else if (event.key === "Tab") {
        const items = panel?.querySelectorAll(
          'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
        );
        if (!items?.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;
        const outside = panel && !panel.contains(active);
        if (event.shiftKey && (active === first || active === panel || outside)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (active === last || active === panel || outside)) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previous?.focus?.();
    };
    // The external ref is stable; callback changes should not restart focus management.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const districtColor = t.group !== undefined
    ? allDistricts[t.group]?.color
    : isTransit ? "#486253" : isUtility ? "#5f5c40" : "#2f3d33";
  const headerLabel = t.group !== undefined
    ? allDistricts[t.group]?.name
    : isTransit ? "City Transit" : isUtility ? "Utilities" : "Street Square";

  const upgradeReason = !canManage ? "Only the deed owner can build." : actionBlocked
    ? disabled ? "Finish the current selection first." : mine === false ? "Wait for your turn to build." : "Finish the current event first."
    : !full ? "Own the full district without mortgages to build."
    : q?.level >= maxLevel ? "This block is fully built."
    : game?.settings?.evenBuild && q?.level !== minLevel ? "Build evenly across the district."
    : (me?.cash || 0) < buildCost ? `Need ${money(buildCost - (me?.cash || 0))} more to build.`
    : "";
  const sellReason = !canManage ? "Only the deed owner can sell a building."
    : actionBlocked ? disabled ? "Finish the current selection first." : mine === false ? "Wait for your turn to sell." : "Finish the current event first."
    : !q?.level ? "There is no building to sell."
    : game?.settings?.evenBuild && q.level !== maxDistrictLevel ? "Sell evenly across the district."
    : "";
  const mortgageReason = !canManage ? "Only the deed owner can mortgage this deed."
    : actionBlocked ? disabled ? "Finish the current selection first." : mine === false ? "Wait for your turn to manage deeds." : "Finish the current event first."
    : game?.settings?.mortgage === false ? "Mortgages are disabled in this room."
    : q?.mortgaged ? "This deed is already mortgaged."
    : q?.level ? "Sell all buildings before mortgaging."
    : districtTiles.some((tile) => props[tile.id]?.level) ? "Sell all district buildings before mortgaging."
    : "";
  const redeemReason = !canManage ? "Only the deed owner can redeem this deed."
    : actionBlocked ? disabled ? "Finish the current selection first." : mine === false ? "Wait for your turn to redeem." : "Finish the current event first."
    : !q?.mortgaged ? "This deed is not mortgaged."
    : (me?.cash || 0) < redeemCost ? `Need ${money(redeemCost - (me?.cash || 0))} more to redeem.`
    : "";

  const rentRows = isProperty ? RENT_MULTIPLIERS.slice(0, maxLevel + 1).map((multiplier, level) => ({
    level,
    label: level === 0 ? (rentSetFull && game?.settings?.doubleRent !== false ? "Full district" : "Street rent") : level === maxLevel && !legacy ? "Hotel" : `${level} ${level === 1 ? "house" : "houses"}`,
    amount: t.rent * multiplier * (level === 0 && rentSetFull && game?.settings?.doubleRent !== false ? 2 : 1),
  })) : [];
  const activeLevel = q?.level || 0;
  const prisonRentPaused = Boolean(owner && game?.settings?.prisonRent === false && owner.jail);
  const rentPaused = Boolean(q?.mortgaged || prisonRentPaused);
  const blackoutActive = Boolean(t.group !== undefined && game?.blackoutDistrict === t.group);
  const nominalCurrentRent = rentRows[activeLevel]?.amount;
  const currentRent = nominalCurrentRent == null ? null : blackoutActive ? Math.floor(nominalCurrentRent / 2) : nominalCurrentRent;
  const showCurrentRent = Boolean(owner && !rentPaused);

  return (
    <div className="deed-popover-backdrop" onClick={(event) => {
      if (event.target === event.currentTarget) closeRef.current?.();
    }}>
      <section
        className="building-popover deed-card-popover"
        ref={propertyFocus}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="property-heading"
        style={{ "--district": districtColor }}
      >
        <header className={`building-heading ${t.group === undefined ? "building-heading-neutral" : ""}`} style={{ backgroundColor: districtColor }}>
          <div className="building-heading-copy">
            <span className="building-district">{headerLabel}</span>
            <h2 id="property-heading">{t.name}</h2>
          </div>
          <button className="building-close" onClick={() => closeRef.current?.()} aria-label="Close property details">
            <X size={18} />
          </button>
        </header>

        <div className="building-content">
          {isProperty && (
            <section className="building-rent-section" aria-label="Rent schedule">
              <div className="building-section-title"><span>Rent schedule</span><b>Current: {rentPaused ? "Paused" : showCurrentRent && currentRent != null ? money(currentRent) : "—"}</b></div>
              <div className="building-rent-list">
                {rentRows.map((row) => (
                  <div key={row.level} className={`building-rent-row ${showCurrentRent && activeLevel === row.level ? "is-current" : ""}`}>
                    <span>{row.label}</span><b>{money(row.amount)}</b>
                  </div>
                ))}
              </div>
              {q?.mortgaged && <p className="building-inline-note">Rent is paused while mortgaged.</p>}
              {!q?.mortgaged && prisonRentPaused && <p className="building-inline-note">Rent is paused while the owner is in jail.</p>}
              {blackoutActive && showCurrentRent && <p className="building-inline-note">A district blackout halves rent.</p>}
            </section>
          )}

          {(isTransit || isUtility) && (
            <section className="building-rent-section" aria-label={isTransit ? "Transit fare schedule" : "Utility rates"}>
              <div className="building-section-title"><span>{isTransit ? "Fare schedule" : "Utility rates"}</span><b>Base {money(t.rent || (isTransit ? (legacyTransitRates ? 45 : 25) : 4))}</b></div>
              <div className="building-rent-list">
                {isTransit ? (legacyTransitRates ? [1, 2] : [1, 2, 3, 4]).map((count) => (
                  <div className="building-rent-row" key={count}><span>{count} line{count > 1 ? "s" : ""} owned</span><b>{money((t.rent || (legacyTransitRates ? 45 : 25)) * (legacyTransitRates ? count : 2 ** (count - 1)))}</b></div>
                )) : <>
                  <div className="building-rent-row"><span>One utility owned</span><b>4× dice</b></div>
                  <div className="building-rent-row"><span>Both utilities owned</span><b>15× dice</b></div>
                </>}
              </div>
            </section>
          )}

          {canManage && isPurchasable && (
            <section className="building-controls" aria-label="Property management">
              {isProperty && (
                <div className="building-action-wrap">
                  <Button secondary className="building-action" disabled={Boolean(upgradeReason)} onClick={() => act({ type: "upgrade", tile: t.id })}>
                    {activeLevel === maxLevel - 1 && !legacy ? <Hotel size={15} /> : <ArrowUp size={15} />}
                    {activeLevel === maxLevel - 1 && !legacy ? `Hotel · ${money(buildCost)}` : `Build · ${money(buildCost)}`}
                  </Button>
                  {upgradeReason && <span className="building-reason">{upgradeReason}</span>}
                </div>
              )}
              {isProperty && (
                <div className="building-action-wrap">
                  <Button secondary className="building-action" disabled={Boolean(sellReason)} onClick={() => act({ type: "sell", tile: t.id })}>
                    <ArrowDown size={15} /> Sell · {money(Math.floor(buildCost / 2))}
                  </Button>
                  {sellReason && <span className="building-reason">{sellReason}</span>}
                </div>
              )}
              <div className="building-action-wrap">
                <Button secondary className="building-action" disabled={Boolean(q?.mortgaged ? redeemReason : mortgageReason)} onClick={() => act({ type: q?.mortgaged ? "redeem" : "mortgage", tile: t.id })}>
                  <Landmark size={15} /> {q?.mortgaged ? `Redeem · ${money(redeemCost)}` : `Mortgage · +${money(mortgageValue)}`}
                </Button>
                {(q?.mortgaged ? redeemReason : mortgageReason) && <span className="building-reason">{q?.mortgaged ? redeemReason : mortgageReason}</span>}
              </div>
            </section>
          )}

          <section className="building-facts" aria-label="Ownership and costs">
            <div className="building-owner-line">
              {owner && <span className="building-avatar" style={{ "--crew": CREWS[owner.crew]?.color || "#c6ed72" }}><HoodFigure color={CREWS[owner.crew]?.color} variant={owner.crew} /></span>}
              <span className="building-fact-label">Owner</span>
              <b>{owner ? owner.id === me?.id ? "Your crew" : owner.name : isPurchasable ? "Unclaimed" : "—"}</b>
              {q?.mortgaged && <span className="building-mortgage-tag">Mortgaged</span>}
            </div>
            {isPurchasable && (
              <div className="building-cost-line">
                <span><small>Purchase</small><b>{money(t.price)}</b></span>
                {isProperty && <span><small>Build cost</small><b>{money(buildCost)}</b></span>}
                <span><small>{q?.mortgaged ? "Redeem" : "Mortgage value"}</small><b>{money(q?.mortgaged ? redeemCost : mortgageValue)}</b></span>
              </div>
            )}
          </section>

          {!isProperty && !isTransit && !isUtility && isPurchasable && (
            <p className="building-description">{tileDescription(t, game)}</p>
          )}
          {!isPurchasable && (
            <div className="building-special-info">
              <p>{tileDescription(t, game)}</p>
              {t.type === "parking" && <b>Community Plot · {money(game?.pot || 0)}</b>}
            </div>
          )}

          {residents.length > 0 && (
            <div className="building-residents" aria-label={`${residents.length} crews on this block`}>
              <Building2 size={14} />
              <span>{residents.map((player) => player.id === me?.id ? "You" : player.name).join(", ")}</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default DeedCardPopover;
