import test from "node:test";
import assert from "node:assert/strict";
import {
  getTimerState,
  holdsBothUtilities,
  getGridLockdownDisabled,
  getEnemyDistricts,
  getCityHeatBadge,
  isAllied,
} from "../shared/hud.js";
import { room, player, start, action } from "../server/game.js";
import { BOARD } from "../shared/board.js";

const prop = (owner, mortgaged = false) => ({ owner, level: 0, mortgaged });

test("Circular SVG Turn Timer Ring progress, stroke dashoffset, and color shift logic", () => {
  const totalTurnTime = 90000;
  const now = 1000000;

  // 1. Normal thinking time: 60s remaining (> 15s)
  const normalState = getTimerState(now + 60000, now, totalTurnTime);
  assert.equal(normalState.color, "#c4f53c");
  assert.equal(normalState.urgency, "normal");
  assert.equal(normalState.className, "normal");
  assert.ok(Math.abs(normalState.progress - 60000 / 90000) < 0.001);
  assert.ok(normalState.strokeDashoffset > 0);
  assert.ok(normalState.strokeDashoffset < normalState.circumference);

  // 2. Full turn duration: 90s remaining
  const fullState = getTimerState(now + 90000, now, totalTurnTime);
  assert.equal(fullState.color, "#c4f53c");
  assert.equal(fullState.progress, 1);
  assert.equal(fullState.strokeDashoffset, 0);

  // 3. Under 15s remaining: 10s remaining -> Amber (#f59e0b)
  const warningState = getTimerState(now + 10000, now, totalTurnTime);
  assert.equal(warningState.color, "#f59e0b");
  assert.equal(warningState.urgency, "warning");
  assert.ok(warningState.className.includes("amber"));
  assert.ok(Math.abs(warningState.progress - 10000 / 90000) < 0.001);

  // 4. Under 5s remaining: 3s remaining -> Pulsing Crimson (#ff4336)
  const criticalState = getTimerState(now + 3000, now, totalTurnTime);
  assert.equal(criticalState.color, "#ff4336");
  assert.equal(criticalState.urgency, "critical");
  assert.ok(criticalState.className.includes("pulsing"));
  assert.ok(criticalState.className.includes("crimson"));
  assert.ok(Math.abs(criticalState.progress - 3000 / 90000) < 0.001);

  // 5. Expired: 0s remaining
  const expiredState = getTimerState(now - 1000, now, totalTurnTime);
  assert.equal(expiredState.color, "#ff4336");
  assert.equal(expiredState.progress, 0);
  assert.equal(expiredState.strokeDashoffset, expiredState.circumference);
});

test("Grid Lockdown prerequisites, solo & team utility holdings, and enemy district detection", () => {
  const p1 = player("Player 1");
  const p2 = player("Player 2");
  const p3 = player("Rival");
  const g = room("LOCKDOWN1", p1);
  g.players.push(p2, p3);
  start(g, p1.id);

  const utilities = BOARD.filter((x) => x.type === "utility");
  assert.ok(utilities.length >= 2);
  const u1 = utilities[0].id;
  const u2 = utilities[1].id;

  // Solo mode: player owns no utilities
  assert.equal(holdsBothUtilities(g, p1.id), false);

  // Player owns only 1 utility
  g.props[u1] = prop(p1.id);
  assert.equal(holdsBothUtilities(g, p1.id), false);

  // Player owns both utilities unmortgaged
  g.props[u2] = prop(p1.id);
  assert.equal(holdsBothUtilities(g, p1.id), true);

  // One utility mortgaged -> cannot lockdown
  g.props[u2].mortgaged = true;
  assert.equal(holdsBothUtilities(g, p1.id), false);
  g.props[u2].mortgaged = false;

  // Team mode: utilities split across allies
  g.settings.teams = true;
  p1.team = 0;
  p2.team = 0;
  p3.team = 1;
  assert.equal(isAllied(g, p1.id, p2.id), true);
  assert.equal(isAllied(g, p1.id, p3.id), false);

  g.props[u1] = prop(p1.id); // Ally 1 holds Power Plug
  g.props[u2] = prop(p2.id); // Ally 2 holds Water Plug
  assert.equal(holdsBothUtilities(g, p1.id), true);
  assert.equal(holdsBothUtilities(g, p2.id), true);
  assert.equal(holdsBothUtilities(g, p3.id), false);

  // If ally mortgages their utility, team holding becomes invalid
  g.props[u2].mortgaged = true;
  assert.equal(holdsBothUtilities(g, p1.id), false);
  g.props[u2].mortgaged = false;

  // Disabled checks: cash and round reuse
  p1.cash = 50;
  assert.equal(getGridLockdownDisabled(g, p1.id), true); // lacks $100

  p1.cash = 500;
  assert.equal(getGridLockdownDisabled(g, p1.id), false); // can afford and round not used

  g.lockdownUsedRound = g.round;
  assert.equal(getGridLockdownDisabled(g, p1.id), true); // already used this round

  // Enemy districts detection:
  // Give all tiles in District 0 to team 0
  const d0Tiles = BOARD.filter((x) => x.group === 0);
  d0Tiles.forEach((t) => {
    g.props[t.id] = prop(p1.id);
  });
  const enemyDistricts = getEnemyDistricts(g, p1.id);
  assert.ok(!enemyDistricts.includes(0)); // District 0 is 100% allied, so excluded
  assert.ok(enemyDistricts.includes(1)); // District 1 has unowned/enemy tiles, so included
  assert.ok(enemyDistricts.length >= 7);
});

