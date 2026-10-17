import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { Handshake, X } from "lucide-react";
import { BOARD, money, DISTRICTS } from "../../shared/board.js";
import { DISTRICTS as LEGACY_DISTRICTS } from "../../shared/legacy-board.js";
import { ArrowLeft, ArrowLeftRight, Send } from "lucide-react";
import "./TradeOverlay.css";
import {
  getDistrictColor,
  stepCash,
  calculateTradeValues,
} from "../../shared/trading.js";

const Btn = ({ secondary = false, className = "", children, ...props }) => (
  <button className={`button ${secondary ? "secondary" : ""} ${className}`} {...props}>
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
    [step, setStep] = useState(counter || initialPartnerId ? "compose" : "choose"),
    [give, setGive] = useState(counter?.takeTiles || []),
    [take, setTake] = useState(counter?.giveTiles || []),
    [cash, setCash] = useState(String(counter?.requestCash || 0)),
    [requestCash, setRequestCash] = useState(String(counter?.cash || 0)),
    [escapes, setEscapes] = useState(String(counter?.takeEscapes || 0)),
    [requestEscapes, setRequestEscapes] = useState(String(counter?.giveEscapes || 0)),
    [submitError, setSubmitError] = useState(""),
    [sent, setSent] = useState(false);
  const partner = game.players.find((p) => p.id === to);
  const stepFocusRef = useRef(null);
  useEffect(() => {
    stepFocusRef.current?.focus({ preventScroll: true });
  }, [step]);
  useEffect(() => {
    setEscapes((value) => Number(value) > (me?.escapes || 0) ? String(me?.escapes || 0) : value);
  }, [me?.escapes]);
  useEffect(() => {
    setRequestEscapes((value) => Number(value) > (partner?.escapes || 0) ? String(partner?.escapes || 0) : value);
  }, [partner?.escapes]);

  const activeRivals = game.players.filter((p) => p.id !== game.me && !p.out && !p.preview);
  const choosePartner = (id) => {
    setTo(id);
    setGive([]);
    setTake([]);
    setCash("0");
    setRequestCash("0");
    setEscapes("0");
    setRequestEscapes("0");
    setSubmitError("");
    setSent(false);
    setStep("compose");
  };
  const setBoundedAmount = (value, max, setter) => {
    if (value === "") return setter("");
    const amount = Number(value);
    if (Number.isFinite(amount)) setter(String(Math.min(max, Math.max(0, Math.trunc(amount)))));
  };
  const backToChooser = () => {
    setTo("");
    setGive([]);
    setTake([]);
    setCash("0");
    setRequestCash("0");
    setEscapes("0");
    setRequestEscapes("0");
    setSubmitError("");
    setSent(false);
    clearCounter?.();
    setStep("choose");
  };

  const available = (t, id) =>
    game.props[t.id]?.owner === id &&
    !game.props[t.id]?.level &&
    (t.group === undefined ||
      !board.some((x) => x.group === t.group && game.props[x.id]?.level));

  const toggle = (id, list, set) =>
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const movable = ["roll", "end", "rent", "buy"].includes(game.phase);
  const draft = {
    from: me?.id,
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
    me && !me.out &&
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

  if (!me || me.out) return <p className="trade-overlay-message">Trading is available to active crews.</p>;
  if (game.trade?.from === me.id && !counter) {
    const recipient = game.players.find((p) => p.id === game.trade.to);
    return <div className="trade-pending-view"><p role="status">Offer sent to {recipient?.name || "your rival"}. Waiting for an answer.</p><TradeSummary game={game} offer={game.trade} /><Btn secondary disabled={disabled} onClick={() => act({ type: "trade-cancel", offerId: game.trade.id })}>Withdraw offer</Btn></div>;
  }
  if (step === "choose") return (
    <div className="trade-chooser">
      <h3 ref={stepFocusRef} tabIndex={-1}>Create a trade</h3>
      <p>Select an active player to trade with:</p>
      {counter && <p className="trade-overlay-notice">The offer changed or expired. Choose a player to start a fresh trade.</p>}
      {activeRivals.length ? activeRivals.map((p) => <button type="button" key={p.id} className="trade-rival-choice" aria-label={`Trade with ${p.name}`} onClick={() => choosePartner(p.id)}><span className="trade-rival-mark" aria-hidden="true">{p.name.slice(0, 1).toUpperCase()}</span><span>{p.name}</span><small>{money(p.cash)}</small></button>) : <p className="trade-overlay-message">No active rivals are available to trade.</p>}
    </div>
  );
  return (
      <div className="exchange trade-composer">
        <div className="trade-composer-content">
          {counter && <p className="trade-overlay-notice" role="status">{stale ? "This offer was replaced or expired. Start a fresh deal." : "Counteroffer draft · the original offer stays open until you send this."}</p>}
          <div className="trade-composer-title"><button ref={stepFocusRef} type="button" className="trade-back-btn" onClick={backToChooser} aria-label="Choose a different player"><ArrowLeft size={17}/><span>Change player</span></button><h3>{counter ? "Counteroffer" : "Create a trade"}</h3></div>
          <div className="trade-columns">
            <div className="trade-column trade-column-give">
              <div className="trade-column-header">
                <div className="trade-column-title-row">
                  <span className="trade-column-badge give-badge">{me.name}</span>
                  <span className="trade-column-cash-pill">
                    {money(me.cash)} available
                  </span>
                </div>
                <p className="trade-column-sub">What you offer</p>
              </div>

              <fieldset
                disabled={!movable || disabled || stale}
                className="exchange-fields"
              >
                <legend>You give · {money(me.cash)} available</legend>
                <div className="amount-fields">
                  <div className="amount-input-wrap trade-cash-control">
                    <label>
                      Cash to give
                      <input
                        aria-label="Cash to give"
                        type="number"
                        min={0}
                        max={me.cash}
                        step={1}
                        value={cash}
                        onChange={(e) => setBoundedAmount(e.target.value, me.cash, setCash)}
                      />
                    </label>
                    <input className="trade-cash-slider" aria-label="Cash to give slider" type="range" min="0" max={me.cash} step="1" value={Math.min(me.cash, Math.max(0, Number(cash) || 0))} disabled={!movable || disabled || stale} onChange={(e) => setCash(e.target.value)} />
                  </div>
                </div>
                {renderPropertyChips(me.id, give, setGive)}
                {me.escapes > 0 && <div className="amount-input-wrap trade-escape-control"><label>Escape cards to give<input type="number" aria-label="Escape cards to give" min={0} max={me.escapes} step={1} value={escapes} onChange={(e) => setBoundedAmount(e.target.value, me.escapes, setEscapes)} /></label></div>}
              </fieldset>
            </div>

            <div className="trade-exchange-mark" aria-hidden="true"><ArrowLeftRight size={20} /></div>

            <div className="trade-column trade-column-take">
              <div className="trade-column-header">
                <div className="trade-column-title-row">
                  <span className="trade-column-badge take-badge">{partner?.name || "Choose a player"}</span>
                  <span className="trade-column-cash-pill">
                    {partner
                      ? `${money(partner.cash)} available`
                      : "No crew selected"}
                  </span>
                </div>
                <p className="trade-column-sub">What you receive</p>
              </div>

              <fieldset
                disabled={!movable || disabled || !partner || stale}
                className="exchange-fields"
              >
                <legend>
                  You receive
                  {partner ? ` · ${money(partner.cash)} available` : ""}
                </legend>
                <div className="amount-fields">
                  <div className="amount-input-wrap trade-cash-control">
                    <label>
                      Cash to receive
                      <input
                        aria-label="Cash to receive"
                        type="number"
                        min={0}
                        max={partner?.cash || 0}
                        step={1}
                        value={requestCash}
                        onChange={(e) => setBoundedAmount(e.target.value, partner?.cash || 0, setRequestCash)}
                      />
                    </label>
                    <input className="trade-cash-slider" aria-label="Cash to receive slider" type="range" min="0" max={partner?.cash || 0} step="1" value={Math.min(partner?.cash || 0, Math.max(0, Number(requestCash) || 0))} disabled={!movable || disabled || !partner || stale} onChange={(e) => setRequestCash(e.target.value)} />
                  </div>
                </div>
                {partner ? renderPropertyChips(to, take, setTake) : <p className="empty-copy">Choose a crew to see their properties.</p>}
                {!!partner?.escapes && <div className="amount-input-wrap trade-escape-control"><label>Escape cards to receive<input type="number" aria-label="Escape cards to receive" min={0} max={partner.escapes} step={1} value={requestEscapes} onChange={(e) => setBoundedAmount(e.target.value, partner.escapes, setRequestEscapes)} /></label></div>}
              </fieldset>
            </div>
          </div>

          {partner && (
            <details className="trade-review">
              <summary>Review deal value</summary>
              <div className="trade-review-content">
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

              <TradeSummary game={game} offer={draft} />
              </div>
            </details>
          )}
          {!valid && <p className="micro-note">Select an available asset and use whole amounts within each crew’s balance.</p>}

          {!movable && (
            <p className="panel-notice">
              Finish the current event before sending or accepting trades.
            </p>
          )}

          <p className="micro-note">
            Sell all buildings in a district before trading its properties. Debt
            trades must return fair value. Offers expire when the turn ends.
          </p>
        </div>

        <div className="trade-composer-footer">
          {submitError && <p className="trade-submit-error" role="alert">{submitError}</p>}
          {sent && <p className="trade-submit-success" role="status">Offer sent. Waiting for {partner?.name || "your rival"} to respond.</p>}
          <Btn
            className="trade-submit-button"
            disabled={
              !movable ||
              disabled ||
              !valid ||
              stale ||
              sent ||
              (!!game.trade && !counter)
            }
            onClick={async () => {
              setSubmitError("");
              const result = await act({
                  type: counter ? "trade-counter" : "trade",
                  ...draft,
                  offerId: counter?.id,
                });
              if (result && !result.error) {
                setSent(true);
                clearCounter();
                onClose?.();
              } else {
                setSubmitError(result?.error || "Trade could not be sent. Check the connection and try again.");
              }
            }}
          >
            {sent ? "Offer sent" : counter ? "Send counteroffer" : "Send offer"}{" "}
            <Send size={17} />
          </Btn>
        </div>
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

  const callbacks = useRef({ onClose });
  callbacks.current.onClose = onClose;
  useLayoutEffect(() => {
    const previous = document.activeElement;
    modalRef.current?.focus({ preventScroll: true });

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        callbacks.current.onClose?.();
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
        } else if (!modalRef.current?.contains(document.activeElement)) {
          e.preventDefault();
          (e.shiftKey ? last : first).focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previous?.focus();
    };
  }, []);

  if (!game) return null;

  return (
    <div
      className="trade-overlay-backdrop"
        onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <section
        className="trade-modal"
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-label="Trade negotiation"
        aria-modal="true"
      >
        <div className="trade-modal-header">
          <div className="trade-modal-title">
            <Handshake size={20} className="trade-modal-icon" aria-hidden="true" />
            <h3 className="trade-modal-heading">Trade negotiation</h3>
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
