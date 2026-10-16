import test from "node:test";
import assert from "node:assert/strict";
import {
  player,
  room,
  start,
  action,
  land,
  tickDuel,
} from "../server/game.js";
import {
  TACTICAL_CARDS,
  drawTacticalCard,
} from "../server/tacticals.js";

function setup(n = 4) {
  const p = player("Ace");
  const g = room("TACTICAL123", p);
  for (let i = 1; i < n; i++) g.players.push(player("Crew" + i));
  start(g, p.id);
  return { g, p, b: g.players[1], c: g.players[2], d: g.players[3] };
}

test("storing tactical cards up to cap of 2 via Street Luck and direct draw", () => {
  const { g, p } = setup();
  assert.deepEqual(p.tacticals, []);
  assert.deepEqual(p.activeEffects, {});

  // First draw: 40% chance triggers (using rng that returns 0 for 100-bound and 0 for key)
  p.pos = 2; // Street Luck
  land(g, (limit) => (limit === 100 ? 10 : 0));
  assert.equal(p.tacticals.length, 1);
  assert.equal(p.tacticals[0], "switchblade");

  // Second draw: stash holds 2
  p.pos = 2;
  land(g, (limit) => (limit === 100 ? 20 : 1));
  assert.equal(p.tacticals.length, 2);
  assert.equal(p.tacticals[1], "getaway");

  // Third draw: stash is capped at 2, card is rejected
  p.pos = 2;
  land(g, (limit) => (limit === 100 ? 5 : 2));
  assert.equal(p.tacticals.length, 2);

  // Direct helper respects cap
  const overflow = drawTacticalCard(g, p, "scanner");
  assert.equal(overflow, null);
  assert.equal(p.tacticals.length, 2);
});

test("using getaway allows player to choose 1-6 movement spaces on their next roll", () => {
  const { g, p, b } = setup();
  p.tacticals = ["getaway"];

  // Non-owner cannot use
  assert.throws(
    () => action(g, b.id, { type: "tactical-use", card: "getaway" }),
    /do not own/,
  );

  // Invalid spaces bounds
  assert.throws(
    () => action(g, p.id, { type: "tactical-use", card: "getaway", spaces: 0 }),
    /1–6/,
  );
  assert.throws(
    () => action(g, p.id, { type: "tactical-use", card: "getaway", spaces: 7 }),
    /1–6/,
  );

  // Valid use specifying 4 spaces
  action(g, p.id, { type: "tactical-use", card: "getaway", spaces: 4 });
  assert.equal(p.tacticals.length, 0);
  assert.equal(p.activeEffects.getaway, 4);

  // Next roll moves exactly 4 spaces (ignoring dice total)
  p.pos = 0;
  action(g, p.id, { type: "roll" });
  assert.equal(p.pos, 4);
  assert.equal(p.activeEffects.getaway, undefined);
});

test("using switchblade adds +15 Kick Damage in the next shootout", () => {
  const { g, p, b } = setup();
  p.tacticals = ["switchblade"];
  g.props[1] = { owner: b.id, level: 0, mortgaged: false };

  // Use switchblade from stash
  action(g, p.id, { type: "tactical-use", card: "switchblade" });
  assert.equal(p.tacticals.length, 0);
  assert.equal(p.activeEffects.switchblade, true);

  // Enter shootout with landlord
  p.cash = 0;
  p.pos = 1;
  land(g);
  action(g, p.id, { type: "shootout" });
  assert.equal(g.phase, "duel");
  assert.equal(g.duel.fighters[p.id].kickBonus, 15);
  assert.equal(p.activeEffects.switchblade, undefined);

  // Ready up both fighters
  const at = 5000;
  action(g, p.id, { type: "duel-ready" }, undefined, { now: at });
  action(g, b.id, { type: "duel-ready" }, undefined, { now: at });

  // Place fighters adjacent and execute a kick
  g.duel.fighters[p.id].x = 5.0;
  g.duel.fighters[p.id].y = 5.0;
  g.duel.fighters[b.id].x = 5.5;
  g.duel.fighters[b.id].y = 5.0;

  action(
    g,
    p.id,
    { type: "duel-kick", yaw: 0, pitch: 0 },
    undefined,
    { now: at + 3500 },
  );

  // Base kick damage is 30, with switchblade (+15) it deals 45 damage
  assert.equal(g.duel.fighters[b.id].hp, 55);
  assert.equal(g.duel.fighters[p.id].damage, 45);
});

