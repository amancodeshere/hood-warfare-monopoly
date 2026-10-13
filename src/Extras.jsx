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
export function SettingsPanel({ game, options, limit, save, close, disabled }) {
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
              value={draft.map}
              onChange={(e) => change("map", e.target.value)}
            >
              {MAPS.map((m) => (
                <option key={m.id} value={m.id}>
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
export function ExchangePanel({ game, act, disabled }) {
  const me = game.players.find((p) => p.id === game.me),
    board = game.board || BOARD;
  const [to, setTo] = useState(""),
    [give, setGive] = useState([]),
    [take, setTake] = useState([]),
    [cash, setCash] = useState("0"),
    [requestCash, setRequestCash] = useState("0"),
    [escapes, setEscapes] = useState("0"),
    [requestEscapes, setRequestEscapes] = useState("0");
  const partner = game.players.find((p) => p.id === to),
    mine = game.players[game.turn].id === game.me && !me?.out;
  if (!me || me.out)
    return (
      <p className="empty-copy">
        Trading is for active crews. You can keep watching the deals.
      </p>
    );
  const available = (id) =>
    board.filter(
      (t) =>
        game.props[t.id]?.owner === id &&
        !game.props[t.id]?.level &&
        (t.group === undefined ||
          !board.some((x) => x.group === t.group && game.props[x.id]?.level)),
    );
  const toggle = (id, list, set) =>
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const movable = mine && ["roll", "end", "rent", "buy"].includes(game.phase);
  return (
    <div className="exchange">
      <div className="turf-heading">
        <h2>Let’s make a deal.</h2>
        <p>
          Trade several blocks, cash, and escape cards in one offer. Send a
          rescue bag at any time outside special events.
        </p>
      </div>
      {game.trade?.from === me.id ? (
        <>
          <p className="waiting">Offer sent. Waiting for the other crew.</p>
          <Btn secondary onClick={() => act({ type: "trade-cancel" })}>
            Cancel offer
          </Btn>
        </>
      ) : (
        <>
          <label htmlFor="exchange-crew">
            Trade with
            <select
              id="exchange-crew"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setTake([]);
              }}
            >
              <option value="">Choose a crew</option>
              {game.players
                .filter((p) => p.id !== me.id && !p.out)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </label>
          <fieldset disabled={!movable || disabled} className="exchange-fields">
            <legend>Your offer</legend>
            {available(me.id).map((t) => (
              <label className="asset-check" key={t.id}>
                <input
                  type="checkbox"
                  checked={give.includes(t.id)}
                  onChange={() => toggle(t.id, give, setGive)}
                />
                <span>
                  {t.name}
                  {game.props[t.id].mortgaged ? " · mortgaged" : ""}
                </span>
              </label>
            ))}
            <div className="amount-fields">
              <label>
                Cash to give
                <input
                  type="number"
                  min={0}
                  max={me.cash}
                  value={cash}
                  onChange={(e) => setCash(e.target.value)}
                />
              </label>
              <label>
                Escape cards
                <input
                  type="number"
                  min={0}
                  max={me.escapes}
                  value={escapes}
                  onChange={(e) => setEscapes(e.target.value)}
                />
              </label>
            </div>
          </fieldset>
          <fieldset
            disabled={!movable || disabled || !partner}
            className="exchange-fields"
          >
            <legend>Their offer</legend>
            {available(to).map((t) => (
              <label className="asset-check" key={t.id}>
                <input
                  type="checkbox"
                  checked={take.includes(t.id)}
                  onChange={() => toggle(t.id, take, setTake)}
                />
                <span>
                  {t.name}
                  {game.props[t.id].mortgaged ? " · mortgaged" : ""}
                </span>
              </label>
            ))}
            <div className="amount-fields">
              <label>
                Cash to receive
                <input
                  type="number"
                  min={0}
                  max={partner?.cash || 0}
                  value={requestCash}
                  onChange={(e) => setRequestCash(e.target.value)}
                />
              </label>
              <label>
                Escape cards
                <input
                  type="number"
                  min={0}
                  max={partner?.escapes || 0}
                  value={requestEscapes}
                  onChange={(e) => setRequestEscapes(e.target.value)}
                />
              </label>
            </div>
          </fieldset>
          <Btn
            disabled={
              !movable ||
              disabled ||
              !to ||
              !!game.trade ||
              (!give.length &&
                !take.length &&
                !Number(cash) &&
                !Number(requestCash) &&
                !Number(escapes) &&
                !Number(requestEscapes))
            }
            onClick={() =>
              act({
                type: "trade",
                to,
                giveTiles: give,
                takeTiles: take,
                cash: Number(cash),
                requestCash: Number(requestCash),
                giveEscapes: Number(escapes),
                takeEscapes: Number(requestEscapes),
              })
            }
          >
            Send offer <Handshake size={18} />
          </Btn>
          <Btn
            secondary
            disabled={
              disabled ||
              !to ||
              Number(cash) <= 0 ||
              Number(cash) > me.cash ||
              [
                "rent",
                "duel",
                "duel-result",
                "auction",
                "stoppa-result",
              ].includes(game.phase)
            }
            onClick={() => act({ type: "gift", to, amount: Number(cash) })}
          >
            Send {money(Number(cash) || 0)} as a gift
          </Btn>
          <p className="micro-note">
            Only unbuilt districts can change hands. Debt trades must return
            fair value. Offers expire at the end of the turn.
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
    end.current?.scrollIntoView({ block: "nearest" });
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
        {!game.chat?.length && (
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
            disabled={disabled || busy}
            maxLength={280}
            placeholder={me ? "Say something…" : "Spectators can read chat"}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            disabled={disabled || busy || !text.trim()}
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
        A bid resets the 20-second clock. Cash moves only when the auction
        closes.
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
}) {
  const [tab, setTab] = useState("friends"),
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
                  Keep your password safe. This version has no email recovery.
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
              Pass Home Base for $200. With doubles enabled, roll again; three
              doubles in a row send you to County. Choose winner takes all
              (default), or a 10/20/30-round cap.
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
              Unaffordable player rent unlocks a 1v1 shootout: fire beats flank,
              flank beats guard, guard beats fire. First to two wins; five-round
              ties use a coin toss. Win wipes the rent. Lose eliminates your
              crew and transfers turf and cash. City debts cannot trigger a
              shootout.
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
