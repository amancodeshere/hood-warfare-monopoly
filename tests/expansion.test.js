import test from "node:test";
import assert from "node:assert/strict";
import {
  room,
  player,
  start,
  action,
  land,
  rent,
  view,
  victory,
  migrate,
  defaultAction,
  active,
} from "../server/game.js";
import { BOARD, makeBoard, coordinates } from "../shared/board.js";
import { settings, matchLimit } from "../shared/settings.js";
const prop = (owner) => ({ owner, level: 0, mortgaged: false });
function game(n = 3, opts = {}) {
  const p = player("Ace"),
    g = room("EXPAND", p);
  for (let i = 1; i < n; i++) g.players.push(player("Rival" + i));
  Object.assign(g.settings, opts);
  start(g, p.id);
  return { g, p, b: g.players[1], c: g.players[2] };
}
test("both maps fit 40 unique perimeter spaces and preserve market economics", () => {
  for (const map of ["trenches", "night-shift"]) {
    const b = makeBoard(map);
    assert.equal(b.length, 40);
    assert.equal(
      new Set(b.map((t) => JSON.stringify(coordinates(t.id, 40)))).size,
      40,
    );
    for (const t of b) {
      const { row, col } = coordinates(t.id, 40);
      assert(row === 1 || row === 11 || col === 1 || col === 11);
    }
    assert.equal(b.filter((t) => t.type === "stoppa").length, 3);
  }
  assert.notEqual(
    makeBoard("trenches")[1].name,
    makeBoard("night-shift")[1].name,
  );
});
test("winner takes all runs beyond round 30; caps are opt-in", () => {
  const { g, p } = game();
  g.round = 101;
  assert.equal(g.limit, null);
  assert(!victory(g));
  g.limit = 30;
  p.cash = 9000;
  assert(victory(g));
  assert.equal(g.winner, p.id);
});
test("settings reject malformed and unknown values including inherited keys", () => {
  for (const s of [
    { maxPlayers: 9 },
    { startingCash: 999 },
    { teams: "yes" },
    { map: "fake" },
    { toString: 1 },
  ])
    assert.throws(() => settings(s));
  assert.equal(settings({ maxPlayers: 8 }).maxPlayers, 8);
  assert.equal(matchLimit(), null);
  assert.equal(matchLimit(0), null);
  assert.throws(() => matchLimit(5));
});
test("legacy snapshots retain original square ids, economics and rules", () => {
  const { g } = game();
  delete g.schemaVersion;
  delete g.board;
  delete g.settings;
  migrate(g);
  assert.equal(g.board.length, 28);
  assert.equal(g.board[10].type, "roulette");
  assert.equal(g.settings.auctions, false);
});
test("Oppa Stoppa conserves cash at both 1% and 10%, rounds down, settles exactly once", () => {
  for (const roll of [0, 9]) {
    const { g, p } = game();
    p.cash = 1537;
    p.pos = 7;
    land(g);
    action(g, p.id, { type: "stoppa-spin" }, () => roll);
    const loss = Math.floor((1537 * (roll + 1)) / 100);
    assert.equal(g.pending.amount, loss);
    assert.equal(p.cash, 1537);
    assert.throws(() => action(g, p.id, { type: "stoppa-spin" }));
    action(g, p.id, { type: "stoppa-collect" });
    assert.equal(p.cash + g.pot, 1537);
    assert.equal(g.pot, loss);
    assert.throws(() => action(g, p.id, { type: "stoppa-collect" }));
    p.pos = 20;
    land(g);
    assert.equal(p.cash, 1537);
    assert.equal(g.pot, 0);
  }
});
test("auction is open to every alive seat, validates bids and transfers once", () => {
  const { g, p, b, c } = game();
  p.pos = 1;
  land(g);
  action(g, p.id, { type: "skip" });
  assert.equal(g.phase, "auction");
  assert.throws(() => action(g, b.id, { type: "auction-bid", amount: 2000 }));
  action(g, b.id, { type: "auction-bid", amount: 20 });
  assert.throws(() => action(g, b.id, { type: "auction-pass" }));
  action(g, c.id, { type: "auction-pass" });
  assert.throws(() => action(g, c.id, { type: "auction-bid", amount: 40 }));
  action(g, p.id, { type: "auction-pass" });
  assert.equal(g.props[1].owner, b.id);
  assert.equal(b.cash, 1480);
  assert.equal(g.phase, "end");
  assert.throws(() => action(g, b.id, { type: "auction-bid", amount: 50 }));
});
test("doubles grant extra rolls, third consecutive doubles jail the player", () => {
  const { g, p } = game();
  for (let i = 0; i < 3; i++) {
    action(g, p.id, { type: "roll" }, () => 0);
    if (i < 2) {
      if (g.phase !== "end") action(g, p.id, defaultAction(g, p.id), () => 0);
      action(g, p.id, { type: "end" });
      assert.equal(active(g).id, p.id);
    }
  }
  assert.equal(p.pos, 10);
  assert.equal(p.jail, 2);
  assert.equal(g.extraRoll, false);
});
test("utilities use dice and transit doubles for combined holdings", () => {
  const { g, p } = game();
  g.dice = [3, 4];
  g.props[12] = prop(p.id);
  assert.equal(rent(g, BOARD[12]), 28);
  g.props[33] = prop(p.id);
  assert.equal(rent(g, BOARD[12]), 70);
  for (const id of [5, 15, 25, 35]) g.props[id] = prop(p.id);
  assert.equal(rent(g, BOARD[5]), 200);
  g.settings.prisonRent = false;
  p.jail = 1;
  assert.equal(rent(g, BOARD[5]), 0);
});
test("teams share sets, avoid rent, enforce even building across allies and inherit turf", () => {
  const { g, p, b, c } = game(3, { teams: true });
  p.team = b.team = "1";
  c.team = "2";
  g.props[1] = prop(p.id);
  g.props[3] = prop(b.id);
  p.pos = 3;
  land(g);
  assert.equal(g.phase, "end");
  assert.equal(rent(g, BOARD[1]), 24);
  action(g, p.id, { type: "upgrade", tile: 1 });
  assert.throws(() => action(g, p.id, { type: "upgrade", tile: 1 }), /evenly/);
  g.props[3].level = 1;
  assert.throws(() => action(g, p.id, { type: "mortgage", tile: 1 }));
  g.props[3].level = 0;
  action(g, p.id, { type: "forfeit" });
  assert.equal(g.props[1].owner, b.id);
  assert.equal(b.cash, 2970);
  assert.equal(g.status, "playing");
  g.turn = 2;
  action(g, c.id, { type: "forfeit" });
  assert.equal(g.status, "finished");
  assert.deepEqual(new Set(g.winners), new Set([p.id, b.id]));
});
test("hotels cap at five and mortgages cannot bypass ally builds", () => {
  const { g, p } = game();
  p.cash = 5000;
  for (const id of [1, 3]) g.props[id] = prop(p.id);
  for (let n = 0; n < 5; n++)
    for (const id of [1, 3]) action(g, p.id, { type: "upgrade", tile: id });
  assert.equal(rent(g, BOARD[1]), 300);
  assert.throws(() => action(g, p.id, { type: "upgrade", tile: 1 }));
});
test("multi-asset trades transfer properties, cash and escape cards atomically", () => {
  const { g, p, b } = game();
  g.props[1] = prop(p.id);
  g.props[3] = prop(p.id);
  g.props[6] = prop(b.id);
  p.escapes = 2;
  b.escapes = 1;
  action(g, p.id, {
    type: "trade",
    to: b.id,
    giveTiles: [1, 3],
    takeTiles: [6],
    cash: 100,
    requestCash: 200,
    giveEscapes: 2,
    takeEscapes: 1,
  });
  action(g, b.id, { type: "trade-respond", accept: true });
  assert.equal(g.props[1].owner, b.id);
  assert.equal(g.props[6].owner, p.id);
  assert.equal(p.cash, 1600);
  assert.equal(b.cash, 1400);
  assert.equal(p.escapes, 1);
  assert.equal(b.escapes, 2);
});
test("debt trades cannot dump an empire; cash-only rescue trades work", () => {
  const { g, p, b } = game();
  g.props[39] = prop(p.id);
  g.props[1] = prop(b.id);
  p.pos = 1;
  p.cash = 0;
  land(g);
  assert.throws(
    () =>
      action(g, p.id, {
        type: "trade",
        to: b.id,
        giveTiles: [39],
        takeTiles: [],
        cash: 0,
      }),
    /fair value/,
  );
  action(g, p.id, {
    type: "trade",
    to: b.id,
    giveTiles: [39],
    takeTiles: [],
    requestCash: 500,
  });
  action(g, b.id, { type: "trade-respond", accept: true });
  action(g, p.id, { type: "pay" });
  assert.equal(g.phase, "end");
});
test("off-turn forfeits preserve the active tile and private team chat is filtered", () => {
  const { g, p, b, c } = game(3, { teams: true });
  p.team = b.team = "1";
  c.team = "2";
  p.pos = 7;
  land(g);
  action(g, c.id, { type: "forfeit" });
  assert.equal(g.status, "finished");
  const f = game(4, { teams: true });
  f.p.team = f.b.team = "1";
  f.c.team = "2";
  f.g.players[3].team = "2";
  f.p.pos = 7;
  land(f.g);
  action(f.g, f.c.id, { type: "forfeit" });
  assert.equal(f.g.phase, "stoppa");
  f.g.chat = [
    { team: "1", text: "secret" },
    { team: null, text: "hello", profileId: "blocked" },
  ];
  assert.equal(view(f.g, f.b.id).chat.length, 2);
  assert.equal(view(f.g, f.g.players[3].id).chat.length, 1);
  assert.equal(view(f.g, "watch", ["blocked"]).chat.length, 0);
});
test("cash gifts and a single extra minute are validated on the server", () => {
  const { g, p, b } = game();
  action(g, b.id, { type: "gift", to: p.id, amount: 300 });
  assert.equal(p.cash, 1800);
  assert.equal(b.cash, 1200);
  const end = g.deadline;
  action(g, b.id, { type: "give-time" });
  assert.equal(g.deadline, end + 60000);
  assert.throws(() => action(g, b.id, { type: "give-time" }));
  assert.throws(() => action(g, p.id, { type: "give-time" }));
});
test("new bot matches resolve auctions and events without invalid money or holdings", () => {
  for (let seed = 1; seed <= 20; seed++) {
    let state = seed;
    const rng = (n) => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state % n;
    };
    const { g } = game(4);
    g.limit = 10;
    g.players.forEach((p) => (p.bot = true));
    let steps = 0;
    while (g.status === "playing" && steps++ < 10000) {
      let ids =
        g.phase === "auction"
          ? g.players
              .filter(
                (p) =>
                  !p.out &&
                  !g.auction.passed.includes(p.id) &&
                  g.auction.highBidder !== p.id,
              )
              .map((p) => p.id)
          : g.phase === "duel"
            ? [g.duel.attacker, g.duel.defender].filter(
                (id) => !g.duel.choices[id],
              )
            : [active(g).id];
      for (const id of ids) {
        action(g, id, defaultAction(g, id), rng);
        if (!["auction", "duel"].includes(g.phase)) break;
      }
      if (g.phase === "auction" && !ids.length) throw Error("Auction stalled");
      for (const p of g.players) assert(p.cash >= 0);
    }
    assert.equal(g.status, "finished");
  }
});