test("using scanner halves the next rent or tax the player lands on", () => {
  const { g, p, b } = setup();

  // Rent test: property 1 rent is $12 (Auntie's Bodega price 60, rent 12)
  g.props[1] = { owner: b.id, level: 0, mortgaged: false };
  p.tacticals = ["scanner"];
  action(g, p.id, { type: "tactical-use", card: "scanner" });
  assert.equal(p.tacticals.length, 0);
  assert.equal(p.activeEffects.scanner, true);

  p.pos = 1;
  land(g);
  assert.equal(g.phase, "rent");
  // 12 halved is 6
  assert.equal(g.pending.amount, 6);
  assert.equal(p.activeEffects.scanner, undefined);

  // Tax test: Flex Tax (tile 4) is $100
  g.pending = null;
  g.phase = "roll";
  p.cash = 1000;
  p.tacticals = ["scanner"];
  action(g, p.id, { type: "tactical-use", card: "scanner" });
  p.pos = 4;
  land(g);
  // Charged $50 instead of $100
  assert.equal(p.cash, 950);
  assert.equal(p.activeEffects.scanner, undefined);
});

test("using bailout frees the player from County Jail without paying or rolling", () => {
  const { g, p } = setup();

  // In-jail usage
  p.jail = 2;
  p.pos = 10;
  g.phase = "jail";
  p.tacticals = ["bailout"];

  action(g, p.id, { type: "tactical-use", card: "bailout" });
  assert.equal(p.tacticals.length, 0);
  assert.equal(p.jail, 0);
  assert.equal(g.phase, "roll");

  // Pre-jail immunity usage
  p.tacticals = ["bailout"];
  action(g, p.id, { type: "tactical-use", card: "bailout" });
  assert.equal(p.activeEffects.bailout, true);

  // Landing on Police Raid
  const raidTile = g.board.findIndex((t) => t.type === "raid");
  p.pos = raidTile;
  land(g);
  assert.equal(p.jail, 0);
  assert.equal(p.activeEffects.bailout, undefined);
});

test("spectator side-bets: $50 bet awards 2x payout, participants rejected, invalid amounts rejected", () => {
  const { g, p, b, c, d } = setup();
  g.props[1] = { owner: b.id, level: 0, mortgaged: false };

  // Set up rent shootout between challenger P and landlord B
  p.cash = 0;
  p.pos = 1;
  land(g);
  action(g, p.id, { type: "shootout" });
  assert.equal(g.phase, "duel");

  // Duel participants cannot place bets
  assert.throws(
    () => action(g, p.id, { type: "duel-bet", amount: 50, pick: p.id }),
    /participants/,
  );
  assert.throws(
    () => action(g, b.id, { type: "duel-bet", amount: 50, pick: b.id }),
    /participants/,
  );

  // Invalid bet amount rejected (must be $50 or $100)
  assert.throws(
    () => action(g, c.id, { type: "duel-bet", amount: 75, pick: p.id }),
    /Bet amount/,
  );

  // Invalid pick rejected (must be attacker or defender)
  assert.throws(
    () => action(g, c.id, { type: "duel-bet", amount: 50, pick: d.id }),
    /challenger or the landlord/,
  );

  // Spectator C places $50 bet on Challenger P
  c.cash = 500;
  action(g, c.id, { type: "duel-bet", amount: 50, pick: p.id });
  assert.equal(c.cash, 450);
  assert.equal(g.duel.bets.length, 1);
  assert.deepEqual(g.duel.bets[0], { player: c.id, amount: 50, pick: p.id });

  // Spectator D places $100 bet on Landlord B
  d.cash = 600;
  action(g, d.id, { type: "duel-bet", amount: 100, pick: b.id });
  assert.equal(d.cash, 500);
  assert.equal(g.duel.bets.length, 2);

  // Ready up both fighters and settle with challenger P winning
  const at = 2000;
  action(g, p.id, { type: "duel-ready" }, undefined, { now: at });
  action(g, b.id, { type: "duel-ready" }, undefined, { now: at });

  g.duel.fighters[b.id].hp = 0;
  tickDuel(g, at + 4000);

  assert.equal(g.phase, "duel-result");
  assert.equal(g.duel.winner, p.id);

  // Winning bettor C receives $50 * 2 = $100 payout
  assert.equal(c.cash, 550); // 450 + 100
  // Losing bettor D receives no payout
  assert.equal(d.cash, 500);
});

