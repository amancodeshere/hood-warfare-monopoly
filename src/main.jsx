import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { io } from "socket.io-client";
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  X,
  Copy,
  Check,
  Crown,
  Diamond,
  Flame,
  Anchor,
  Dice5,
  Crosshair,
  Shield,
  KeyRound,
  Siren,
  CircleDollarSign,
  TrainFront,
  Car,
  Building2,
  HelpCircle,
  Volume2,
  VolumeX,
  Users,
  ChevronRight,
  LogOut,
  Clock3,
  Wifi,
  WifiOff,
  Circle,
  Handshake,
  Sparkles,
  Home,
  Landmark,
  Store,
  Menu,
  RotateCcw,
  Flag,
} from "lucide-react";
import {
  BOARD,
  CREWS,
  DISTRICTS,
  ROULETTE,
  money,
  coordinates,
} from "../shared/board.js";
import City from "./City.jsx";
import "@fontsource/barlow/latin-400.css";
import "@fontsource/barlow/latin-500.css";
import "@fontsource/barlow/latin-600.css";
import "@fontsource/barlow/latin-700.css";
import "@fontsource/barlow-condensed/latin-600.css";
import "@fontsource/barlow-condensed/latin-700.css";
import "@fontsource/barlow-condensed/latin-800.css";
import "./style.css";
const socket = io({ autoConnect: false });
const icons = {
  crown: Crown,
  diamond: Diamond,
  flame: Flame,
  anchor: Anchor,
  start: Home,
  jail: Landmark,
  card: Sparkles,
  roulette: CircleDollarSign,
  transit: TrainFront,
  tax: CircleDollarSign,
  parking: Car,
  raid: Siren,
  property: Store,
};
const stored = (k) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const persist = (k, v) => {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    /* Storage is optional. */
  }
};
const propertyValue = (g, p) =>
  p.cash +
  BOARD.filter((t) => g.props[t.id]?.owner === p.id).reduce(
    (v, t) =>
      v +
      (g.props[t.id].mortgaged ? t.price / 2 : t.price) +
      g.props[t.id].level * (t.build || 0),
    0,
  );
