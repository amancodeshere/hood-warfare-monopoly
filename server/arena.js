import {
  move,
  angle,
  clamp,
  wall,
  sight,
  BULLET_SPEED,
  SHOT_DELAY,
  RELOAD_MS,
} from "../shared/arena.js";
const check = (ok, message) => {
  if (!ok) throw new Error(message);
};
export function arenaFighters(ids, options = {}) {
  const defenderId = options.defender ?? ids[1];
  return Object.fromEntries(
    ids.map((id, i) => [
      id,
      {
        hp: options.highStakes && id === defenderId ? 115 : 100,
        ammo: 6,
        x: i ? 9.5 : 2.5,
        y: 6.5,
        yaw: i ? Math.PI : 0,
        pitch: -0.055,
        input: { forward: 0, strafe: 0 },
        inputAt: 0,
        inputSeq: 0,
        lastShot: 0,
        lastKick: 0,
        reloadUntil: 0,
        damage: 0,
        shots: 0,
        hits: 0,
      },
    ]),
  );
}
function aim(a) {
  check(
    Number.isFinite(a.yaw) &&
      Number.isFinite(a.pitch) &&
      Math.abs(a.yaw) <= 1000 &&
      Math.abs(a.pitch) <= 0.55,
    "Aim inside the arena.",
  );
}
export function arenaAction(d, id, a, now) {
  const f = d.fighters[id],
    other = id === d.attacker ? d.defender : d.attacker,
    rival = d.fighters[other];
  if (a.type === "duel-input") {
    aim(a);
    check(
      Number.isInteger(a.seq) && a.seq >= 0 && a.seq <= Number.MAX_SAFE_INTEGER,
      "Invalid movement sequence.",
    );
    check(
      Number.isFinite(a.forward) &&
        Math.abs(a.forward) <= 1 &&
        Number.isFinite(a.strafe) &&
        Math.abs(a.strafe) <= 1,
      "Choose a valid movement.",
    );
    if (a.seq <= f.inputSeq) return;
    f.inputSeq = a.seq;
    f.inputAt = now;
    f.yaw = angle(a.yaw);
    f.pitch = a.pitch;
    f.input = { forward: a.forward, strafe: a.strafe };
  } else if (a.type === "duel-reload") {
    check(
      !f.reloadUntil && f.ammo < 6,
      "Your magazine is full or already reloading.",
    );
    f.reloadUntil = now + RELOAD_MS;
  } else if (a.type === "duel-fire") {
    aim(a);
    check(!f.reloadUntil && f.ammo > 0, "Reload your magazine first.");
    check(now - f.lastShot >= SHOT_DELAY, "Let your next shot settle.");
    f.yaw = angle(a.yaw);
    f.pitch = a.pitch;
    f.lastShot = now;
    f.ammo--;
    f.shots++;
    const bullet = {
      id: ++d.sequence,
      player: id,
      x: f.x,
      y: f.y,
      z: 0.8,
      vx: Math.cos(f.yaw) * BULLET_SPEED,
      vy: Math.sin(f.yaw) * BULLET_SPEED,
      vz: Math.tan(f.pitch) * BULLET_SPEED,
      at: now,
    };
    d.projectiles.push(bullet);
    d.shots.push({
      id: bullet.id,
      player: id,
      at: now,
      damage: 0,
      head: false,
      pending: true,
    });
    d.shots = d.shots.slice(-12);
  } else if (a.type === "duel-kick") {
    aim(a);
    check(now - f.lastKick >= 850, "Let your kick recover.");
    f.yaw = angle(a.yaw);
    f.lastKick = now;
    const bearing = Math.atan2(rival.y - f.y, rival.x - f.x);
    const hit =
      Math.hypot(rival.x - f.x, rival.y - f.y) < 1.4 &&
      Math.abs(angle(bearing - f.yaw)) < 0.65 &&
      sight(f.x, f.y, rival.x, rival.y);
    const kickDamage = 30 + (f.kickBonus || 0);
    if (hit) {
      rival.hp = Math.max(0, rival.hp - kickDamage);
      f.damage += kickDamage;
      f.hits++;
      const yaw = rival.yaw;
      rival.yaw = bearing;
      move(rival, { forward: 1, strafe: 0 }, 0.12);
      rival.yaw = yaw;
    }
    d.shots.push({
      id: ++d.sequence,
      player: id,
      at: now,
      damage: hit ? kickDamage : 0,
      kick: true,
    });
    d.shots = d.shots.slice(-12);
  } else throw new Error("Choose an arena control.");
}
export function arenaTick(d, now) {
  if (d.stage !== "live" || now < d.startsAt) return false;
  const end = Math.min(now, d.endsAt),
    start = Math.max(d.tickAt || d.startsAt, d.startsAt);
  // Bound catch-up after a suspended process; never teleport a fighter across the map.
  const seconds = clamp((end - start) / 1000, 0, 0.15);
  d.tickAt = end;
  if (!seconds) return false;
  for (const f of Object.values(d.fighters)) {
    if (f.reloadUntil && end >= f.reloadUntil) {
      f.ammo = 6;
      f.reloadUntil = 0;
    }
    if (end - f.inputAt < 250 && f.hp > 0) move(f, f.input, seconds);
  }
  d.projectiles = d.projectiles.filter((b) => {
    const target =
      d.fighters[b.player === d.attacker ? d.defender : d.attacker];
    const flightSeconds = Math.min(seconds, Math.max(0, (end - b.at) / 1000));
    const steps = Math.ceil((flightSeconds * BULLET_SPEED) / 0.08),
      dt = steps ? flightSeconds / steps : 0;
    for (let i = 0; i < steps; i++) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.z += b.vz * dt;
      if (wall(b.x, b.y) || b.z < 0 || b.z > 1.5 || end - b.at > 1600) {
        finish(b, 0, false);
        return false;
      }
      if (
        Math.hypot(b.x - target.x, b.y - target.y) < 0.29 &&
        b.z > 0.08 &&
        b.z < 1.08
      ) {
        const head = b.z > 0.82,
          damage = head ? 40 : 25;
        target.hp = Math.max(0, target.hp - damage);
        const f = d.fighters[b.player];
        f.damage += damage;
        f.hits++;
        finish(b, damage, head);
        return false;
      }
    }
    return true;
  });
  function finish(b, damage, head) {
    const s = d.shots.find((s) => s.id === b.id);
    if (s)
      Object.assign(s, {
        damage,
        head,
        pending: false,
        impactAt: end,
        impactX: b.x,
        impactY: b.y,
        impactZ: b.z,
      });
  }
  return true;
}
export function arenaBot(d, id, rng, now) {
  const f = d.fighters[id],
    rival = d.fighters[id === d.attacker ? d.defender : d.attacker];
  if (f.reloadUntil) return null;
  const distance = Math.hypot(rival.x - f.x, rival.y - f.y),
    yaw = Math.atan2(rival.y - f.y, rival.x - f.x);
  if (distance < 1.3 && now - f.lastKick >= 850)
    return { type: "duel-kick", yaw, pitch: 0 };
  if (!f.ammo) return { type: "duel-reload" };
  if (sight(f.x, f.y, rival.x, rival.y) && now - f.lastShot >= 500)
    return {
      type: "duel-fire",
      yaw: yaw + (rng(11) - 5) * 0.013,
      pitch: -0.035,
    };
  return {
    type: "duel-input",
    seq: f.inputSeq + 1,
    forward: distance > 3 ? 1 : 0,
    strafe: wall(f.x + Math.cos(yaw) * 0.6, f.y + Math.sin(yaw) * 0.6) ? 1 : 0,
    yaw,
    pitch: 0,
  };
}
