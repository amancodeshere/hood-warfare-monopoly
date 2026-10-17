import React, { useState, useEffect, useRef } from "react";
import "./BoardTiles.css";
import { Crosshair } from "lucide-react";
import {
  BOARD as DEFAULT_BOARD,
  CREWS,
  DISTRICTS,
  money,
  coordinates,
} from "../../shared/board.js";
import { DISTRICTS as LEGACY_DISTRICTS } from "../../shared/legacy-board.js";
import { COSMETICS } from "../../shared/cosmetics.js";
import { HoodFigure, StreetBuilding } from "../StreetPieces.jsx";
import City from "../City.jsx";
import { Icon, Die } from "./common.jsx";
import { getBoardDisplayName } from "../utils/board-display-name.js";

export function BoardCenter({
  game,
  size,
  districts,
  rolling,
  current,
  BOARD,
}) {
  const activeBoard = BOARD || game?.board || DEFAULT_BOARD;
  const boardSize = size || Math.floor(activeBoard.length / 4) + 1;
  const cityScale = boardSize === 8 ? 0.75 : 1;
  const activeDistricts =
    districts ||
    (boardSize === 8 || game?.schemaVersion === 1 || activeBoard.length === 28
      ? (game?.districts || LEGACY_DISTRICTS)
      : (game?.districts || DISTRICTS));

  return (
    <div
      className="board-center"
      data-size={boardSize}
      style={{
        gridColumn: `2/${boardSize}`,
        gridRow: `2/${boardSize}`,
        "--board-size": boardSize,
      }}
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
        palette={activeDistricts.map((d) => d.color)}
        theme={game?.settings?.map?.startsWith?.("custom:") ? "custom" : game?.mapTheme}
        scale={cityScale}
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
                : ` · ${activeBoard[current?.pos || 0]?.name || ""}`}
            </p>
          </>
        ) : (
          <>
            <div className="board-sign">
              <span>{activeBoard.length} BLOCKS</span>
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
  );
}

import {
  getActivePlayerBark,
  sortTokenPlayersByBark,
  BARK_DURATION_MS,
  BARK_FADE_MS,
} from "../../shared/barks.js";

export {
  getActivePlayerBark,
  sortTokenPlayersByBark,
  BARK_DURATION_MS,
  BARK_FADE_MS,
};

