import test from "node:test";
import assert from "node:assert/strict";
import {
  createFPS,
  fpsAction,
  fpsWinner,
  fpsTick,
  fpsBot,
  shiftFPS,
} from "../server/fps.js";
import {
  player,
  room,
  start,
  land,
  action,
  tickDuel,
  view,
} from "../server/game.js";
function duel() {
  return { ...createFPS(["a", "b"]), attacker: "a", defender: "b" };
}
function ready(d) {
  fpsAction(d, "a", { type: "duel-ready" }, 1000);
  fpsAction(d, "b", { type: "duel-ready" }, 1000);
  return 4000;
}
test("FPS actions enforce participants, readiness, countdown, bounds, ammunition and cooldown", () => {
  const d = duel();
  assert.throws(
    () => fpsAction(d, "spectator", { type: "duel-ready" }, 1000),
    /not in/,
  );
  fpsAction(d, "a", { type: "duel-ready" }, 1000);
  assert.throws(
    () => fpsAction(d, "a", { type: "duel-ready" }, 1000),
    /already ready/,
  );
  fpsAction(d, "b", { type: "duel-ready" }, 1000);
  assert.throws(
    () => fpsAction(d, "a", { type: "duel-fire", x: 0.5, y: 0.53 }, 3999),
    /countdown/,
  );
  assert.throws(
    () => fpsAction(d, "a", { type: "duel-fire", x: NaN, y: 0.5 }, 4000),
    /inside/,
  );
  assert.throws(
    () => fpsAction(d, "a", { type: "duel-fire", x: 0.5, y: 2 }, 4000),
    /inside/,
  );
  for (let i = 0; i < 6; i++)
    fpsAction(d, "a", { type: "duel-fire", x: 0, y: 0 }, 4000 + i * 400);
  assert.equal(d.fighters.a.ammo, 0);
  assert.equal(d.fighters.b.hp, 100);
  assert.throws(
    () => fpsAction(d, "a", { type: "duel-fire", x: 0.5, y: 0.53 }, 6400),
    /Reload/,
  );
  fpsAction(d, "a", { type: "duel-reload" }, 6500);
  assert.throws(
    () => fpsAction(d, "a", { type: "duel-fire", x: 0.5, y: 0.53 }, 7000),
    /Reload/,
  );
  fpsTick(d, 7800);
  assert.equal(d.fighters.a.ammo, 6);
  fpsAction(d, "a", { type: "duel-fire", x: 0.5, y: 0.53 }, 7800);
  assert.equal(d.fighters.b.hp, 75);
  assert.throws(
    () => fpsAction(d, "a", { type: "duel-fire", x: 0.5, y: 0.53 }, 7801),
    /settle/,
  );
});
test("server hit boxes follow dodging and cover; headshots and time limit settle without client damage", () => {
  const d = duel();
  ready(d);
  fpsAction(d, "b", { type: "duel-move", lane: 1 }, 4000);
  fpsAction(d, "a", { type: "duel-fire", x: 0.5, y: 0.53, damage: 999 }, 4000);
  assert.equal(d.fighters.b.hp, 100);
  fpsAction(d, "b", { type: "duel-duck" }, 4200);
  fpsAction(d, "a", { type: "duel-fire", x: 0.73, y: 0.72 }, 4400);
  assert.equal(d.fighters.b.hp, 100);
  fpsAction(d, "a", { type: "duel-fire", x: 0.73, y: 0.57 }, 4800);
  assert.equal(d.fighters.b.hp, 60);
  assert.throws(
    () => fpsAction(d, "b", { type: "duel-fire", x: 0.5, y: 0.53 }, 4800),
    /Stand up/,
  );
  fpsTick(d, 4900);
  fpsAction(d, "a", { type: "duel-fire", x: 0.73, y: 0.35 }, 5200);
  fpsAction(d, "a", { type: "duel-fire", x: 0.73, y: 0.35 }, 5600);
  assert.equal(d.fighters.b.hp, 0);
  assert.equal(fpsWinner(d, 5600), "a");
  const tie = duel();
  ready(tie);
  assert.equal(fpsWinner(tie, 33999), null);
  assert.equal(fpsWinner(tie, 34000), "b");
  assert.throws(
    () => fpsAction(tie, "a", { type: "duel-fire", x: 0.5, y: 0.53 }, 34000),
    /after the duel/,
  );
});
test("FPS pause shifts every combat deadline and bots use bounded controls", () => {
  const d = duel();
  ready(d);
  fpsAction(d, "a", { type: "duel-duck" }, 4000);
  shiftFPS(d, 10000);
  assert.equal(d.startsAt, 14000);
  assert.equal(d.endsAt, 44000);
  assert.equal(d.fighters.a.duckUntil, 14700);
  assert.equal(d.fighters.a.duckReady, 15900);
  assert.equal(
    fpsBot(d, "a", () => 0, 13999),
    null,
  );
  assert.deepEqual(
    fpsBot(d, "b", () => 0, 14000),
    { type: "duel-move", lane: -1 },
  );
  d.fighters.b.ammo = 0;
  assert.equal(fpsBot(d, "b", () => 9, 14000).type, "duel-reload");
});
function fixture() {
  const a = player("Ace"),
    b = player("Landlord"),
    c = player("Watcher"),
    g = room("FPS123", a);
  g.players.push(b, c);
  start(g, a.id);
  g.props[1] = { owner: b.id, level: 0, mortgaged: false };
  a.pos = 1;
  a.cash = 0;
  land(g);
  action(g, a.id, { type: "shootout" });
  return { g, a, b, c };
}
test("new rent shootouts use FPS; attacker victory wipes debt exactly once and spectator cannot fire", () => {
  const { g, a, b, c } = fixture();
  assert.equal(g.duel.mode, "fps");
  assert.throws(() => action(g, c.id, { type: "duel-ready" }), /not in/);
  const at = Date.now();
  for (const p of [a, b])
    action(g, p.id, { type: "duel-ready" }, undefined, { now: at });
  for (let i = 0; i < 3; i++)
    action(g, a.id, { type: "duel-fire", x: 0.5, y: 0.35 }, undefined, {
      now: at + 3000 + i * 400,
    });
  assert.equal(g.phase, "duel-result");
  assert.equal(g.pending, null);
  assert.equal(g.duel.winner, a.id);
  assert.equal(a.out, false);
  assert.equal(tickDuel(g, at + 40000), false);
  assert(!("choices" in view(g, c.id).duel));
  assert.throws(
    () => action(g, a.id, { type: "duel-fire", x: 0.5, y: 0.35 }),
    /over/,
  );
});
test("ready forfeits and landlord wins transfer challenger assets; exact ties protect the block", () => {
  const { g, a, b } = fixture();
  g.props[3] = { owner: a.id, level: 0, mortgaged: false };
  tickDuel(g, g.deadline + 1);
  assert.equal(a.out, true);
  assert.equal(g.props[3].owner, b.id);
  const f = fixture();
  action(f.g, f.a.id, { type: "duel-ready" });
  tickDuel(f.g, f.g.deadline + 1);
  assert.equal(f.g.duel.winner, f.a.id);
  assert.equal(f.g.pending, null);
});
test("forfeiting either FPS participant settles immediately without leaving a ghost opponent", () => {
  const f = fixture();
  action(f.g, f.b.id, { type: "forfeit" });
  assert.equal(f.b.out, true);
  assert.equal(f.g.duel.winner, f.a.id);
  assert.equal(f.g.pending, null);
  assert.equal(f.g.duel.stage, "finished");
  const a = fixture();
  action(a.g, a.a.id, { type: "forfeit" });
  assert.equal(a.a.out, true);
  assert.equal(a.g.duel.winner, a.b.id);
  assert.notEqual(a.g.phase, "duel");
});
test("automated FPS crews finish with bounded health and magazines", () => {
  const d = duel();
  ready(d);
  let pick = 0,
    winner;
  const rng = (n) => (pick++ * 7 + 3) % n;
  for (let now = 4000; now <= 34000; now += 500) {
    fpsTick(d, now);
    winner = fpsWinner(d, now);
    if (winner) break;
    for (const id of ["a", "b"]) {
      const next = fpsBot(d, id, rng, now);
      if (next) fpsAction(d, id, next, now);
      if (fpsWinner(d, now)) break;
    }
    for (const f of Object.values(d.fighters)) {
      assert(f.hp >= 0 && f.hp <= 100);
      assert(f.ammo >= 0 && f.ammo <= 6);
    }
  }
  assert(["a", "b"].includes(winner || fpsWinner(d, 34000)));
});
