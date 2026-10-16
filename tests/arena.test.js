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
import { arenaFighters } from "../server/arena.js";
import { action, player, room, start, tickDuel } from "../server/game.js";
import { ARENA_THEMES, resolveArenaTheme } from "../src/arenaRenderer.js";
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
test("high-stakes duel triggers when debt is at least 500 or landlord has hotels; defender starts with 115 HP", () => {
  const directFighters = arenaFighters(["a", "b"], {
    highStakes: true,
    defender: "b",
  });
  assert.equal(directFighters.a.hp, 100);
  assert.equal(directFighters.b.hp, 115);

  const directDuel = createFPS(["p1", "p2"], true, {
    highStakes: true,
    defender: "p2",
  });
  assert.equal(directDuel.highStakes, true);
  assert.equal(directDuel.fighters.p1.hp, 100);
  assert.equal(directDuel.fighters.p2.hp, 115);

  const a = player("Ace"),
    b = player("Landlord"),
    g1 = room("ROOM1", a);
  g1.players.push(b);
  start(g1, a.id);
  g1.phase = "rent";
  g1.pending = { owner: b.id, amount: 500 };
  a.cash = 100;
  action(g1, a.id, { type: "shootout" });
  assert.equal(g1.duel.highStakes, true);
  assert.equal(g1.duel.fighters[b.id].hp, 115);
  assert.equal(g1.duel.fighters[a.id].hp, 100);

  const g2 = room("ROOM2", a);
  g2.players.push(b);
  start(g2, a.id);
  g2.props[1] = { owner: b.id, level: 5, mortgaged: false };
  g2.phase = "rent";
  g2.pending = { owner: b.id, amount: 200 };
  a.cash = 50;
  action(g2, a.id, { type: "shootout" });
  assert.equal(g2.duel.highStakes, true);
  assert.equal(g2.duel.fighters[b.id].hp, 115);
  assert.equal(g2.duel.fighters[a.id].hp, 100);

  const g3 = room("ROOM3", a);
  g3.players.push(b);
  start(g3, a.id);
  g3.props[1] = { owner: b.id, level: 2, mortgaged: false };
  g3.phase = "rent";
  g3.pending = { owner: b.id, amount: 150 };
  a.cash = 50;
  action(g3, a.id, { type: "shootout" });
  assert.equal(g3.duel.highStakes, undefined);
  assert.equal(g3.duel.fighters[b.id].hp, 100);
  assert.equal(g3.duel.fighters[a.id].hp, 100);
});
test("challenger victory in high-stakes duel wipes debt and loots $200 street bounty from landlord", () => {
  const a = player("Challenger"),
    b = player("Landlord"),
    g = room("ROOM_HIGH", a);
  g.players.push(b);
  start(g, a.id);
  a.cash = 150;
  b.cash = 600;
  g.phase = "rent";
  g.pending = { owner: b.id, amount: 550 };
  action(g, a.id, { type: "shootout" });
  assert.equal(g.duel.highStakes, true);
  assert.equal(g.duel.fighters[b.id].hp, 115);

  const at = 5000;
  for (const p of [a, b])
    action(g, p.id, { type: "duel-ready" }, undefined, { now: at });

  let shotAt = at + 3000;
  for (let i = 0; i < 3; i++) {
    action(g, a.id, { type: "duel-fire", yaw: 0, pitch: 0.015 }, undefined, {
      now: shotAt,
    });
    for (let step = 1; step <= 10; step++) tickDuel(g, shotAt + step * 50);
    shotAt += 600;
  }

  assert.equal(g.duel.fighters[b.id].hp, 0);
  assert.equal(g.phase, "duel-result");
  assert.equal(g.pending, null);
  assert.equal(g.duel.winner, a.id);
  assert.equal(g.duel.bounty, 200);
  assert.equal(a.cash, 350);
  assert.equal(b.cash, 400);
});
test("challenger victory in high-stakes duel loots landlord remaining balance when landlord cash is below $200", () => {
  const a = player("Challenger"),
    b = player("BrokeLandlord"),
    g = room("ROOM_BROKE", a);
  g.players.push(b);
  start(g, a.id);
  a.cash = 100;
  b.cash = 80;
  g.phase = "rent";
  g.pending = { owner: b.id, amount: 500 };
  action(g, a.id, { type: "shootout" });
  assert.equal(g.duel.highStakes, true);

  const at = 5000;
  for (const p of [a, b])
    action(g, p.id, { type: "duel-ready" }, undefined, { now: at });

  let shotAt = at + 3000;
  for (let i = 0; i < 3; i++) {
    action(g, a.id, { type: "duel-fire", yaw: 0, pitch: 0.015 }, undefined, {
      now: shotAt,
    });
    for (let step = 1; step <= 10; step++) tickDuel(g, shotAt + step * 50);
    shotAt += 600;
  }

  assert.equal(g.phase, "duel-result");
  assert.equal(g.pending, null);
  assert.equal(g.duel.winner, a.id);
  assert.equal(g.duel.bounty, 80);
  assert.equal(b.cash, 0);
  assert.equal(a.cash, 180);
});
test("map-themed arena visuals resolve theme overrides and color definitions for all city maps", () => {
  const maps = [
    ["snow-day", "#d6e8f5", "#6a8296"],
    ["cold-streets", "#d6e8f5", "#6a8296"],
    ["neon", "#130924", "#1d1233"],
    ["night-shift", "#0b101c", "#161c28"],
    ["boardwalk", "#d8e8ee", "#8e7a62"],
    ["festival", "#361d24", "#6d3d34"],
    ["trenches", "#262428", "#3c3a42"],
  ];
  for (const [id, ceiling, floor] of maps) {
    const t = resolveArenaTheme(id);
    assert.equal(t.ceiling, ceiling);
    assert.equal(t.floor, floor);
    assert(typeof t.wall === "function");
    assert(t.wall(150).startsWith("rgb("));
  }
  assert.equal(
    resolveArenaTheme("unknown-map").ceiling,
    ARENA_THEMES.trenches.ceiling,
  );
});
