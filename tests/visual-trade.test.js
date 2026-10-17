import test from "node:test";
import assert from "node:assert/strict";
import { BOARD, DISTRICTS } from "../shared/board.js";
import {
  calculateTradeValues,
  stepCash,
  getDistrictColor,
} from "../shared/trading.js";

test("calculateTradeValues: empty trade returns fair status with balanced ratio", () => {
  const result = calculateTradeValues(BOARD, {}, {});
  assert.equal(result.status, "fair");
  assert.equal(result.label, "Fair");
  assert.equal(result.giveTotal, 0);
  assert.equal(result.takeTotal, 0);
  assert.equal(result.diff, 0);
  assert.equal(result.ratio, 0.5);
  assert.ok(result.description.includes("Add properties or cash"));
});

test("calculateTradeValues: equal property swap evaluates to Fair", () => {
  // Tile 1: Auntie's Bodega ($60), Tile 3: Broke Boy Blvd ($80)
  // Give: Auntie's Bodega ($60) + $20 cash = $80
  // Take: Broke Boy Blvd ($80)
  const props = {
    1: { owner: "p1", level: 0, mortgaged: false },
    3: { owner: "p2", level: 0, mortgaged: false },
  };
  const result = calculateTradeValues(BOARD, props, {
    giveTiles: [1],
    cash: 20,
    takeTiles: [3],
    requestCash: 0,
  });

  assert.equal(result.givePropsVal, 60);
  assert.equal(result.giveCashVal, 20);
  assert.equal(result.giveTotal, 80);
  assert.equal(result.takePropsVal, 80);
  assert.equal(result.takeCashVal, 0);
  assert.equal(result.takeTotal, 80);
  assert.equal(result.diff, 0);
  assert.equal(result.status, "fair");
  assert.equal(result.label, "Fair");
  assert.ok(result.description.includes("Even split"));
});

test("calculateTradeValues: mortgaged properties are valued at 50% list price", () => {
  // Tile 5: Spin the Bus ($200) - mortgaged = $100
  // Tile 1: Auntie's Bodega ($60) - unmortgaged = $60
  const props = {
    5: { owner: "p1", level: 0, mortgaged: true },
    1: { owner: "p2", level: 0, mortgaged: false },
  };
  const result = calculateTradeValues(BOARD, props, {
    giveTiles: [5],
    takeTiles: [1],
  });

  assert.equal(result.givePropsVal, 100, "Mortgaged $200 transit must be valued at $100");
  assert.equal(result.takePropsVal, 60, "Unmortgaged property must be valued at 100%");
  assert.equal(result.giveTotal, 100);
  assert.equal(result.takeTotal, 60);
  // Difference is $40, which is <= $50, so deal remains Fair
  assert.equal(result.status, "fair");
  assert.equal(result.label, "Fair");
});

test("calculateTradeValues: offering significantly more value evaluates to Generous", () => {
  // Give: $300 cash + Auntie's Bodega ($60) = $360
  // Take: Broke Boy Blvd ($80)
  const props = {
    1: { owner: "p1", level: 0, mortgaged: false },
    3: { owner: "p2", level: 0, mortgaged: false },
  };
  const result = calculateTradeValues(BOARD, props, {
    giveTiles: [1],
    cash: 300,
    takeTiles: [3],
    requestCash: 0,
  });

  assert.equal(result.giveTotal, 360);
  assert.equal(result.takeTotal, 80);
  assert.equal(result.diff, 280);
  assert.equal(result.status, "generous");
  assert.equal(result.label, "Generous");
  assert.ok(result.description.includes("provides $280 more estimated value"));
  assert.ok(result.ratio > 0.8);
});

test("calculateTradeValues: requesting significantly more value evaluates to One-Sided", () => {
  // Give: $20 cash
  // Take: Rich Auntie Row ($460 list price, tile 37)
  const props = {
    37: { owner: "p2", level: 0, mortgaged: false },
  };
  const result = calculateTradeValues(BOARD, props, {
    giveTiles: [],
    cash: 20,
    takeTiles: [37],
    requestCash: 0,
  });

  assert.equal(result.giveTotal, 20);
  assert.equal(result.takeTotal, 460);
  assert.equal(result.diff, -440);
  assert.equal(result.status, "one-sided");
  assert.equal(result.label, "One-Sided");
  assert.ok(result.description.includes("asks for $440 more estimated value"));
  assert.ok(result.ratio < 0.1);
});

test("calculateTradeValues: escape cards are valued at $50 each (bail equivalent)", () => {
  const result = calculateTradeValues(BOARD, {}, {
    escapes: 2, // 2 * $50 = $100
    requestCash: 100,
  });

  assert.equal(result.giveCardsVal, 100);
  assert.equal(result.takeCashVal, 100);
  assert.equal(result.giveTotal, 100);
  assert.equal(result.takeTotal, 100);
  assert.equal(result.diff, 0);
  assert.equal(result.status, "fair");
});

test("stepCash: adjusts by +50 / -50 and clamps at 0 and max", () => {
  assert.equal(stepCash(100, 50, 500), "150");
  assert.equal(stepCash(100, -50, 500), "50");
  assert.equal(stepCash(30, -50, 500), "0", "Clamps down at 0");
  assert.equal(stepCash(0, -50, 500), "0", "Cannot drop below 0");
  assert.equal(stepCash(480, 50, 500), "500", "Clamps up at max");
  assert.equal(stepCash(500, 50, 500), "500", "Cannot exceed max");
  assert.equal(stepCash("not-a-number", 50, 200), "50", "Handles invalid inputs gracefully");
  assert.equal(stepCash(100, 50, 0), "0", "Respects 0 max");
});

test("getDistrictColor: returns correct colors for districts, transits, utilities, and corners", () => {
  // Tile 1: group 0
  assert.equal(getDistrictColor(BOARD[1], DISTRICTS), DISTRICTS[0].color);
  // Tile 6: group 1
  assert.equal(getDistrictColor(BOARD[6], DISTRICTS), DISTRICTS[1].color);
  // Tile 5: transit
  assert.equal(getDistrictColor(BOARD[5], DISTRICTS), "#486253");
  // Tile 12: utility
  assert.equal(getDistrictColor(BOARD[12], DISTRICTS), "#5f5c40");
  // Tile 0: start (home base)
  assert.equal(getDistrictColor(BOARD[0], DISTRICTS), "#2f3d33");
  // Null or undefined fallback
  assert.equal(getDistrictColor(null, DISTRICTS), "#2f3d33");
});
