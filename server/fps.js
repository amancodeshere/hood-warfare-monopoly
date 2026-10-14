import { arenaFighters, arenaAction, arenaTick, arenaBot } from "./arena.js";
// Coordinates are normalized to the alley viewport. The server owns aim checks,
// ammunition, cooldowns, cover, health, and settlement; clients never send damage.
const check = (ok, message) => {
  if (!ok) throw new Error(message);
};
export function createFPS(ids, arena = false) {
  return {
    mode: "fps",
    ...(arena ? { arena: true, projectiles: [], tickAt: 0 } : {}),
    stage: "ready",
    ready: [],
    fighters: arena
      ? arenaFighters(ids)
      : Object.fromEntries(
          ids.map((id) => [
            id,
            {
              hp: 100,
              ammo: 6,
              lane: 0,
              lastShot: 0,
              lastMove: 0,
              duckUntil: 0,
              duckReady: 0,
              reloadUntil: 0,
              damage: 0,
              shots: 0,
              hits: 0,
            },
          ]),
        ),
    shots: [],
    sequence: 0,
  };
}
export function fpsTarget(f, now) {
  return { x: 0.5 + f.lane * 0.23, duck: f.duckUntil > now };
}
export function fpsWinner(d, now) {
  const ids = [d.attacker, d.defender];
  if (d.stage !== "live") return null;
  const dead = ids.find((id) => d.fighters[id].hp <= 0);
  if (dead) return ids.find((id) => id !== dead);
  if (now < d.endsAt) return null;
  // Defender holds the block on an exact tie; no hidden random coin toss.
  return d.fighters[ids[0]].hp > d.fighters[ids[1]].hp ? ids[0] : ids[1];
}
export function fpsAction(d, id, action, now = Date.now()) {
  check([d.attacker, d.defender].includes(id), "You are not in this duel.");
  const f = d.fighters[id],
    other = id === d.attacker ? d.defender : d.attacker,
    rival = d.fighters[other];
  if (action.type === "duel-ready") {
    check(d.stage === "ready", "The shootout has already started.");
    check(!d.ready.includes(id), "You are already ready.");
    d.ready.push(id);
    if (d.ready.length === 2) {
      d.stage = "live";
      d.startsAt = now + 3000;
      d.endsAt = d.startsAt + 30000;
    }
    return;
  }
  check(
    d.stage === "live" &&
      now >= d.startsAt &&
      now < d.endsAt &&
      !d.winner &&
      f.hp > 0 &&
      rival.hp > 0,
    "Wait for the countdown, or return to the board after the duel.",
  );
  if (f.reloadUntil && now >= f.reloadUntil) {
    f.ammo = 6;
    f.reloadUntil = 0;
  }
  if (d.arena) return arenaAction(d, id, action, now);
  if (action.type === "duel-move") {
    check([-1, 0, 1].includes(action.lane), "Choose left, center, or right.");
    check(now - f.lastMove >= 150, "Move again in a moment.");
    f.lane = action.lane;
    f.lastMove = now;
  } else if (action.type === "duel-duck") {
    check(now >= f.duckReady, "Cover needs a moment to recover.");
    f.duckUntil = now + 700;
    f.duckReady = now + 1900;
  } else if (action.type === "duel-reload") {
    check(
      !f.reloadUntil && f.ammo < 6,
      "Your magazine is full or already reloading.",
    );
    f.reloadUntil = now + 1300;
  } else if (action.type === "duel-fire") {
    check(
      Number.isFinite(action.x) &&
        Number.isFinite(action.y) &&
        action.x >= 0 &&
        action.x <= 1 &&
        action.y >= 0 &&
        action.y <= 1,
      "Aim inside the alley.",
    );
    check(!f.reloadUntil && f.ammo > 0, "Reload your magazine first.");
    check(now - f.lastShot >= 400, "Let your next shot settle.");
    check(now >= f.duckUntil, "Stand up before firing.");
    f.lastShot = now;
    f.ammo--;
    f.shots++;
    const target = fpsTarget(rival, now),
      headY = target.duck ? 0.57 : 0.35;
    const head =
      ((action.x - target.x) / 0.046) ** 2 +
        ((action.y - headY) / 0.065) ** 2 <=
      1;
    const body =
      Math.abs(action.x - target.x) <= 0.075 &&
      action.y >= (target.duck ? 0.64 : 0.43) &&
      action.y <= (target.duck ? 0.82 : 0.78);
    // Cover blocks torso shots; an exposed head can still be hit.
    const damage = head ? 40 : body && !target.duck ? 25 : 0;
    rival.hp = Math.max(0, rival.hp - damage);
    f.damage += damage;
    if (damage) f.hits++;
    d.shots.push({
      id: ++d.sequence,
      player: id,
      x: action.x,
      y: action.y,
      damage,
      head,
      at: now,
    });
    d.shots = d.shots.slice(-8);
  } else throw new Error("Choose a shootout control.");
}
export function fpsBot(d, id, rng, now = Date.now()) {
  if (d.stage === "ready")
    return d.ready.includes(id) ? null : { type: "duel-ready" };
  if (now < d.startsAt || now >= d.endsAt) return null;
  if (d.arena) return arenaBot(d, id, rng, now);
  const f = d.fighters[id],
    rival = d.fighters[id === d.attacker ? d.defender : d.attacker];
  if (f.reloadUntil) return null;
  if (!f.ammo) return { type: "duel-reload" };
  const pick = rng(10);
  if (pick < 2) return { type: "duel-move", lane: rng(3) - 1 };
  if (pick === 2 && now >= f.duckReady) return { type: "duel-duck" };
  if (now < f.duckUntil) return null;
  const target = fpsTarget(rival, now);
  return {
    type: "duel-fire",
    x: Math.min(0.99, Math.max(0.01, target.x + (rng(25) - 12) / 100)),
    y: target.duck ? 0.57 : 0.53,
  };
}
export function fpsTick(d, now = Date.now()) {
  if (d.arena) return arenaTick(d, now);
  let changed = false;
  for (const f of Object.values(d.fighters)) {
    if (f.reloadUntil && now >= f.reloadUntil) {
      f.ammo = 6;
      f.reloadUntil = 0;
      changed = true;
    }
    if (f.duckUntil && now >= f.duckUntil) {
      f.duckUntil = 0;
      changed = true;
    }
  }
  return changed;
}
export function shiftFPS(d, delta) {
  if (d?.mode !== "fps") return;
  for (const key of ["startsAt", "endsAt", "tickAt"])
    if (d[key]) d[key] += delta;
  if (d.arena) {
    for (const b of d.projectiles) b.at += delta;
    for (const s of d.shots) {
      s.at += delta;
      if (s.impactAt) s.impactAt += delta;
    }
  }
  for (const f of Object.values(d.fighters))
    for (const key of [
      "lastKick",
      "inputAt",
      "lastShot",
      "lastMove",
      "duckUntil",
      "duckReady",
      "reloadUntil",
    ])
      if (f[key]) f[key] += delta;
}
