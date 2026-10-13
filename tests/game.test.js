import test from "node:test";
import assert from "node:assert/strict";
import {
  player,
  room,
  start,
  action,
  land,
  rent,
  worth,
  view,
  active,
  defaultAction,
} from "../server/game.js";
import { BOARD, coordinates } from "../shared/board.js";
function fixture(n = 3) {
  const p = player("Ace"),
    g = room("ABC123", p);
  for (let i = 1; i < n; i++) g.players.push(player("Crew " + i));
  start(g, p.id);
  return { g, p, b: g.players[1] };
}
const zero = () => 0;
test("board has 28 unique perimeter coordinates", () => {
  assert.equal(
    new Set(BOARD.map((t) => JSON.stringify(coordinates(t.id)))).size,
    28,
  );
  for (const t of BOARD) {
    const { row, col } = coordinates(t.id);
    assert(row >= 1 && row <= 8 && col >= 1 && col <= 8);
    assert(row === 1 || row === 8 || col === 1 || col === 8);
  }
});
test("only host starts and at least two crews required", () => {
  const p = player("A"),
    g = room("CODE", p);
  assert.throws(() => start(g, p.id), /friend or a bot/);
  g.players.push(player("B"));
  assert.throws(() => start(g, g.players[1].id), /host/);
  start(g, p.id);
  assert.equal(g.status, "playing");
});
test("roll is server generated and pass home pays exactly once", () => {
  const { g, p } = fixture();
  p.pos = 27;
  action(g, p.id, { type: "roll" }, zero);
  assert.deepEqual(g.dice, [1, 1]);
  assert.equal(p.pos, 1);
  assert.equal(p.cash, 1700);
  assert.equal(g.phase, "buy");
});
test("out-of-turn and duplicate rolls do not alter the game", () => {
  const { g, p, b } = fixture();
  assert.throws(() => action(g, b.id, { type: "roll" }), /your turn/);
  action(g, p.id, { type: "roll" }, zero);
  const saved = JSON.stringify(g);
  assert.throws(() => action(g, p.id, { type: "roll" }));
  assert.equal(JSON.stringify(g), saved);
});
test("buying transfers cash and owns property; unaffordable buy rejects", () => {
  const { g, p } = fixture();
  p.pos = 1;
  land(g);
  p.cash = 99;
  assert.throws(() => action(g, p.id, { type: "buy" }), /afford/);
  p.cash = 100;
  action(g, p.id, { type: "buy" });
  assert.equal(p.cash, 0);
  assert.equal(g.props[1].owner, p.id);
  assert.equal(g.phase, "end");
});
test("rent transfers exactly, cannot be paid twice", () => {
  const { g, p, b } = fixture();
  g.props[1] = { owner: b.id, level: 0, mortgaged: false };
  p.pos = 1;
  land(g);
  action(g, p.id, { type: "pay" });
  assert.equal(p.cash, 1476);
  assert.equal(b.cash, 1524);
  assert.throws(() => action(g, p.id, { type: "pay" }), /No debt/);
});
test("full district doubles rent and building multiplies it", () => {
  const { g, p } = fixture();
  for (const id of [1, 2, 4])
    g.props[id] = { owner: p.id, level: 0, mortgaged: false };
  assert.equal(rent(g, BOARD[1]), 48);
  action(g, p.id, { type: "upgrade", tile: 1 });
  assert.equal(rent(g, BOARD[1]), 72);
  assert.throws(() => action(g, p.id, { type: "upgrade", tile: 1 }), /evenly/);
});
test("upgrades require whole district, are capped, and sell evenly", () => {
  const { g, p } = fixture();
  g.props[1] = { owner: p.id, level: 0, mortgaged: false };
  assert.throws(
    () => action(g, p.id, { type: "upgrade", tile: 1 }),
    /district/,
  );
  for (const id of [2, 4])
    g.props[id] = { owner: p.id, level: 0, mortgaged: false };
  p.cash = 5000;
  for (let level = 0; level < 3; level++)
    for (const id of [1, 2, 4]) action(g, p.id, { type: "upgrade", tile: id });
  assert.throws(() => action(g, p.id, { type: "upgrade", tile: 1 }));
  action(g, p.id, { type: "sell", tile: 1 });
  assert.throws(() => action(g, p.id, { type: "sell", tile: 1 }), /evenly/);
});
test("mortgages pay half, stop rent, and cost 55% to redeem", () => {
  const { g, p } = fixture();
  g.props[1] = { owner: p.id, level: 0, mortgaged: false };
  action(g, p.id, { type: "mortgage", tile: 1 });
  assert.equal(p.cash, 1550);
  assert.equal(rent(g, BOARD[1]), 0);
  action(g, p.id, { type: "redeem", tile: 1 });
  assert.equal(p.cash, 1495);
  assert.equal(rent(g, BOARD[1]), 24);
});
test("district businesses prevent a mortgage exploit", () => {
  const { g, p } = fixture();
  for (const id of [1, 2, 4])
    g.props[id] = { owner: p.id, level: 0, mortgaged: false };
  action(g, p.id, { type: "upgrade", tile: 1 });
  assert.throws(
    () => action(g, p.id, { type: "mortgage", tile: 2 }),
    /businesses/,
  );
});
test("transit rent scales and net worth stays finite", () => {
  const { g, p } = fixture();
  for (const id of [5, 19])
    g.props[id] = { owner: p.id, level: 0, mortgaged: false };
  assert.equal(rent(g, BOARD[5]), 90);
  assert.equal(worth(g, p), 1860);
  action(g, p.id, { type: "mortgage", tile: 5 });
  assert.equal(rent(g, BOARD[19]), 45);
  assert(Number.isFinite(worth(g, p)));
});
test("shootout is exclusive to unaffordable player rent", () => {
  const { g, p, b } = fixture();
  g.props[1] = { owner: b.id, level: 0, mortgaged: false };
  p.pos = 1;
  land(g);
  assert.throws(() => action(g, p.id, { type: "shootout" }));
  p.cash = 0;
  action(g, p.id, { type: "shootout" });
  assert.equal(g.phase, "duel");
});
function duelFixture(n = 3) {
  const f = fixture(n);
  f.g.props[1] = { owner: f.b.id, level: 0, mortgaged: false };
  f.p.pos = 1;
  f.p.cash = 5;
  land(f.g);
  action(f.g, f.p.id, { type: "shootout" });
  return f;
}
test("duel choices are secret and cannot be changed or submitted by spectators", () => {
  const { g, p } = duelFixture();
  action(g, p.id, { type: "duel-choice", choice: "fire" });
  assert(!("choices" in view(g, g.players[2].id).duel));
  assert.deepEqual(view(g, p.id).duel.locked, [p.id]);
  assert.throws(
    () => action(g, p.id, { type: "duel-choice", choice: "guard" }),
    /locked/,
  );
  assert.throws(
    () => action(g, g.players[2].id, { type: "duel-choice", choice: "fire" }),
    /not in this duel/,
  );
});
test("winning shootout wipes debt and does not mint cash", () => {
  const { g, p, b } = duelFixture();
  const cash = b.cash;
  for (let i = 0; i < 2; i++) {
    action(g, p.id, { type: "duel-choice", choice: "fire" });
    action(g, b.id, { type: "duel-choice", choice: "flank" });
  }
  assert.equal(g.phase, "duel-result");
  assert.equal(g.pending, null);
  assert.equal(p.cash, 5);
  assert.equal(b.cash, cash);
  action(g, p.id, { type: "end" });
  assert.equal(active(g).id, b.id);
});
test("losing shootout inherits turf and cash, eliminated turn advances", () => {
  const { g, p, b } = duelFixture();
  g.props[2] = { owner: p.id, level: 1, mortgaged: false };
  for (let i = 0; i < 2; i++) {
    action(g, p.id, { type: "duel-choice", choice: "fire" });
    action(g, b.id, { type: "duel-choice", choice: "guard" });
  }
  assert(p.out);
  assert.equal(b.cash, 1505);
  assert.equal(g.props[2].owner, b.id);
  action(g, p.id, { type: "end" });
  assert.equal(active(g).id, b.id);
});
test("duel five-round ties terminate using server randomness", () => {
  const { g, p, b } = duelFixture();
  for (let i = 0; i < 5; i++) {
    action(g, p.id, { type: "duel-choice", choice: "guard" }, zero);
    action(g, b.id, { type: "duel-choice", choice: "guard" }, zero);
  }
  assert.equal(g.duel.winner, p.id);
  assert.equal(g.phase, "duel-result");
});
test("last crew standing wins", () => {
  const { g, p, b } = duelFixture(2);
  for (let i = 0; i < 2; i++) {
    action(g, p.id, { type: "duel-choice", choice: "flank" });
    action(g, b.id, { type: "duel-choice", choice: "fire" });
  }
  assert.equal(g.status, "finished");
  assert.equal(g.winner, b.id);
});
test("city fine debt cannot use shootouts; surrender releases turf", () => {
  const { g, p } = fixture();
  g.props[1] = { owner: p.id, level: 0, mortgaged: false };
  p.cash = 0;
  p.pos = 13;
  land(g);
  assert.equal(g.phase, "rent");
  assert.throws(() => action(g, p.id, { type: "shootout" }));
  action(g, p.id, { type: "surrender" });
  assert(p.out);
  assert(!g.props[1]);
});
test("cards award jackpot, jail, and escape correctly", () => {
  for (const [i, check] of [
    [0, (p) => assert.equal(p.cash, 2100)],
    [
      1,
      (p) => {
        assert.equal(p.jail, 2);
        assert.equal(p.pos, 7);
      },
    ],
    [2, (p) => assert.equal(p.escapes, 1)],
  ]) {
    const { g, p } = fixture();
    p.pos = 3;
    land(g, () => i);
    action(g, p.id, { type: "card" });
    check(p);
    assert.equal(g.phase, "end");
  }
});
test("roulette weights cover all six results; spin cannot be repeated", () => {
  const results = new Set();
  for (let i = 0; i < 12; i++) {
    const { g, p } = fixture();
    p.pos = 10;
    land(g);
    action(g, p.id, { type: "spin" }, () => i);
    results.add(g.pending.roulette);
    assert.throws(() => action(g, p.id, { type: "spin" }));
    action(g, p.id, { type: "collect" });
    assert.equal(g.phase, "end");
  }
  assert.equal(results.size, 6);
});
test("jail waits two turns and bail/escape permit rolling", () => {
  const { g, p } = fixture();
  p.jail = 2;
  g.phase = "jail";
  action(g, p.id, { type: "jail-wait" });
  assert.equal(p.jail, 1);
  g.phase = "jail";
  action(g, p.id, { type: "jail-wait" });
  assert.equal(p.jail, 0);
  p.jail = 2;
  g.phase = "jail";
  action(g, p.id, { type: "jail-pay" });
  assert.equal(p.cash, 1400);
  assert.equal(g.phase, "roll");
  p.jail = 2;
  p.escapes = 1;
  g.phase = "jail";
  action(g, p.id, { type: "jail-card" });
  assert.equal(p.jail, 0);
  assert.equal(p.escapes, 0);
});
test("tax pot is collected and cleared at Free Parking", () => {
  const { g, p } = fixture();
  p.pos = 13;
  land(g);
  assert.equal(g.pot, 100);
  p.pos = 14;
  land(g);
  assert.equal(g.pot, 0);
  assert.equal(p.cash, 1500);
});
test("trade validates recipient and transfers both blocks and cash atomically", () => {
  const { g, p, b } = fixture();
  g.props[1] = { owner: p.id, level: 0, mortgaged: false };
  g.props[6] = { owner: b.id, level: 0, mortgaged: false };
  action(g, p.id, { type: "trade", give: 1, take: 6, cash: 50, to: b.id });
  assert.throws(() =>
    action(g, g.players[2].id, { type: "trade-respond", accept: true }),
  );
  action(g, b.id, { type: "trade-respond", accept: true });
  assert.equal(g.props[1].owner, b.id);
  assert.equal(g.props[6].owner, p.id);
  assert.equal(p.cash, 1450);
  assert.equal(b.cash, 1550);
});
test("trade becomes invalid when offered cash is no longer available", () => {
  const { g, p, b } = fixture();
  g.props[1] = { owner: p.id, level: 0, mortgaged: false };
  g.props[6] = { owner: b.id, level: 0, mortgaged: false };
  action(g, p.id, { type: "trade", give: 1, take: 6, cash: 1400, to: b.id });
  p.cash = 100;
  const saved = JSON.stringify(g);
  assert.throws(
    () => action(g, b.id, { type: "trade-respond", accept: true }),
    /afford/,
  );
  assert.equal(JSON.stringify(g), saved);
});
test("round cap declares highest net worth; no active crew is skipped", () => {
  const { g, p, b } = fixture(2);
  g.limit = 1;
  b.cash = 1600;
  g.phase = "end";
  action(g, p.id, { type: "end" });
  g.phase = "end";
  action(g, b.id, { type: "end" });
  assert.equal(g.status, "finished");
  assert.equal(g.winner, b.id);
});
test("100 simulated full matches finish with nonnegative cash and valid ownership", () => {
  for (let seed = 1; seed <= 100; seed++) {
    let state = seed;
    const rng = (n) => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state % n;
    };
    const { g } = fixture(4);
    g.limit = 10;
    g.players.forEach((p) => (p.bot = true));
    let moves = 0;
    while (g.status === "playing" && moves++ < 3000) {
      if (g.phase === "duel") {
        for (const id of [g.duel.attacker, g.duel.defender])
          if (g.phase === "duel" && !g.duel.choices[id])
            action(
              g,
              id,
              {
                type: "duel-choice",
                choice: ["fire", "flank", "guard"][rng(3)],
              },
              rng,
            );
      } else {
        const id = active(g).id;
        action(g, id, defaultAction(g, id), rng);
      }
      for (const p of g.players) {
        assert(p.cash >= 0);
        assert(Number.isFinite(worth(g, p)));
      }
      for (const q of Object.values(g.props)) {
        assert(g.players.some((p) => p.id === q.owner && !p.out));
        assert(q.level >= 0 && q.level <= 3);
      }
    }
    assert.equal(g.status, "finished", `Seed ${seed} stuck in ${g.phase}`);
  }
});
