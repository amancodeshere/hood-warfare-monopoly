import React, { useEffect, useRef, useState } from "react";
import {
  Crosshair,
  ArrowRight,
  RotateCcw,
  Footprints,
  MousePointer2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Modal } from "./Modal.jsx";
import { money } from "../shared/board.js";
import { move, angle, clamp, SHOT_DELAY } from "../shared/arena.js";
import { renderArena, spawnArenaSparks } from "./arenaRenderer.js";
import { playGunshot, playKick } from "./audio.js";
import {
  SpectatorReactionPills,
  FloatingReactions,
  useSpectatorReactions,
} from "./SpectatorReactions.jsx";
export default function ArenaDuel({ game, act, disabled, socket }) {
  const d = game.duel,
    playing = !!d.fighters[game.me],
    viewer = playing ? game.me : d.attacker;
  const rivalId = viewer === d.attacker ? d.defender : d.attacker,
    mine = d.fighters[viewer],
    rival = d.fighters[rivalId];
  const canvas = useRef(null),
    current = useRef(null),
    camera = useRef({ ...mine }),
    keys = useRef(new Set()),
    history = useRef([]);
  const fx = useRef({
    shot: 0,
    kick: 0,
    hurt: 0,
    hit: 0,
    steps: 0,
    speed: 0,
    reduced: false,
    reloadUntil: 0,
    sparks: [],
  });
  const remote = useRef({ ...rival });
  const seq = useRef(mine.inputSeq || 0),
    lastInput = useRef(0),
    lastFire = useRef(0),
    lastKick = useRef(0),
    audio = useRef(null),
    look = useRef(null),
    mouseReady = useRef(Infinity),
    firing = useRef(false),
    seenImpacts = useRef(new Set());
  const [now, setNow] = useState(Date.now()),
    [locked, setLocked] = useState(false),
    [sound, setSound] = useState(false),
    [notice, setNotice] = useState(""),
    [damagePulse, setDamagePulse] = useState({
      active: false,
      dir: "front",
      key: 0,
    }),
    [sparkBurst, setSparkBurst] = useState({ active: false, key: 0 }),
    [showMovement, setShowMovement] = useState(
      () => matchMedia("(pointer: coarse), (max-width: 600px)").matches,
    );
  const effectiveSocket =
    socket || (typeof window !== "undefined" ? window.__stb_socket : null);
  const { reactions, sendReaction } = useSpectatorReactions(effectiveSocket);
  const offset = (game.serverNow || Date.now()) - Date.now(),
    time = now + offset;
  const ready = d.stage === "ready",
    result = d.stage === "finished",
    countdown = Math.max(0, Math.ceil(((d.startsAt || 0) - time) / 1000));
  const live =
    playing && d.stage === "live" && !countdown && time < d.endsAt && !disabled;
  const reloading = mine.reloadUntil > time;
  const myBet = d.bets?.find((b) => b.player === game.me),
    hasBet = !!myBet,
    bettingOpen =
      !playing &&
      !result &&
      (ready ||
        (d.stage === "live" &&
          (d.liveAt ? time - d.liveAt <= 5000 : countdown > 0)));
  current.current = {
    game,
    d,
    act,
    live,
    playing,
    viewer,
    sound,
    offset,
    shoot,
    kick,
    reload,
    aim,
  };
  useEffect(() => {
    const f = d.fighters[viewer],
      cam = camera.current;
    if (!playing) Object.assign(cam, f);
    else {
      // Replay unacknowledged movement, then reconcile gently instead of snapping.
      history.current = history.current.filter((i) => i.seq > f.inputSeq);
      const target = { ...f };
      for (const i of history.current) {
        target.yaw = i.yaw;
        move(target, i, i.dt);
      }
      const gap = Math.hypot(target.x - cam.x, target.y - cam.y);
      const weight = gap > 1.4 ? 1 : 0.28;
      cam.x += (target.x - cam.x) * weight;
      cam.y += (target.y - cam.y) * weight;
    }
    fx.current.snapshotAt = Date.now();
    fx.current.reloadUntil = f.reloadUntil - offset;
    if (f.hp < (fx.current.hp ?? f.hp)) {
      fx.current.hurt = Date.now();
      const rivalPos = d.fighters[rivalId] || { x: cam.x + 1, y: cam.y };
      const attackerBearing = Math.atan2(rivalPos.y - cam.y, rivalPos.x - cam.x);
      const relAngle = angle(attackerBearing - cam.yaw);
      let dir = "front";
      if (Math.abs(relAngle) > (3 * Math.PI) / 4) dir = "back";
      else if (relAngle > Math.PI / 4) dir = "right";
      else if (relAngle < -Math.PI / 4) dir = "left";
      setDamagePulse({ active: true, dir, key: Date.now() });
    }
    fx.current.hp = f.hp;
    const shot = d.shots.findLast((s) => s.player === viewer && s.damage);
    if (shot && shot.id !== fx.current.hitId) {
      fx.current.hit = Date.now();
      fx.current.hitId = shot.id;
    }
    for (const s of d.shots || []) {
      if (s.impactAt && !seenImpacts.current.has(s.id)) {
        seenImpacts.current.add(s.id);
        const rivalPos = d.fighters[rivalId] || { x: cam.x, y: cam.y };
        const ix =
          s.impactX ?? (s.damage ? rivalPos.x : cam.x + Math.cos(cam.yaw) * 3);
        const iy =
          s.impactY ?? (s.damage ? rivalPos.y : cam.y + Math.sin(cam.yaw) * 3);
        const iz = s.impactZ ?? (s.head ? 0.95 : 0.6);
        spawnArenaSparks(fx.current, ix, iy, iz, s.damage ? 18 : 10);
        setSparkBurst({ active: true, key: Date.now() });
      }
    }
  }, [d.fighters, d.shots, viewer, playing, offset, rivalId]);
  useEffect(() => {
    if (!damagePulse.active) return;
    const t = setTimeout(
      () => setDamagePulse((p) => ({ ...p, active: false })),
      450,
    );
    return () => clearTimeout(t);
  }, [damagePulse.key, damagePulse.active]);
  useEffect(() => {
    if (!sparkBurst.active) return;
    const t = setTimeout(
      () => setSparkBurst((s) => ({ ...s, active: false })),
      350,
    );
    return () => clearTimeout(t);
  }, [sparkBurst.key, sparkBurst.active]);
  useEffect(() => {
    if (live) canvas.current?.focus({ preventScroll: true });
    if (!live) {
      keys.current.clear();
      firing.current = false;
    }
    if (result && document.pointerLockElement === canvas.current)
      document.exitPointerLock();
  }, [live, result]);
  useEffect(() => {
    const element = canvas.current;
    let frame,
      previous = performance.now(),
      lastHud = 0;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    fx.current.reduced = reduced.matches;
    function loop(stamp) {
      const dt = Math.min(0.05, (stamp - previous) / 1000);
      previous = stamp;
      const c = current.current,
        cam = camera.current,
        k = keys.current;
      if (c.live && !document.hidden) {
        const input = {
          forward: Number(k.has("w") || k.has("z")) - Number(k.has("s")),
          strafe: Number(k.has("d")) - Number(k.has("a") || k.has("q")),
        };
        cam.yaw = angle(
          cam.yaw +
            (Number(k.has("arrowright")) - Number(k.has("arrowleft"))) *
              dt *
              1.7,
        );
        cam.pitch = clamp(
          cam.pitch +
            (Number(k.has("arrowup")) - Number(k.has("arrowdown"))) * dt * 0.8,
          -0.5,
          0.5,
        );
        move(cam, input, dt);
        fx.current.speed = Math.hypot(input.forward, input.strafe);
        fx.current.steps += dt * fx.current.speed;
        if (stamp - lastInput.current >= 50) {
          const packet = {
            type: "duel-input",
            seq: ++seq.current,
            ...input,
            yaw: cam.yaw,
            pitch: cam.pitch,
          };
          history.current.push({
            ...packet,
            dt: Math.min(0.1, (stamp - lastInput.current) / 1000),
          });
          history.current = history.current.slice(-30);
          lastInput.current = stamp;
          c.act(packet);
        }
        if (firing.current || k.has("enter")) c.shoot();
      }
      const el = canvas.current;
      if (el && !document.hidden) {
        const bounds = el.getBoundingClientRect(),
          width = Math.min(900, Math.max(320, Math.round(bounds.width))),
          height = Math.round((width * bounds.height) / bounds.width);
        if (el.width !== width || el.height !== height) {
          el.width = width;
          el.height = height;
        }
        const other = c.viewer === c.d.attacker ? c.d.defender : c.d.attacker;
        const target = c.d.fighters[other],
          smooth = remote.current;
        const weight = 1 - Math.exp(-dt * 20);
        smooth.x += (target.x - smooth.x) * weight;
        smooth.y += (target.y - smooth.y) * weight;
        const scene = {
          ...c.d,
          fighters: {
            ...c.d.fighters,
            [other]: { ...target, x: smooth.x, y: smooth.y },
          },
          projectiles: c.d.projectiles.map((b) => {
            const elapsed = Math.min(
              0.12,
              (Date.now() - (fx.current.snapshotAt || Date.now())) / 1000,
            );
            return {
              ...b,
              x: b.x + b.vx * elapsed,
              y: b.y + b.vy * elapsed,
              z: b.z + b.vz * elapsed,
            };
          }),
        };
        renderArena(
          el.getContext("2d", { alpha: false }),
          cam,
          scene,
          c.viewer,
          Date.now(),
          fx.current,
          c.game?.mapTheme || c.game?.settings?.map,
        );
      }
      if (stamp - lastHud > 100) {
        setNow(Date.now());
        lastHud = stamp;
      }
      frame = requestAnimationFrame(loop);
    }
    function stop() {
      keys.current.clear();
      firing.current = false;
      look.current = null;
    }
    function lock() {
      const captured = document.pointerLockElement === element;
      // Native cursor recentering is not player aim. Let the lock transition settle.
      mouseReady.current = captured ? performance.now() + 120 : Infinity;
      setLocked(captured);
      stop();
    }
    function key(e) {
      if (e.key === "Escape" && document.pointerLockElement === element) {
        mouseReady.current = Infinity;
        document.exitPointerLock();
        stop();
        return;
      }
      if (
        /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) ||
        !current.current.live
      )
        return;
      const key = e.key.toLowerCase();
      if (
        [
          "w",
          "a",
          "s",
          "d",
          "q",
          "z",
          "arrowleft",
          "arrowright",
          "arrowup",
          "arrowdown",
          " ",
          "r",
          "enter",
        ].includes(key)
      ) {
        if ((key === " " || key === "enter") && e.target.tagName === "BUTTON")
          return;
        e.preventDefault();
        keys.current.add(key);
        if (!e.repeat && key === " ") current.current.kick();
        if (!e.repeat && key === "r") current.current.reload();
      }
    }
    function up(e) {
      keys.current.delete(e.key.toLowerCase());
    }
    function mouse(e) {
      if (
        document.pointerLockElement === element &&
        performance.now() >= mouseReady.current
      )
        current.current.aim(e.movementX, e.movementY);
    }
    document.addEventListener("keydown", key);
    document.addEventListener("keyup", up);
    document.addEventListener("mousemove", mouse);
    document.addEventListener("pointerlockchange", lock);
    window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", stop);
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      stop();
      document.removeEventListener("keydown", key);
      document.removeEventListener("keyup", up);
      document.removeEventListener("mousemove", mouse);
      document.removeEventListener("pointerlockchange", lock);
      window.removeEventListener("blur", stop);
      document.removeEventListener("visibilitychange", stop);
      if (document.pointerLockElement === element) document.exitPointerLock();
      audio.current?.close();
    };
  }, []);
  function tone(kind) {
    if (!current.current.sound) return;
    try {
      const ctx = audio.current || (audio.current = new AudioContext());
      ctx.resume();
      if (kind === "shot") {
        playGunshot(ctx);
      } else {
        playKick(ctx);
      }
    } catch {
      /* Sound is optional. */
    }
  }
  function shoot() {
    const c = current.current,
      f = c.d.fighters[c.viewer],
      at = Date.now(),
      serverAt = at + c.offset;
    if (
      !c.live ||
      !f.ammo ||
      f.reloadUntil > serverAt ||
      at - lastFire.current < SHOT_DELAY + 25
    )
      return;
    lastFire.current = at;
    fx.current.shot = at;
    tone("shot");
    c.act({
      type: "duel-fire",
      yaw: camera.current.yaw,
      pitch: camera.current.pitch,
    });
  }
  function kick() {
    const c = current.current,
      at = Date.now();
    if (!c.live || at - lastKick.current < 880) return;
    lastKick.current = at;
    fx.current.kick = at;
    tone("kick");
    c.act({
      type: "duel-kick",
      yaw: camera.current.yaw,
      pitch: camera.current.pitch,
    });
  }
  function reload() {
    const c = current.current,
      f = c.d.fighters[c.viewer];
    if (c.live && f.ammo < 6 && !f.reloadUntil) c.act({ type: "duel-reload" });
  }
  function aim(dx, dy) {
    if (!current.current.live) return;
    camera.current.yaw = angle(camera.current.yaw + dx * 0.0035);
    camera.current.pitch = clamp(camera.current.pitch - dy * 0.0035, -0.5, 0.5);
  }
  async function capture() {
    if (document.pointerLockElement === canvas.current) {
      mouseReady.current = Infinity;
      document.exitPointerLock();
      return;
    }
    canvas.current?.focus();
    mouseReady.current = Infinity;
    try {
      await canvas.current.requestPointerLock();
      setNotice("");
    } catch {
      setNotice(
        "Mouse capture unavailable. Drag the arena to aim, or use arrow keys.",
      );
    }
    canvas.current?.focus();
  }
  function hold(key, label) {
    return (
      <button
        aria-label={label}
        disabled={!live}
        onPointerDown={(e) => {
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          keys.current.add(key);
        }}
        onPointerUp={() => keys.current.delete(key)}
        onPointerCancel={() => keys.current.delete(key)}
        onLostPointerCapture={() => keys.current.delete(key)}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            keys.current.add(key);
          }
        }}
        onKeyUp={() => keys.current.delete(key)}
        onBlur={() => keys.current.delete(key)}
      >
        {label}
      </button>
    );
  }
  const shot = d.shots.findLast((s) => s.player === viewer),
    recent = shot && time - (shot.impactAt || shot.at) < 1000;
  return (
    <Modal title={result ? "The score is settled." : "Rent due. Guns up."} wide>
      <div className="arena-duel">
        <div className="arena-scoreboard">
          <div>
            <strong>
              {playing
                ? "You"
                : game.players.find((p) => p.id === viewer)?.name}
            </strong>
            <meter
              aria-label={playing ? "Your health" : "Challenger health"}
              min="0"
              max={d.highStakes ? 115 : 100}
              value={mine.hp}
            />
            <span>
              {mine.hp} HP
              {d.highStakes && viewer === d.defender ? " · ARMOR" : ""}
            </span>
          </div>
          <div className="arena-clock">
            <strong>
              {ready
                ? money(d.debt)
                : Math.max(0, Math.ceil(((d.endsAt || time) - time) / 1000)) +
                  "s"}
            </strong>
            <span>
              {ready
                ? d.highStakes
                  ? "HIGH-STAKES RENT"
                  : "RENT AT STAKE"
                : "HIGHER HP WINS"}
            </span>
            {d.highStakes && (
              <small className="arena-bounty-tag">+$200 BOUNTY</small>
            )}
          </div>
          <div>
            <strong>{game.players.find((p) => p.id === rivalId)?.name}</strong>
            <meter
              aria-label="Rival health"
              min="0"
              max={d.highStakes ? 115 : 100}
              value={rival.hp}
            />
            <span>
              {rival.hp} HP
              {d.highStakes && rivalId === d.defender ? " · ARMOR" : ""}
            </span>
          </div>
        </div>
        <div className="arena-stage">
          <canvas
            ref={canvas}
            className="arena-canvas"
            role="application"
            aria-label="First-person rent arena. WASD to move, arrow keys or mouse to aim, Enter to fire, Space to kick, R to reload."
            tabIndex={0}
            onPointerDown={(e) => {
              if (!live) return;
              canvas.current.focus();
              if (!locked) {
                e.currentTarget.setPointerCapture(e.pointerId);
                look.current = { x: e.clientX, y: e.clientY };
              }
              if (e.pointerType !== "touch") {
                firing.current = true;
                shoot();
              }
            }}
            onPointerMove={(e) => {
              if (look.current && !locked) {
                aim(e.clientX - look.current.x, e.clientY - look.current.y);
                look.current = { x: e.clientX, y: e.clientY };
              }
            }}
            onPointerUp={() => {
              firing.current = false;
              look.current = null;
            }}
            onPointerCancel={() => {
              firing.current = false;
              look.current = null;
            }}
            onLostPointerCapture={() => {
              firing.current = false;
              look.current = null;
            }}
          />
          {damagePulse.active && (
            <div
              key={`vignette-${damagePulse.key}`}
              className={`arena-damage-vignette active from-${damagePulse.dir}`}
              aria-hidden="true"
            />
          )}
          {damagePulse.active && (
            <div
              key={`indicator-${damagePulse.key}`}
              className={`arena-hit-indicator dir-${damagePulse.dir}`}
              aria-hidden="true"
            />
          )}
          {sparkBurst.active && (
            <div
              key={`spark-${sparkBurst.key}`}
              className="arena-spark-burst"
              aria-hidden="true"
            >
              <span className="spark s1" />
              <span className="spark s2" />
              <span className="spark s3" />
              <span className="spark s4" />
              <span className="spark s5" />
              <span className="spark s6" />
              <span className="spark s7" />
              <span className="spark s8" />
            </div>
          )}
          <FloatingReactions reactions={reactions} />
          <div className="arena-hud" aria-live="off">
            <strong>{reloading ? "RELOADING" : mine.ammo + " / 6"}</strong>
            <span>
              {recent
                ? shot.pending
                  ? "SHOT AWAY"
                  : shot.damage
                    ? (shot.head ? "HEADSHOT" : "HIT") + " +" + shot.damage
                    : shot.kick
                      ? "KICK MISSED"
                      : "MISSED"
                : "MOVE. AIM. SETTLE IT."}
            </span>
          </div>
          {ready && (
            <div className="arena-message">
              <strong>
                RENT DUE.
                <br />
                GUNS UP.
              </strong>
              <p>
                Move through the alley. Dodge red bullets. Six shots, then
                reload. Get close and kick.
              </p>
              {d.highStakes && (
                <p className="arena-high-stakes-notice">
                  ⚡ <strong>HIGH-STAKES DUEL:</strong> Landlord starts with 115
                  HP (+15 Armor). Challenger victory loots a $200 Street Bounty!
                </p>
              )}
              <p>
                {game.me === d.attacker
                  ? "Win wipes your rent. Lose forfeits your cash and turf."
                  : playing
                    ? "Win eliminates the challenger; a loss wipes the rent they owe you."
                    : "Challenger victory wipes rent; defeat eliminates the challenger."}
              </p>
              {playing ? (
                <button
                  className="button"
                  disabled={disabled || d.ready.includes(game.me)}
                  onClick={() => act({ type: "duel-ready" })}
                >
                  {d.ready.includes(game.me)
                    ? "Ready · waiting for rival"
                    : "Ready up"}{" "}
                  <Crosshair size={18} />
                </button>
              ) : (
                <div className="spectator-betting">
                  <p>Spectator Side-Bets (2x Payout):</p>
                  <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap", marginTop: "8px" }}>
                    <button
                      className="button secondary"
                      disabled={disabled || d.bets?.some((b) => b.player === game.me) || (game.players.find((p) => p.id === game.me)?.cash || 0) < 50}
                      onClick={() => act({ type: "duel-bet", amount: 50, pick: d.attacker })}
                    >
                      $50 on {game.players.find((p) => p.id === d.attacker)?.name || "Challenger"}
                    </button>
                    <button
                      className="button secondary"
                      disabled={disabled || d.bets?.some((b) => b.player === game.me) || (game.players.find((p) => p.id === game.me)?.cash || 0) < 50}
                      onClick={() => act({ type: "duel-bet", amount: 50, pick: d.defender })}
                    >
                      $50 on {game.players.find((p) => p.id === d.defender)?.name || "Landlord"}
                    </button>
                    <button
                      className="button secondary"
                      disabled={disabled || d.bets?.some((b) => b.player === game.me) || (game.players.find((p) => p.id === game.me)?.cash || 0) < 100}
                      onClick={() => act({ type: "duel-bet", amount: 100, pick: d.attacker })}
                    >
                      $100 on {game.players.find((p) => p.id === d.attacker)?.name || "Challenger"}
                    </button>
                    <button
                      className="button secondary"
                      disabled={disabled || d.bets?.some((b) => b.player === game.me) || (game.players.find((p) => p.id === game.me)?.cash || 0) < 100}
                      onClick={() => act({ type: "duel-bet", amount: 100, pick: d.defender })}
                    >
                      $100 on {game.players.find((p) => p.id === d.defender)?.name || "Landlord"}
                    </button>
                  </div>
                  {d.bets?.some((b) => b.player === game.me) && (
                    <p style={{ marginTop: "6px", color: "var(--lime, #c6ed72)", fontSize: "12px" }}>
                      Bet placed! Backing{" "}
                      {game.players.find((p) => p.id === d.bets.find((b) => b.player === game.me)?.pick)?.name} for{" "}
                      ${d.bets.find((b) => b.player === game.me)?.amount} (2x payout).
                    </p>
                  )}
                  <div style={{ marginTop: "10px", display: "flex", justifyContent: "center" }}>
                    <SpectatorReactionPills onReact={sendReaction} disabled={disabled} />
                  </div>
                </div>
              )}
            </div>
          )}
          {!!countdown && !ready && !result && (
            <div className="arena-countdown" role="status">
              {countdown}
              <small>GET READY</small>
            </div>
          )}
          {result && (
            <div className="arena-message">
              <strong>
                {game.players.find((p) => p.id === d.winner)?.name} wins.
              </strong>
              <p>
                {d.winner === d.attacker
                  ? d.highStakes
                    ? `Rent wiped and $${d.bounty ?? 200} Street Bounty looted! Live to own another block.`
                    : "Rent wiped. Live to own another block."
                  : game.settings?.killerTakesAll
                    ? "Killer takes all: the landlord inherits the challenger’s properties, including buildings and mortgages."
                    : "The challenger is out. Their properties return to the board with buildings and mortgages cleared."}
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
        </div>
        {playing && !ready && !result && (
          <>
            <div className="arena-actions">
              <button
                className="arena-capture"
                onClick={capture}
                disabled={!live}
              >
                <MousePointer2 size={17} />
                {locked ? "Mouse captured · Esc releases" : "Capture mouse"}
              </button>
              <button
                onClick={shoot}
                disabled={!live || reloading || !mine.ammo}
              >
                <Crosshair size={17} />
                Fire
              </button>
              <button onClick={kick} disabled={!live}>
                <Footprints size={17} />
                Kick
              </button>
              <button
                onClick={reload}
                disabled={!live || reloading || mine.ammo === 6}
              >
                <RotateCcw size={17} />
                Reload
              </button>
              <button
                className="arena-movement-toggle"
                aria-expanded={showMovement}
                onClick={() => setShowMovement(!showMovement)}
              >
                Movement controls
              </button>
              <button
                onClick={() => setSound(!sound)}
                aria-label={sound ? "Mute shootout" : "Enable shootout sound"}
                aria-pressed={sound}
              >
                {sound ? <Volume2 size={17} /> : <VolumeX size={17} />} Sound
              </button>
            </div>
            {showMovement && (
              <div
                className="arena-touch"
                aria-label="Touch and keyboard movement"
              >
                {hold("w", "Move forward")}
                {hold("s", "Move back")}
                {hold("a", "Strafe left")}
                {hold("d", "Strafe right")}
                {hold("arrowleft", "Aim left")}
                {hold("arrowright", "Aim right")}
              </div>
            )}
          </>
        )}
        {!playing && !ready && !result && (bettingOpen || hasBet) && (
          <div
            className="spectator-betting-bar"
            style={{
              padding: "10px 14px",
              background: "rgba(0, 0, 0, 0.45)",
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
              textAlign: "center",
            }}
          >
            <p
              style={{
                margin: "0 0 6px",
                fontSize: "12px",
                fontWeight: "bold",
                color: "#fce7b0",
              }}
            >
              {bettingOpen && !hasBet
                ? "🎲 Spectator Side-Bets Open (First 5s of Shootout · 2x Payout):"
                : "🎲 Active Shootout Side-Bet:"}
            </p>
            {bettingOpen && !hasBet && (
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                <button
                  className="button secondary"
                  disabled={
                    disabled ||
                    (game.players.find((p) => p.id === game.me)?.cash || 0) < 50
                  }
                  onClick={() =>
                    act({ type: "duel-bet", amount: 50, pick: d.attacker })
                  }
                >
                  $50 on{" "}
                  {game.players.find((p) => p.id === d.attacker)?.name ||
                    "Challenger"}
                </button>
                <button
                  className="button secondary"
                  disabled={
                    disabled ||
                    (game.players.find((p) => p.id === game.me)?.cash || 0) < 50
                  }
                  onClick={() =>
                    act({ type: "duel-bet", amount: 50, pick: d.defender })
                  }
                >
                  $50 on{" "}
                  {game.players.find((p) => p.id === d.defender)?.name ||
                    "Landlord"}
                </button>
                <button
                  className="button secondary"
                  disabled={
                    disabled ||
                    (game.players.find((p) => p.id === game.me)?.cash || 0) < 100
                  }
                  onClick={() =>
                    act({ type: "duel-bet", amount: 100, pick: d.attacker })
                  }
                >
                  $100 on{" "}
                  {game.players.find((p) => p.id === d.attacker)?.name ||
                    "Challenger"}
                </button>
                <button
                  className="button secondary"
                  disabled={
                    disabled ||
                    (game.players.find((p) => p.id === game.me)?.cash || 0) < 100
                  }
                  onClick={() =>
                    act({ type: "duel-bet", amount: 100, pick: d.defender })
                  }
                >
                  $100 on{" "}
                  {game.players.find((p) => p.id === d.defender)?.name ||
                    "Landlord"}
                </button>
              </div>
            )}
            {hasBet && (
              <p
                style={{
                  margin: "4px 0 0",
                  color: "var(--lime, #c6ed72)",
                  fontSize: "12px",
                  fontWeight: "bold",
                }}
              >
                Bet placed! Backing{" "}
                {game.players.find((p) => p.id === myBet.pick)?.name ||
                  "Shooter"}{" "}
                for ${myBet.amount} (pays ${myBet.amount * 2}).
              </p>
            )}
          </div>
        )}
        {!playing && !ready && (
          <div style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}>
            <SpectatorReactionPills onReact={sendReaction} disabled={disabled} />
          </div>
        )}
        {notice && (
          <p role="status" className="arena-notice">
            {notice}
          </p>
        )}
        <p className="arena-help">
          WASD / ZQSD move · Mouse / arrows aim · Hold click / Enter to fire ·
          Space kicks · R reloads. On touch, drag the arena to aim and hold
          movement controls. 30 seconds; higher health wins, ties protect the
          landlord. Ready within 25 seconds.
        </p>
      </div>
    </Modal>
  );
}
