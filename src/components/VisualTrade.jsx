import React, { useState, useEffect, useRef } from "react";
import { Handshake, X } from "lucide-react";
import { BOARD, money, DISTRICTS } from "../../shared/board.js";
import { DISTRICTS as LEGACY_DISTRICTS } from "../../shared/legacy-board.js";
import {
  getDistrictColor,
  stepCash,
  calculateTradeValues,
} from "../../shared/trading.js";

const Btn = ({ secondary = false, children, ...props }) => (
  <button className={`button ${secondary ? "secondary" : ""}`} {...props}>
    {children}
  </button>
);

/**
 * Summary view of a proposed trade deal or pending inbox deal.
 */
export function TradeSummary({ game, offer, viewer = game.me }) {
  const board = game.board || BOARD;
  const receiving = offer.to === viewer;
  const sides = [
    {
      title: receiving ? "You receive" : "You give",
      ids: offer.giveTiles || [offer.give],
      cash: offer.cash || 0,
      cards: offer.giveEscapes || 0,
      player: offer.from,
    },
    {
      title: receiving ? "You give" : "You receive",
      ids: offer.takeTiles || [offer.take],
      cash: offer.requestCash || 0,
      cards: offer.takeEscapes || 0,
      player: offer.to,
    },
  ];
  return (
    <div className="deal-summary">
      {sides.map((side) => (
        <section key={side.title}>
          <h4>{side.title}</h4>
          <ul>
            {side.ids
              .filter((id) => board[id]?.price)
              .map((id) => (
                <li key={id}>
                  <span>{board[id].name}</span>
                  <small>
                    {money(board[id].price)} list price
                    {game.props[id]?.mortgaged ? " · mortgaged; no rent" : ""}
                  </small>
                </li>
              ))}
            {!!side.cash && <li>{money(side.cash)} cash</li>}
            {!!side.cards && (
              <li>
                {side.cards} escape card{side.cards === 1 ? "" : "s"}
              </li>
            )}
            {!side.ids.some((id) => board[id]?.price) &&
              !side.cash &&
              !side.cards && <li>Nothing</li>}
          </ul>
        </section>
      ))}
      <p className="deal-cash-note">
        Your cash after this deal:{" "}
        {money(
          (game.players.find((p) => p.id === viewer)?.cash || 0) +
            (receiving
              ? (offer.cash || 0) - (offer.requestCash || 0)
              : (offer.requestCash || 0) - (offer.cash || 0)),
        )}
        . Mortgages stay with the property.
      </p>
    </div>
  );
}

/**
 * Visual Trade Value Meter comparing estimated asset and cash parity.
 * Evaluates the deal as Fair, Generous, or One-Sided in real-time.
 */
export function TradeValueMeter({
  board,
  props,
  partner,
  giveTiles,
  takeTiles,
  cash,
  requestCash,
  escapes,
  requestEscapes,
}) {
  const valuation = calculateTradeValues(board, props, {
    giveTiles,
    takeTiles,
    cash,
    requestCash,
    escapes,
    requestEscapes,
  });

  const {
    giveTotal,
    takeTotal,
    grandTotal,
    diff,
    ratio,
    status,
    label,
    description,
  } = valuation;

  const givePercent = grandTotal > 0 ? Math.round(ratio * 100) : 50;
  const takePercent = 100 - givePercent;

  return (
    <div
      className={`trade-value-meter meter-status-${status}`}
      data-testid="trade-value-meter"
      data-trade-status={status}
      role="region"
      aria-label={`Trade Value Meter: ${label}`}
    >
      <div className="trade-meter-top">
        <div className="trade-meter-headline">
          <span className="trade-meter-kicker">Deal Valuation</span>
          <h4 className="trade-meter-title">Trade Value Meter</h4>
        </div>
        <div className={`trade-meter-badge badge-${status}`}>
          <span className="badge-dot" aria-hidden="true" />
          <span className="badge-text">{label}</span>
        </div>
      </div>

      <div className="trade-meter-track" aria-hidden="true">
        <div
          className="meter-bar meter-bar-give"
          style={{ width: `${givePercent}%` }}
          title={`Your Offer: ${money(giveTotal)} (${givePercent}%)`}
        />
        <div
          className="meter-bar meter-bar-take"
          style={{ width: `${takePercent}%` }}
          title={`Rival’s Offer: ${money(takeTotal)} (${takePercent}%)`}
        />
        <div className="meter-marker" title="50% Fair Parity Marker" />
      </div>

      <div className="trade-meter-stats">
        <div className="meter-stat stat-give">
          <span className="stat-label">Your Offer</span>
          <span className="stat-val">{money(giveTotal)}</span>
          <span className="stat-pct">{givePercent}%</span>
        </div>
        <div className="meter-stat stat-center">
          <span className="stat-label">Balance</span>
          <span className={`stat-parity parity-${status}`}>
            {diff === 0
              ? "Even"
              : diff > 0
                ? `+${money(diff)}`
                : `-${money(Math.abs(diff))}`}
          </span>
        </div>
        <div className="meter-stat stat-take">
          <span
            className="stat-label"
            title={partner ? `${partner.name}’s Side` : "Rival’s Side"}
          >
            {partner
              ? `${partner.name.length > 12 ? partner.name.slice(0, 10) + "…" : partner.name}’s Side`
              : "Rival’s Side"}
          </span>
          <span className="stat-val">{money(takeTotal)}</span>
          <span className="stat-pct">{takePercent}%</span>
        </div>
      </div>

      <p className="trade-meter-explainer">{description}</p>
    </div>
  );
}