test("Server validates allied team holding both utilities to execute grid-lockdown", () => {
  const p1 = player("Captain");
  const p2 = player("Mate");
  const rival = player("Enemy");
  const g = room("LOCKDOWN2", p1);
  g.players.push(p2, rival);
  start(g, p1.id);

  g.settings.teams = true;
  p1.team = 0;
  p2.team = 0;
  rival.team = 1;

  const utilities = BOARD.filter((x) => x.type === "utility");
  const u1 = utilities[0].id;
  const u2 = utilities[1].id;

  // Teammates split utilities
  g.props[u1] = prop(p1.id);
  g.props[u2] = prop(p2.id);
  p1.cash = 500;
  g.phase = "roll";

  // Rival owns district 2
  const d2Tiles = BOARD.filter((x) => x.group === 2);
  d2Tiles.forEach((t) => {
    g.props[t.id] = prop(rival.id);
  });

  // Action succeeds using team utility holdings
  action(g, p1.id, { type: "grid-lockdown", district: 2 });
  assert.equal(p1.cash, 400); // $100 maintenance cost deducted
  assert.equal(g.lockdownUsedRound, g.round);
  assert.equal(g.blackoutDistrict, 2);
  assert.equal(g.blackoutExpiresOnPlayer, p1.id);
});

test("City Heat HUD Badge text format and scaling across heat levels", () => {
  // Round < 15, heatLevel = 0 -> no badge
  const g0 = { round: 10, heatLevel: 0 };
  assert.equal(getCityHeatBadge(g0), null);

  // Heat Level 1 (Round 15) -> HOME $175, TAX +20%
  const g1 = { round: 15, heatLevel: 1 };
  const badge1 = getCityHeatBadge(g1);
  assert.notEqual(badge1, null);
  assert.equal(badge1.heatLevel, 1);
  assert.equal(badge1.homeBonus, 175);
  assert.equal(badge1.taxPercent, 20);
  assert.equal(badge1.text, "🔥 CITY HEAT LVL 1 · HOME $175 · TAX +20%");

  // Heat Level 2 (Round 20) -> HOME $150, TAX +40%
  const g2 = { round: 20, heatLevel: 2 };
  const badge2 = getCityHeatBadge(g2);
  assert.equal(badge2.text, "🔥 CITY HEAT LVL 2 · HOME $150 · TAX +40%");

  // Heat Level 3 (Round 25) -> HOME $125, TAX +60%
  const g3 = { round: 25, heatLevel: 3 };
  const badge3 = getCityHeatBadge(g3);
  assert.equal(badge3.text, "🔥 CITY HEAT LVL 3 · HOME $125 · TAX +60%");

  // Heat Level 4 (Round 30+) -> HOME $100, TAX +80%
  const g4 = { round: 30, heatLevel: 4 };
  const badge4 = getCityHeatBadge(g4);
  assert.equal(badge4.text, "🔥 CITY HEAT LVL 4 · HOME $100 · TAX +80%");
});