test("spectator betting closes after the first 5 seconds of live shootout", () => {
  const { g, p, b, c } = setup();
  g.props[1] = { owner: b.id, level: 0, mortgaged: false };

  p.cash = 0;
  p.pos = 1;
  land(g);
  action(g, p.id, { type: "shootout" });

  const at = 1000;
  action(g, p.id, { type: "duel-ready" }, undefined, { now: at });
  action(g, b.id, { type: "duel-ready" }, undefined, { now: at });

  // Live at 1000; at 7000 (6s after live), betting is closed
  assert.throws(
    () =>
      action(
        g,
        c.id,
        { type: "duel-bet", amount: 50, pick: p.id },
        undefined,
        { now: 7000 },
      ),
    /closed/,
  );

  // Eliminated player cannot bet
  c.out = true;
  assert.throws(
    () =>
      action(
        g,
        c.id,
        { type: "duel-bet", amount: 50, pick: p.id },
        undefined,
        { now: 2000 },
      ),
    /active player|Eliminated/,
  );
});

test("tactical card definitions match specification", () => {
  assert.equal(TACTICAL_CARDS.switchblade.id, "switchblade");
  assert.equal(
    TACTICAL_CARDS.switchblade.description,
    "+15 Kick Damage in next Shootout",
  );
  assert.equal(TACTICAL_CARDS.getaway.id, "getaway");
  assert.equal(
    TACTICAL_CARDS.getaway.description,
    "Choose 1–6 movement spaces on your next roll",
  );
  assert.equal(TACTICAL_CARDS.bailout.id, "bailout");
  assert.equal(
    TACTICAL_CARDS.bailout.description,
    "Get Out of County Jail free",
  );
  assert.equal(TACTICAL_CARDS.scanner.id, "scanner");
  assert.equal(
    TACTICAL_CARDS.scanner.description,
    "Halve the next rent or tax you land on",
  );
});

test("anti-exploit: spectator cannot place multiple bets or change their bet", () => {
  const { g, p, b, c } = setup();
  g.props[1] = { owner: b.id, level: 0, mortgaged: false };
  p.cash = 0;
  p.pos = 1;
  land(g);
  action(g, p.id, { type: "shootout" });

  c.cash = 500;
  action(g, c.id, { type: "duel-bet", amount: 50, pick: p.id });
  assert.equal(c.cash, 450);

  // Attempting to place a second bet on the same duel is rejected
  assert.throws(
    () => action(g, c.id, { type: "duel-bet", amount: 50, pick: b.id }),
    /already placed/,
  );
  assert.throws(
    () => action(g, c.id, { type: "duel-bet", amount: 100, pick: p.id }),
    /already placed/,
  );
});

test("anti-exploit: cannot waste/stack primed tactical card effects", () => {
  const { g, p } = setup();
  p.tacticals = ["getaway", "getaway", "switchblade", "switchblade"];

  // Activate getaway
  action(g, p.id, { type: "tactical-use", card: "getaway", spaces: 3 });
  assert.equal(p.activeEffects.getaway, 3);
  // Attempt to activate another getaway while one is active
  assert.throws(
    () => action(g, p.id, { type: "tactical-use", card: "getaway", spaces: 4 }),
    /already primed/,
  );

  // Activate switchblade
  action(g, p.id, { type: "tactical-use", card: "switchblade" });
  assert.equal(p.activeEffects.switchblade, true);
  assert.throws(
    () => action(g, p.id, { type: "tactical-use", card: "switchblade" }),
    /already equipped/,
  );
});

test("mid-duel switchblade usage applies to current duel and does not leak to future duels", () => {
  const { g, p, b } = setup();
  g.props[1] = { owner: b.id, level: 0, mortgaged: false };
  p.cash = 0;
  p.pos = 1;
  land(g);
  action(g, p.id, { type: "shootout" });

  // P equips switchblade mid-duel
  p.tacticals = ["switchblade"];
  action(g, p.id, { type: "tactical-use", card: "switchblade" });
  assert.equal(g.duel.fighters[p.id].kickBonus, 15);
  // activeEffects.switchblade should NOT be set to prevent leaking to next duel
  assert.equal(p.activeEffects.switchblade, undefined);
});

test("landing on Street Luck with full tactical stash (2/2) falls back to drawing standard card", () => {
  const { g, p } = setup();
  p.tacticals = ["getaway", "switchblade"];
  p.pos = 2; // Street Luck
  // Trigger Street Luck with rng returning 0 for 100-bound (which would normally trigger 40% tactical)
  land(g, (_limit) => 0);
  // Tactical cards count remains capped at 2
  assert.equal(p.tacticals.length, 2);
  // Turn phase transitions to standard card drawn instead of ending empty-handed
  assert.equal(g.phase, "card");
  assert.ok(g.pending?.card);
});
