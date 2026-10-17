import React, { useState, useEffect, useRef } from "react";
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

export function BoardCenter({
  game,
  size,
  districts,
  rolling,
  current,
  BOARD,
}) {
  return (
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
  );
}

export function GameBoard({ game, selected, setSelected, rolling, highlight }) {
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
                      className={`token ${walking?.id === p.id ? "hopping" : ""}`}
                      key={`${p.id}-${walking?.id === p.id ? walking.step : "idle"}`}
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