/**
 * Interactive Property Chip with district swatch, mortgage status, and accessible checkbox.
 */
export function PropertyChip({
  tile,
  isChecked,
  isAvailable,
  isMortgaged,
  swatchColor,
  onToggle,
}) {
  return (
    <label
      className={`asset-check trade-chip ${isChecked ? "selected" : ""} ${!isAvailable ? "disabled" : ""}`}
      key={tile.id}
      data-testid={`trade-chip-${tile.id}`}
    >
      <input
        type="checkbox"
        disabled={!isAvailable}
        checked={isChecked}
        onChange={onToggle}
      />
      <div className="trade-chip-body">
        <div className="trade-chip-top">
          <span
            className="trade-chip-swatch"
            style={{ backgroundColor: swatchColor }}
            aria-hidden="true"
          />
          <span className="trade-chip-name">{tile.name}</span>
          {isMortgaged && (
            <span
              className="trade-chip-mortgage-tag"
              title="Mortgaged property: rent cannot be collected"
            >
              Mortgaged
            </span>
          )}
        </div>
        <small>
          {money(tile.price)} ·{" "}
          {isMortgaged
            ? "Mortgaged; no rent"
            : "Base rent " + (tile.rent ? money(tile.rent) : "varies")}
          {!isAvailable ? " · Sell district buildings first" : ""}
        </small>
      </div>
    </label>
  );
}

/**
 * Intuitive +$50 / -$50 / Max quick cash stepper buttons.
 */
export function CashStepperButtons({
  currentVal,
  maxVal,
  onUpdate,
  disabled,
  contextLabel,
}) {
  const num = parseInt(String(currentVal).trim(), 10) || 0;
  const max = Math.max(0, parseInt(String(maxVal).trim(), 10) || 0);

  return (
    <div
      className="cash-steppers"
      role="group"
      aria-label={`Quick cash adjustment for ${contextLabel}`}
    >
      <button
        type="button"
        className="trade-stepper-btn"
        disabled={disabled || num <= 0}
        onClick={() => onUpdate(stepCash(currentVal, -50, max))}
        aria-label={`Subtract $50 from ${contextLabel}`}
      >
        -$50
      </button>
      <button
        type="button"
        className="trade-stepper-btn"
        disabled={disabled || num >= max}
        onClick={() => onUpdate(stepCash(currentVal, 50, max))}
        aria-label={`Add $50 to ${contextLabel}`}
      >
        +$50
      </button>
      <button
        type="button"
        className="trade-stepper-btn trade-stepper-max"
        disabled={disabled || num >= max}
        onClick={() => onUpdate(String(max))}
        aria-label={`Set maximum cash for ${contextLabel}`}
      >
        Max
      </button>
    </div>
  );
}

