import FPSDuel from "./FPSDuel.jsx";
import { HoodFigure, StreetBuilding } from "./StreetPieces.jsx";
import { EntryPage, MapStudio } from "./LoginMaps.jsx";
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
  BOARD as DEFAULT_BOARD,
  CREWS,
  DISTRICTS,
  ROULETTE,
  money,
  coordinates,
} from "../shared/board.js";
import { DISTRICTS as LEGACY_DISTRICTS } from "../shared/legacy-board.js";
import { Modal } from "./Modal.jsx";
import {
  SettingsPanel,
  RoomsPanel,
  ExchangePanel,
  TradeSummary,
  ChatPanel,
  AccountPanel,
  Auction,
  Stoppa,
  ExpandedRules,
  PlayerPanel,
} from "./Extras.jsx";
import { DEFAULT_SETTINGS } from "../shared/settings.js";
import { COSMETICS } from "../shared/cosmetics.js";
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
  stoppa: Shield,
  utility: Sparkles,
  key: KeyRound,
  crosshair: Crosshair,
  car: Car,
  sparkles: Sparkles,
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
  (g.board || DEFAULT_BOARD)
    .filter((t) => g.props[t.id]?.owner === p.id)
    .reduce(
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
function CrewMark({ crew = 0, size = "normal", appearance }) {
  const item = COSMETICS.find((x) => x.id === appearance);
  return (
    <span
      className={`crew-mark ${size}`}
      style={{ "--crew": item?.color || CREWS[crew].color }}
    >
      <Icon name={item?.icon || CREWS[crew].symbol} />
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
function Board({ game, selected, setSelected, rolling, highlight }) {
  const BOARD = game?.board || DEFAULT_BOARD,
    size = BOARD.length / 4 + 1,
    districts =
      game?.schemaVersion === 1
        ? LEGACY_DISTRICTS
        : game?.districts || DISTRICTS;
  const [walking, setWalking] = useState(null),
    lastMove = useRef(game?.lastMove?.id);
  useEffect(() => {
    const m = game?.lastMove;
    if (!m || lastMove.current === m.id) return;
    lastMove.current = m.id;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let step = 0;
    setWalking({ id: m.player, pos: m.from });
    const timer = setInterval(() => {
      step++;
      if (step >= m.steps) {
        setWalking(null);
        clearInterval(timer);
      } else setWalking({ id: m.player, pos: (m.from + step) % BOARD.length });
    }, 45);
    return () => {
      clearInterval(timer);
      setWalking(null);
    };
  }, [game?.lastMove, BOARD.length]);
  const live = game?.status === "playing",
    current = game?.players[game.turn];
  return (
    <div className={`board-shell ${live ? "in-play" : ""}`}>
      <div className="board-grid" style={{ "--board-size": size }}>
        {BOARD.map((t) => {
          const pos = coordinates(t.id, BOARD.length),
            q = game?.props[t.id],
            owner = game?.players.find((p) => p.id === q?.owner),
            players =
              game?.players.filter(
                (p) =>
                  !p.out &&
                  (walking?.id === p.id ? walking.pos : p.pos) === t.id,
              ) || [],
            corner = t.id % (BOARD.length / 4) === 0;
          const tokenPlayers = players
            .slice()
            .sort(
              (a, b) => Number(b.id === game?.me) - Number(a.id === game?.me),
            );
          return (
            <button
              key={t.id}
              className={`tile ${corner ? "corner" : ""} ${selected === t.id ? "selected" : ""} ${q ? "owned" : ""} ${q?.level ? "built" : ""} ${q?.mortgaged ? "mortgaged" : ""} ${q?.owner === highlight ? "highlighted" : ""} ${live && current?.pos === t.id ? "occupied" : ""}`}
              style={{
                gridRow: pos.row,
                gridColumn: pos.col,
                "--district":
                  t.group !== undefined ? districts[t.group].color : "#77887c",
                "--owner": q
                  ? CREWS[game.players.find((p) => p.id === q.owner)?.crew || 0]
                      .color
                  : "transparent",
              }}
              onClick={() => setSelected(t.id)}
              aria-label={`${t.name}${t.price ? ", " + money(t.price) : ""}${t.type === "parking" ? ", community balance " + money(game?.pot || 0) : ""}${q ? ", owned by " + game.players.find((p) => p.id === q.owner)?.name : ""}`}
            >
              {t.group !== undefined && <div className="district-stripe"></div>}
              {q?.level > 0 && (
                <span
                  className="building-pieces"
                  title={q.level === 5 ? "Hotel" : `${q.level} houses`}
                  aria-label={q.level === 5 ? "Hotel" : `${q.level} houses`}
                >
                  <StreetBuilding hotel={q.level === 5} />
                  <b>{q.level === 5 ? "HOTEL" : `×${q.level}`}</b>
                </span>
              )}
              {t.type !== "property" && (
                <Icon name={t.type} size={corner ? 24 : 19} />
              )}
              <span className="tile-name">{t.name}</span>
              {t.type === "parking" && (
                <span className="community-balance">
                  {money(game?.pot || 0)}
                </span>
              )}
              {t.type !== "parking" && (
                <span className="tile-price">
                  {t.price
                    ? money(t.price)
                    : t.type === "start"
                      ? "+$200"
                      : t.type === "tax"
                        ? "$100"
                        : t.type === "roulette"
                          ? "SPIN TO WIN"
                          : t.type === "stoppa"
                            ? "LOSE 1–10%"
                            : t.type === "card"
                              ? "TAKE A CHANCE"
                              : t.type === "jail"
                                ? "JUST VISITING"
                                : t.type === "raid"
                                  ? "GO TO JAIL"
                                  : "COMMUNITY POT"}
                </span>
              )}
              {q && (
                <span
                  className="owner-badge"
                  title={`Owned by ${owner?.name}${q.mortgaged ? " · mortgaged" : ""}`}
                >
                  <span>
                    {q.mortgaged
                      ? "MORTGAGED"
                      : owner?.id === game.me
                        ? "YOU OWN"
                        : "OWNED"}
                  </span>
                  <b>{owner?.name}</b>
                </span>
              )}
              {players.length > 0 && (
                <div
                  className={`tokens ${players.length > 4 ? "crowded" : ""}`}
                  aria-label={tokenPlayers.map((p) => p.name).join(", ")}
                >
                  {tokenPlayers.map((p) => (
                    <span
                      className="token"
                      key={p.id}
                      style={{
                        "--crew":
                          COSMETICS.find((x) => x.id === p.appearance)?.color ||
                          CREWS[p.crew].color,
                      }}
                      title={p.name}
                    >
                      <HoodFigure
                        color={
                          COSMETICS.find((x) => x.id === p.appearance)?.color ||
                          CREWS[p.crew].color
                        }
                        variant={p.crew}
                      />
                      {p.appearance && p.appearance !== "crew" && (
                        <span className="token-emblem">
                          <Icon
                            name={
                              COSMETICS.find((x) => x.id === p.appearance)?.icon
                            }
                            size={10}
                          />
                        </span>
                      )}
                    </span>
                  ))}
                  {players.length > 1 && (
                    <span
                      className="token-stack-count"
                      title={tokenPlayers
                        .slice(1)
                        .map((p) => p.name)
                        .join(", ")}
                    >
                      +{players.length - 1}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
        <div
          className="board-center"
          style={{ gridColumn: `2/${size}`, gridRow: `2/${size}` }}
        >
          <div className="center-top">
            <span className="center-stamp">
              <Crosshair size={13} /> TURF. LUCK. RESPECT.
            </span>
            {game && (
              <span className="round-tag">
                ROUND {game.round}
                {game.limit ? ` / ${game.limit}` : " · ALL IN"}
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
          <City
            palette={districts.map((d) => d.color)}
            theme={game?.mapTheme}
          />
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
                  <span>{BOARD.length} BLOCKS</span>
                  <i />
                  <span>2–8 CREWS</span>
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
  if (game.duel.mode === "fps")
    return <FPSDuel game={game} act={act} disabled={disabled} />;
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
  const [entry, setEntry] = useState(
      !stored("stb-entry") && !stored("stb-seat"),
    ),
    [studio, setStudio] = useState(false),
    [game, setGame] = useState(null),
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
    [counterOffer, setCounterOffer] = useState(null),
    [limit, setLimit] = useState(0),
    [muted, setMuted] = useState(stored("stb-sound") !== "on"),
    [now, setNow] = useState(Date.now()),
    [rolling, setRolling] = useState(false),
    [showLog, setShowLog] = useState(false),
    [options, setOptions] = useState({ ...DEFAULT_SETTINGS }),
    [soloBots, setSoloBots] = useState(3),
    [settingsOpen, setSettingsOpen] = useState(false),
    [roomsOpen, setRoomsOpen] = useState(false),
    [accountOpen, setAccountOpen] = useState(false),
    [accountTab, setAccountTab] = useState("friends"),
    [profile, setProfile] = useState(null),
    [social, setSocial] = useState({ friends: [], incoming: [], outgoing: [] }),
    [playerOpen, setPlayerOpen] = useState(null),
    [confirmForfeit, setConfirmForfeit] = useState(false),
    [highlight, setHighlight] = useState(null),
    [mapOverview, setMapOverview] = useState(false);
  useEffect(() => {
    if (
      game?.status === "playing" &&
      [
        "roulette",
        "roulette-result",
        "duel",
        "duel-result",
        "auction",
        "stoppa",
        "stoppa-result",
      ].includes(game.phase)
    ) {
      setRules(false);
      setSettingsOpen(false);
      setAccountOpen(false);
      setRoomsOpen(false);
      setPlayerOpen(null);
      setConfirmForfeit(false);
    }
  }, [game?.phase, game?.status]);
  const propertyFocus = useRef(null),
    chatFocus = useRef(null);
  useEffect(() => {
    if (selected !== null && window.innerWidth <= 720) {
      propertyFocus.current?.focus({ preventScroll: true });
      propertyFocus.current?.scrollIntoView({ block: "center" });
    }
  }, [selected]);
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
      socket
        .timeout(8000)
        .emit(
          "profile-auth",
          { token: stored("stb-profile"), name: stored("stb-name") },
          (err, r) => {
            if (!err && r?.token) {
              persist("stb-profile", r.token);
              setProfile(r.profile);
            }
          },
        );
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
    function arenaState(packet) {
      const g = gameRef.current;
      if (
        !g?.duel?.arena ||
        g.phase !== "duel" ||
        g.code !== packet.code ||
        g.duel.startsAt !== packet.startsAt
      )
        return;
      const next = {
        ...g,
        serverNow: packet.serverNow,
        duel: {
          ...g.duel,
          fighters: packet.fighters,
          projectiles: packet.projectiles,
          shots: packet.shots,
          tickAt: packet.tickAt,
        },
      };
      gameRef.current = next;
      setGame(next);
    }
    function profileState(r) {
      setProfile(r.profile);
      setSocial({
        friends: r.friends || [],
        incoming: r.incoming || [],
        outgoing: r.outgoing || [],
      });
    }
    function profileToken(r) {
      persist("stb-profile", r.token);
      setProfile(r.profile);
    }
    socket.on("profile", profileState);
    socket.on("profile-token", profileToken);
    socket.on("connect", connect);
    socket.on("disconnect", disconnect);
    socket.on("state", state);
    socket.on("arena-state", arenaState);
    socket.on("connect_error", disconnect);
    socket.connect();
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(timer);
      socket.off("profile", profileState);
      socket.off("profile-token", profileToken);
      socket.off("connect", connect);
      socket.off("disconnect", disconnect);
      socket.off("state", state);
      socket.off("arena-state", arenaState);
      socket.off("connect_error", disconnect);
      socket.disconnect();
    };
  }, []);
  function emit(event, data, report = false) {
    if (!connected) {
      setError("Connection lost. Wait for reconnect, then try again.");
      return Promise.resolve(
        report ? { error: "Connection lost. Wait for reconnect." } : null,
      );
    }
    const combat =
      event === "action" &&
      gameRef.current?.duel?.mode === "fps" &&
      data.type?.startsWith("duel-") &&
      data.type !== "duel-ready";
    if (combat && data.type === "duel-input") {
      socket.volatile.emit(event, data);
      return Promise.resolve();
    }
    if (!combat) setPending(true);
    setError("");
    return new Promise((resolve) =>
      socket.timeout(8000).emit(event, data, (err, r) => {
        if (!combat) setPending(false);
        if (err) {
          setError("No response yet. Check your connection and try again.");
          resolve(
            report
              ? { error: "No response yet. Check your connection." }
              : null,
          );
        } else if (r?.error) {
          if (!combat || gameRef.current?.phase === "duel") setError(r.error);
          resolve(report ? { error: r.error } : null);
        } else resolve(r);
      }),
    );
  }
  async function create(solo = false) {
    persist("stb-name", name || "You");
    const r = await emit("create", {
      name: name || profile?.name || "You",
      solo,
      limit,
      settings: solo ? { ...options, maxPlayers: soloBots + 1 } : options,
    });
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
      setTab("turn");
      setCounterOffer(null);
      setCode("");
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
  const BOARD = game?.board || DEFAULT_BOARD;
  const districts =
    game?.schemaVersion === 1 ? LEGACY_DISTRICTS : game?.districts || DISTRICTS;
  const me = game?.players.find((p) => p.id === game.me),
    current = game?.players[game.turn],
    mine = me?.id === current?.id && !me?.out,
    disabled = pending || !connected,
    owned = game ? BOARD.filter((t) => game.props[t.id]?.owner === me?.id) : [],
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
          (game?.props[x.id]?.owner === me?.id ||
            (game?.settings.teams &&
              me?.team != null &&
              game.players.find((p) => p.id === game.props[x.id]?.owner)
                ?.team === me.team)) &&
          !game.props[x.id]?.mortgaged,
      );
    return (
      <section
        className="property-detail"
        ref={propertyFocus}
        tabIndex={-1}
        role="region"
        aria-labelledby="property-heading"
        style={{
          "--district":
            t.group !== undefined ? districts[t.group].color : "#92a392",
        }}
      >
        <div className="property-title">
          <h3 id="property-heading">{t.name}</h3>
          <button
            className="icon-button"
            onClick={() => setSelected(null)}
            aria-label="Close property details"
          >
            <X size={17} />
          </button>
        </div>
        {game?.players.some((p) => p.pos === t.id && !p.out) && (
          <div className="property-residents" aria-label="Crews on this block">
            {game.players
              .filter((p) => p.pos === t.id && !p.out)
              .map((p) => (
                <span key={p.id}>
                  <HoodFigure color={CREWS[p.crew].color} variant={p.crew} />
                  <b>{p.id === me?.id ? "You" : p.name}</b>
                </span>
              ))}
          </div>
        )}
        {owner && (
          <div
            className="property-owner-summary"
            style={{ "--crew": CREWS[owner.crew].color }}
          >
            <HoodFigure color={CREWS[owner.crew].color} variant={owner.crew} />
            <div>
              <strong>
                {owner.id === me?.id ? "Your block" : `Owned by ${owner.name}`}
              </strong>
              <span>
                {CREWS[owner.crew].name}
                {q.mortgaged
                  ? " · MORTGAGED · no rent"
                  : q.level === 5
                    ? " · Hotel"
                    : q.level
                      ? ` · ${q.level} houses`
                      : " · No buildings"}
              </span>
            </div>
            {q.level > 0 && <StreetBuilding hotel={q.level === 5} />}
          </div>
        )}
        <p>
          {t.group !== undefined
            ? districts[t.group].name
            : t.type === "transit"
              ? "City transit"
              : t.type === "stoppa"
                ? "Spin away 1–10% of cash into the Community Plot."
                : t.type === "utility"
                  ? "Rent is 4× dice, or 10× when your side owns both plugs."
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
                              ? game?.settings.communityCash === false
                                ? "Community payouts are off in this room."
                                : "Land here to collect the community pot."
                              : "Pay $100 into the community pot."}
        </p>
        {t.type === "parking" && (
          <div className="detail-stat">
            <span>Community Plot balance</span>
            <b>{money(game?.pot || 0)}</b>
          </div>
        )}
        {t.price && (
          <>
            <div className="detail-stat">
              <span>Purchase</span>
              <b>{money(t.price)}</b>
            </div>
            <div className="detail-stat">
              <span>Base rent</span>
              <b>
                {t.type === "utility"
                  ? "4× / 10× dice"
                  : t.type === "transit"
                    ? "$25 / $50 / $100 / $200"
                    : money(t.rent)}
              </b>
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
                      ? q.level === 5
                        ? "Hotel"
                        : `${q.level} businesses`
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
              ? "Your crew is out. Leave for a new game, or stay to watch and chat."
              : `They’re ${game.phase === "duel" ? "settling a score" : game.phase === "roll" ? "getting ready to roll" : "at " + BOARD[current.pos].name}. ${!me ? "You’re watching from the sidelines." : "Your seat is next in line."}`}
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
      case "stoppa":
      case "stoppa-result":
        return (
          <div className="turn-hero">
            <Shield size={38} />
            <h2>Caught lackin.</h2>
            <p>
              Oppa Stoppa is eyeing your pockets. Your lost cash feeds the
              Community Plot.
            </p>
          </div>
        );
      case "auction":
        return (
          <div className="turn-hero">
            <Landmark size={38} />
            <h2>Bid for the block.</h2>
            <p>Every crew gets a shot. Highest bid takes the turf.</p>
          </div>
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
              {game.settings.auctions
                ? "Put it up for auction"
                : "Pass on this block"}
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
              onClick={() => act({ type: "jail-roll" })}
            >
              Roll for doubles <Dice5 size={18} />
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
  const authenticated = (r) => {
    persist("stb-profile", r.token);
    setProfile(r.profile);
    setName(r.profile.name);
    persist("stb-name", r.profile.name);
  };
  const enter = () => {
    persist("stb-entry", "yes");
    setEntry(false);
  };
  if (entry && !game)
    return (
      <EntryPage
        profile={profile}
        emit={emit}
        authenticated={authenticated}
        enter={enter}
        disabled={disabled}
      />
    );
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
          <button
            className="icon-button"
            aria-label="Profile and friends"
            onClick={() => {
              setAccountTab("friends");
              setAccountOpen(true);
            }}
          >
            <Users size={19} />
          </button>
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
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {game?.status === "playing"
          ? `${current.name}’s turn. ${game.phase.replaceAll("-", " ")}. At ${BOARD[current.pos].name}. ${game.log[0]?.text || ""}`
          : game?.status === "finished"
            ? `${winner?.name} wins the match.`
            : game
              ? `Room ${game.code}. ${game.players.length} crews joined.`
              : "Create or join a private room to play."}
      </div>
      <main className="game-layout">
        <aside className="crew-sidebar">
          <div className="section-heading">
            <h2>Your competition</h2>
            <span>
              {game ? game.players.length : 4} /{" "}
              {game?.settings.maxPlayers || 8}
            </span>
          </div>
          <div className="crew-list">
            {(
              game?.players ||
              CREWS.slice(0, 4).map((c, i) => ({
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
                onMouseEnter={() => setHighlight(p.id)}
                onMouseLeave={() => setHighlight(null)}
                className={`crew-row ${p.out ? "eliminated" : ""} ${game?.status === "playing" && current.id === p.id ? "active" : ""}`}
                style={{ "--crew": CREWS[p.crew].color }}
              >
                <div className="crew-main">
                  <CrewMark crew={p.crew} appearance={p.appearance} />
                  <div>
                    <h3>
                      {p.profileId ? (
                        <button
                          className="player-name"
                          onClick={() => setPlayerOpen(p)}
                        >
                          {p.name}
                        </button>
                      ) : (
                        p.name
                      )}
                      {p.id === game?.me && <span>YOU</span>}
                    </h3>
                    <small>
                      {game?.settings.teams && p.team
                        ? game.teamNames?.[p.team] || `Team ${p.team}`
                        : CREWS[p.crew].name}
                    </small>
                    {p.escapes > 0 && (
                      <span
                        className="held-cards"
                        aria-label={`${p.name} holds ${p.escapes} escape card${p.escapes === 1 ? "" : "s"}`}
                      >
                        <KeyRound size={12} aria-hidden="true" />
                        <span>
                          {p.escapes} escape card{p.escapes === 1 ? "" : "s"}
                        </span>
                      </span>
                    )}
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
          {game?.status === "lobby" &&
            game.players.length < game.settings.maxPlayers && (
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
            {districts.map((d) => (
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
                    : game.mapName
                      ? `LIVE · ${game.mapName.toUpperCase()}`
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
          <div className="map-controls">
            <span>{BOARD.length} blocks to explore</span>
            <button onClick={() => setMapOverview(!mapOverview)}>
              {mapOverview ? "Explore readable streets" : "See full map"}
            </button>
          </div>
          <div className={`board-viewport ${mapOverview ? "overview" : ""}`}>
            <Board
              game={game}
              selected={selected}
              setSelected={setSelected}
              rolling={rolling}
              highlight={highlight}
            />
          </div>
          <p className="board-scroll-hint">
            Swipe to explore all {BOARD.length} blocks. Tap a square for its
            details.
          </p>
          <div className="table-footer">
            <span>
              <Shield size={14} />{" "}
              {game?.status === "playing"
                ? `Community pot: ${money(game.pot)}`
                : "Original crews. No real-money stakes."}
            </span>
            <button
              onClick={() => (game ? setSettingsOpen(true) : setRules(true))}
            >
              <HelpCircle size={14} /> House rules
            </button>
          </div>
          {game && (
            <p className="piece-legend">
              <StreetBuilding /> House × count <StreetBuilding hotel /> Hotel ·
              Crew badges show who owns each block. Tap a tile for details.
            </p>
          )}
          {game && (
            <div className="board-chat" ref={chatFocus}>
              <ChatPanel
                game={game}
                emit={emit}
                disabled={!connected || !me}
                onPlayer={setPlayerOpen}
              />
            </div>
          )}
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
          {game?.status === "playing" && me?.out && (
            <section className="eliminated-exit" aria-label="Your crew is out">
              <h2>Your crew is out.</h2>
              <p>
                Leave for another table whenever you’re ready. Watching is
                optional.
              </p>
              <Button disabled={disabled} onClick={leave}>
                <LogOut size={18} /> Leave game session
              </Button>
            </section>
          )}
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
                  <option value={0}>Winner takes all · Default</option>
                  <option value={10}>Quick · 10 rounds</option>
                  <option value={20}>Classic · 20 rounds</option>
                  <option value={30}>Marathon · 30 rounds</option>
                </select>
              </div>
              <Button disabled={disabled} onClick={() => create()}>
                Create a private room <ArrowUpRight size={20} />
              </Button>
              <div className="solo-options">
                <label htmlFor="solo-bots">Bot opponents</label>
                <select
                  id="solo-bots"
                  value={soloBots}
                  onChange={(e) => setSoloBots(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <option key={n} value={n}>
                      {n} bot{n === 1 ? "" : "s"}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                secondary
                disabled={disabled}
                onClick={() => create(true)}
              >
                Play solo vs bots <Dice5 size={18} />
              </Button>
              <div className="quick-links">
                <button onClick={() => setSettingsOpen(true)}>
                  Room settings
                </button>
                <button onClick={() => setRoomsOpen(true)}>Public rooms</button>
              </div>
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
                    placeholder="6-character code"
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
              <div className="feature-note">
                <Users size={18} />
                <span>
                  2–8 players · Solo or online
                  <br />
                  Bots fill the empty seats automatically
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
                <span>YOUR {game.settings.visibility.toUpperCase()} ROOM</span>
                <strong>{game.code}</strong>
                <span>
                  <Copy size={14} /> Copy invite link
                </span>
              </button>
              <div className="lobby-seats">
                {Array.from(
                  { length: game.settings.maxPlayers },
                  (_, i) => i,
                ).map((i) => (
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
                on the block · {game.settings.maxPlayers - game.players.length}{" "}
                open seat
                {game.settings.maxPlayers - game.players.length === 1
                  ? ""
                  : "s"}
              </p>
              <div className="match-select">
                <label htmlFor="room-length">Match length</label>
                <select
                  id="room-length"
                  disabled={game.host !== game.me}
                  value={game.limit || 0}
                  onChange={(e) =>
                    lobby({ type: "settings", limit: Number(e.target.value) })
                  }
                >
                  <option value={0}>Winner takes all · Default</option>
                  <option value={10}>Quick · 10 rounds</option>
                  <option value={20}>Classic · 20 rounds</option>
                  <option value={30}>Marathon · 30 rounds</option>
                </select>
              </div>
              <Button secondary onClick={() => setSettingsOpen(true)}>
                House rules & room settings
              </Button>
              {game.settings.teams && (
                <div className="team-picker">
                  <label htmlFor="team-choice">Your team</label>
                  <select
                    id="team-choice"
                    disabled={!me || disabled}
                    value={me?.team || "1"}
                    onChange={(e) => emit("team", { team: e.target.value })}
                  >
                    {["1", "2", "3", "4"].map((n) => (
                      <option key={n} value={n}>
                        Team {n}
                      </option>
                    ))}
                  </select>
                  <p className="micro-note">
                    Unassigned seats split across teams 1 and 2. Set bot teams
                    below.
                  </p>
                  {game.host === game.me && (
                    <details>
                      <summary>Name your teams</summary>
                      {["1", "2", "3", "4"].map((n) => (
                        <label key={n}>
                          Team {n}
                          <input
                            maxLength={20}
                            defaultValue={game.teamNames?.[n] || `Team ${n}`}
                            onBlur={(e) => {
                              if (e.target.value.trim())
                                emit("team-name", {
                                  team: n,
                                  name: e.target.value,
                                });
                            }}
                          />
                        </label>
                      ))}
                    </details>
                  )}
                  {game.host === game.me &&
                    game.players
                      .filter((p) => p.bot)
                      .map((p) => (
                        <label key={p.id}>
                          {p.name}
                          <select
                            value={p.team || String((p.crew % 2) + 1)}
                            onChange={(e) =>
                              emit("team", { id: p.id, team: e.target.value })
                            }
                          >
                            {["1", "2", "3", "4"].map((n) => (
                              <option key={n} value={n}>
                                Team {n}
                              </option>
                            ))}
                          </select>
                        </label>
                      ))}
                </div>
              )}
              {game.host === game.me ? (
                <>
                  <Button
                    disabled={
                      disabled ||
                      (!game.settings.autoFill && game.players.length < 2)
                    }
                    onClick={() => lobby({ type: "start" })}
                  >
                    Start the takeover <Dice5 size={20} />
                  </Button>
                  {game.players.length < game.settings.maxPlayers && (
                    <Button
                      secondary
                      disabled={disabled}
                      onClick={() => lobby({ type: "fill-bots" })}
                    >
                      <Plus size={18} /> Fill seats with bots
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
                  ? game.settings.autoFill
                    ? "Start now; bots fill every empty seat."
                    : "Add at least one friend or bot to start."
                  : `Everyone starts with ${money(game.settings.startingCash)}. ${game.limit ? `${game.limit} rounds.` : "Last crew or team standing takes all."}`}
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
                <p>
                  {game.settings.teams && winner?.team
                    ? `${game.teamNames?.[winner.team] || `Team ${winner.team}`} wins together.`
                    : winner && `${CREWS[winner.crew].name} takes the city.`}
                </p>
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
              {game.host === game.me && (
                <Button
                  disabled={disabled}
                  onClick={() => lobby({ type: "rematch" })}
                >
                  Rematch this crew <RotateCcw size={18} />
                </Button>
              )}
              <Button secondary disabled={disabled} onClick={leave}>
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
                  { id: "chat", label: "Chat" },
                ].map((x) => (
                  <button
                    key={x.id}
                    className={tab === x.id ? "active" : ""}
                    onClick={() => {
                      if (x.id === "chat") {
                        chatFocus.current?.scrollIntoView({
                          block: "center",
                          behavior: "smooth",
                        });
                        chatFocus.current
                          ?.querySelector("input")
                          ?.focus({ preventScroll: true });
                      } else setTab(x.id);
                    }}
                  >
                    {x.label}
                    {x.id === "chat" && (
                      <span aria-hidden="true">{game.chat?.length || 0}</span>
                    )}
                    {x.id === "turf" && <span>{owned.length}</span>}
                  </button>
                ))}
              </div>
              {game.trade?.to === game.me && (
                <div className="trade-inbox">
                  <Handshake size={20} />
                  <h3>
                    {game.trade.revision > 1
                      ? "Counteroffer from "
                      : "A deal from "}
                    {game.players.find((p) => p.id === game.trade.from)?.name}
                  </h3>
                  <TradeSummary game={game} offer={game.trade} />
                  <div>
                    <Button
                      disabled={
                        disabled ||
                        !["roll", "end", "rent", "buy"].includes(game.phase)
                      }
                      onClick={() =>
                        act({
                          type: "trade-respond",
                          accept: true,
                          offerId: game.trade.id,
                        })
                      }
                    >
                      Accept deal
                    </Button>
                    <Button
                      secondary
                      disabled={
                        disabled ||
                        !["roll", "end", "rent", "buy"].includes(game.phase)
                      }
                      onClick={() => {
                        setCounterOffer(game.trade);
                        setTab("trade");
                      }}
                    >
                      Counteroffer
                    </Button>
                    <Button
                      secondary
                      disabled={disabled}
                      onClick={() =>
                        act({
                          type: "trade-respond",
                          accept: false,
                          offerId: game.trade.id,
                        })
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
                                : districts[t.group].color,
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
                    Your net worth:{" "}
                    {me ? money(propertyValue(game, me)) : "Spectating"}
                    <br />
                    Escape cards: {me?.escapes || 0}
                  </p>
                </>
              ) : (
                <ExchangePanel
                  key={counterOffer?.id || "new"}
                  game={game}
                  act={act}
                  disabled={disabled}
                  counter={counterOffer}
                  clearCounter={() => setCounterOffer(null)}
                />
              )}
              {!mine &&
                me &&
                !me.out &&
                !["auction", "duel", "duel-result"].includes(game.phase) && (
                  <button
                    className="text-button"
                    disabled={disabled || game.timeDonors?.includes(me.id)}
                    onClick={() => act({ type: "give-time" })}
                  >
                    Give {current.name} one more minute
                  </button>
                )}
              <div className="match-tools">
                <button onClick={() => setSettingsOpen(true)}>
                  Room rules
                </button>
                {!me || me.out ? (
                  <button onClick={leave}>Leave table</button>
                ) : (
                  <button onClick={() => setConfirmForfeit(true)}>
                    Forfeit seat
                  </button>
                )}
              </div>
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
      {error &&
        (settingsOpen ||
          roomsOpen ||
          accountOpen ||
          playerOpen ||
          confirmForfeit ||
          (game?.status === "playing" &&
            [
              "auction",
              "duel",
              "duel-result",
              "roulette",
              "roulette-result",
              "stoppa",
              "stoppa-result",
            ].includes(game.phase))) && (
          <div className="overlay-error" role="alert">
            {error}
            <button
              className="icon-button"
              aria-label="Dismiss error"
              onClick={() => setError("")}
            >
              <X size={16} />
            </button>
          </div>
        )}
      {rules && <ExpandedRules game={game} close={() => setRules(false)} />}
      {settingsOpen && (
        <SettingsPanel
          game={game}
          profile={profile}
          openStudio={() => {
            setSettingsOpen(false);
            setStudio(true);
          }}
          openAccount={() => {
            setSettingsOpen(false);
            setAccountTab("account");
            setAccountOpen(true);
          }}
          options={options}
          limit={limit}
          disabled={disabled}
          close={() => setSettingsOpen(false)}
          save={async (opts, len) => {
            if (game) {
              const r = await lobby({
                type: "settings",
                settings: opts,
                limit: len,
              });
              if (r) setSettingsOpen(false);
            } else {
              setOptions(opts);
              setLimit(len);
              setSettingsOpen(false);
            }
          }}
        />
      )}
      {roomsOpen && (
        <RoomsPanel
          emit={emit}
          disabled={disabled}
          close={() => setRoomsOpen(false)}
          enter={async (code, watch = false, quick = false) => {
            const r = await emit(
              quick ? "quick-play" : watch ? "spectate" : "join",
              { name: name || profile?.name || "You", code },
            );
            if (r) {
              persist("stb-seat", r.token);
              setCode(r.code);
              history.replaceState({}, "", `?room=${r.code}`);
              setRoomsOpen(false);
              setSelected(null);
            }
          }}
        />
      )}
      {studio && (
        <MapStudio
          profile={profile}
          emit={emit}
          close={() => setStudio(false)}
          select={async (map) => {
            if (game) {
              if (!(await lobby({ type: "settings", settings: { map } })))
                return;
            } else setOptions((o) => ({ ...o, map }));
            setStudio(false);
            setSettingsOpen(true);
          }}
        />
      )}
      {accountOpen && (
        <AccountPanel
          profile={profile}
          initialTab={accountTab}
          openLogin={() => {
            setAccountOpen(false);
            setEntry(true);
          }}
          social={social}
          game={game}
          emit={emit}
          disabled={disabled}
          close={() => setAccountOpen(false)}
          authenticated={authenticated}
          signoutToken={stored("stb-profile")}
          inviteJoin={async (c) => {
            setCode(c);
            setAccountOpen(false);
            notify("Invite ready. Use the Join room button.");
          }}
        />
      )}
      {playerOpen && (
        <PlayerPanel
          player={playerOpen}
          game={game}
          profile={profile}
          emit={emit}
          disabled={disabled}
          close={() => setPlayerOpen(null)}
          notify={notify}
        />
      )}
      {confirmForfeit && (
        <Modal
          title="Leave your empire behind?"
          close={() => setConfirmForfeit(false)}
        >
          <p>
            Forfeiting eliminates your crew. Your teammate inherits your turf,
            or it returns to the market. A rent creditor inherits it when you
            owe them.
          </p>
          <Button
            danger
            disabled={disabled}
            onClick={async () => {
              const r = await act({ type: "forfeit" });
              if (r) setConfirmForfeit(false);
            }}
          >
            Forfeit my seat
          </Button>
          <Button secondary onClick={() => setConfirmForfeit(false)}>
            Keep playing
          </Button>
        </Modal>
      )}
      {game?.status === "playing" &&
        !me?.out &&
        ["stoppa", "stoppa-result"].includes(game.phase) && (
          <Stoppa game={game} act={act} disabled={disabled} />
        )}
      {game?.status === "playing" && !me?.out && game.phase === "auction" && (
        <Auction game={game} act={act} disabled={disabled} now={now} />
      )}
      {game?.status === "playing" &&
        !me?.out &&
        ["roulette", "roulette-result"].includes(game.phase) && (
          <Roulette game={game} act={act} disabled={disabled} />
        )}
      {game?.status === "playing" &&
        !me?.out &&
        ["duel", "duel-result"].includes(game.phase) && (
          <Duel
            game={game}
            act={act}
            disabled={game.duel?.mode === "fps" ? !connected : disabled}
          />
        )}
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);
