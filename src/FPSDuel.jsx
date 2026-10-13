import React, { useEffect, useRef, useState } from "react";
import {
  Crosshair,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Shield,
  Check,
  Zap,
} from "lucide-react";
import { Modal } from "./Modal.jsx";
import { HoodFigure } from "./StreetPieces.jsx";
import { CREWS, money } from "../shared/board.js";
function Alley() {
  return (
    <svg
      className="fps-alley"
      viewBox="0 0 960 540"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <rect width="960" height="540" fill="#83978b" />
      <path d="M0 0H280L415 320 0 540Z" fill="#45564b" />
      <path d="M960 0H680L545 320 960 540Z" fill="#39493e" />
      <path d="M280 0H680V320H280Z" fill="#26372d" />
      <path d="M0 540L415 280H545L960 540Z" fill="#27342d" />
      <path
        d="M415 280L160 540M545 280L800 540"
        stroke="#9caa8d"
        strokeWidth="3"
        opacity=".25"
      />
      <path
        d="M0 100L332 145M0 230L372 215M960 90L627 143M960 220L590 213"
        stroke="#18281e"
        strokeWidth="12"
      />
      <path
        d="M60 35L175 65V173L60 142ZM785 60L896 30V133L785 169Z"
        fill="#1c2a22"
        stroke="#9caa8d"
        strokeWidth="5"
      />
      <path d="M337 251H388V325H337ZM573 245H629V325H573Z" fill="#a1aa87" />
      <rect x="412" y="175" width="134" height="94" fill="#151f19" />
      <path d="M435 95H530V119H435Z" fill="#d9c784" />
      <text
        x="482"
        y="112"
        textAnchor="middle"
        fontFamily="Barlow Condensed"
        fontSize="17"
        fontWeight="800"
        fill="#263326"
      >
        NO RENT NO PEACE
      </text>
      <path
        d="M100 440H275V540H100ZM702 412H835V540H702Z"
        fill="#4d6151"
        stroke="#1a281f"
        strokeWidth="5"
      />
      <path d="M115 457H260M717 429H820" stroke="#75836b" strokeWidth="5" />
    </svg>
  );
}
export default function FPSDuel({ game, act, disabled }) {
  const d = game.duel,
    playing = !!d.fighters[game.me],
    mine = d.fighters[game.me] || d.fighters[d.attacker];
  const rivalId = playing
      ? game.me === d.attacker
        ? d.defender
        : d.attacker
      : d.defender,
    rival = d.fighters[rivalId],
    opponent = game.players.find((p) => p.id === rivalId);
  const [now, setNow] = useState(Date.now()),
    [aim, setAim] = useState({ x: 0.5, y: 0.53 }),
    [flash, setFlash] = useState(false);
  const offset = useRef(0),
    arena = useRef(null),
    lastFire = useRef(0),
    controls = useRef(null);
  useEffect(() => {
    offset.current = (game.serverNow || Date.now()) - Date.now();
  }, [game.serverNow]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 50);
    return () => clearInterval(t);
  }, []);
  const time = now + offset.current,
    ready = d.stage === "ready",
    result = d.stage === "finished",
    countdown = d.startsAt
      ? Math.max(0, Math.ceil((d.startsAt - time) / 1000))
      : 0;
  const live =
    playing && d.stage === "live" && !countdown && time < d.endsAt && !disabled;
  const duck = mine.duckUntil > time,
    targetDuck = rival.duckUntil > time,
    reloading = mine.reloadUntil > time;
  function fire(x = aim.x, y = aim.y) {
    if (
      !live ||
      duck ||
      reloading ||
      !mine.ammo ||
      Date.now() - lastFire.current < 430
    )
      return;
    lastFire.current = Date.now();
    setFlash(true);
    setTimeout(() => setFlash(false), 90);
    act({ type: "duel-fire", x, y });
  }
  controls.current = {
    live,
    fire,
    move: (lane) => act({ type: "duel-move", lane }),
    duck: () => act({ type: "duel-duck" }),
    reload: () => act({ type: "duel-reload" }),
  };
  useEffect(() => {
    function key(e) {
      if (
        e.repeat ||
        !controls.current.live ||
        /INPUT|TEXTAREA|SELECT|BUTTON/.test(e.target.tagName)
      )
        return;
      const c = controls.current;
      if (
        [
          "a",
          "ArrowLeft",
          "d",
          "ArrowRight",
          "s",
          "ArrowDown",
          " ",
          "r",
          "Enter",
        ].includes(e.key)
      ) {
        e.preventDefault();
        if (e.key === "a" || e.key === "ArrowLeft") c.move(-1);
        else if (e.key === "d" || e.key === "ArrowRight") c.move(1);
        else if (e.key === "s" || e.key === "ArrowDown") c.move(0);
        else if (e.key === " ") c.duck();
        else if (e.key === "r") c.reload();
        else if (e.key === "Enter") c.fire();
      }
    }
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);
  const shot = d.shots.at(-1),
    ownShot = [...d.shots].reverse().find((s) => s.player === game.me),
    recent = ownShot && time - ownShot.at < 700;
  return (
    <Modal title={result ? "The score is settled." : "Rent due. Guns up."} wide>
      <div className="fps-stakes">
        <strong>{money(d.debt)} rent on the line</strong>
        <span>
          {playing ? "YOUR FIRST-PERSON VIEW" : "WATCHING THE CHALLENGER"}
        </span>
      </div>
      <div className="fps-scoreboard">
        <div
          style={{
            "--crew":
              CREWS[
                game.players.find(
                  (p) => p.id === (playing ? game.me : d.attacker),
                ).crew
              ].color,
          }}
        >
          <strong>
            {playing
              ? "You"
              : game.players.find((p) => p.id === d.attacker).name}
          </strong>
          <meter min="0" max="100" value={mine.hp} aria-label="Your health" />
          <span>{mine.hp} HP</span>
        </div>
        <strong className="fps-clock">
          {ready
            ? "READY?"
            : result
              ? "SETTLED"
              : countdown || Math.max(0, Math.ceil((d.endsAt - time) / 1000))}
        </strong>
        <div style={{ "--crew": CREWS[opponent.crew].color }}>
          <strong>{opponent.name}</strong>
          <meter
            min="0"
            max="100"
            value={rival.hp}
            aria-label="Opponent health"
          />
          <span>{rival.hp} HP</span>
        </div>
      </div>
      <div
        ref={arena}
        className={
          "fps-viewport " +
          (flash ? "firing " : "") +
          (duck ? "in-cover " : "") +
          (shot?.player !== game.me && shot?.damage && time - shot.at < 350
            ? "hurt"
            : "")
        }
        role="application"
        aria-label="Shootout alley. Aim with pointer or arrow aim controls, press Enter to fire."
        tabIndex={0}
        onPointerMove={(e) => {
          const r = arena.current.getBoundingClientRect();
          setAim({
            x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
            y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
          });
        }}
        onPointerDown={(e) => {
          if (e.button !== 0 || e.target.closest("button")) return;
          e.preventDefault();
          arena.current.focus();
          const r = arena.current.getBoundingClientRect(),
            x = (e.clientX - r.left) / r.width,
            y = (e.clientY - r.top) / r.height;
          setAim({ x, y });
          fire(x, y);
        }}
      >
        <Alley />
        <div
          className={"fps-opponent " + (targetDuck ? "ducking" : "")}
          style={{ left: (0.5 + rival.lane * 0.23) * 100 + "%" }}
        >
          <HoodFigure
            color={CREWS[opponent.crew].color}
            variant={opponent.crew}
            armed
            stretch
          />
        </div>
        {d.shots
          .filter((s) => time - s.at < 500)
          .map((s) => (
            <span
              key={s.id}
              className={"fps-impact " + (s.damage ? "hit" : "miss")}
              style={{ left: s.x * 100 + "%", top: s.y * 100 + "%" }}
            >
              <Crosshair size={22} />
            </span>
          ))}
        <span
          className="fps-crosshair"
          style={{ left: aim.x * 100 + "%", top: aim.y * 100 + "%" }}
        >
          <Crosshair size={32} />
        </span>
        <svg className="fps-weapon" viewBox="0 0 200 180" aria-hidden="true">
          <path
            d="M18 180L68 85 102 77 151 180Z"
            fill="#a67857"
            stroke="#19291f"
            strokeWidth="5"
          />
          <path
            d="M64 12H127L138 82 110 103 117 163H73L73 87 57 74Z"
            fill="#39493e"
            stroke="#101b15"
            strokeWidth="6"
          />
          <path d="M72 15H117V66H72Z" fill="#667763" />
          <path d="M82 6H106V17H82Z" fill="#d9c784" />
          <path d="M80 102H105V145H80Z" fill="#18251c" />
          {flash && (
            <path
              d="M85 4L67-20 87-10 97-40 104-10 129-20 109 5Z"
              fill="#f3d082"
            />
          )}
        </svg>
        {ready && (
          <div className="fps-screen-message">
            <strong>Settle it on the block.</strong>
            <p>
              Aim at your rival. Dodge left or right. Duck behind cover. Six
              shots, then reload.
            </p>
            <p>
              {game.me === d.attacker
                ? "Win wipes your rent. Lose forfeits your cash and turf."
                : playing
                  ? "Win eliminates the challenger; a loss wipes the rent they owe you."
                  : "Challenger victory wipes rent; defeat eliminates the challenger and transfers their assets."}
            </p>
            {playing ? (
              <button
                className="button"
                disabled={disabled || d.ready.includes(game.me)}
                onClick={() => act({ type: "duel-ready" })}
              >
                {d.ready.includes(game.me) ? (
                  <>
                    <Check size={18} /> Ready · waiting for rival
                  </>
                ) : (
                  <>
                    Ready up <Crosshair size={18} />
                  </>
                )}
              </button>
            ) : (
              <p>Waiting for both crews to ready up.</p>
            )}
          </div>
        )}
        {!!countdown && !ready && !result && (
          <div className="fps-countdown" role="status">
            {countdown}
            <small>GUNS UP</small>
          </div>
        )}
        {result && (
          <div className="fps-screen-message">
            <strong>
              {game.players.find((p) => p.id === d.winner)?.name} wins.
            </strong>
            <p>
              {d.winner === d.attacker
                ? "Rent wiped. Live to own another block."
                : "The challenger is out. Cash and turf pass to a living teammate, otherwise the landlord."}
            </p>
            {game.me === d.attacker &&
            !game.players.find((p) => p.id === d.attacker).out ? (
              <button
                className="button"
                disabled={disabled}
                onClick={() => act({ type: "end" })}
              >
                Back to the block <ArrowRight size={18} />
              </button>
            ) : (
              <p>Returning to the board…</p>
            )}
          </div>
        )}
        {live && (
          <div className="fps-ammo">
            <strong>{reloading ? "RELOADING" : mine.ammo + " / 6"}</strong>
            <span>
              {duck
                ? "IN COVER"
                : recent
                  ? ownShot.damage
                    ? ownShot.head
                      ? "HEADSHOT +40"
                      : "HIT +25"
                    : "MISSED"
                  : "AIM. FIRE. MOVE."}
            </span>
          </div>
        )}
      </div>
      {playing && !ready && !result && (
        <>
          <div className="fps-controls">
            <button
              disabled={!live}
              onClick={() => act({ type: "duel-move", lane: -1 })}
            >
              <ArrowLeft size={18} /> Dodge left
            </button>
            <button
              disabled={!live || time < mine.duckReady}
              onClick={() => act({ type: "duel-duck" })}
            >
              <Shield size={18} /> Duck
            </button>
            <button
              disabled={!live}
              onClick={() => act({ type: "duel-move", lane: 1 })}
            >
              Dodge right <ArrowRight size={18} />
            </button>
            <button
              disabled={!live || reloading || mine.ammo === 6}
              onClick={() => act({ type: "duel-reload" })}
            >
              <RotateCcw size={18} /> Reload
            </button>
            <button
              disabled={!live || duck || reloading || !mine.ammo}
              onClick={() => fire()}
            >
              <Zap size={18} /> Fire
            </button>
          </div>
          <div className="fps-aim-controls" aria-label="Keyboard aiming">
            <span>Aim</span>
            {[
              ["Left", -0.04, 0],
              ["Up", 0, -0.04],
              ["Down", 0, 0.04],
              ["Right", 0.04, 0],
            ].map(([label, x, y]) => (
              <button
                key={label}
                disabled={!live}
                onClick={() =>
                  setAim((p) => ({
                    x: Math.max(0, Math.min(1, p.x + x)),
                    y: Math.max(0, Math.min(1, p.y + y)),
                  }))
                }
              >
                Aim {label.toLowerCase()}
              </button>
            ))}
          </div>
        </>
      )}
      <p className="fps-help">
        Click or tap to fire · A / D dodge · S center · Space duck · R reload ·
        Enter fires at crosshair. 30 seconds; higher health wins. An exact tie
        protects the landlord. Ready within 25 seconds or concede.
      </p>
    </Modal>
  );
}