/**
 * Visual Trade Negotiation UI (Trading 2.0).
 * Displays two distinct columns ("Your Offer" and "Rival's Offer"),
 * interactive property chips with swatches and mortgage flags,
 * quick cash stepper buttons, and a real-time Trade Value Meter.
 */
export function VisualTrade({
  game,
  act,
  disabled,
  counter,
  clearCounter,
  initialPartnerId,
  onClose,
}) {
  const me = game.players.find((p) => p.id === game.me),
    board = game.board || BOARD;
  const districts =
    game?.schemaVersion === 1 || board.length === 28
      ? game?.districts || LEGACY_DISTRICTS
      : game?.districts || DISTRICTS;

  const [to, setTo] = useState(counter?.from || initialPartnerId || ""),
    [give, setGive] = useState(counter?.takeTiles || []),
    [take, setTake] = useState(counter?.giveTiles || []),
    [cash, setCash] = useState(String(counter?.requestCash || 0)),
    [requestCash, setRequestCash] = useState(String(counter?.cash || 0)),
    [escapes, setEscapes] = useState(String(counter?.takeEscapes || 0)),
    [requestEscapes, setRequestEscapes] = useState(
      String(counter?.giveEscapes || 0),
    );

  useEffect(() => {
    if (initialPartnerId && !counter && initialPartnerId !== to) {
      setTo(initialPartnerId);
      setTake([]);
      setRequestCash("0");
      setRequestEscapes("0");
    }
  }, [initialPartnerId, counter, to]);

  const partner = game.players.find((p) => p.id === to);
  if (!me || me.out)
    return <p className="empty-copy">Trading is for active crews.</p>;

  const available = (t, id) =>
    game.props[t.id]?.owner === id &&
    !game.props[t.id]?.level &&
    (t.group === undefined ||
      !board.some((x) => x.group === t.group && game.props[x.id]?.level));

  const toggle = (id, list, set) =>
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const movable = ["roll", "end", "rent", "buy"].includes(game.phase);
  const draft = {
    from: me.id,
    to,
    giveTiles: give,
    takeTiles: take,
    cash: Number(cash),
    requestCash: Number(requestCash),
    giveEscapes: Number(escapes),
    takeEscapes: Number(requestEscapes),
  };

  const validAmount = (value, max) =>
    value !== "" &&
    Number.isInteger(Number(value)) &&
    Number(value) >= 0 &&
    Number(value) <= max;

  const valid =
    partner &&
    !partner.out &&
    validAmount(cash, me.cash) &&
    validAmount(requestCash, partner.cash) &&
    validAmount(escapes, me.escapes) &&
    validAmount(requestEscapes, partner.escapes) &&
    give.every((id) => available(board[id], me.id)) &&
    take.every((id) => available(board[id], to)) &&
    give.length +
      take.length +
      draft.cash +
      draft.requestCash +
      draft.giveEscapes +
      draft.takeEscapes >
      0;

  const stale = counter && game.trade?.id !== counter.id;

  const renderPropertyChips = (ownerId, selected, set) => {
    const owned = board.filter((t) => game.props[t.id]?.owner === ownerId);
    return owned.length ? (
      <div className="trade-chips-list">
        {owned.map((t) => (
          <PropertyChip
            key={t.id}
            tile={t}
            isChecked={selected.includes(t.id)}
            isAvailable={available(t, ownerId)}
            isMortgaged={Boolean(game.props[t.id]?.mortgaged)}
            swatchColor={getDistrictColor(t, districts)}
            onToggle={() => toggle(t.id, selected, set)}
          />
        ))}
      </div>
    ) : (
      <p className="empty-copy">
        No properties yet. Cash and cards can still be traded.
      </p>
    );
  };

  return (
    <div className="exchange">
      <div className="turf-heading">
        <h2>{counter ? "Make a counteroffer." : "Let’s make a deal."}</h2>
        <p>
          Swap multiple properties, cash, and escape cards. Any active crew can
          negotiate between events.
        </p>
      </div>

      {game.trade?.from === me.id ? (
        <>
          <p className="waiting">
            Offer sent to{" "}
            {game.players.find((p) => p.id === game.trade.to)?.name}. Waiting
            for an answer.
          </p>
          <TradeSummary game={game} offer={game.trade} />
          <Btn
            secondary
            disabled={disabled}
            onClick={() =>
              act({ type: "trade-cancel", offerId: game.trade.id })
            }
          >
            Withdraw offer
          </Btn>
        </>
      ) : (
        <>
          {counter && (
            <p className="panel-notice" role="status">
              {stale
                ? "This offer was replaced or expired. Start a fresh deal."
                : "The original stays open until you send your counteroffer. Sending replaces it; no assets move yet."}
              <button className="text-button" onClick={clearCounter}>
                Discard counteroffer draft
              </button>
            </p>
          )}

          <fieldset
            className="trade-crew-choices"
            disabled={!!counter || disabled}
          >
            <legend>Trade with</legend>
            {game.players
              .filter((p) => p.id !== me.id && !p.out)
              .map((p) => (
                <label key={p.id}>
                  <input
                    type="radio"
                    name="trade-partner"
                    value={p.id}
                    checked={to === p.id}
                    onChange={() => {
                      setTo(p.id);
                      setTake([]);
                      setRequestCash("0");
                      setRequestEscapes("0");
                    }}
                  />
                  <span>
                    {p.name} · {money(p.cash)}
                  </span>
                </label>
              ))}
          </fieldset>

          <div className="trade-columns">
            <div className="trade-column trade-column-give">
              <div className="trade-column-header">
                <div className="trade-column-title-row">
                  <span className="trade-column-badge give-badge">
                    Your Offer
                  </span>
                  <span className="trade-column-cash-pill">
                    {money(me.cash)} available
                  </span>
                </div>
                <p className="trade-column-sub">Assets and cash you offer</p>
              </div>

              <fieldset
                disabled={!movable || disabled || stale}
                className="exchange-fields"
              >
                <legend>You give · {money(me.cash)} available</legend>
                {renderPropertyChips(me.id, give, setGive)}
                <div className="amount-fields">
                  <div className="amount-input-wrap">
                    <label>
                      Cash to give
                      <input
                        type="number"
                        min={0}
                        max={me.cash}
                        step={1}
                        value={cash}
                        onChange={(e) => setCash(e.target.value)}
                      />
                    </label>
                    <CashStepperButtons
                      currentVal={cash}
                      maxVal={me.cash}
                      onUpdate={setCash}
                      disabled={!movable || disabled || stale}
                      contextLabel="Cash to give"
                    />
                  </div>
                  <div className="amount-input-wrap">
                    <label>
                      Escape cards to give
                      <input
                        type="number"
                        min={0}
                        max={me.escapes}
                        step={1}
                        value={escapes}
                        onChange={(e) => setEscapes(e.target.value)}
                      />
                    </label>
                  </div>
                </div>
              </fieldset>
            </div>

            <div className="trade-column trade-column-take">
              <div className="trade-column-header">
                <div className="trade-column-title-row">
                  <span className="trade-column-badge take-badge">
                    Rival’s Offer
                  </span>
                  <span className="trade-column-cash-pill">
                    {partner
                      ? `${money(partner.cash)} available`
                      : "No crew selected"}
                  </span>
                </div>
                <p className="trade-column-sub">
                  Assets and cash you request in return
                </p>
              </div>

              <fieldset
                disabled={!movable || disabled || !partner || stale}
                className="exchange-fields"
              >
                <legend>
                  You receive
                  {partner ? ` · ${money(partner.cash)} available` : ""}
                </legend>
                {partner ? (
                  renderPropertyChips(to, take, setTake)
                ) : (
                  <p className="empty-copy">
                    Choose a crew to see their properties.
                  </p>
                )}
                <div className="amount-fields">
                  <div className="amount-input-wrap">
                    <label>
                      Cash to receive
                      <input
                        type="number"
                        min={0}
                        max={partner?.cash || 0}
                        step={1}
                        value={requestCash}
                        onChange={(e) => setRequestCash(e.target.value)}
                      />
                    </label>
                    <CashStepperButtons
                      currentVal={requestCash}
                      maxVal={partner?.cash || 0}
                      onUpdate={setRequestCash}
                      disabled={!movable || disabled || !partner || stale}
                      contextLabel="Cash to receive"
                    />
                  </div>
                  <div className="amount-input-wrap">
                    <label>
                      Escape cards to receive
                      <input
                        type="number"
                        min={0}
                        max={partner?.escapes || 0}
                        step={1}
                        value={requestEscapes}
                        onChange={(e) => setRequestEscapes(e.target.value)}
                      />
                    </label>
                  </div>
                </div>
              </fieldset>
            </div>
          </div>

          {partner && (
            <>
              <TradeValueMeter
                board={board}
                props={game.props}
                partner={partner}
                giveTiles={give}
                takeTiles={take}
                cash={cash}
                requestCash={requestCash}
                escapes={escapes}
                requestEscapes={requestEscapes}
              />

              <h3 className="deal-preview-title">
                Review your {counter ? "counteroffer" : "offer"}
              </h3>
              <TradeSummary game={game} offer={draft} />
              {!valid && (
                <p className="micro-note">
                  Select an available asset and use whole amounts within each
                  crew’s balance.
                </p>
              )}
            </>
          )}

          <Btn
            disabled={
              !movable ||
              disabled ||
              !valid ||
              stale ||
              (!!game.trade && !counter)
            }
            onClick={async () => {
              if (
                await act({
                  type: counter ? "trade-counter" : "trade",
                  ...draft,
                  offerId: counter?.id,
                })
              ) {
                clearCounter();
                setGive([]);
                setTake([]);
                setCash("0");
                setRequestCash("0");
                setEscapes("0");
                setRequestEscapes("0");
              }
            }}
          >
            {counter ? "Send counteroffer" : "Send offer"}{" "}
            <Handshake size={18} />
          </Btn>

          {!movable && (
            <p className="panel-notice">
              Finish the current event before sending or accepting trades.
            </p>
          )}

          {!counter && (
            <Btn
              secondary
              disabled={
                disabled ||
                !partner ||
                Number(cash) <= 0 ||
                !validAmount(cash, me.cash) ||
                !movable ||
                (game.players[game.turn].id === me.id && game.phase === "rent")
              }
              onClick={() => act({ type: "gift", to, amount: Number(cash) })}
            >
              Send {money(Number(cash) || 0)} as a gift
            </Btn>
          )}

          {onClose && (
            <Btn secondary onClick={onClose}>
              Close negotiation
            </Btn>
          )}

          <p className="micro-note">
            Sell all buildings in a district before trading its properties. Debt
            trades must return fair value. Offers expire when the turn ends.
          </p>
        </>
      )}
    </div>
  );
}

