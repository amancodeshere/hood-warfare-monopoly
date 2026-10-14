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
import { renderArena } from "./arenaRenderer.js";
export default function ArenaDuel({ game, act, disabled }) {
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
  });
  const remote = useRef({ ...rival });
  const seq = useRef(mine.inputSeq || 0),
    lastInput = useRef(0),
    lastFire = useRef(0),
    lastKick = useRef(0),
    audio = useRef(null),
    look = useRef(null),
    firing = useRef(false);
  const [now, setNow] = useState(Date.now()),
    [locked, setLocked] = useState(false),
    [sound, setSound] = useState(false),
    [notice, setNotice] = useState(""),
    [showMovement, setShowMovement] = useState(
      () => matchMedia("(pointer: coarse), (max-width: 600px)").matches,
    );
  const offset = (game.serverNow || Date.now()) - Date.now(),
    time = now + offset;
  const ready = d.stage === "ready",
    result = d.stage === "finished",
    countdown = Math.max(0, Math.ceil(((d.startsAt || 0) - time) / 1000));
  const live =
    playing && d.stage === "live" && !countdown && time < d.endsAt && !disabled;
  const reloading = mine.reloadUntil > time;
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
    if (f.hp < (fx.current.hp ?? 100)) fx.current.hurt = Date.now();
    fx.current.hp = f.hp;
    const shot = d.shots.findLast((s) => s.player === viewer && s.damage);
    if (shot && shot.id !== fx.current.hitId) {
      fx.current.hit = Date.now();
      fx.current.hitId = shot.id;
    }
  }, [d.fighters, d.shots, viewer, playing, offset]);
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
      setLocked(document.pointerLockElement === canvas.current);
      stop();
    }
    function key(e) {
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
      if (document.pointerLockElement === canvas.current)
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
      const oscillator = ctx.createOscillator(),
        gain = ctx.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(
        kind === "shot" ? 150 : 70,
        ctx.currentTime,
      );
      oscillator.frequency.exponentialRampToValueAtTime(
        35,
        ctx.currentTime + 0.1,
      );
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.13);
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
    canvas.current?.focus();
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
              max="100"
              value={mine.hp}
            />
            <span>{mine.hp} HP</span>
          </div>
          <div className="arena-clock">
            <strong>
              {ready
                ? money(d.debt)
                : Math.max(0, Math.ceil(((d.endsAt || time) - time) / 1000)) +
                  "s"}
            </strong>
            <span>{ready ? "RENT AT STAKE" : "HIGHER HP WINS"}</span>
          </div>
          <div>
            <strong>{game.players.find((p) => p.id === rivalId)?.name}</strong>
            <meter
              aria-label="Rival health"
              min="0"
              max="100"
              value={rival.hp}
            />
            <span>{rival.hp} HP</span>
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
                <p>Waiting for both crews.</p>
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
