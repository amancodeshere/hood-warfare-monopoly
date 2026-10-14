import test from "node:test";
import assert from "node:assert/strict";
import {
  createFPS,
  fpsAction,
  fpsTick,
  fpsWinner,
  fpsBot,
  shiftFPS,
} from "../server/fps.js";
import { clear, move, SPEED } from "../shared/arena.js";
function fixture() {
  const d = { ...createFPS(["a", "b"], true), attacker: "a", defender: "b" };
  fpsAction(d, "a", { type: "duel-ready" }, 1000);
  fpsAction(d, "b", { type: "duel-ready" }, 1000);
  return d;
}
const input = (seq, extra = {}) => ({
  type: "duel-input",
  seq,
  forward: 1,
  strafe: 0,
  yaw: 0,
  pitch: 0,
  ...extra,
});
function ticks(d, from, to) {
  for (let at = from; at <= to; at += 50) fpsTick(d, at);
}
test("arena movement is server bounded, diagonal normalized, blocked by walls, and stale inputs stop", () => {
  const d = fixture(),
    f = d.fighters.a;
  fpsAction(d, "a", input(1, { forward: 1, strafe: 1 }), 4000);
  ticks(d, 4050, 4200);
  assert(Math.abs(Math.hypot(f.x - 2.5, f.y - 6.5) - SPEED * 0.2) < 0.001);
  const old = { x: f.x, y: f.y };
  ticks(d, 4250, 5000);
  assert(Math.hypot(f.x - old.x, f.y - old.y) < 0.2);
  fpsAction(d, "a", input(1, { yaw: 2 }), 5000);
  assert.equal(f.yaw, 0);
  assert.throws(
    () => fpsAction(d, "a", input(2, { forward: 999, x: 100 }), 5000),
    /valid movement/,
  );
  assert.throws(() => fpsAction(d, "a", input(2, { yaw: NaN }), 5000), /Aim/);
  assert.throws(() => fpsAction(d, "watcher", input(2), 5000), /not in/);
  const atWall = { x: 1.3, y: 1.3, yaw: Math.PI };
  for (let i = 0; i < 100; i++) move(atWall, { forward: 1, strafe: 0 }, 0.05);
  assert(clear(atWall.x, atWall.y));
  assert(atWall.x >= 1.24);
  const before = f.x;
  fpsAction(d, "a", input(2), 5100);
  fpsTick(d, 5200);
  assert(f.x - before <= SPEED * 0.15);
});
test("projectiles take travel time, damage comes from collisions, cover blocks them, and magazines reload", () => {
  const d = fixture();
  fpsAction(d, "a", { type: "duel-fire", yaw: 0, pitch: 0, damage: 999 }, 4000);
  assert.equal(d.fighters.b.hp, 100);
  ticks(d, 4050, 4550);
  assert.equal(d.fighters.b.hp, 75);
  assert.equal(d.projectiles.length, 0);
  assert.throws(
    () => fpsAction(d, "a", { type: "duel-fire", yaw: 0, pitch: 0 }, 4001),
    /settle/,
  );
  d.fighters.b.y = 3.5;
  d.fighters.a.y = 3.5;
  fpsAction(d, "a", { type: "duel-fire", yaw: 0, pitch: 0.02 }, 4600);
  ticks(d, 4650, 5200);
  assert.equal(d.fighters.b.hp, 75);
  for (let i = 0; i < 4; i++) {
    const now = 5300 + i * 300;
    fpsAction(d, "a", { type: "duel-fire", yaw: Math.PI, pitch: 0 }, now);
    ticks(d, now + 50, now + 300);
  }
  assert.equal(d.fighters.a.ammo, 0);
  assert.throws(
    () => fpsAction(d, "a", { type: "duel-fire", yaw: 0, pitch: 0 }, 7000),
    /Reload/,
  );
  fpsAction(d, "a", { type: "duel-reload" }, 7000);
  ticks(d, 7050, 8100);
  assert.equal(d.fighters.a.ammo, 6);
});
test("kick checks range, facing, cooldown, and walls; headshots and timeout settle deterministically", () => {
  const d = fixture();
  fpsAction(d, "a", { type: "duel-kick", yaw: 0, pitch: 0 }, 4000);
  assert.equal(d.fighters.b.hp, 100);
  d.fighters.b.x = 3.5;
  fpsAction(d, "a", { type: "duel-kick", yaw: Math.PI, pitch: 0 }, 4900);
  assert.equal(d.fighters.b.hp, 100);
  fpsAction(d, "a", { type: "duel-kick", yaw: 0, pitch: 0 }, 5800);
  assert.equal(d.fighters.b.hp, 70);
  assert.throws(
    () => fpsAction(d, "a", { type: "duel-kick", yaw: 0, pitch: 0 }, 5801),
    /recover/,
  );
  const head = fixture();
  for (let i = 0; i < 3; i++) {
    const at = 4000 + i * 600;
    fpsAction(head, "a", { type: "duel-fire", yaw: 0, pitch: 0.015 }, at);
    ticks(head, at + 50, at + 550);
  }
  assert.equal(head.fighters.b.hp, 0);
  assert.equal(fpsWinner(head, 5800), "a");
  assert.equal(fpsWinner(fixture(), 34000), "b");
});
test("arena pauses shift inputs and airborne bullets, and bots complete with valid bounded actions", () => {
  const d = fixture();
  fpsAction(d, "a", input(1), 4000);
  fpsAction(d, "a", { type: "duel-fire", yaw: 0, pitch: 0 }, 4000);
  fpsTick(d, 4050);
  shiftFPS(d, 10000);
  assert.equal(d.tickAt, 14050);
  assert.equal(d.fighters.a.inputAt, 0);
  assert.deepEqual(d.fighters.a.input, { forward: 0, strafe: 0 });
  const pausedPosition = d.fighters.a.x;
  fpsTick(d, 14100);
  assert.equal(d.fighters.a.x, pausedPosition);
  assert.equal(d.projectiles[0].at, 14000);
  let pick = 0;
  const rng = (n) => (pick++ * 7 + 3) % n;
  for (let now = 14100; now <= 44000; now += 50) {
    fpsTick(d, now);
    if (fpsWinner(d, now)) break;
    for (const id of ["a", "b"]) {
      if (now % 200) continue;
      const a = fpsBot(d, id, rng, now);
      if (a) fpsAction(d, id, a, now);
    }
    for (const f of Object.values(d.fighters)) {
      assert(f.hp >= 0 && f.hp <= 100);
      assert(f.ammo >= 0 && f.ammo <= 6);
      assert(clear(f.x, f.y));
    }
  }
  assert(["a", "b"].includes(fpsWinner(d, 44000)));
});