/**
 * Richup-style centered elevated glassmorphic modal popover for trade negotiations.
 * Positioned directly over the board with backdrop blur, 1-click close button, and Escape key dismissal.
 */
export function TradeModal({
  game,
  act,
  disabled,
  counter,
  clearCounter,
  initialPartnerId,
  onClose,
}) {
  const modalRef = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    modalRef.current?.focus({ preventScroll: true });

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
        return;
      }
      if (e.key === "Tab") {
        const items = modalRef.current?.querySelectorAll(
          'button:not(:disabled), [tabindex="0"], input:not(:disabled)',
        );
        if (!items?.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === modalRef.current)
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
  }, [onClose]);

  if (!game) return null;

  return (
    <div
      className="deed-popover-backdrop trade-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <section
        className="trade-card-popover trade-modal"
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-label="Trade negotiation"
        aria-modal="true"
      >
        <div className="trade-modal-header">
          <div className="trade-modal-title">
            <Handshake size={20} className="trade-modal-icon" aria-hidden="true" />
            <span className="trade-modal-tag">STREET DEAL</span>
            <h3 className="trade-modal-heading">Trade Negotiation</h3>
          </div>
          <button
            type="button"
            className="icon-button trade-close-btn"
            onClick={onClose}
            aria-label="Close trade negotiation"
          >
            <X size={18} />
          </button>
        </div>

        <div className="trade-modal-body">
          <VisualTrade
            game={game}
            act={act}
            disabled={disabled}
            counter={counter}
            clearCounter={clearCounter}
            initialPartnerId={initialPartnerId}
            onClose={onClose}
          />
        </div>
      </section>
    </div>
  );
}

export const ExchangePanel = VisualTrade;
export default VisualTrade;