export function GameBoard({
  game,
  selected,
  setSelected,
  rolling,
  highlight,
  barks: externalBarks,
}) {
  const BOARD = game?.board || DEFAULT_BOARD,
    size = Math.floor(BOARD.length / 4) + 1,
    districts =
      game?.schemaVersion === 1 || BOARD.length === 28
        ? (game?.districts || LEGACY_DISTRICTS)
        : (game?.districts || DISTRICTS);
  const [walking, setWalking] = useState(null),
    lastMove = useRef(game?.lastMove?.id);

  const [barks, setBarks] = useState({});
  const barksRef = useRef(barks);
  barksRef.current = barks;
  const barkTimers = useRef(new Map());
  const seenMsgTimes = useRef(new Map());

  // Track latest chat message / bark for each seated player
  useEffect(() => {
    const chat = game?.chat || [];
    const players = game?.players || [];
    if (!chat.length || !players.length) return;

    const now = Date.now();
    const BARK_DURATION_MS = 3500;
    const BARK_FADE_MS = 500;

    players.forEach((p) => {
      let latestMsg = null;
      for (let i = chat.length - 1; i >= 0; i--) {
        const m = chat[i];
        if (!m || !m.text) continue;
        const isMatch =
          m.player === p.id ||
          (m.id && m.id === p.id) ||
          (!m.player && m.name && m.name === p.name);
        if (isMatch) {
          latestMsg = m;
          break;
        }
      }

      if (!latestMsg) return;

      let msgTime = Number(latestMsg.time || latestMsg.timestamp);
      if (!msgTime || Number.isNaN(msgTime)) {
        if (seenMsgTimes.current.has(latestMsg.id || latestMsg)) {
          msgTime = seenMsgTimes.current.get(latestMsg.id || latestMsg);
        } else {
          msgTime = now;
          seenMsgTimes.current.set(latestMsg.id || latestMsg, msgTime);
        }
      }

      const age = now - msgTime;
      if (age < 0 || age >= BARK_DURATION_MS) return;

      const msgId = latestMsg.id || `${latestMsg.text}-${msgTime}`;
      const currentBark = barksRef.current[p.id];
      if (currentBark && currentBark.id === msgId) return;

      if (barkTimers.current.has(p.id)) {
        const { dismissTimer, removeTimer } = barkTimers.current.get(p.id);
        clearTimeout(dismissTimer);
        clearTimeout(removeTimer);
      }

      const remainingTotal = Math.max(0, BARK_DURATION_MS - age);
      const remainingActive = Math.max(0, remainingTotal - BARK_FADE_MS);

      setBarks((prev) => ({
        ...prev,
        [p.id]: {
          id: msgId,
          text: latestMsg.text,
          time: msgTime,
          dismissing: remainingActive === 0,
        },
      }));

      const dismissTimer = setTimeout(() => {
        setBarks((prev) => {
          if (prev[p.id]?.id === msgId) {
            return { ...prev, [p.id]: { ...prev[p.id], dismissing: true } };
          }
          return prev;
        });
      }, remainingActive);

      const removeTimer = setTimeout(() => {
        setBarks((prev) => {
          if (prev[p.id]?.id === msgId) {
            const next = { ...prev };
            delete next[p.id];
            return next;
          }
          return prev;
        });
        barkTimers.current.delete(p.id);
      }, remainingTotal);

      barkTimers.current.set(p.id, { dismissTimer, removeTimer });
    });
  }, [game?.chat, game?.players]);

  useEffect(() => {
    const timers = barkTimers.current;
    return () => {
      timers.forEach(({ dismissTimer, removeTimer }) => {
        clearTimeout(dismissTimer);
        clearTimeout(removeTimer);
      });
      timers.clear();
    };
  }, []);

  useEffect(() => {
    const handleLocalBubble = (e) => {
      const { player, text } = e.detail || {};
      if (!player || !text) return;
      const msgId = `local-${player}-${Date.now()}`;
      const BARK_DURATION_MS = 3500;
      const BARK_FADE_MS = 500;

      if (barkTimers.current.has(player)) {
        const { dismissTimer, removeTimer } = barkTimers.current.get(player);
        clearTimeout(dismissTimer);
        clearTimeout(removeTimer);
      }

      setBarks((prev) => ({
        ...prev,
        [player]: {
          id: msgId,
          text,
          time: Date.now(),
          dismissing: false,
        },
      }));

      const dismissTimer = setTimeout(() => {
        setBarks((prev) => {
          if (prev[player]?.id === msgId) {
            return { ...prev, [player]: { ...prev[player], dismissing: true } };
          }
          return prev;
        });
      }, BARK_DURATION_MS - BARK_FADE_MS);

      const removeTimer = setTimeout(() => {
        setBarks((prev) => {
          if (prev[player]?.id === msgId) {
            const next = { ...prev };
            delete next[player];
            return next;
          }
          return prev;
        });
        barkTimers.current.delete(player);
      }, BARK_DURATION_MS);

      barkTimers.current.set(player, { dismissTimer, removeTimer });
    };

    window.addEventListener("stb-speech-bubble", handleLocalBubble);
    return () => window.removeEventListener("stb-speech-bubble", handleLocalBubble);
  }, []);

  const effectiveBarks = { ...barks, ...(externalBarks || {}) };

  useEffect(() => {
    const m = game?.lastMove;
    if (!m || lastMove.current === m.id) return;
    lastMove.current = m.id;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let step = 0;
    setWalking({ id: m.player, pos: m.from, step: 0 });
    const timer = setInterval(() => {
      step++;
      if (step >= m.steps) {
        setWalking(null);
        clearInterval(timer);
      } else {
        setWalking({ id: m.player, pos: (m.from + step) % BOARD.length, step });
      }
    }, 130);
    return () => {
      clearInterval(timer);
      setWalking(null);
    };
  }, [game?.lastMove, BOARD.length]);
  const live = game?.status === "playing",
    current = game?.players[game.turn];
  return (
    <div className={`board-shell ${live ? "in-play" : ""}`}>
      <div
        className="board-grid"
        data-size={size}
        style={{ "--board-size": size }}
      >
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
          const tokenPlayers = sortTokenPlayersByBark(
            players,
            effectiveBarks,
            game?.me,
          );
          return (
            <button
              key={t.id}
              className={`tile ${t.group !== undefined ? "district-tile" : ""} ${corner ? "corner" : ""} ${selected === t.id ? "selected" : ""} ${q ? "owned" : ""} ${q?.level ? "built" : ""} ${q?.mortgaged ? "mortgaged" : ""} ${q?.owner === highlight ? "highlighted" : ""} ${live && current?.pos === t.id ? "occupied" : ""}`}
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
              <div className="tile-content">
                {t.type !== "property" && (
                  <Icon name={t.type} size={corner ? 24 : 19} />
                )}
                <span className="tile-name" title={t.name}>
                  {getBoardDisplayName(t.name)}
                </span>
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
              </div>
              {q && (
                <span
                  className="owner-badge tile-owner-bar"
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
                  {tokenPlayers.map((p) => {
                    const playerBark = effectiveBarks[p.id];
                    return (
                      <span
                        className={`token ${walking?.id === p.id ? "hopping" : ""}`}
                        key={`${p.id}-${walking?.id === p.id ? walking.step : "idle"}`}
                        style={{
                          "--crew":
                            COSMETICS.find((x) => x.id === p.appearance)?.color ||
                            CREWS[p.crew].color,
                        }}
                        title={p.name}
                      >
                        {playerBark && (
                          <div
                            className={`token-bark-bubble ${playerBark.dismissing ? "dismissing" : ""}`}
                            role="status"
                            aria-live="polite"
                            data-player={p.id}
                          >
                            <span className="token-bark-text">{playerBark.text}</span>
                            <span className="token-bark-tail" aria-hidden="true" />
                          </div>
                        )}
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
                    );
                  })}
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
        <BoardCenter
          game={game}
          size={size}
          districts={districts}
          rolling={rolling}
          current={current}
          BOARD={BOARD}
        />
      </div>
    </div>
  );
}

export const Board = GameBoard;
export default GameBoard;
