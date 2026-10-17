import React from "react";
import { X, Plus, KeyRound } from "lucide-react";
import { CREWS, money, BOARD as DEFAULT_BOARD } from "../../shared/board.js";
import { getTimerState } from "../../shared/hud.js";
import { CashDeltaBadge } from "../CashDelta.jsx";
import { CrewMark } from "./common.jsx";

export function AvatarTimerRing({ timerState }) {
  if (!timerState) return null;
  return (
    <svg
      className={`avatar-timer-ring ${timerState.className}`}
      viewBox="0 0 44 44"
      aria-label={`Turn timer: ${Math.ceil(timerState.remainingSec)} seconds remaining`}
    >
      <circle
        className="avatar-timer-bg"
        cx="22"
        cy="22"
        r="19"
      />
      <circle
        className="avatar-timer-progress"
        cx="22"
        cy="22"
        r="19"
        stroke={timerState.color}
        strokeDasharray={timerState.circumference}
        strokeDashoffset={timerState.strokeDashoffset}
        style={{
          strokeDasharray: timerState.circumference,
          strokeDashoffset: timerState.strokeDashoffset,
          stroke: timerState.color,
        }}
      />
    </svg>
  );
}

export function CrewRow({
  p,
  game,
  current,
  now,
  setHighlight,
  setPlayerOpen,
  onTrade,
  lobby,
  BOARD = DEFAULT_BOARD,
}) {
  const isActive =
    game?.status === "playing" && current?.id === p.id && !p.out;
  const isRival =
    game?.status === "playing" && p.id !== game?.me && !p.out && !p.preview;
  const turnDeadline = game?.turnDeadline || game?.deadline || 0;
  const totalTurnTime =
    game?.turnDeadline &&
    game?.turnStarted &&
    game.turnDeadline > game.turnStarted
      ? game.turnDeadline - game.turnStarted
      : (game?.settings?.turnSeconds || 90) * 1000;
  const timerState = isActive
    ? getTimerState(turnDeadline, now, totalTurnTime)
    : null;

  return (
    <article
      key={p.id}
      onMouseEnter={() => setHighlight?.(p.id)}
      onMouseLeave={() => setHighlight?.(null)}
      className={`crew-row ${p.out ? "eliminated" : ""} ${game?.status === "playing" && current?.id === p.id ? "active" : ""}`}
      style={{ "--crew": CREWS[p.crew].color }}
    >
      <div className="crew-main">
        <div
          className={`avatar-timer-wrap avatar-timer-wrapper ${isActive ? "active" : ""}`}
        >
          <CrewMark crew={p.crew} appearance={p.appearance} />
          {isActive && <AvatarTimerRing timerState={timerState} />}
        </div>
        <div>
          <h3>
            {p.profileId ? (
              <button
                className="player-name"
                onClick={() => setPlayerOpen?.(p)}
              >
                {p.name}
              </button>
            ) : (
              p.name
            )}
            {p.id === game?.me && <span>YOU</span>}
          </h3>
          <small>
            {game?.settings?.teams && p.team
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
        <CashDeltaBadge cash={p.cash} />
        <span>
          {game
            ? BOARD.filter((t) => game.props[t.id]?.owner === p.id).length
            : 0}{" "}
          blocks{p.jail > 0 ? " · jailed" : ""}
        </span>
        {isRival && onTrade && (
          <button
            type="button"
            className="crew-trade-btn"
            onClick={(e) => {
              e.stopPropagation();
              onTrade(p);
            }}
            aria-label={`Trade with ${p.name}`}
            title={`Trade with ${p.name}`}
          >
            🤝 Trade
          </button>
        )}
      </div>
      {game?.status === "lobby" && game.host === game.me && p.bot && (
        <button
          className="remove-bot"
          onClick={() => lobby?.({ type: "remove-bot", id: p.id })}
          aria-label={`Remove ${p.name}`}
        >
          <X size={12} />
        </button>
      )}
    </article>
  );
}

export function CrewRoster({
  game,
  current,
  now,
  setHighlight,
  setPlayerOpen,
  onTrade,
  lobby,
  disabled,
  BOARD = DEFAULT_BOARD,
}) {
  const players =
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
    }));

  return (
    <>
      <div className="section-heading">
        <h2>Your competition</h2>
        <span>
          {game ? game.players.length : 4} /{" "}
          {game?.settings?.maxPlayers || 8}
        </span>
      </div>
      <div className="crew-list">
        {players.map((p) => (
          <CrewRow
            key={p.id}
            p={p}
            game={game}
            current={current}
            now={now}
            setHighlight={setHighlight}
            setPlayerOpen={setPlayerOpen}
            onTrade={onTrade}
            lobby={lobby}
            BOARD={BOARD}
          />
        ))}
      </div>
      {game?.status === "lobby" &&
        game.players.length < (game.settings?.maxPlayers || 8) && (
          <button
            className="add-seat"
            disabled={game.host !== game.me || disabled}
            onClick={() => lobby?.({ type: "add-bot" })}
          >
            <Plus size={16} /> Add a bot to the crew
          </button>
        )}
    </>
  );
}

export default CrewRoster;
