import { MapPicker, Verification } from "./LoginMaps.jsx";
import React, { useState, useEffect, useRef } from "react";
import {
  Shield,
  Landmark,
  Dice5,
  Handshake,
  Users,
  ArrowRight,
  Check,
  Lock,
  Send,
  Crown,
  Diamond,
  Flame,
  Car,
  Sparkles,
} from "lucide-react";
import { Modal } from "./Modal.jsx";
import { DEFAULT_SETTINGS, RULE_OPTIONS } from "../shared/settings.js";
import { BOARD, MAPS, money, CREWS } from "../shared/board.js";
import { COSMETICS } from "../shared/cosmetics.js";
const Btn = ({ secondary = false, children, ...props }) => (
  <button className={`button ${secondary ? "secondary" : ""}`} {...props}>
    {children}
  </button>
);
function useRequest(emit) {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function request(event, data) {
    setBusy(true);
    setMessage("");
    const r = await emit(event, data, true);
    setBusy(false);
    if (!r || r.error) {
      setMessage(r?.error || "Connection lost. Try again.");
      return null;
    }
    return r;
  }
  return { request, message, busy, setMessage };
}
const Notice = ({ text }) =>
  text ? (
    <p className="panel-notice" role="status">
      {text}
    </p>
  ) : null;