function Icon({ name, ...props }) {
  const I = icons[name] || Circle;
  return <I size={18} strokeWidth={1.7} {...props} />;
}
function CrewMark({ crew = 0, size = "normal" }) {
  return (
    <span
      className={`crew-mark ${size}`}
      style={{ "--crew": CREWS[crew].color }}
    >
      <Icon name={CREWS[crew].symbol} />
    </span>
  );
}
function Die({ value }) {
  const sets = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };
  return (
    <span className="die" aria-label={`Dice ${value}`}>
      {Array.from({ length: 9 }, (_, i) => (
        <i key={i} className={sets[value].includes(i) ? "dot" : ""} />
      ))}
    </span>
  );
}
function Button({ children, secondary = false, danger = false, ...props }) {
  return (
    <button
      className={`button ${secondary ? "secondary" : ""} ${danger ? "danger" : ""}`}
      {...props}
    >
      {children}
    </button>
  );
}
function Board({ game, selected, setSelected, rolling }) {
  const live = game?.status === "playing",
    current = game?.players[game.turn];
  return (
    <div className={`board-shell ${live ? "in-play" : ""}`}>
      <div className="board-grid">
        {BOARD.map((t) => {
          const pos = coordinates(t.id),
            q = game?.props[t.id],
            players =
              game?.players.filter((p) => !p.out && p.pos === t.id) || [],
            corner = t.id % 7 === 0;
          return (
            <button
              key={t.id}
              className={`tile ${corner ? "corner" : ""} ${selected === t.id ? "selected" : ""} ${q?.mortgaged ? "mortgaged" : ""} ${live && current?.pos === t.id ? "occupied" : ""}`}
              style={{
                gridRow: pos.row,
                gridColumn: pos.col,
                "--district":
                  t.group !== undefined ? DISTRICTS[t.group].color : "#77887c",
                "--owner": q
                  ? CREWS[game.players.find((p) => p.id === q.owner)?.crew || 0]
                      .color
                  : "transparent",
              }}
              onClick={() => setSelected(t.id)}
              aria-label={`${t.name}${t.price ? ", " + money(t.price) : ""}${q ? ", owned by " + game.players.find((p) => p.id === q.owner)?.name : ""}`}
            >
              {t.group !== undefined && (
                <div className="district-stripe">
                  {q?.level > 0 &&
                    Array.from({ length: q.level }, (_, i) => (
                      <Building2 key={i} size={10} />
                    ))}
                </div>
              )}
              {t.type !== "property" && (
                <Icon name={t.type} size={corner ? 24 : 19} />
              )}
              <span className="tile-name">{t.name}</span>
              <span className="tile-price">
                {t.price
                  ? money(t.price)
                  : t.type === "start"
                    ? "+$200"
                    : t.type === "tax"
                      ? "$100"
                      : t.type === "roulette"
                        ? "SPIN TO WIN"
                        : t.type === "card"
                          ? "TAKE A CHANCE"
                          : t.type === "jail"
                            ? "JUST VISITING"
                            : t.type === "raid"
                              ? "GO TO JAIL"
                              : "COMMUNITY POT"}
              </span>
              {q && <span className="owner-dot" />}
              {players.length > 0 && (
                <div className="tokens">
                  {players.map((p) => (
                    <span
                      className="token"
                      key={p.id}
                      style={{ "--crew": CREWS[p.crew].color }}
                      title={p.name}
                    >
                      <Icon name={CREWS[p.crew].symbol} size={12} />
                    </span>
                  ))}
                </div>
              )}
            </button>
          );
        })}
        <div className="board-center">
          <div className="center-top">
            <span className="center-stamp">
              <Crosshair size={13} /> TURF. LUCK. RESPECT.
            </span>
            {game && (
              <span className="round-tag">
                ROUND {Math.min(game.round, game.limit)} / {game.limit}
              </span>
            )}
          </div>
          <div className="brand-on-board">
            <span className="brand-line">SPIN THE</span>
            <span className="brand-big">
              BLOCK<span className="title-star">✳</span>
            </span>
            <span className="brand-sub">THE STREETS ARE YOURS. TAKE THEM.</span>
          </div>
          <City />
          <div className={`center-bottom ${rolling ? "rolling" : ""}`}>
            {game && game.status !== "lobby" ? (
              <>
                <div className="board-dice">
                  <Die value={game.dice[0]} />
                  <Die value={game.dice[1]} />
                </div>
                <p>
                  <span style={{ color: CREWS[current?.crew || 0].color }}>
                    {current?.name}
                  </span>
                  {game.status === "finished"
                    ? " · match complete"
                    : ` · ${BOARD[current?.pos || 0].name}`}
                </p>
              </>
            ) : (
              <>
                <div className="board-sign">
                  <span>28 BLOCKS</span>
                  <i />
                  <span>4 CREWS</span>
                  <i />
                  <span>ONE CITY</span>
                </div>
                <p>A property game with a street-side twist.</p>
              </>
            )}
          </div>
          <span className="board-coordinate coord-left">
            STB // CITY LIMITS
          </span>
          <span className="board-coordinate coord-right">EST. 2026</span>
        </div>
      </div>
    </div>
  );
}
function Rules({ close }) {
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
              2–4 crews start with $1,500. Roll two dice, move around 28 spaces,
              and collect $200 when you pass Home Base. Doubles move you
              normally; turns do not repeat.
            </p>
          </div>
        </article>
        <article>
          <Building2 />
          <div>
            <h3>Own your neighborhood</h3>
            <p>
              Buy vacant blocks or pass. Collect rent when rivals land on your
              turf. Complete a district to double its base rent, then build up
              to three businesses per block, evenly across the district.
            </p>
          </div>
        </article>
        <article>
          <Crosshair />
          <div>
            <h3>Can’t pay? Settle it.</h3>
            <p>
              Mortgage blocks for half their price or sell businesses for half
              their build cost. If you still cannot afford player rent,
              challenge the landlord. Fire beats flank. Flank beats guard. Guard
              beats fire. First to two wins; after five rounds, the high score
              wins and ties use a coin toss.
            </p>
            <p>
              Win: rent is wiped. Lose: you are eliminated and the landlord
              inherits your turf and cash. City debts cannot trigger a duel. You
              may also surrender when you cannot pay.
            </p>
          </div>
        </article>
        <article>
          <CircleDollarSign />
          <div>
            <h3>Spin the street wheel</h3>
            <p>
              Roulette spaces grant a free spin. Jackpot $900 (1/12), jail
              (2/12), payday $300 (3/12), escape card (2/12), bust −$150 (2/12),
              or big bag $500 (2/12). Street Luck draws one of eight equally
              likely cards. No real money.
            </p>
          </div>
        </article>
        <article>
          <KeyRound />
          <div>
            <h3>Stay out of trouble</h3>
            <p>
              Jail lasts two of your turns. Pay $100 bail or use an escape card
              at the start of a turn. City taxes and fines go into the community
              pot; Free Parking collects it. Mortgaged properties collect no
              rent; redeem them for 55% of the purchase price.
            </p>
          </div>
        </article>
        <article>
          <Handshake />
          <div>
            <h3>Make a deal</h3>
            <p>
              Offer a block swap with an optional cash bonus on your turn,
              before rolling or after resolving a tile. Blocks with businesses
              cannot be traded. Offers expire when your turn ends.
            </p>
          </div>
        </article>
        <article>
          <Crown />
          <div>
            <h3>Be the last crew standing</h3>
            <p>
              Last crew standing wins. At the round limit, the highest net worth
              wins: cash + purchase value of turf + upgrade costs. Mortgaged
              turf counts at half value. Equal scores favor the earlier seat.
              Turns have a 90-second timer; duel tactics have 25 seconds. The
              server takes a safe default action on timeout.
            </p>
          </div>
        </article>
      </div>
      <Button onClick={close}>
        Let’s play <ArrowRight size={16} />
      </Button>
    </Modal>
  );
}
function Modal({ children, title, close, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.focus();
    function keys(e) {
      if (e.key === "Escape" && close) close();
      if (e.key === "Tab") {
        const items = ref.current?.querySelectorAll(
          'button:not(:disabled), input, select, [tabindex="0"]',
        );
        if (!items?.length) return;
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", keys);
    return () => {
      document.removeEventListener("keydown", keys);
      previous?.focus();
    };
  }, [close]);
  return (
    <div className="modal-backdrop">
      <section
        className={`modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={ref}
        tabIndex={-1}
      >
        <div className="modal-heading">
          <h2>{title}</h2>
          {close && (
            <button
              className="icon-button"
              onClick={close}
              aria-label="Close dialog"
            >
              <X size={20} />
            </button>
          )}
        </div>
        {children}
      </section>
    </div>
  );
}
function Roulette({ game, act, disabled }) {
  const result = game.phase === "roulette-result",
    index = game.pending?.roulette || 0;
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(false);
    const t = setTimeout(() => setReady(true), result ? 2600 : 0);
    return () => clearTimeout(t);
  }, [result, index]);
  const total = ROULETTE.reduce((s, x) => s + x.weight, 0);
  let cursor = 0;
  const ranges = ROULETTE.map((x) => {
    const from = (cursor / total) * 360;
    cursor += x.weight;
    return `${x.color} ${from}deg ${(cursor / total) * 360}deg`;
  });
  const before = ROULETTE.slice(0, index).reduce((s, x) => s + x.weight, 0);
  const angle =
    360 * 5 + 360 - ((before + ROULETTE[index].weight / 2) / total) * 360;
  const c = game.pending?.card;
  return (
    <Modal title="The street wheel">
      <div className="wheel-wrap">
        <div className="wheel-pointer" />
        <div
          className={`wheel ${result ? "spun" : ""}`}
          style={{
            background: `conic-gradient(${ranges.join(",")})`,
            transform: `rotate(${result ? angle : 0}deg)`,
          }}
        >
          {ROULETTE.map((x, i) => {
            const start = ROULETTE.slice(0, i).reduce(
              (s, y) => s + y.weight,
              0,
            );
            return (
              <span
                key={x.title}
                style={{
                  transform: `rotate(${((start + x.weight / 2) / total) * 360}deg)`,
                }}
              >
                <b>{x.title}</b>
              </span>
            );
          })}
          <div className="wheel-hub">
            <Crosshair size={30} />
          </div>
        </div>
      </div>
      <div className="roulette-caption">
        <h3>{result && ready ? c.title : "High risk. Big bag."}</h3>
        <p>
          {result && ready
            ? c.text
            : "One spin. Six outcomes. Let the streets decide."}
        </p>
      </div>
      {game.me === game.players[game.turn].id ? (
        <Button
          disabled={disabled || (result && !ready)}
          onClick={() => act({ type: result ? "collect" : "spin" })}
        >
          {result
            ? ready
              ? "Collect result"
              : "Wheel is spinning…"
            : "Spin the wheel"}
          <CircleDollarSign size={18} />
        </Button>
      ) : (
        <p className="waiting">Watching {game.players[game.turn].name} spin.</p>
      )}
      <p className="micro-note">
        Odds shown by segment size · In-game cash only
      </p>
    </Modal>
  );
}
function Duel({ game, act, disabled }) {
  const d = game.duel,
    a = game.players.find((p) => p.id === d.attacker),
    b = game.players.find((p) => p.id === d.defender),
    result = game.phase === "duel-result",
    playing = [d.attacker, d.defender].includes(game.me),
    locked = d.locked?.includes(game.me),
    last = d.history.at(-1);
  return (
    <Modal title={result ? "The score is settled." : "Rent due. Guns up."} wide>
      <div className="duel-tag">
        <Crosshair size={14} /> {money(d.debt)} ON THE LINE
      </div>
      <div className="duel-arena">
        <div className="duelist" style={{ "--crew": CREWS[a.crew].color }}>
          <CrewMark crew={a.crew} size="large" />
          <strong>{a.name}</strong>
          <span>CHALLENGER</span>
          <div className="score-pips">
            {[0, 1].map((i) => (
              <i key={i} className={d.scores[a.id] > i ? "won" : ""} />
            ))}
          </div>
        </div>
        <div className="duel-vs">
          <Crosshair size={48} />
          <b>VS</b>
        </div>
        <div className="duelist" style={{ "--crew": CREWS[b.crew].color }}>
          <CrewMark crew={b.crew} size="large" />
          <strong>{b.name}</strong>
          <span>LANDLORD</span>
          <div className="score-pips">
            {[0, 1].map((i) => (
              <i key={i} className={d.scores[b.id] > i ? "won" : ""} />
            ))}
          </div>
        </div>
        <div className="arena-street" />
      </div>
      {result ? (
        <div className="duel-result">
          <h3>{game.players.find((p) => p.id === d.winner)?.name} wins.</h3>
          <p>
            {d.winner === d.attacker
              ? "Debt wiped. Live to own another block."
              : "The landlord takes the cash and turf. The challenger is out."}
          </p>
          {game.me === a.id && !a.out ? (
            <Button onClick={() => act({ type: "end" })} disabled={disabled}>
              Back to the block <ArrowRight size={18} />
            </Button>
          ) : (
            <p className="waiting">Returning to the board…</p>
          )}
        </div>
      ) : (
        <>
          <p className="duel-instruction">
            Round {d.history.length + 1} · First to two points.
            {last && (
              <span>
                {" "}
                Last: {last.a} vs {last.b} →{" "}
                {last.winner
                  ? game.players.find((p) => p.id === last.winner)?.name +
                    " scores"
                  : "tie"}
                .
              </span>
            )}
          </p>
          <div className="tactics">
            {[
              {
                choice: "fire",
                name: "Fire",
                text: "Beats flank",
                Icon: Crosshair,
              },
              {
                choice: "flank",
                name: "Flank",
                text: "Beats guard",
                Icon: ArrowUpRight,
              },
              {
                choice: "guard",
                name: "Guard",
                text: "Beats fire",
                Icon: Shield,
              },
            ].map((t) => (
              <button
                key={t.choice}
                disabled={!playing || locked || disabled}
                onClick={() => act({ type: "duel-choice", choice: t.choice })}
              >
                <t.Icon size={30} />
                <b>{t.name}</b>
                <span>{t.text}</span>
              </button>
            ))}
          </div>
          <p className="waiting">
            {locked
              ? "Tactic locked. Waiting for your rival."
              : playing
                ? "Choose secretly. Both tactics reveal together."
                : "Watching the crews settle their score."}
          </p>
          <p className="micro-note">
            5-round cap · Tied final scores use a coin toss · Win wipes rent;
            lose forfeits your crew
          </p>
        </>
      )}
    </Modal>
  );
}
function App() {
  const [game, setGame] = useState(null),
    [connected, setConnected] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [rules, setRules] = useState(false),
    [selected, setSelected] = useState(null),
    [name, setName] = useState(stored("stb-name") || ""),
    [code, setCode] = useState(
      new URLSearchParams(location.search).get("room") || "",
    ),
    [tab, setTab] = useState("turn"),
    [limit, setLimit] = useState(20),
    [muted, setMuted] = useState(stored("stb-sound") !== "on"),
    [now, setNow] = useState(Date.now()),
    [rolling, setRolling] = useState(false),
    [showLog, setShowLog] = useState(false),
    [tradeTo, setTradeTo] = useState(""),
    [give, setGive] = useState(""),
    [take, setTake] = useState(""),
    [tradeCash, setTradeCash] = useState("0");
  const gameRef = useRef(null),
    audioRef = useRef(null),
    mutedRef = useRef(muted);
  mutedRef.current = muted;
  const notify = (text) => {
    setToast(text);
    setTimeout(() => setToast(""), 2500);
  };
  useEffect(() => {
    function connect() {
      setConnected(true);
      const token = stored("stb-seat");
      if (token)
        socket.timeout(8000).emit("resume", { token }, (err, r) => {
          if (err) {
            setError("Could not restore your seat. Reconnect to try again.");
            return;
          }
          if (r?.error) {
            persist("stb-seat", null);
            setGame(null);
            setError(r.error);
          }
        });
    }
    function disconnect() {
      setConnected(false);
    }
    function state(g) {
      const old = gameRef.current;
      if (old && JSON.stringify(old.dice) !== JSON.stringify(g.dice)) {
        setRolling(true);
        setTimeout(() => setRolling(false), 650);
      }
      if (!mutedRef.current && old && g.log[0]?.id !== old.log[0]?.id) {
        try {
          const ctx =
            audioRef.current || (audioRef.current = new window.AudioContext());
          const o = ctx.createOscillator(),
            gain = ctx.createGain();
          o.connect(gain);
          gain.connect(ctx.destination);
          o.frequency.value = g.players[g.turn]?.id === g.me ? 520 : 280;
          gain.gain.setValueAtTime(0.025, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
          o.start();
          o.stop(ctx.currentTime + 0.12);
        } catch {
          /* Audio is optional. */
        }
      }
      gameRef.current = g;
      setGame(g);
      setError("");
    }
    socket.on("connect", connect);
    socket.on("disconnect", disconnect);
    socket.on("state", state);
    socket.on("connect_error", disconnect);
    socket.connect();
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(timer);
      socket.off("connect", connect);
      socket.off("disconnect", disconnect);
      socket.off("state", state);
      socket.off("connect_error", disconnect);
      socket.disconnect();
    };
  }, []);
  function emit(event, data) {
    if (!connected) {
      setError("Connection lost. Wait for reconnect, then try again.");
      return Promise.resolve(null);
    }
    setPending(true);
    setError("");
    return new Promise((resolve) =>
      socket.timeout(8000).emit(event, data, (err, r) => {
        setPending(false);
        if (err) {
          setError("No response yet. Check your connection and try again.");
          resolve(null);
        } else if (r?.error) {
          setError(r.error);
          resolve(null);
        } else resolve(r);
      }),
    );
  }
  async function create(solo = false) {
    persist("stb-name", name || "You");
    const r = await emit("create", { name: name || "You", solo, limit });
    if (r) {
      persist("stb-seat", r.token);
      setCode(r.code);
      history.replaceState({}, "", `?room=${r.code}`);
      setSelected(null);
    }
  }
  async function join(e) {
    e.preventDefault();
    persist("stb-name", name || "You");
    const r = await emit("join", { name: name || "You", code });
    if (r) {
      persist("stb-seat", r.token);
      history.replaceState({}, "", `?room=${r.code}`);
      setSelected(null);
    }
  }
  async function leave() {
    const r = await emit("leave", {});
    if (r) {
      setGame(null);
      gameRef.current = null;
      persist("stb-seat", null);
      history.replaceState({}, "", "/");
      setSelected(null);
    }
  }
  const act = (a) => emit("action", a),
    lobby = (a) => emit("lobby", a);
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        `${location.origin}/?room=${game.code}`,
      );
      notify("Invite link copied. Send it to your crew.");
    } catch {
      notify(`Room code: ${game.code}`);
    }
  }
  const me = game?.players.find((p) => p.id === game.me),
    current = game?.players[game.turn],
    mine = me?.id === current?.id && !me?.out,
    disabled = pending || !connected,
    owned = game ? BOARD.filter((t) => game.props[t.id]?.owner === me?.id) : [],
    tradePartner = game?.players.find((p) => p.id === tradeTo),
    their = game
      ? BOARD.filter(
          (t) => game.props[t.id]?.owner === tradeTo && !game.props[t.id].level,
        )
      : [],
    winner = game?.players.find((p) => p.id === game.winner),
    time = game ? Math.max(0, Math.ceil((game.deadline - now) / 1000)) : 0;
  function propertyPanel(t) {
    const q = game?.props[t.id],
      owner = game?.players.find((p) => p.id === q?.owner),
      manage = mine && ["roll", "end", "rent", "buy"].includes(game.phase);
    const full =
      t.group !== undefined &&
      BOARD.filter((x) => x.group === t.group).every(
        (x) =>
          game?.props[x.id]?.owner === me?.id && !game.props[x.id]?.mortgaged,
      );
    return (
      <section
        className="property-detail"
        style={{
          "--district":
            t.group !== undefined ? DISTRICTS[t.group].color : "#92a392",
        }}
      >
        <div className="property-title">
          <h3>{t.name}</h3>
          <button
            className="icon-button"
            onClick={() => setSelected(null)}
            aria-label="Close property details"
          >
            <X size={17} />
          </button>
        </div>
        <p>
          {t.group !== undefined
            ? DISTRICTS[t.group].name
            : t.type === "transit"
              ? "City transit"
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
                          ? "Collect the community pot."
                          : "Pay $100 into the community pot."}
        </p>
        {t.price && (
          <>
            <div className="detail-stat">
              <span>Purchase</span>
              <b>{money(t.price)}</b>
            </div>
            <div className="detail-stat">
              <span>Base rent</span>
              <b>{money(t.rent)}</b>
            </div>
            {t.build && (
              <div className="detail-stat">
                <span>Build a business</span>
                <b>{money(t.build)}</b>
              </div>
            )}
            <div className="detail-stat">
              <span>Owner</span>
              <b>{owner?.name || "Unclaimed"}</b>
            </div>
            {q && (
              <div className="detail-stat">
                <span>Status</span>
                <b>
                  {q.mortgaged
                    ? "Mortgaged"
                    : q.level
                      ? `${q.level} businesses`
                      : "Street level"}
                </b>
              </div>
            )}
            {owner?.id === me?.id && (
              <div className="property-actions">
                {t.type === "property" && (
                  <Button
                    secondary
                    disabled={
                      !manage ||
                      !full ||
                      q.level >= 3 ||
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
          </>
        )}
      </section>
    );
  }
  function turnPanel() {
    if (!mine)
      return (
        <div className="turn-wait">
          <CrewMark crew={current.crew} size="large" />
          <h2>{current.name}’s move.</h2>
          <p>
            {me?.out
              ? "Your crew is out. Stay to watch the block change hands."
              : `They’re ${game.phase === "duel" ? "settling a score" : game.phase === "roll" ? "getting ready to roll" : "at " + BOARD[current.pos].name}. Your seat is next in line.`}
          </p>
          <div className="waiting-dots">
            <i />
            <i />
            <i />
          </div>
        </div>
      );
    const t = BOARD[current.pos];
    switch (game.phase) {
      case "roll":
        return (
          <>
            <div className="turn-hero">
              <Dice5 size={38} />
              <h2>
                Make your
                <br />
                next move.
              </h2>
              <p>
                The block is waiting. Roll the dice and see where the streets
                take you.
              </p>
            </div>
            <div className="dice-large">
              <Die value={game.dice[0]} />
              <Die value={game.dice[1]} />
            </div>
            <Button disabled={disabled} onClick={() => act({ type: "roll" })}>
              Roll the dice <Dice5 size={20} />
            </Button>
            <p className="micro-note">Pass Home Base → collect $200</p>
          </>
        );
      case "buy":
        return (
          <>
            <div className="turn-hero">
              <Icon name={t.type} size={36} />
              <h2>{t.name}</h2>
              <p>
                This block is open. Make it yours and collect rent from rival
                crews.
              </p>
            </div>
            <div className="purchase-price">
              {money(t.price)}
              <span>PURCHASE PRICE</span>
            </div>
            <Button
              disabled={disabled || me.cash < t.price}
              onClick={() => act({ type: "buy" })}
            >
              Claim this block <Plus size={18} />
            </Button>
            <Button
              secondary
              disabled={disabled}
              onClick={() => act({ type: "skip" })}
            >
              Pass on this block
            </Button>
            {me.cash < t.price && (
              <p className="micro-note">
                Short on cash? Open My turf to mortgage a block.
              </p>
            )}
          </>
        );
      case "rent": {
        const d = game.pending,
          owner = game.players.find((p) => p.id === d.owner),
          short = me.cash < d.amount;
        return (
          <>
            <div className="turn-hero">
              <CircleDollarSign size={36} />
              <h2>
                {short ? "Rent’s due. Cash is short." : "Pay your respects."}
              </h2>
              <p>
                {owner
                  ? `${owner.name} owns ${t.name}.`
                  : "The city has a bill with your name on it."}{" "}
                {short
                  ? "Raise cash from your turf or put it all on the line."
                  : "Pay the rent to keep moving."}
              </p>
            </div>
            <div className="purchase-price">
              {money(d.amount)}
              <span>
                {short ? `${money(d.amount - me.cash)} SHORT` : "RENT DUE"}
              </span>
            </div>
            <Button
              disabled={disabled || short}
              onClick={() => act({ type: "pay" })}
            >
              Pay {money(d.amount)} <ArrowRight size={18} />
            </Button>
            {short && owner && (
              <Button
                danger
                disabled={disabled}
                onClick={() => act({ type: "shootout" })}
              >
                Challenge to a shootout <Crosshair size={18} />
              </Button>
            )}
            {short && (
              <>
                <Button secondary onClick={() => setTab("turf")}>
                  Raise cash from turf <Building2 size={17} />
                </Button>
                <p className="risk-note">
                  {owner
                    ? "Win: debt wiped. Lose: crew eliminated."
                    : "City debt can only be paid or surrendered."}
                </p>
                <button
                  className="text-button danger-text"
                  disabled={disabled}
                  onClick={() => act({ type: "surrender" })}
                >
                  Surrender cash & turf
                </button>
              </>
            )}
          </>
        );
      }
      case "card":
        return (
          <>
            <div className={`street-card ${game.pending.card.tone}`}>
              <Sparkles size={38} />
              <span>STREET LUCK</span>
              <h2>{game.pending.card.title}</h2>
              <p>{game.pending.card.text}</p>
              <span className="card-seal">
                <Crosshair size={25} />
              </span>
            </div>
            <Button disabled={disabled} onClick={() => act({ type: "card" })}>
              Play this card <ArrowRight size={18} />
            </Button>
          </>
        );
      case "jail":
        return (
          <>
            <div className="turn-hero">
              <Landmark size={38} />
              <h2>
                Cooling off
                <br />
                in County.
              </h2>
              <p>
                {me.jail} jail turn{me.jail === 1 ? "" : "s"} left. Post bail,
                use an escape card, or sit this one out.
              </p>
            </div>
            <Button
              disabled={disabled || me.cash < 100}
              onClick={() => act({ type: "jail-pay" })}
            >
              Post bail · $100 <KeyRound size={18} />
            </Button>
            <Button
              secondary
              disabled={disabled || !me.escapes}
              onClick={() => act({ type: "jail-card" })}
            >
              Use escape card ({me.escapes})
            </Button>
            <Button
              secondary
              disabled={disabled}
              onClick={() => act({ type: "jail-wait" })}
            >
              Serve a turn
            </Button>
          </>
        );
      case "end":
        return (
          <>
            <div className="turn-hero">
              <Flag size={36} />
              <h2>
                That’s your
                <br />
                block, handled.
              </h2>
              <p>
                Build up your turf, make a trade, or pass the dice to the next
                crew.
              </p>
            </div>
            <div className="turn-summary">
              <span>YOUR CASH</span>
              <strong>{money(me.cash)}</strong>
              <span>{owned.length} blocks in your pocket</span>
            </div>
            <Button disabled={disabled} onClick={() => act({ type: "end" })}>
              End your turn <ArrowRight size={18} />
            </Button>
          </>
        );
      default:
        return (
          <div className="turn-hero">
            <Crosshair size={38} />
            <h2>
              Big moves
              <br />
              in progress.
            </h2>
            <p>Resolve the event to get back to the block.</p>
          </div>
        );
    }
  }
  return (
    <>
      <header className="topbar">
        <a
          className="wordmark"
          href="/"
          onClick={(e) => {
            if (game) {
              e.preventDefault();
              setRules(true);
            }
          }}
        >
          <span className="logo-icon">
            <Crosshair size={22} />
          </span>
          <span>
            SPIN THE BLOCK<small>HOOD WARFARE MONOPOLY</small>
          </span>
        </a>
        <nav>
          <span className="nav-active">Game table</span>
          <button onClick={() => setRules(true)}>
            How to play <ArrowUpRight size={13} />
          </button>
        </nav>
        <div className="top-actions">
          <span className={`connection ${connected ? "" : "offline"}`}>
            {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
            <span>{connected ? "CONNECTED" : "RECONNECTING"}</span>
          </span>
          <button
            className="icon-button"
            title={muted ? "Enable sound" : "Mute sound"}
            aria-label={muted ? "Enable sound" : "Mute sound"}
            onClick={() => {
              setMuted(!muted);
              persist("stb-sound", muted ? "on" : "off");
              if (muted) {
                audioRef.current =
                  audioRef.current || new window.AudioContext();
                audioRef.current.resume();
              }
            }}
          >
            {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
          </button>
        </div>
      </header>
      {!connected && (
        <div className="connection-banner" role="status">
          Reconnecting to the streets… Your seat is saved.{" "}
          <button onClick={() => socket.connect()}>Reconnect</button>
        </div>
      )}
      <main className="game-layout">
        <aside className="crew-sidebar">
          <div className="section-heading">
            <h2>Your competition</h2>
            <span>{game ? game.players.length : 4} / 4</span>
          </div>
          <div className="crew-list">
            {(
              game?.players ||
              CREWS.map((c, i) => ({
                id: i,
                name: [
                  "Your crew",
                  "Eastside crew",
                  "Sunset crew",
                  "Harbor crew",
                ][i],
                crew: i,
                cash: 1500,
                preview: true,
              }))
            ).map((p) => (
              <article
                key={p.id}
                className={`crew-row ${p.out ? "eliminated" : ""} ${game?.status === "playing" && current.id === p.id ? "active" : ""}`}
                style={{ "--crew": CREWS[p.crew].color }}
              >
                <div className="crew-main">
                  <CrewMark crew={p.crew} />
                  <div>
                    <h3>
                      {p.name}
                      {p.id === game?.me && <span>YOU</span>}
                    </h3>
                    <small>{CREWS[p.crew].name}</small>
                  </div>
                  {p.bot ? (
                    <span className="bot-tag">BOT</span>
                  ) : (
                    !p.preview && (
                      <i
                        className={`presence ${p.connected ? "online" : ""}`}
                        title={p.connected ? "Connected" : "Seat reserved"}
                      />
                    )
                  )}
                </div>
                <div className="crew-balance">
                  <strong>{p.out ? "OUT" : money(p.cash)}</strong>
                  <span>
                    {game
                      ? BOARD.filter((t) => game.props[t.id]?.owner === p.id)
                          .length
                      : 0}{" "}
                    blocks{p.jail > 0 ? " · jailed" : ""}
                  </span>
                </div>
                {game?.status === "lobby" && game.host === game.me && p.bot && (
                  <button
                    className="remove-bot"
                    onClick={() => lobby({ type: "remove-bot", id: p.id })}
                    aria-label={`Remove ${p.name}`}
                  >
                    <X size={12} />
                  </button>
                )}
              </article>
            ))}
          </div>
          {game?.status === "lobby" && game.players.length < 4 && (
            <button
              className="add-seat"
              disabled={game.host !== game.me || disabled}
              onClick={() => lobby({ type: "add-bot" })}
            >
              <Plus size={16} /> Add a bot to the crew
            </button>
          )}
          <div className="district-key">
            <h3>THE NEIGHBORHOODS</h3>
            {DISTRICTS.map((d) => (
              <div key={d.name}>
                <i style={{ background: d.color }} />
                <span>{d.name}</span>
              </div>
            ))}
          </div>
          <div className="sidebar-tip">
            <Crosshair size={21} />
            <p>
              Can’t make rent?
              <br />
              <strong>Make it a shootout.</strong>
            </p>
          </div>
          <button
            className="activity-toggle"
            onClick={() => setShowLog(!showLog)}
          >
            <Menu size={16} /> {showLog ? "Hide" : "Show"} street activity
          </button>
        </aside>
        <section className="table-area">
          <div className="table-heading">
            <div>
              <span className="status-dot" />{" "}
              {game
                ? game.status === "lobby"
                  ? "CREW ASSEMBLING"
                  : game.status === "finished"
                    ? "MATCH COMPLETE"
                    : "LIVE ON THE BLOCK"
                : "THE CITY IS OPEN"}
            </div>
            {game ? (
              <button className="room-code" onClick={copy}>
                ROOM {game.code} <Copy size={13} />
              </button>
            ) : (
              <span>PRIVATE ROOMS · PLAY WITH FRIENDS</span>
            )}
          </div>
          <Board
            game={game}
            selected={selected}
            setSelected={setSelected}
            rolling={rolling}
          />
          <div className="table-footer">
            <span>
              <Shield size={14} />{" "}
              {game?.status === "playing"
                ? `Community pot: ${money(game.pot)}`
                : "Original crews. No real-money stakes."}
            </span>
            <button onClick={() => setRules(true)}>
              <HelpCircle size={14} /> House rules
            </button>
          </div>
          {showLog && (
            <section className="activity-log" aria-label="Street activity">
              <div className="section-heading">
                <h2>On the streets</h2>
                <button
                  className="icon-button"
                  onClick={() => setShowLog(false)}
                  aria-label="Close activity"
                >
                  <X size={17} />
                </button>
              </div>
              {game?.log.length ? (
                game.log.map((l) => (
                  <p key={l.id} className={l.kind}>
                    <span>
                      {new Date(l.time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {l.text}
                  </p>
                ))
              ) : (
                <p>Make your first move. The street story starts here.</p>
              )}
            </section>
          )}
        </section>
        <aside className="action-sidebar">
          {!game ? (
            <>
              <div className="welcome">
                <h1>
                  Own the streets.
                  <br />
                  <em>Settle the score.</em>
                </h1>
                <p>
                  Claim blocks. Collect rent. Risk it all.
                  <br />
                  Your crew’s next game night starts here.
                </p>
              </div>
              <label className="input-label" htmlFor="crew-name">
                YOUR STREET NAME
              </label>
              <input
                id="crew-name"
                placeholder="What do they call you?"
                value={name}
                maxLength={20}
                onChange={(e) => setName(e.target.value)}
              />
              <div className="match-select">
                <label htmlFor="match-length">Match length</label>
                <select
                  id="match-length"
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                >
                  <option value={10}>Quick · 10 rounds</option>
                  <option value={20}>Classic · 20 rounds</option>
                  <option value={30}>Marathon · 30 rounds</option>
                </select>
              </div>
              <Button disabled={disabled} onClick={() => create()}>
                Create a private room <ArrowUpRight size={20} />
              </Button>
              <div className="join-divider">
                <span>ALREADY GOT A CREW?</span>
              </div>
              <form onSubmit={join}>
                <label className="input-label" htmlFor="room-code">
                  ROOM CODE
                </label>
                <div className="join-row">
                  <input
                    id="room-code"
                    placeholder="6-digit code"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                  />
                  <button
                    disabled={disabled || code.length !== 6}
                    aria-label="Join room"
                    type="submit"
                  >
                    <ArrowRight size={20} />
                  </button>
                </div>
              </form>
              <button
                className="solo-button"
                disabled={disabled}
                onClick={() => create(true)}
              >
                Practice against bots <ChevronRight size={15} />
              </button>
              <div className="feature-note">
                <Users size={18} />
                <span>
                  2–4 players · Private invite links
                  <br />
                  Bots fill the empty seats
                </span>
              </div>
            </>
          ) : game.status === "lobby" ? (
            <>
              <div className="welcome">
                <h1>
                  Get the
                  <br />
                  <em>crew together.</em>
                </h1>
                <p>
                  Your city is ready. Share the link, fill the seats, and take
                  over.
                </p>
              </div>
              <button className="invite-box" onClick={copy}>
                <span>YOUR PRIVATE ROOM</span>
                <strong>{game.code}</strong>
                <span>
                  <Copy size={14} /> Copy invite link
                </span>
              </button>
              <div className="lobby-seats">
                {[0, 1, 2, 3].map((i) => (
                  <div className={game.players[i] ? "filled" : ""} key={i}>
                    {game.players[i] ? (
                      <CrewMark crew={i} />
                    ) : (
                      <Plus size={18} />
                    )}
                  </div>
                ))}
              </div>
              <p className="lobby-count">
                {game.players.length} crew{game.players.length === 1 ? "" : "s"}{" "}
                on the block · {4 - game.players.length} open seat
                {game.players.length === 3 ? "" : "s"}
              </p>
              <div className="match-select">
                <label htmlFor="room-length">Match length</label>
                <select
                  id="room-length"
                  disabled={game.host !== game.me}
                  value={game.limit}
                  onChange={(e) =>
                    lobby({ type: "settings", limit: Number(e.target.value) })
                  }
                >
                  <option value={10}>Quick · 10 rounds</option>
                  <option value={20}>Classic · 20 rounds</option>
                  <option value={30}>Marathon · 30 rounds</option>
                </select>
              </div>
              {game.host === game.me ? (
                <>
                  <Button
                    disabled={disabled || game.players.length < 2}
                    onClick={() => lobby({ type: "start" })}
                  >
                    Start the takeover <Dice5 size={20} />
                  </Button>
                  {game.players.length < 4 && (
                    <Button
                      secondary
                      disabled={disabled}
                      onClick={() => lobby({ type: "add-bot" })}
                    >
                      <Plus size={18} /> Add a bot
                    </Button>
                  )}
                </>
              ) : (
                <p className="waiting">
                  Waiting for the host to start the match.
                </p>
              )}
              <p className="micro-note">
                {game.players.length < 2
                  ? "Add at least one friend or bot to start."
                  : "Everyone starts with $1,500. May the best crew win."}
              </p>
              <button
                className="text-button"
                onClick={leave}
                disabled={disabled}
              >
                <LogOut size={14} /> Leave room
              </button>
            </>
          ) : game.status === "finished" ? (
            <>
              <div className="winner-panel">
                <Crown size={52} />
                <h1>
                  {winner?.name}
                  <br />
                  owns the block.
                </h1>
                <p>{winner && CREWS[winner.crew].name} takes the city.</p>
              </div>
              <div className="final-scores">
                {[...game.players]
                  .sort(
                    (a, b) => propertyValue(game, b) - propertyValue(game, a),
                  )
                  .map((p, i) => (
                    <div key={p.id}>
                      <span>
                        {i + 1}. {p.name}
                      </span>
                      <b>{p.out ? "OUT" : money(propertyValue(game, p))}</b>
                    </div>
                  ))}
              </div>
              <p className="micro-note">
                Final ranking by net worth. Cash, turf, and businesses.
              </p>
              <Button disabled={disabled} onClick={leave}>
                Find your next block <RotateCcw size={18} />
              </Button>
            </>
          ) : (
            <>
              <div className="turn-heading">
                <span style={{ color: CREWS[current.crew].color }}>
                  {mine ? "YOUR TURN" : current.name.toUpperCase() + "’S TURN"}
                </span>
                <span>
                  <Clock3 size={13} /> {Math.floor(time / 60)}:
                  {String(time % 60).padStart(2, "0")}
                </span>
              </div>
              <div className="panel-tabs">
                {[
                  { id: "turn", label: "The move" },
                  { id: "turf", label: "My turf" },
                  { id: "trade", label: "Trade" },
                ].map((x) => (
                  <button
                    key={x.id}
                    className={tab === x.id ? "active" : ""}
                    onClick={() => setTab(x.id)}
                  >
                    {x.label}
                    {x.id === "turf" && <span>{owned.length}</span>}
                  </button>
                ))}
              </div>
              {game.trade?.to === game.me && (
                <div className="trade-inbox">
                  <Handshake size={20} />
                  <h3>
                    A deal from{" "}
                    {game.players.find((p) => p.id === game.trade.from)?.name}
                  </h3>
                  <p>
                    Get {BOARD[game.trade.give].name}
                    {game.trade.cash ? " + " + money(game.trade.cash) : ""}.
                    Give {BOARD[game.trade.take].name}.
                  </p>
                  <div>
                    <Button
                      disabled={disabled}
                      onClick={() =>
                        act({ type: "trade-respond", accept: true })
                      }
                    >
                      Accept
                    </Button>
                    <Button
                      secondary
                      disabled={disabled}
                      onClick={() =>
                        act({ type: "trade-respond", accept: false })
                      }
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              )}
              {tab === "turn" ? (
                turnPanel()
              ) : tab === "turf" ? (
                <>
                  <div className="turf-heading">
                    <h2>
                      Your corner
                      <br />
                      of the city.
                    </h2>
                    <p>
                      {owned.length
                        ? "Select a block to build, sell, or mortgage."
                        : "Claim your first block and start collecting rent."}
                    </p>
                  </div>
                  <div className="turf-list">
                    {owned.map((t) => (
                      <button
                        key={t.id}
                        className={selected === t.id ? "active" : ""}
                        onClick={() => setSelected(t.id)}
                      >
                        <i
                          style={{
                            background:
                              t.group === undefined
                                ? "#92a392"
                                : DISTRICTS[t.group].color,
                          }}
                        />
                        <span>
                          {t.name}
                          <small>
                            {game.props[t.id].mortgaged
                              ? "Mortgaged"
                              : game.props[t.id].level
                                ? `${game.props[t.id].level} businesses`
                                : "Street level"}
                          </small>
                        </span>
                        <ChevronRight size={15} />
                      </button>
                    ))}
                  </div>
                  {!owned.length && (
                    <Building2 className="empty-turf" size={68} />
                  )}
                  <p className="micro-note">
                    Your net worth: {money(propertyValue(game, me))}
                    <br />
                    Escape cards: {me.escapes}
                  </p>
                </>
              ) : (
                <>
                  <div className="turf-heading">
                    <h2>
                      Let’s make
                      <br />a deal.
                    </h2>
                    <p>
                      Swap blocks with a rival. Add a cash bonus to sweeten it.
                    </p>
                  </div>
                  {game.trade?.from === game.me ? (
                    <>
                      <p className="waiting">
                        Offer sent. Waiting for the other crew.
                      </p>
                      <Button
                        secondary
                        onClick={() => act({ type: "trade-cancel" })}
                      >
                        Cancel offer
                      </Button>
                    </>
                  ) : (
                    <>
                      <label className="input-label" htmlFor="trade-crew">
                        TRADE WITH
                      </label>
                      <select
                        id="trade-crew"
                        value={tradeTo}
                        onChange={(e) => {
                          setTradeTo(e.target.value);
                          setTake("");
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
                      <label className="input-label" htmlFor="trade-give">
                        YOUR BLOCK
                      </label>
                      <select
                        id="trade-give"
                        value={give}
                        onChange={(e) => setGive(e.target.value)}
                      >
                        <option value="">Choose a block</option>
                        {owned
                          .filter((t) => !game.props[t.id].level)
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                      </select>
                      <label className="input-label" htmlFor="trade-take">
                        THEIR BLOCK
                      </label>
                      <select
                        id="trade-take"
                        value={take}
                        onChange={(e) => setTake(e.target.value)}
                      >
                        <option value="">
                          {tradePartner
                            ? "Choose a block"
                            : "Choose a crew first"}
                        </option>
                        {their.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                      <label className="input-label" htmlFor="trade-cash">
                        ADD CASH
                      </label>
                      <input
                        id="trade-cash"
                        type="number"
                        min="0"
                        max={me.cash}
                        step="10"
                        value={tradeCash}
                        onChange={(e) => setTradeCash(e.target.value)}
                      />
                      <Button
                        disabled={
                          disabled ||
                          !mine ||
                          !["roll", "end"].includes(game.phase) ||
                          !tradeTo ||
                          !give ||
                          !take ||
                          !!game.trade ||
                          me.out
                        }
                        onClick={() =>
                          act({
                            type: "trade",
                            to: tradeTo,
                            give: Number(give),
                            take: Number(take),
                            cash: Number(tradeCash),
                          })
                        }
                      >
                        Send offer <Handshake size={18} />
                      </Button>
                      <p className="micro-note">
                        Trade on your turn, before your roll or after resolving
                        your tile. Offers expire when your turn ends.
                      </p>
                    </>
                  )}
                </>
              )}
            </>
          )}
          {error && (
            <div className="error-message" role="alert">
              {error}
              <button
                className="icon-button"
                onClick={() => setError("")}
                aria-label="Dismiss error"
              >
                <X size={14} />
              </button>
            </div>
          )}
          {selected !== null && propertyPanel(BOARD[selected])}
        </aside>
      </main>
      <footer className="page-footer">
        <span>
          SPIN THE BLOCK <b>© 2026</b>
        </span>
        <span>Claim the streets. Collect the rent. Settle the score.</span>
        <button onClick={() => setRules(true)}>
          Play fair. Play smart. <ArrowUpRight size={13} />
        </button>
      </footer>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
      {rules && <Rules close={() => setRules(false)} />}
      {game?.status === "playing" &&
        ["roulette", "roulette-result"].includes(game.phase) && (
          <Roulette game={game} act={act} disabled={disabled} />
        )}
      {game?.status === "playing" &&
        ["duel", "duel-result"].includes(game.phase) && (
          <Duel game={game} act={act} disabled={disabled} />
        )}
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);
