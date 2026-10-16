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
  timeoutAction,
  active,
  updateHeat,
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
test("auction countdown starts at 15s, decays on consecutive bids, and enforces 5s minimum grace", () => {
  const { g, p, b, c } = game();
  p.pos = 1;
  land(g);
  action(g, p.id, { type: "skip" });
  assert.equal(g.phase, "auction");
  assert.equal(g.auction.clock, 15);
  const now = Date.now();
  assert(g.deadline <= now + 15100 && g.deadline >= now + 14900);

  // A bid when 15s remain clamps timer to 8s
  action(g, b.id, { type: "auction-bid", amount: 20 });
  assert.equal(g.auction.clock, 8);
  assert(g.deadline <= Date.now() + 8100 && g.deadline >= Date.now() + 7900);

  // Manipulate deadline to simulate 2s remaining
  g.deadline = Date.now() + 2000;
  action(g, c.id, { type: "auction-bid", amount: 30 });
  // Under 5s grace rule, timer resets up to 5s
  assert.equal(g.auction.clock, 5);
  assert(g.deadline <= Date.now() + 5100 && g.deadline >= Date.now() + 4900);
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
  assert.equal(rent(g, BOARD[12]), 105);
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
  action(g, b.id, {
    type: "trade-respond",
    accept: true,
    offerId: g.trade?.id,
  });
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
  action(g, b.id, {
    type: "trade-respond",
    accept: true,
    offerId: g.trade?.id,
  });
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

test("timeouts never auction or mortgage human assets and two idle turns eliminate", () => {
  const { g, p } = game();
  p.pos = 1;
  land(g);
  assert.equal(timeoutAction(g, p.id), null);
  assert.equal(g.phase, "end");
  assert.equal(g.auction, undefined);
  assert.equal(p.afk, 1);
  action(g, p.id, { type: "end" });
  g.turn = 0;
  g.phase = "roll";
  g.timeoutCounted = false;
  assert.equal(timeoutAction(g, p.id), null);
  assert.equal(p.out, true);
  const f = game();
  f.g.props[1] = prop(f.b.id);
  f.g.props[39] = prop(f.p.id);
  f.p.cash = 0;
  f.p.pos = 1;
  land(f.g);
  assert.equal(timeoutAction(f.g, f.p.id).type, "surrender");
  assert.equal(f.g.props[39].mortgaged, false);
});

test("off-turn negotiations counter atomically, reject stale answers and withdraw without waiting for a turn", () => {
  const { g, p, b, c } = game();
  g.props[1] = prop(b.id);
  g.props[6] = prop(c.id);
  action(g, b.id, {
    type: "trade",
    to: c.id,
    giveTiles: [1],
    takeTiles: [6],
    cash: 20,
  });
  const original = g.trade.id;
  assert.throws(
    () =>
      action(g, p.id, {
        type: "trade-counter",
        to: b.id,
        offerId: original,
        cash: 10,
      }),
    /receiving/,
  );
  assert.throws(
    () =>
      action(g, c.id, {
        type: "trade-counter",
        to: b.id,
        offerId: original,
        requestCash: 99999,
      }),
    /afford/,
  );
  assert.equal(g.trade.id, original);
  action(g, c.id, {
    type: "trade-counter",
    to: b.id,
    offerId: original,
    giveTiles: [6],
    takeTiles: [1],
    requestCash: 50,
  });
  assert.notEqual(g.trade.id, original);
  assert.equal(g.trade.revision, 2);
  assert.equal(g.props[1].owner, b.id);
  assert.throws(
    () =>
      action(g, b.id, {
        type: "trade-respond",
        offerId: original,
        accept: true,
      }),
    /changed/,
  );
  action(g, b.id, { type: "trade-respond", offerId: g.trade.id, accept: true });
  assert.equal(b.cash, 1450);
  assert.equal(c.cash, 1550);
  assert.equal(g.props[1].owner, c.id);
  assert.equal(g.props[6].owner, b.id);
  action(g, b.id, { type: "trade", to: c.id, cash: 1 });
  action(g, b.id, { type: "trade-cancel", offerId: g.trade.id });
  assert.equal(g.trade, null);
});

test("trade revalidates assets and finances before moving anything; mortgages travel and special events block acceptance", () => {
  const { g, p, b } = game();
  g.props[1] = { ...prop(p.id), mortgaged: true };
  action(g, p.id, {
    type: "trade",
    to: b.id,
    giveTiles: [1],
    requestCash: 100,
  });
  b.cash = 50;
  assert.throws(
    () =>
      action(g, b.id, {
        type: "trade-respond",
        offerId: g.trade.id,
        accept: true,
      }),
    /afford/,
  );
  assert.equal(g.props[1].owner, p.id);
  assert.equal(p.cash, 1500);
  b.cash = 1500;
  g.phase = "roulette";
  assert.throws(
    () =>
      action(g, b.id, {
        type: "trade-respond",
        offerId: g.trade.id,
        accept: true,
      }),
    /event/,
  );
  action(g, b.id, {
    type: "trade-respond",
    offerId: g.trade.id,
    accept: false,
  });
  assert.equal(g.trade, null);
  g.phase = "roll";
  for (const cash of [NaN, -1, 1.5, "100"])
    assert.throws(
      () => action(g, p.id, { type: "trade", to: b.id, cash }),
      /whole/,
    );
  action(g, p.id, {
    type: "trade",
    to: b.id,
    giveTiles: [1],
    requestCash: 100,
  });
  action(g, b.id, { type: "trade-respond", offerId: g.trade.id, accept: true });
  assert.equal(g.props[1].owner, b.id);
  assert.equal(g.props[1].mortgaged, true);
});

test("utility monopoly grants 15x dice multiplier when both plugs held", () => {
  const { g, p } = game();
  g.dice = [2, 3]; // total 5
  g.props[12] = prop(p.id); // Power Plug only
  assert.equal(rent(g, BOARD[12]), 20); // 5 * 4 = 20

  g.props[33] = prop(p.id); // Both Power Plug and Water Plug
  assert.equal(rent(g, BOARD[12]), 75); // 5 * 15 = 75
  assert.equal(rent(g, BOARD[33]), 75); // 5 * 15 = 75

  // Mortgaged plug falls back to 4x on active plug
  g.props[33].mortgaged = true;
  assert.equal(rent(g, BOARD[12]), 20);
  assert.equal(rent(g, BOARD[33]), 0);
  g.props[33].mortgaged = false;

  // In teams mode, ally owning second plug triggers 15x
  const { g: tg, p: tp, b: tb } = game(2, { teams: true });
  tp.team = tb.team = "1";
  tg.dice = [3, 5]; // total 8
  tg.props[12] = prop(tp.id);
  tg.props[33] = prop(tb.id);
  assert.equal(rent(tg, BOARD[12]), 120); // 8 * 15 = 120
  assert.equal(rent(tg, BOARD[33]), 120); // 8 * 15 = 120
});

test("City Grid Lockdown validates prerequisites, charges $100, halves district rent, and expires after 1 round", () => {
  const { g, p, b } = game();
  p.cash = 1000;
  // Precondition: phase guardrail
  for (const invalidPhase of ["duel", "duel-result", "auction", "stoppa-result"]) {
    g.phase = invalidPhase;
    assert.throws(
      () => action(g, p.id, { type: "grid-lockdown", district: 1 }),
      /showdown or auction/,
    );
  }
  g.phase = "roll";

  // Precondition: must own both utilities
  assert.throws(
    () => action(g, p.id, { type: "grid-lockdown", district: 1 }),
    /utilities/,
  );

  g.props[12] = prop(p.id); // Power Plug only
  assert.throws(
    () => action(g, p.id, { type: "grid-lockdown", district: 1 }),
    /utilities/,
  );

  g.props[33] = prop(p.id); // Water Plug
  g.props[12].mortgaged = true;
  assert.throws(
    () => action(g, p.id, { type: "grid-lockdown", district: 1 }),
    /utilities/,
  );
  g.props[12].mortgaged = false;

  // Precondition: cash >= 100
  p.cash = 50;
  assert.throws(
    () => action(g, p.id, { type: "grid-lockdown", district: 1 }),
    /maintenance/,
  );
  p.cash = 1000;

  // Precondition: targeted district cannot be owned by player's team
  // District 0: tiles 1 and 3
  g.props[1] = prop(p.id);
  g.props[3] = prop(p.id);
  assert.throws(
    () => action(g, p.id, { type: "grid-lockdown", district: 0 }),
    /team/,
  );

  // Precondition: invalid district
  assert.throws(
    () => action(g, p.id, { type: "grid-lockdown", district: 8 }),
    /district/,
  );
  assert.throws(
    () => action(g, p.id, { type: "grid-lockdown", district: -1 }),
    /district/,
  );

  // Rival owns district 1 (tiles 6, 8, 9)
  g.props[6] = prop(b.id);
  g.props[8] = prop(b.id);
  g.props[9] = prop(b.id);
  const normalRent6 = rent(g, BOARD[6]);
  assert.equal(normalRent6, 44);

  // Activate City Grid Lockdown on rival district 1
  action(g, p.id, { type: "grid-lockdown", district: 1 });
  assert.equal(p.cash, 900); // $100 maintenance cost deducted
  assert.equal(g.lockdownUsedRound, 1);
  assert.equal(g.blackoutDistrict, 1);
  assert.equal(g.blackoutExpiresOnPlayer, p.id);

  // Cannot activate lockdown twice in the same round
  assert.throws(
    () => action(g, p.id, { type: "grid-lockdown", district: 2 }),
    /once per round/,
  );

  // Rent in blacked out district 1 is halved (50%)
  const blackedRent6 = rent(g, BOARD[6]);
  assert.equal(blackedRent6, Math.floor(normalRent6 * 0.5));
  assert.equal(blackedRent6, 22);

  // Rent in unaffected district (e.g. district 0) is not reduced
  assert.equal(rent(g, BOARD[1]), 24);

  // Opponent b takes their turn while blackout is active
  g.phase = "end";
  action(g, p.id, { type: "end" });
  assert.equal(g.turn, 1);
  assert.equal(g.blackoutDistrict, 1);
  assert.equal(rent(g, BOARD[6]), 22);

  // Turn returns to activator (p), clearing blackout
  g.phase = "end";
  action(g, b.id, { type: "end" });
  assert.equal(g.turn, 2);
  g.phase = "end";
  action(g, g.players[2].id, { type: "end" });
  assert.equal(g.turn, 0); // back to p
  assert.equal(g.blackoutDistrict, null);
  assert.equal(g.blackoutExpiresOnPlayer, null);
  assert.equal(rent(g, BOARD[6]), normalRent6);

  // Player can activate lockdown again in round 2
  assert.equal(g.round, 2);
  action(g, p.id, { type: "grid-lockdown", district: 2 });
  assert.equal(p.cash, 800);
  assert.equal(g.lockdownUsedRound, 2);
  assert.equal(g.blackoutDistrict, 2);
});

test("when the last player in turn order activates grid-lockdown, blackout persists into round 2 until their next turn", () => {
  const { g, p, b, c } = game(3);
  const lastPlayer = c;
  lastPlayer.cash = 1000;
  // Last player owns both utilities
  g.props[12] = prop(lastPlayer.id);
  g.props[33] = prop(lastPlayer.id);

  // Rival (p) owns district 1 (tiles 6, 8, 9)
  g.props[6] = prop(p.id);
  g.props[8] = prop(p.id);
  g.props[9] = prop(p.id);
  const normalRent6 = rent(g, BOARD[6]);
  assert.equal(normalRent6, 44);

  // It is last player's turn in round 1
  g.round = 1;
  g.turn = 2; // last player in 3-player match
  g.phase = "roll";

  // Last player activates City Grid Lockdown on district 1
  action(g, lastPlayer.id, { type: "grid-lockdown", district: 1 });
  assert.equal(g.blackoutDistrict, 1);
  assert.equal(g.blackoutExpiresOnPlayer, lastPlayer.id);
  assert.equal(lastPlayer.cash, 900);

  // Last player finishes their turn
  g.phase = "end";
  action(g, lastPlayer.id, { type: "end" });

  // Round rolled over to round 2, turn is now player 0 (p)
  assert.equal(g.round, 2);
  assert.equal(g.turn, 0);

  // CRITICAL: Blackout MUST persist into round 2 for opponents
  assert.equal(g.blackoutDistrict, 1);
  assert.equal(rent(g, BOARD[6]), 22); // still 50% rent in round 2!

  // Player 0 (p) finishes turn
  g.phase = "end";
  action(g, p.id, { type: "end" });
  assert.equal(g.turn, 1); // player 1 (b)
  assert.equal(g.blackoutDistrict, 1);
  assert.equal(rent(g, BOARD[6]), 22); // still 50% rent for player 1!

  // Player 1 (b) finishes turn -> turn returns to lastPlayer (c)
  g.phase = "end";
  action(g, b.id, { type: "end" });
  assert.equal(g.turn, 2); // back to lastPlayer

  // Now that turn has returned to the activator, blackout expires
  assert.equal(g.blackoutDistrict, null);
  assert.equal(g.blackoutExpiresOnPlayer, null);
  assert.equal(rent(g, BOARD[6]), normalRent6); // rent restored to 100%
});

test("City Heat bonus decay at round 15 ($175), round 20 ($150), and tax scaling", () => {
  const { g, p } = game();
  g.settings.doubles = false;

  // Round < 15: normal economics
  g.round = 14;
  updateHeat(g);
  assert.equal(g.heatLevel, 0);
  p.cash = 1000;
  p.pos = 39;
  action(g, p.id, { type: "roll" }, () => 0); // passed Home Base
  assert.equal(p.cash, 1200); // +$200

  // Flex Tax at round 14: $100
  p.pos = 4;
  land(g);
  assert.equal(p.cash, 1100); // -$100

  // Round 15: Heat Level 1
  g.round = 15;
  g.phase = "roll";
  p.cash = 1000;
  p.pos = 39;
  action(g, p.id, { type: "roll" }, () => 0); // passed Home Base
  assert.equal(g.heatLevel, 1);
  assert.equal(p.cash, 1175); // Home Base bonus decays by $25 -> +$175

  // Flex Tax at round 15: 100 * (1 + 1 * 0.20) = $120
  p.pos = 4;
  land(g);
  assert.equal(p.cash, 1055); // 1175 - 120 = 1055

  // Round 20: Heat Level 2
  g.round = 20;
  g.phase = "roll";
  p.cash = 1000;
  p.pos = 39;
  action(g, p.id, { type: "roll" }, () => 0); // passed Home Base
  assert.equal(g.heatLevel, 2);
  assert.equal(p.cash, 1150); // Home Base bonus decays by $50 -> +$150

  // Flex Tax at round 20: 100 * (1 + 2 * 0.20) = $140
  p.pos = 4;
  land(g);
  assert.equal(p.cash, 1010); // 1150 - 140 = 1010

  // Round 25: Heat Level 3
  g.round = 25;
  g.phase = "roll";
  p.cash = 1000;
  p.pos = 39;
  action(g, p.id, { type: "roll" }, () => 0);
  assert.equal(g.heatLevel, 3);
  assert.equal(p.cash, 1125); // +$125

  p.pos = 4;
  land(g);
  assert.equal(p.cash, 965); // 1125 - 160 = 965

  // Round 30: Heat Level 4 (cap)
  g.round = 30;
  g.phase = "roll";
  p.cash = 1000;
  p.pos = 39;
  action(g, p.id, { type: "roll" }, () => 0);
  assert.equal(g.heatLevel, 4);
  assert.equal(p.cash, 1100); // +$100 (capped minimum $100)

  p.pos = 4;
  land(g);
  assert.equal(p.cash, 920); // 1100 - 180 = 920

  // Round 35+: Heat Level remains capped at 4
  g.round = 35;
  g.phase = "roll";
  p.cash = 1000;
  p.pos = 39;
  action(g, p.id, { type: "roll" }, () => 0);
  assert.equal(g.heatLevel, 4);
  assert.equal(p.cash, 1100); // stays $100

  p.pos = 4;
  land(g);
  assert.equal(p.cash, 920); // stays $180
});