const LenOptions = () => (
  <>
    <option value={0}>Winner takes all · Default</option>
    <option value={10}>Quick · 10 rounds</option>
    <option value={20}>Classic · 20 rounds</option>
    <option value={30}>Marathon · 30 rounds</option>
  </>
);
export function SettingsPanel({
  game,
  options,
  limit,
  save,
  close,
  disabled,
  profile,
  openStudio,
  openAccount,
}) {
  const [draft, setDraft] = useState({
      ...DEFAULT_SETTINGS,
      ...(game?.settings || options),
    }),
    [length, setLength] = useState(game?.limit || limit || 0);
  const editable = !game || (game.status === "lobby" && game.me === game.host),
    change = (key, value) => setDraft((s) => ({ ...s, [key]: value }));
  return (
    <Modal
      title={editable ? "Make the house rules" : "This room’s house rules"}
      close={close}
      wide
    >
      <p>
        Winner takes all keeps playing until one crew or team owns the city.
        Choose a round cap for a shorter game.
      </p>
      <MapPicker
        value={draft.map}
        onChange={(map) => change("map", map)}
        profile={profile}
        editable={editable && !disabled}
        openStudio={openStudio}
        openAccount={openAccount}
      />
      <fieldset disabled={!editable || disabled} className="settings-fields">
        <div className="settings-grid">
          <label>
            Seats
            <select
              value={draft.maxPlayers}
              onChange={(e) => change("maxPlayers", Number(e.target.value))}
            >
              {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>
                  {n} crews
                </option>
              ))}
            </select>
          </label>
          <label>
            Starting cash
            <select
              value={draft.startingCash}
              onChange={(e) => change("startingCash", Number(e.target.value))}
            >
              {[500, 1000, 1500, 2000, 2500, 3000].map((n) => (
                <option key={n} value={n}>
                  {money(n)}
                </option>
              ))}
            </select>
          </label>
          <label>
            City map
            <select
              aria-label="City map"
              value={draft.map}
              onChange={(e) => change("map", e.target.value)}
            >
              {game?.settings.map?.startsWith("custom:") &&
                !profile?.savedMaps?.some(
                  (m) => "custom:" + m.id === game.settings.map,
                ) && <option value={game.settings.map}>{game.mapName}</option>}
              {profile?.savedMaps?.map((m) => (
                <option key={m.id} value={"custom:" + m.id}>
                  {m.definition.name}
                </option>
              ))}
              {MAPS.map((m) => (
                <option
                  key={m.id}
                  value={m.id}
                  disabled={m.verified && !profile?.verified}
                >
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Room visibility
            <select
              value={draft.visibility}
              onChange={(e) => change("visibility", e.target.value)}
            >
              <option value="private">Private · invite code only</option>
              <option value="public">Public · listed for everyone</option>
            </select>
          </label>
          <label>
            Match length
            <select
              value={length}
              onChange={(e) => setLength(Number(e.target.value))}
            >
              <LenOptions />
            </select>
          </label>
          <label>
            Free thinking time
            <select
              value={draft.turnSeconds}
              onChange={(e) => change("turnSeconds", Number(e.target.value))}
            >
              {[60, 90, 120].map((n) => (
                <option key={n} value={n}>
                  {n} seconds + personal reserve
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="rule-switches">
          {RULE_OPTIONS.map(([key, title, description]) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={draft[key]}
                onChange={(e) => change(key, e.target.checked)}
              />
              <span>
                <strong>{title}</strong>
                <small>{description}</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {editable ? (
        <Btn disabled={disabled} onClick={() => save(draft, length)}>
          Save house rules <Check size={18} />
        </Btn>
      ) : (
        <p className="micro-note">
          The host sets rules before the game starts. These rules stay locked
          during play.
        </p>
      )}
    </Modal>
  );
}
export function RoomsPanel({ emit, enter, close, disabled }) {
  const [rooms, setRooms] = useState([]),
    [code, setCode] = useState(""),
    [leaderboard, setLeaderboard] = useState(null);
  const { request, message, busy } = useRequest(emit);
  const emitRef = useRef(emit);
  emitRef.current = emit;
  useEffect(() => {
    let live = true;
    emitRef.current("rooms", {}, true).then((r) => {
      if (live) setRooms(r?.rooms || []);
    });
    return () => {
      live = false;
    };
  }, []);
  return (
    <Modal title="Find your next crew" close={close} wide>
      <p>
        Jump into a public lobby, watch a match, or bring a private room code.
        Starting alone still works—bots fill the empty seats.
      </p>
      <div className="panel-actions">
        <Btn disabled={disabled} onClick={() => enter("", false, true)}>
          Quick play <ArrowRight size={18} />
        </Btn>
        <Btn
          secondary
          disabled={busy}
          onClick={async () => {
            const r = await request("rooms", {});
            if (r) setRooms(r.rooms);
          }}
        >
          Refresh rooms
        </Btn>
      </div>
      <div className="room-directory">
        {rooms.length ? (
          rooms.map((g) => (
            <div className="directory-row" key={g.code}>
              <div>
                <strong>{g.code}</strong>
                <small>
                  {g.players}/{g.maxPlayers} crews ·{" "}
                  {g.teams ? "Teams" : "Free for all"} ·{" "}
                  {g.limit ? `${g.limit} rounds` : "Winner takes all"}
                  {g.registeredOnly ? " · Accounts only" : ""}
                </small>
              </div>
              <button
                disabled={disabled}
                onClick={() => enter(g.code, g.status !== "lobby")}
              >
                {g.status === "lobby" ? "Join" : "Spectate"}{" "}
                <ArrowRight size={14} />
              </button>
            </div>
          ))
        ) : (
          <p className="empty-copy">
            No open public rooms yet. Quick play opens the first one.
          </p>
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          enter(code, true);
        }}
        className="spectate-form"
      >
        <label htmlFor="watch-code">Watch a room by code</label>
        <div className="join-row">
          <input
            id="watch-code"
            value={code}
            maxLength={6}
            placeholder="6-character code"
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <button
            disabled={disabled || code.length !== 6}
            aria-label="Spectate room"
          >
            <Users size={18} />
          </button>
        </div>
      </form>
      <button
        className="text-button"
        disabled={busy}
        onClick={async () => {
          const r = await request("leaderboard", {});
          if (r) setLeaderboard(r.players);
        }}
      >
        View the city leaderboard
      </button>
      {leaderboard && (
        <div className="standings">
          {leaderboard.length ? (
            leaderboard.map((p, i) => (
              <div key={p.id}>
                <span>
                  {i + 1}. {p.name}
                </span>
                <b>
                  {p.stats.wins} wins · {p.stats.games} games
                </b>
              </div>
            ))
          ) : (
            <p>
              Finish a match with at least two human profiles to enter the
              rankings.
            </p>
          )}
        </div>
      )}
      <Notice text={message} />
    </Modal>
  );
}
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
export function ExchangePanel({ game, act, disabled, counter, clearCounter }) {
  const me = game.players.find((p) => p.id === game.me),
    board = game.board || BOARD;
  const [to, setTo] = useState(counter?.from || ""),
    [give, setGive] = useState(counter?.takeTiles || []),
    [take, setTake] = useState(counter?.giveTiles || []),
    [cash, setCash] = useState(String(counter?.requestCash || 0)),
    [requestCash, setRequestCash] = useState(String(counter?.cash || 0)),
    [escapes, setEscapes] = useState(String(counter?.takeEscapes || 0)),
    [requestEscapes, setRequestEscapes] = useState(
      String(counter?.giveEscapes || 0),
    );
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
  const assets = (id, selected, set) => {
    const owned = board.filter((t) => game.props[t.id]?.owner === id);
    return owned.length ? (
      owned.map((t) => (
        <label className="asset-check" key={t.id}>
          <input
            type="checkbox"
            disabled={!available(t, id)}
            checked={selected.includes(t.id)}
            onChange={() => toggle(t.id, selected, set)}
          />
          <span>
            {t.name}
            <small>
              {money(t.price)} ·{" "}
              {game.props[t.id].mortgaged
                ? "Mortgaged; no rent"
                : "Base rent " + (t.rent ? money(t.rent) : "varies")}
              {!available(t, id) ? " · Sell district buildings first" : ""}
            </small>
          </span>
        </label>
      ))
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
          <fieldset
            disabled={!movable || disabled || stale}
            className="exchange-fields"
          >
            <legend>You give · {money(me.cash)} available</legend>
            {assets(me.id, give, setGive)}
            <div className="amount-fields">
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
          </fieldset>
          <fieldset
            disabled={!movable || disabled || !partner || stale}
            className="exchange-fields"
          >
            <legend>
              You receive{partner ? ` · ${money(partner.cash)} available` : ""}
            </legend>
            {partner ? (
              assets(to, take, setTake)
            ) : (
              <p className="empty-copy">
                Choose a crew to see their properties.
              </p>
            )}
            <div className="amount-fields">
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
          </fieldset>
          {partner && (
            <>
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
          <p className="micro-note">
            Sell all buildings in a district before trading its properties. Debt
            trades must return fair value. Offers expire when the turn ends.
          </p>
        </>
      )}
    </div>
  );
}
export function ChatPanel({ game, emit, disabled, onPlayer }) {
  const [text, setText] = useState(""),
    [team, setTeam] = useState(false);
  const { request, message, busy } = useRequest(emit);
  const end = useRef(null),
    me = game.players.find((p) => p.id === game.me);
  useEffect(() => {
    if (end.current?.parentElement)
      end.current.parentElement.scrollTop =
        end.current.parentElement.scrollHeight;
  }, [game.chat?.length]);
  return (
    <section className="chat-panel" aria-label="Room chat">
      <h2>Talk on the block.</h2>
      <div className="chat-channel">
        <button
          className={!team ? "active" : ""}
          onClick={() => setTeam(false)}
        >
          Everyone
        </button>
        {game.settings.teams && me?.team && (
          <button
            className={team ? "active" : ""}
            onClick={() => setTeam(true)}
          >
            <Lock size={12} />
            Team {me.team}
          </button>
        )}
      </div>
      <div className="chat-messages" role="log" aria-live="polite">
        {(game.chat || [])
          .filter((m) => (team ? m.team === String(me?.team) : !m.team))
          .map((m) => (
            <p key={m.id}>
              <button
                onClick={() => {
                  const p = game.players.find((p) => p.id === m.player);
                  if (p) onPlayer(p);
                }}
              >
                {m.name}
              </button>
              <span>{m.text}</span>
            </p>
          ))}
        {!(game.chat || []).some((m) =>
          team ? m.team === String(me?.team) : !m.team,
        ) && (
          <p className="empty-copy">
            Say hello, talk trades, or call your shot.
          </p>
        )}
        <span ref={end} />
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (await request("chat", { text, team })) setText("");
        }}
      >
        <label htmlFor="chat-message" className="sr-only">
          Chat message
        </label>
        <div className="join-row">
          <input
            id="chat-message"
            disabled={disabled || busy || !me}
            maxLength={280}
            placeholder={me ? "Say something…" : "Spectators can read chat"}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            disabled={disabled || busy || !me || !text.trim()}
            aria-label="Send chat message"
          >
            <Send size={18} />
          </button>
        </div>
      </form>
      <Notice text={message} />
    </section>
  );
}
export function Auction({ game, act, disabled, now }) {
  const a = game.auction,
    t = (game.board || BOARD)[a.tile],
    me = game.players.find((p) => p.id === game.me),
    [amount, setAmount] = useState(a.highBid + 10);
  const mine =
    me && !me.out && !a.passed.includes(me.id) && a.highBidder !== me.id;
  useEffect(() => setAmount(a.highBid + 10), [a.highBid]);
  return (
    <Modal title={`Who’s buying ${t.name}?`}>
      <div className="event-header">
        <Landmark size={36} />
        <p>
          Passed blocks go to the whole table. Bid at least $10 more, or pass
          for this auction.
        </p>
      </div>
      <div className="auction-price">
        <strong>{money(a.highBid)}</strong>
        <span>
          {a.highBidder
            ? `${game.players.find((p) => p.id === a.highBidder)?.name} leads`
            : "Opening bid: $10"}
        </span>
        <b>{Math.max(0, Math.ceil((game.deadline - now) / 1000))}s left</b>
      </div>
      <div className="auction-players">
        {game.players
          .filter((p) => !p.out)
          .map((p) => (
            <span key={p.id} className={a.highBidder === p.id ? "leading" : ""}>
              {p.name} ·{" "}
              {a.passed.includes(p.id)
                ? "passed"
                : a.highBidder === p.id
                  ? "high bid"
                  : "in"}
            </span>
          ))}
      </div>
      {mine ? (
        <>
          <label htmlFor="auction-bid">
            Your bid · {money(me.cash)} available
          </label>
          <input
            id="auction-bid"
            type="number"
            min={a.highBid + 10}
            max={me.cash}
            step={10}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
          <div className="panel-actions">
            <Btn
              disabled={disabled || amount < a.highBid + 10 || amount > me.cash}
              onClick={() => act({ type: "auction-bid", amount })}
            >
              Bid {money(amount)}
            </Btn>
            <Btn
              secondary
              disabled={disabled}
              onClick={() => act({ type: "auction-pass" })}
            >
              Pass
            </Btn>
          </div>
        </>
      ) : (
        <p className="waiting">
          {a.highBidder === me?.id
            ? "You hold the highest bid."
            : "Watch the table bid it out."}
        </p>
      )}
      <p className="micro-note">
        Bids accelerate the countdown (8s max, 5s grace). Cash moves only when
        the auction closes.
      </p>
    </Modal>
  );
}
export function Stoppa({ game, act, disabled }) {
  const result = game.phase === "stoppa-result",
    p = game.players[game.turn],
    mine = p.id === game.me,
    [settled, setSettled] = useState(false);
  useEffect(() => {
    setSettled(false);
    if (!result) return;
    const id = setTimeout(() => setSettled(true), 1800);
    return () => clearTimeout(id);
  }, [result]);
  const percent = game.pending?.percent || 1;
  return (
    <Modal title="Oppa Stoppa caught you lackin.">
      <div className="event-header">
        <Shield size={32} />
        <p>
          {p.name} spins a fair 1–10% of their cash into the Community Plot. The
          block gives back when someone lands there.
        </p>
      </div>
      <div
        className="stoppa-dial"
        aria-label={
          result
            ? `Oppa Stoppa spun ${percent} percent`
            : "Ten equally likely percentages"
        }
      >
        <div
          className={`stoppa-ring ${result ? "spun" : ""}`}
          style={{ "--spin": `${1080 + (11 - percent) * 36}deg` }}
        >
          {Array.from({ length: 10 }, (_, i) => (
            <span key={i} style={{ "--angle": `${i * 36}deg` }}>
              {i + 1}%
            </span>
          ))}
        </div>
        <span className="stoppa-pointer" />
        <strong>{result && settled ? `${percent}%` : "?"}</strong>
      </div>
      {result && settled ? (
        <div className="stoppa-result">
          <h3>{money(game.pending.amount)} to the Plot.</h3>
          <p>
            {percent}% of {money(game.pending.basis)}. Cash is rounded down.
          </p>
        </div>
      ) : (
        <p className="waiting">
          {result
            ? "Checking your pockets…"
            : "One spin. Ten possible outcomes."}
        </p>
      )}
      {mine ? (
        <Btn
          disabled={disabled || (result && !settled)}
          onClick={() =>
            act({ type: result ? "stoppa-collect" : "stoppa-spin" })
          }
        >
          {result ? "Pay the Stoppa" : "Spin the Stoppa"} <Shield size={18} />
        </Btn>
      ) : (
        <p className="micro-note">You’re watching {p.name}’s spin.</p>
      )}
    </Modal>
  );
}
const cosmeticIcons = {
  crown: Crown,
  diamond: Diamond,
  flame: Flame,
  car: Car,
  sparkles: Sparkles,
};
export function AccountPanel({
  profile,
  social,
  game,
  emit,
  disabled,
  close,
  authenticated,
  inviteJoin,
  signoutToken,
  openLogin,
  initialTab = "friends",
}) {
  const [tab, setTab] = useState(initialTab),
    [query, setQuery] = useState(""),
    [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [mode, setMode] = useState("register");
  const { request, message, busy, setMessage } = useRequest(emit);
  if (!profile)
    return (
      <Modal title="Your street profile" close={close}>
        <p>Connecting your profile…</p>
      </Modal>
    );
  const change = async (d) => {
    const r = await request("profile-change", d);
    if (r) setMessage("Saved.");
  };
  return (
    <Modal title={`${profile.name}’s street profile`} close={close} wide>
      <div className="profile-summary">
        <div>
          <strong>{profile.code}</strong>
          <small>
            Your friend code
            {profile.username ? ` · @${profile.username}` : " · Guest profile"}
          </small>
        </div>
        <span>{profile.respect} respect</span>
      </div>
      <div className="profile-stats">
        <span>
          <b>{profile.stats.wins}</b>Online wins
        </span>
        <span>
          <b>{profile.stats.games}</b>Online games
        </span>
        <span>
          <b>{profile.stats.karma}</b>Games completed
        </span>
        <span>
          <b>{profile.stats.practiceWins}</b>Practice wins
        </span>
      </div>
      <div className="panel-tabs">
        {["friends", "looks", "history", "account"].map((x) => (
          <button
            className={tab === x ? "active" : ""}
            key={x}
            onClick={() => setTab(x)}
          >
            {x[0].toUpperCase() + x.slice(1)}
          </button>
        ))}
      </div>
      {tab === "friends" ? (
        <>
          <form
            className="friend-search"
            onSubmit={(e) => {
              e.preventDefault();
              change({ type: "friend-request", to: query });
            }}
          >
            <label htmlFor="friend-code">Add by friend code or username</label>
            <div className="join-row">
              <input
                id="friend-code"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Friend code or @username"
              />
              <button
                disabled={busy || !query.trim()}
                aria-label="Send friend request"
              >
                <Users size={18} />
              </button>
            </div>
          </form>
          {social.incoming.map((p) => (
            <div className="directory-row" key={p.id}>
              <span>{p.name} wants to be friends</span>
              <button
                disabled={busy}
                onClick={() => change({ type: "friend-accept", to: p.id })}
              >
                Accept
              </button>
              <button
                disabled={busy}
                onClick={() =>
                  change({ type: "friend-accept", to: p.id, accept: false })
                }
              >
                Decline
              </button>
            </div>
          ))}
          <div className="friend-list">
            {social.friends.length ? (
              social.friends.map((p) => (
                <div className="directory-row" key={p.id}>
                  <div>
                    <strong>{p.name}</strong>
                    <small>
                      {p.online ? "On the streets now" : "Offline"} ·{" "}
                      {p.stats.wins} wins
                    </small>
                  </div>
                  <button
                    disabled={busy || game?.status !== "lobby"}
                    onClick={() =>
                      change({ type: "invite", to: p.id, code: game.code })
                    }
                  >
                    Invite
                  </button>
                  <button
                    disabled={busy}
                    aria-label={`Remove friend ${p.name}`}
                    onClick={() => change({ type: "friend-remove", to: p.id })}
                  >
                    Remove
                  </button>
                </div>
              ))
            ) : (
              <p className="empty-copy">
                Your crew starts here. Share your friend code and accept a
                request.
              </p>
            )}
          </div>
          {social.outgoing.map((p) => (
            <p className="micro-note" key={p.id}>
              Request pending: {p.name}
            </p>
          ))}
          {(profile.invites || [])
            .filter((x) => Date.now() - x.time < 3600000)
            .map((i) => (
              <div className="directory-row" key={i.id}>
                <span>
                  {i.name} invited you to {i.code}
                </span>
                <button disabled={!!game} onClick={() => inviteJoin(i.code)}>
                  Use invite
                </button>
                <button
                  onClick={() => change({ type: "dismiss-invite", id: i.id })}
                >
                  Dismiss
                </button>
              </div>
            ))}
          {!!profile.blocks?.length && (
            <details>
              <summary>Blocked players ({profile.blocks.length})</summary>
              {profile.blocks.map((id) => (
                <div className="directory-row" key={id}>
                  <span>Blocked profile · {id.slice(0, 8)}</span>
                  <button
                    onClick={() =>
                      change({ type: "block", to: id, blocked: false })
                    }
                  >
                    Unblock
                  </button>
                </div>
              ))}
            </details>
          )}
          {!!profile.muted?.length && (
            <details>
              <summary>Muted players ({profile.muted.length})</summary>
              {profile.muted.map((id) => (
                <div className="directory-row" key={id}>
                  <span>Muted profile · {id.slice(0, 8)}</span>
                  <button
                    onClick={() =>
                      change({ type: "mute", to: id, muted: false })
                    }
                  >
                    Unmute
                  </button>
                </div>
              ))}
            </details>
          )}
        </>
      ) : tab === "looks" ? (
        <>
          <p>
            Complete games to earn respect. Unlock appearances without spending
            it. Online wins earn 10, other online finishes 3; solo wins earn 2,
            other solo finishes 1.
          </p>
          <div className="cosmetic-list">
            {COSMETICS.map((c) => {
              const I = cosmeticIcons[c.icon] || Users;
              return (
                <button
                  key={c.id}
                  className={profile.appearance === c.id ? "equipped" : ""}
                  disabled={disabled || busy || profile.respect < c.cost}
                  onClick={() => change({ type: "equip", id: c.id })}
                >
                  <I style={{ color: c.color || CREWS[0].color }} size={28} />
                  <span>
                    {c.name}
                    <small>
                      {profile.appearance === c.id
                        ? "Equipped"
                        : c.cost
                          ? `${c.cost} respect to unlock`
                          : "Free"}
                    </small>
                  </span>
                  {profile.respect < c.cost ? (
                    <Lock size={16} />
                  ) : profile.appearance === c.id ? (
                    <Check size={16} />
                  ) : (
                    <ArrowRight size={16} />
                  )}
                </button>
              );
            })}
          </div>
        </>
      ) : tab === "history" ? (
        <div className="history-list">
          {profile.history.length ? (
            profile.history.map((h, i) => (
              <details key={h.time + ":" + i}>
                <summary>
                  {h.won ? "Won the block" : "Crew finished"} · {h.code}
                  <small>
                    {new Date(h.time).toLocaleDateString()} · {h.rounds} rounds
                    · {h.public ? "Public" : "Private"}
                  </small>
                </summary>
                <p>
                  {h.limit ? `${h.limit}-round cap` : "Winner takes all"} ·{" "}
                  {h.settings.teams ? "Teams" : "Free for all"} · {h.map}
                </p>
                {h.players.map((p, j) => (
                  <div className="directory-row" key={j}>
                    <span>
                      {p.name}
                      {p.bot ? " · BOT" : ""}
                    </span>
                    <b>{p.out ? "OUT" : money(p.worth)}</b>
                  </div>
                ))}
              </details>
            ))
          ) : (
            <p className="empty-copy">
              Finish your first game to write your street history. Private games
              stay visible to their participants.
            </p>
          )}
        </div>
      ) : (
        <>
          <p>
            {profile.registered
              ? `You’re signed in as @${profile.username}.`
              : "Your guest profile is saved in this browser. Register to bring your friends, looks, and history to another device."}
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const r = await request("profile-change", {
                type: "rename",
                name: query,
              });
              if (r) setMessage("Street name saved.");
            }}
          >
            <label htmlFor="profile-name">Street name</label>
            <input
              id="profile-name"
              maxLength={20}
              placeholder={profile.name}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Btn secondary disabled={busy || !query.trim()}>
              Save name
            </Btn>
          </form>
          {profile.registered && <Verification profile={profile} emit={emit} />}
          {!profile.registered && (
            <Btn secondary disabled={!!game} onClick={openLogin}>
              Open login page
            </Btn>
          )}
          {profile.registered && (
            <Btn
              secondary
              disabled={busy || !!game}
              onClick={async () => {
                const r = await request("profile-logout", {
                  token: signoutToken,
                });
                if (r) {
                  authenticated(r);
                  setMessage(
                    "Signed out. This browser now has a new guest profile.",
                  );
                }
              }}
            >
              Sign out
            </Btn>
          )}
          {!profile.registered && (
            <>
              <div className="chat-channel">
                <button
                  className={mode === "register" ? "active" : ""}
                  onClick={() => setMode("register")}
                >
                  Register
                </button>
                <button
                  className={mode === "login" ? "active" : ""}
                  onClick={() => setMode("login")}
                >
                  Sign in
                </button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const r = await request("profile-" + mode, {
                    username,
                    password,
                  });
                  if (r) {
                    authenticated(r);
                    setPassword("");
                    setMessage("Your profile is saved.");
                  }
                }}
              >
                <label htmlFor="account-user">Username</label>
                <input
                  id="account-user"
                  autoComplete="username"
                  minLength={3}
                  maxLength={20}
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value.replace(/^@/, ""))
                  }
                />
                <label htmlFor="account-pass">
                  Password · at least 12 characters
                </label>
                <input
                  id="account-pass"
                  autoComplete={
                    mode === "register" ? "new-password" : "current-password"
                  }
                  type="password"
                  minLength={mode === "register" ? 12 : 1}
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Btn disabled={busy || !!game || !username || !password}>
                  {mode === "register" ? "Create your account" : "Sign in"}
                </Btn>
                {game && (
                  <p className="micro-note">
                    Leave your table to register or sign in.
                  </p>
                )}
                <p className="micro-note">
                  Verify your email after creating an account to unlock more
                  maps. Keep your password safe; email verification does not
                  reset it.
                </p>
              </form>
            </>
          )}
        </>
      )}
      <Notice text={message} />
    </Modal>
  );
}
export function PlayerPanel({
  player,
  profile,
  emit,
  disabled,
  close,
  notify,
}) {
  const { request, message, busy, setMessage } = useRequest(emit),
    [publicProfile, setPublicProfile] = useState(null),
    [reason, setReason] = useState("");
  const emitRef = useRef(emit);
  emitRef.current = emit;
  useEffect(() => {
    let live = true;
    if (player.profileId)
      emitRef
        .current("profile-find", { query: player.profileId }, true)
        .then((r) => {
          if (live) setPublicProfile(r?.profile);
        });
    return () => {
      live = false;
    };
  }, [player.profileId]);
  const change = async (d) => {
    if (await request("profile-change", { ...d, to: player.profileId })) {
      setMessage("Saved.");
      notify("Player preference saved.");
    }
  };
  return (
    <Modal title={`${player.name} on the block`} close={close}>
      <p>
        {publicProfile
          ? `${publicProfile.stats.wins} online wins · ${publicProfile.stats.games} games · ${publicProfile.respect} respect`
          : "Loading their street profile…"}
      </p>
      {player.profileId && player.profileId !== profile?.id && (
        <>
          <div className="panel-actions">
            <Btn
              secondary
              disabled={busy || disabled}
              onClick={() => change({ type: "friend-request" })}
            >
              Add friend
            </Btn>
            <Btn
              secondary
              disabled={busy || disabled}
              onClick={() =>
                change({
                  type: "mute",
                  muted: !profile?.muted?.includes(player.profileId),
                })
              }
            >
              {profile?.muted?.includes(player.profileId)
                ? "Unmute"
                : "Mute chat"}
            </Btn>
            <Btn
              secondary
              disabled={busy || disabled}
              onClick={() =>
                change({
                  type: "block",
                  blocked: !profile?.blocks?.includes(player.profileId),
                })
              }
            >
              {profile?.blocks?.includes(player.profileId)
                ? "Unblock"
                : "Block player"}
            </Btn>
          </div>
          <p className="micro-note">
            Blocking prevents future matching and hides their chat. Muting only
            hides chat.
          </p>
          <details>
            <summary>Report this player</summary>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (await request("report", { id: player.id, reason }))
                  setMessage(
                    "Report saved with this room. Mute or block to hide their chat immediately.",
                  );
              }}
            >
              <label htmlFor="report-reason">Describe the issue</label>
              <textarea
                id="report-reason"
                minLength={5}
                maxLength={300}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <Btn secondary disabled={busy || reason.trim().length < 5}>
                Save report
              </Btn>
            </form>
          </details>
        </>
      )}
      <h3>Public game history</h3>
      {publicProfile?.history.length ? (
        publicProfile.history.map((h, i) => (
          <p key={i}>
            {h.won ? "Won" : "Finished"} · {h.code} · {h.rounds} rounds
          </p>
        ))
      ) : (
        <p className="empty-copy">No public games yet.</p>
      )}
      <Notice text={message} />
    </Modal>
  );
}
export function ExpandedRules({ close, game }) {
  const legacy = game?.schemaVersion === 1;
  return (
    <Modal title="Know the block" close={close}>
      <p className="rules-intro">
        Build an empire. Play the odds. Settle the score.
      </p>
      <div className="rules-list">
        <article>
          <Dice5 />
          <div>
            <h3>Make your move</h3>
            <p>
              {legacy
                ? "This saved match uses the original 28-square board."
                : "2–8 crews move around 40 squares. Fill spare seats with bots or play solo against 1–7 bots."}{" "}
              Totals 2–12 each have a 1-in-11 chance. The dice show a randomly
              selected pair for that total. Pass Home Base for $200. With
              doubles enabled, roll again; three doubles in a row send you to
              County. Choose winner takes all (default), or a 10/20/30-round
              cap.
            </p>
          </div>
        </article>
        <article>
          <Landmark />
          <div>
            <h3>Buy, bid, and build</h3>
            <p>
              Buy unclaimed blocks or let everyone bid when auctions are on.
              Full districts double base rent when enabled. Build evenly to{" "}
              {legacy ? "three businesses" : "four houses and a hotel"}.
              Mortgage for half price; redeem for 55%. Utilities charge 4× dice,
              or 10× with both plugs. Four transit lines charge
              $25/$50/$100/$200.
            </p>
          </div>
        </article>
        <article>
          <Shield />
          <div>
            <h3>Oppa Stoppa & Community Plot</h3>
            <p>
              Three Oppa Stoppa spaces spin ten equally likely outcomes: 1–10%
              of your cash, rounded down, goes into the Community Plot. Taxes
              and fines feed it too. Landing on the Plot collects the pot when
              payouts are on.
            </p>
          </div>
        </article>
        <article>
          <Crown />
          <div>
            <h3>Can’t pay? Settle it.</h3>
            <p>
              Sell businesses, mortgage turf, trade, or ask for a rescue gift.
              Unaffordable player rent unlocks a first-person alley duel. Aim,
              fire, dodge, duck, and reload a six-shot magazine. Body hits deal
              25 damage; headshots deal 40. At 30 seconds, higher health wins;
              an exact tie protects the landlord. Ready within 25 seconds or
              concede. Win wipes rent; lose eliminates your crew and transfers
              cash and turf to a living teammate, otherwise the landlord. City
              debts cannot trigger a shootout.
            </p>
          </div>
        </article>
        <article>
          <Sparkles />
          <div>
            <h3>Spin the street wheel</h3>
            <p>
              Roulette grants jackpot $900 (1/12), jail (2/12), payday $300
              (3/12), escape card (2/12), bust −$150 (2/12), or big bag $500
              (2/12). Street Luck has eight equally likely cards. Bail costs
              $100, or roll doubles, use an escape card, or serve two turns.
            </p>
          </div>
        </article>
        <article>
          <Users />
          <div>
            <h3>Your crew, your city</h3>
            <p>
              Teams pay no allied rent and combine district, transit, and
              utility sets. Living teammates inherit an eliminated ally’s
              empire. Team chat stays private. Trade multiple properties, cash,
              and escape cards. Public lobbies, spectating, friends,
              invitations, and saved history keep game night moving.
            </p>
          </div>
        </article>
        <article>
          <Handshake />
          <div>
            <h3>Keep the game moving</h3>
            <p>
              Turns have free thinking time and a personal reserve that grows
              after manual turns. Debt adds 90 seconds; another crew can add a
              minute once per turn. Timeouts resolve basic actions. Two
              timed-out turns eliminate an idle crew. The server pauses when all
              humans disconnect; reconnect in the same browser to reclaim your
              seat.
            </p>
          </div>
        </article>
      </div>
      <p className="micro-note">
        Room settings override optional rules. All currency is in-game. Last
        surviving crew or team wins; a round cap ranks by net worth.
      </p>
      <Btn onClick={close}>
        Let’s play <ArrowRight size={18} />
      </Btn>
    </Modal>
  );
}
