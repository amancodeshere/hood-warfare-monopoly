import React, { useEffect } from "react";
import { X, Users, Plus } from "lucide-react";
import { CREWS, money, BOARD as DEFAULT_BOARD, DISTRICTS } from "../../shared/board.js";
import { BOARD as LEGACY_BOARD, DISTRICTS as LEGACY_DISTRICTS } from "../../shared/legacy-board.js";
import { HoodFigure, StreetBuilding } from "../StreetPieces.jsx";
import { Button } from "./common.jsx";

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
  const is28 = activeBoard?.length === 28 || game?.schemaVersion === 1;
  const allDistricts =
    districts ||
    (is28 ? LEGACY_DISTRICTS : DISTRICTS);
  const q = game?.props[t.id];
  const owner = game?.players?.find((p) => p.id === q?.owner);
  const residents =
    game?.players?.filter((p) => !p.out && p.pos === t.id) || [];
  const manage = mine && ["roll", "end", "rent", "buy"].includes(game?.phase);
  const full =
    t.group !== undefined &&
    activeBoard.filter((x) => x.group === t.group).every(
      (x) =>
        (game?.props[x.id]?.owner === me?.id ||
          (game?.settings?.teams &&
            me?.team != null &&
            game?.players?.find((p) => p.id === game?.props[x.id]?.owner)
              ?.team === me?.team)) &&
        !game?.props[x.id]?.mortgaged,
    );

  useEffect(() => {
    const previous = document.activeElement;
    propertyFocus.current?.focus({ preventScroll: true });

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const items = propertyFocus.current?.querySelectorAll(
          'button:not(:disabled), [tabindex="0"]',
        );
        if (!items?.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === propertyFocus.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previous?.focus();
    };
  }, [onClose, propertyFocus]);

  const districtColor =
    t.group !== undefined
      ? allDistricts[t.group]?.color
      : t.type === "transit"
        ? "#486253"
        : t.type === "utility"
          ? "#5f5c40"
          : "#2f3d33";

  const isProp = t.type === "property";
  const isTransit = t.type === "transit";
  const isUtil = t.type === "utility";
  const isPurchasable = Boolean(t.price);

  return (
    <div
      className="deed-popover-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="property-detail deed-card-popover"
        ref={propertyFocus}
        tabIndex={-1}
        role="region"
        aria-label={t.name}
        aria-modal="true"
        aria-labelledby="property-heading"
        style={{ "--district": districtColor }}
      >
        <div className="deed-drawer-handle" />

        <div className="deed-banner" style={{ background: districtColor }}>
          <div className="deed-banner-content property-title">
            <span className="deed-banner-tag">
              {t.group !== undefined
                ? `TITLE DEED · ${allDistricts[t.group]?.name.toUpperCase()}`
                : isTransit
                  ? "TITLE DEED · CITY TRANSIT"
                  : isUtil
                    ? "TITLE DEED · UTILITY PLUG"
                    : "STREET SQUARE"}
            </span>
            <h3 id="property-heading" className="deed-street-title">
              {t.name}
            </h3>
          </div>
          <button
            className="icon-button deed-close-btn"
            onClick={onClose}
            aria-label="Close property details"
          >
            <X size={18} />
          </button>
        </div>

        <div className="deed-body">
          {owner ? (
            <div
              className="property-owner-summary deed-owner-card"
              style={{ "--crew": CREWS[owner.crew].color }}
            >
              <div className="owner-avatar">
                <HoodFigure
                  color={CREWS[owner.crew].color}
                  variant={owner.crew}
                />
              </div>
              <div className="owner-meta">
                <div className="owner-title-row">
                  <span
                    className="owner-badge-tag"
                    style={{ background: CREWS[owner.crew].color }}
                  >
                    {CREWS[owner.crew].name}
                  </span>
                  <strong>
                    {owner.id === me?.id
                      ? "Your block"
                      : `Owned by ${owner.name}`}
                  </strong>
                </div>
                <span className="owner-status">
                  {q.mortgaged
                    ? "MORTGAGED · Rent paused"
                    : q.level === 5
                      ? "Hotel built"
                      : q.level
                        ? `${q.level} house${q.level > 1 ? "s" : ""} built`
                        : "Street level · No buildings"}
                </span>
              </div>
              {q.level > 0 && <StreetBuilding hotel={q.level === 5} />}
            </div>
          ) : isPurchasable ? (
            <div className="deed-unowned-badge">
              <span className="unclaimed-dot" />
              <span>
                Unclaimed block · Available for <b>{money(t.price)}</b>
              </span>
            </div>
          ) : null}

          <div className="deed-description">
            <p>
              {t.group !== undefined
                ? allDistricts[t.group]?.name
                : t.type === "transit"
                  ? "City transit station. Collects scaled fare based on lines held."
                  : t.type === "stoppa"
                    ? "Spin away 1–10% of cash into the Community Plot."
                    : t.type === "utility"
                      ? "Rent is 4× dice, or 15× when your side owns both plugs."
                      : t.type === "roulette"
                        ? "Six outcomes. One free spin."
                        : t.type === "card"
                          ? "A surprise from the streets."
                          : t.type === "start"
                            ? "Collect $200 each time you pass."
                            : t.type === "jail"
                              ? "Two turns, $100 bail, or an escape card."
                              : t.type === "raid"
                                ? "Go straight to County Jail."
                                : t.type === "parking"
                                  ? game?.settings?.communityCash === false
                                    ? "Community payouts are off in this room."
                                    : "Land here to collect the community pot."
                                  : "Pay $100 into the community pot."}
            </p>
          </div>

          {t.type === "parking" && (
            <div className="detail-stat">
              <span>Community Plot balance</span>
              <b>{money(game?.pot || 0)}</b>
            </div>
          )}

          {isProp && (
            <div className="deed-rent-ladder">
              <div className="deed-ladder-header">
                <span>RENT SCHEDULE</span>
                <span className="deed-base-rent">
                  Base Rent: <b>{money(t.rent)}</b>
                </span>
              </div>
              <div className="deed-ladder-rows">
                <div
                  className={`deed-ladder-row ${q && !q.level && !q.mortgaged ? "current-tier" : ""}`}
                >
                  <span className="tier-label">Base Rent (Street)</span>
                  <span className="tier-dots" />
                  <span className="tier-val">{money(t.rent)}</span>
                </div>
                <div className="deed-ladder-row muted">
                  <span className="tier-label">With Full District</span>
                  <span className="tier-dots" />
                  <span className="tier-val">{money(t.rent * 2)}</span>
                </div>
                <div
                  className={`deed-ladder-row ${q?.level === 1 ? "current-tier" : ""}`}
                >
                  <span className="tier-label">
                    <span className="house-pip">🏠</span> With 1 House
                  </span>
                  <span className="tier-dots" />
                  <span className="tier-val">{money(t.rent * 3)}</span>
                </div>
                <div
                  className={`deed-ladder-row ${q?.level === 2 ? "current-tier" : ""}`}
                >
                  <span className="tier-label">
                    <span className="house-pip">🏠🏠</span> With 2 Houses
                  </span>
                  <span className="tier-dots" />
                  <span className="tier-val">{money(t.rent * 6)}</span>
                </div>
                <div
                  className={`deed-ladder-row ${q?.level === 3 ? "current-tier" : ""}`}
                >
                  <span className="tier-label">
                    <span className="house-pip">🏠🏠🏠</span> With 3 Houses
                  </span>
                  <span className="tier-dots" />
                  <span className="tier-val">{money(t.rent * 10)}</span>
                </div>
                <div
                  className={`deed-ladder-row ${q?.level === 4 ? "current-tier" : ""}`}
                >
                  <span className="tier-label">
                    <span className="house-pip">🏠🏠🏠🏠</span> With 4 Houses
                  </span>
                  <span className="tier-dots" />
                  <span className="tier-val">{money(t.rent * 16)}</span>
                </div>
                <div
                  className={`deed-ladder-row hotel ${q?.level === 5 ? "current-tier" : ""}`}
                >
                  <span className="tier-label">
                    <span className="hotel-pip">🏨</span> With Hotel
                  </span>
                  <span className="tier-dots" />
                  <span className="tier-val">{money(t.rent * 25)}</span>
                </div>
              </div>
            </div>
          )}

          {isTransit && (
            <div className="deed-rent-ladder">
              <div className="deed-ladder-header">
                <span>TRANSIT FARE LADDER</span>
                <span className="deed-base-rent">
                  Base: <b>{money(t.rent || (is28 ? 45 : 25))}</b>
                </span>
              </div>
              <div className="deed-ladder-rows">
                {(is28
                  ? [
                      { count: 1, val: t.rent || 45 },
                      { count: 2, val: (t.rent || 45) * 2 },
                    ]
                  : [
                      { count: 1, val: t.rent || 25 },
                      { count: 2, val: (t.rent || 25) * 2 },
                      { count: 3, val: (t.rent || 25) * 4 },
                      { count: 4, val: (t.rent || 25) * 8 },
                    ]
                ).map(({ count, val }) => (
                  <div key={count} className="deed-ladder-row">
                    <span className="tier-label">
                      If {count} Station{count > 1 ? "s" : ""} owned
                    </span>
                    <span className="tier-dots" />
                    <span className="tier-val">{money(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isUtil && (
            <div className="deed-rent-ladder">
              <div className="deed-ladder-header">
                <span>UTILITY RATES</span>
              </div>
              <div className="deed-ladder-rows">
                <div className="deed-ladder-row">
                  <span className="tier-label">If 1 Plug owned</span>
                  <span className="tier-dots" />
                  <span className="tier-val">4× Dice Total</span>
                </div>
                <div className="deed-ladder-row">
                  <span className="tier-label">If both Plugs owned</span>
                  <span className="tier-dots" />
                  <span className="tier-val">15× Dice Total</span>
                </div>
              </div>
            </div>
          )}

          {isPurchasable && (
            <div className="deed-financials">
              <div className="deed-finance-grid">
                {t.build ? (
                  <div className="deed-finance-item">
                    <span className="label">Build Cost</span>
                    <b className="val">{money(t.build)}</b>
                    <span className="sub">per house/hotel</span>
                  </div>
                ) : (
                  <div className="deed-finance-item">
                    <span className="label">Buy Price</span>
                    <b className="val">{money(t.price)}</b>
                    <span className="sub">deed purchase</span>
                  </div>
                )}
                <div className="deed-finance-item">
                  <span className="label">Mortgage</span>
                  <b className="val">{money(t.price / 2)}</b>
                  <span className="sub">50% cash payout</span>
                </div>
                <div className="deed-finance-item">
                  <span className="label">Redeem</span>
                  <b className="val">
                    {money(Math.ceil((t.price * 55) / 100))}
                  </b>
                  <span className="sub">55% to unfreeze</span>
                </div>
              </div>
            </div>
          )}

          <div className="deed-residents-section">
            <div className="deed-residents-header">
              <Users size={14} />
              <span>CREWS ON THIS BLOCK</span>
              <span className="resident-count">{residents.length}</span>
            </div>
            {residents.length > 0 ? (
              <div
                className="property-residents deed-residents-list"
                aria-label="Crews on this block"
              >
                {residents.map((p) => (
                  <span
                    key={p.id}
                    className="resident-pill"
                    style={{ "--crew": CREWS[p.crew].color }}
                  >
                    <HoodFigure
                      color={CREWS[p.crew].color}
                      variant={p.crew}
                    />
                    <b>{p.id === me?.id ? "You" : p.name}</b>
                    <small>{CREWS[p.crew].name}</small>
                  </span>
                ))}
              </div>
            ) : (
              <p className="deed-no-residents">No crews on this block</p>
            )}
          </div>

          {owner?.id === me?.id && (
            <div className="property-actions">
              {t.type === "property" && (
                <Button
                  secondary
                  disabled={
                    !manage ||
                    !full ||
                    q.level >= (game.schemaVersion === 1 ? 3 : 5) ||
                    me.cash < t.build ||
                    disabled
                  }
                  onClick={() => act({ type: "upgrade", tile: t.id })}
                >
                  <Plus size={15} /> Build {money(t.build)}
                </Button>
              )}
              {q.level > 0 ? (
                <Button
                  secondary
                  disabled={!manage || disabled}
                  onClick={() => act({ type: "sell", tile: t.id })}
                >
                  Sell business {money(Math.floor(t.build / 2))}
                </Button>
              ) : (
                <Button
                  secondary
                  disabled={
                    !manage ||
                    disabled ||
                    (!q.mortgaged && !game.settings.mortgage) ||
                    (q.mortgaged && me.cash < Math.ceil((t.price * 55) / 100))
                  }
                  onClick={() =>
                    act({
                      type: q.mortgaged ? "redeem" : "mortgage",
                      tile: t.id,
                    })
                  }
                >
                  {q.mortgaged
                    ? "Redeem " + money(Math.ceil((t.price * 55) / 100))
                    : "Mortgage +" + money(t.price / 2)}
                </Button>
              )}
              {!manage && (
                <p className="micro-note">
                  Manage turf on your turn after resolving special events.
                </p>
              )}
              {t.type === "property" && !full && (
                <p className="micro-note">
                  Own the full district without mortgages to build.
                </p>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default DeedCardPopover;
