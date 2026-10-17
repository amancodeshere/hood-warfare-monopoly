import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS, settings } from "../shared/settings.js";
import { BOARD as LEGACY_BOARD } from "../shared/legacy-board.js";
import {
  action,
  eliminate,
  land,
  migrate,
  player,
  room,
  start,
  tickDuel,
} from "../server/game.js";

function fixture(options = {}) {
  const debtor = player("Debtor"),
    landlord = player("Landlord"),
    game = room("ELIM", debtor, {
      settings: { autoFill: false, ...options },
    });
  game.players.push(landlord);
  start(game, debtor.id);
  game.props[1] = { owner: landlord.id, level: 0, mortgaged: false };
  debtor.pos = 1;
  debtor.cash = 5;
  land(game);
  action(game, debtor.id, { type: "shootout" });
  delete game.duel.mode;
  return { game, debtor, landlord };
}

function resolve(game, debtor, landlord, winner) {
  const sides = winner === landlord.id ? ["fire", "guard"] : ["fire", "flank"];
  for (let i = 0; i < 2; i++) {
    action(game, debtor.id, { type: "duel-choice", choice: sides[0] });
    action(game, landlord.id, { type: "duel-choice", choice: sides[1] });
  }
}

test("Killer Takes All defaults off and validates as a boolean", () => {
  assert.equal(DEFAULT_SETTINGS.killerTakesAll, false);
  assert.equal(settings().killerTakesAll, false);
  assert.equal(settings({ killerTakesAll: true }).killerTakesAll, true);
  for (const value of [1, "true", null])
    assert.throws(() => settings({ killerTakesAll: value }), /on\/off/);
});

test("migrating a room saved before Killer Takes All defaults the rule off", () => {
  const game = room("OLD", player("Host"));
  delete game.settings.killerTakesAll;
  migrate(game);
  assert.equal(game.settings.killerTakesAll, false);
});

test("a landlord winning a rent shootout inherits the debtor's deed state when enabled", () => {
  const { game, debtor, landlord } = fixture({ killerTakesAll: true });
  game.props[3] = { owner: debtor.id, level: 2, mortgaged: false };
  game.props[6] = { owner: debtor.id, level: 0, mortgaged: true };
  resolve(game, debtor, landlord, landlord.id);
  assert.equal(debtor.out, true);
  assert.deepEqual(game.props[3], {
    owner: landlord.id,
    level: 2,
    mortgaged: false,
  });
  assert.deepEqual(game.props[6], {
    owner: landlord.id,
    level: 0,
    mortgaged: true,
  });
});

test("authoritative FPS defender victory also inherits the debtor's deeds", () => {
  const { game, debtor, landlord } = fixture({ killerTakesAll: true });
  game.props[3] = { owner: debtor.id, level: 1, mortgaged: false };
  game.props[6] = { owner: debtor.id, level: 0, mortgaged: true };
  game.duel.mode = "fps";
  game.duel.stage = "live";
  game.duel.endsAt = 10_000;
  game.duel.fighters[debtor.id].hp = 0;
  assert.equal(tickDuel(game, 9_000), true);
  assert.equal(game.props[3].owner, landlord.id);
  assert.equal(game.props[3].level, 1);
  assert.equal(game.props[3].mortgaged, false);
  assert.equal(game.props[6].owner, landlord.id);
  assert.equal(game.props[6].level, 0);
  assert.equal(game.props[6].mortgaged, true);
});

test("a debtor winning a shootout keeps their deed and is not eliminated", () => {
  const { game, debtor, landlord } = fixture({ killerTakesAll: true });
  game.props[3] = { owner: debtor.id, level: 2, mortgaged: false };
  game.props[6] = { owner: debtor.id, level: 0, mortgaged: true };
  resolve(game, debtor, landlord, debtor.id);
  assert.equal(debtor.out, false);
  assert.deepEqual(game.props[3], {
    owner: debtor.id,
    level: 2,
    mortgaged: false,
  });
  assert.deepEqual(game.props[6], {
    owner: debtor.id,
    level: 0,
    mortgaged: true,
  });
});

test("generic elimination returns properties to market for bots and humans, even with a creditor and rule enabled", () => {
  for (const bot of [false, true]) {
    const debtor = player("Debtor", bot),
      creditor = player("Creditor"),
      game = room("ELIM", debtor, {
        settings: { autoFill: false, killerTakesAll: true },
      });
    game.players.push(creditor);
    start(game, debtor.id);
    game.props[3] = { owner: debtor.id, level: 3, mortgaged: false };
    game.props[6] = { owner: debtor.id, level: 0, mortgaged: true };
    eliminate(game, debtor, creditor);
    assert.equal(debtor.out, true);
    assert.equal(game.props[3], undefined);
    assert.equal(game.props[6], undefined);
  }
});

test("team elimination also returns properties to market by default", () => {
  const debtor = player("Debtor"),
    teammate = player("Mate"),
    rival = player("Rival"),
    game = room("ELIM", debtor, {
      settings: { autoFill: false, teams: true },
    });
  game.players.push(teammate);
  game.players.push(rival);
  debtor.team = teammate.team = 1;
  rival.team = 2;
  start(game, debtor.id);
  game.props[1] = { owner: debtor.id, level: 1, mortgaged: false };
  eliminate(game, debtor);
  assert.equal(game.props[1], undefined);
});

test("quick board elimination returns all debtor properties to the market", () => {
  const debtor = player("Debtor"),
    game = room("QUICK", debtor, {
      settings: { autoFill: false, mapSize: "quick" },
    });
  game.players.push(player("Other"));
  start(game, debtor.id);
  game.props[1] = { owner: debtor.id, level: 0, mortgaged: true };
  game.props[2] = { owner: debtor.id, level: 1, mortgaged: false };
  eliminate(game, debtor);
  assert.equal(game.props[1], undefined);
  assert.equal(game.props[2], undefined);
});

test("legacy boards retain their market reset behavior on elimination", () => {
  const debtor = player("Debtor"),
    game = room("ELIM", debtor, {
      settings: { autoFill: false, mapSize: "quick" },
    });
  game.schemaVersion = 1;
  game.board = LEGACY_BOARD;
  game.players.push(player("Other"));
  start(game, debtor.id);
  game.props[1] = { owner: debtor.id, level: 0, mortgaged: false };
  eliminate(game, debtor);
  assert.equal(game.props[1], undefined);
});
