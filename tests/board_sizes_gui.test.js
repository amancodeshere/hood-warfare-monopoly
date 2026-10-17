import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  BOARD as BOARD_40,
  QUICK_BOARD as BOARD_28,
  coordinates,
  DISTRICTS as _DISTRICTS_40,
} from "../shared/board.js";
import {
  BOARD as LEGACY_BOARD_28,
  DISTRICTS as _DISTRICTS_28,
} from "../shared/legacy-board.js";
import {
  room,
  player,
  action,
  start,
  rent,
} from "../server/game.js";
import { getEnemyDistricts } from "../shared/hud.js";

// Helper to create test room
function createTestGame(boardSize = 40, opts = {}) {
  const p1 = player("Player 1");
  const p2 = player("Player 2");
  const activeBoard = boardSize === 28 ? (BOARD_28 || LEGACY_BOARD_28) : BOARD_40;
  const g = room("ROOM1", p1, { settings: { ...opts, autoFill: false } });
  g.players.push(p2);
  g.board = activeBoard;
  g.schemaVersion = 2;
  return { g, p1, p2, activeBoard };
}

test("Dynamic Board Sizing: compute size = Math.floor(BOARD.length / 4) + 1", () => {
  assert.equal(Math.floor(BOARD_40.length / 4) + 1, 11, "40 tiles must yield 11x11 grid");
  assert.equal(Math.floor(BOARD_28.length / 4) + 1, 8, "28 tiles must yield 8x8 grid");
  assert.equal(Math.floor(LEGACY_BOARD_28.length / 4) + 1, 8, "28 legacy tiles must yield 8x8 grid");

  const gameBoardCode = readFileSync(resolve("src/components/GameBoard.jsx"), "utf8");
  assert.ok(
    gameBoardCode.includes("Math.floor(BOARD.length / 4) + 1") ||
      gameBoardCode.includes("Math.floor(activeBoard.length / 4) + 1"),
    "GameBoard.jsx must compute size dynamically using Math.floor(BOARD.length / 4) + 1",
  );
  assert.ok(
    gameBoardCode.includes('"board-grid"') && gameBoardCode.includes('--board-size": size'),
    "GameBoard.jsx must pass --board-size to .board-grid style",
  );
});

test("Coordinate Mappings: 40-tile board has 40 perimeter coordinates and exact corners on 11x11 grid", () => {
  const coords = BOARD_40.map((t) => coordinates(t.id, 40));
  assert.equal(coords.length, 40);

  // Unique positions
  const uniqueKeys = new Set(coords.map((c) => `${c.row},${c.col}`));
  assert.equal(uniqueKeys.size, 40, "All 40 tiles must occupy unique grid coordinates");

  // All coordinates lie on perimeter of 11x11 grid
  for (const c of coords) {
    assert.ok(c.row >= 1 && c.row <= 11, `Row ${c.row} must be within 1..11`);
    assert.ok(c.col >= 1 && c.col <= 11, `Col ${c.col} must be within 1..11`);
    assert.ok(
      c.row === 1 || c.row === 11 || c.col === 1 || c.col === 11,
      `Coordinate (${c.row}, ${c.col}) must lie on perimeter`,
    );
  }

  // Four corners
  assert.deepEqual(coordinates(0, 40), { row: 11, col: 11 }, "Corner 0 (Start) at (11, 11)");
  assert.deepEqual(coordinates(10, 40), { row: 11, col: 1 }, "Corner 10 (Jail) at (11, 1)");
  assert.deepEqual(coordinates(20, 40), { row: 1, col: 1 }, "Corner 20 (Parking) at (1, 1)");
  assert.deepEqual(coordinates(30, 40), { row: 1, col: 11 }, "Corner 30 (Raid) at (1, 11)");
});

test("Coordinate Mappings: 28-tile board has 28 perimeter coordinates and exact corners on 8x8 grid", () => {
  const board = BOARD_28 || LEGACY_BOARD_28;
  const coords = board.map((t) => coordinates(t.id, 28));
  assert.equal(coords.length, 28);

  // Unique positions
  const uniqueKeys = new Set(coords.map((c) => `${c.row},${c.col}`));
  assert.equal(uniqueKeys.size, 28, "All 28 tiles must occupy unique grid coordinates");

  // All coordinates lie on perimeter of 8x8 grid
  for (const c of coords) {
    assert.ok(c.row >= 1 && c.row <= 8, `Row ${c.row} must be within 1..8`);
    assert.ok(c.col >= 1 && c.col <= 8, `Col ${c.col} must be within 1..8`);
    assert.ok(
      c.row === 1 || c.row === 8 || c.col === 1 || c.col === 8,
      `Coordinate (${c.row}, ${c.col}) must lie on perimeter`,
    );
  }

  // Four corners
  assert.deepEqual(coordinates(0, 28), { row: 8, col: 8 }, "Corner 0 (Start) at (8, 8)");
  assert.deepEqual(coordinates(7, 28), { row: 8, col: 1 }, "Corner 7 (Jail) at (8, 1)");
  assert.deepEqual(coordinates(14, 28), { row: 1, col: 1 }, "Corner 14 (Parking) at (1, 1)");
  assert.deepEqual(coordinates(21, 28), { row: 1, col: 8 }, "Corner 21 (Raid) at (1, 8)");
});

test("BoardCenter grid bounds and dynamic City centerpiece scale: 8x8 vs 11x11", () => {
  const gameBoardCode = readFileSync(resolve("src/components/GameBoard.jsx"), "utf8");
  const cityCode = readFileSync(resolve("src/City.jsx"), "utf8");
  const css = readFileSync(resolve("src/style.css"), "utf8");

  // BoardCenter dynamically scales perspective and size
  assert.ok(
    gameBoardCode.includes("gridColumn: `2/${boardSize}`") ||
      gameBoardCode.includes("gridColumn: `2/${size}`"),
    "BoardCenter must dynamically set gridColumn: 2/${size}",
  );
  assert.ok(
    gameBoardCode.includes("gridRow: `2/${boardSize}`") ||
      gameBoardCode.includes("gridRow: `2/${size}`"),
    "BoardCenter must dynamically set gridRow: 2/${size}",
  );


  // City accepts scale and renders scale transform
  assert.ok(cityCode.includes("scale = 1"), "City component must accept scale prop with default 1");
  assert.ok(cityCode.includes("data-scale={scale}"), "City component must render data-scale attribute");
  assert.ok(
    cityCode.includes("scale(${scale})") || cityCode.includes("--city-scale"),
    "City component must apply scale transform",
  );

  // CSS supports --board-size and --city-scale
  assert.ok(css.includes(".board-center"), "style.css must define .board-center");
  assert.ok(css.includes("var(--board-size"), "style.css must use var(--board-size) for grid bounds");
  assert.ok(css.includes("--city-scale"), "style.css must support --city-scale on .city-art");
  assert.ok(css.includes('.board-grid[data-size="8"]'), "style.css must have specific 8x8 board rules");
});

test("Building pieces positioning & scaling cleanly on 8x8 tiles without overlapping owner stripes or prices", () => {
  const css = readFileSync(resolve("src/style.css"), "utf8");

  // Building pieces position and container query units
  assert.ok(css.includes(".building-pieces"), "style.css must style .building-pieces");
  assert.ok(css.includes(".building-pieces svg"), "style.css must style .building-pieces svg");
  assert.ok(css.includes(".tile.built"), "style.css must style .tile.built");

  // 8x8 board clearance rules
  assert.ok(
    css.includes('.board-grid[data-size="8"] .tile.built') ||
      css.includes('.board-grid[data-size="8"] .building-pieces'),
    "style.css must declare 8x8 specific clearance for built tiles and building pieces",
  );

  // Built tile padding and owner bar clearance
  assert.ok(css.includes(".tile.owned"), "style.css must declare .tile.owned");
  assert.ok(css.includes("padding-bottom"), "style.css must declare padding-bottom for owner bar clearance");
});

test("Overhead Token Speech Bubbles: alignment and pointer styling on 8x8 and 11x11 boards", () => {
  const css = readFileSync(resolve("src/style.css"), "utf8");

  // Speech bubble pointer arrow alignment
  assert.ok(css.includes(".token-bark-bubble"), "style.css must style .token-bark-bubble");
  assert.ok(
    css.includes(".token-bark-bubble::before") && css.includes("translateX(-50%)"),
    "style.css must center bubble pointer arrow using translateX(-50%)",
  );
  assert.ok(
    css.includes(".token-bark-bubble::after") && css.includes("translateX(-50%)"),
    "style.css must center bubble inner pointer arrow using translateX(-50%)",
  );
  assert.ok(
    css.includes("overflow: visible !important"),
    "style.css must unclip tile and tokens overflow for speech bubbles",
  );
});

test("Grid Lockdown: feature parity on 28-tile board (districts 0-5) vs 40-tile board (districts 0-7)", () => {
  // Test 40-tile board
  const { g: g40, p1: p1_40, p2: _p2_40 } = createTestGame(40);
  start(g40, p1_40.id);

  // Give p1 both utilities on 40-tile board (id 12 and 33)
  g40.props[12] = { owner: p1_40.id, level: 0, mortgaged: false };
  g40.props[33] = { owner: p1_40.id, level: 0, mortgaged: false };
  p1_40.cash = 1000;

  // Enemy districts for p1_40 includes 0..7
  const enemyDistricts40 = getEnemyDistricts(g40, p1_40.id);
  assert.ok(enemyDistricts40.includes(0));
  assert.ok(enemyDistricts40.includes(7));
  assert.ok(!enemyDistricts40.includes(8));

  // Valid activation on district 7
  action(g40, p1_40.id, { type: "grid-lockdown", district: 7 });
  assert.equal(g40.blackoutDistrict, 7);
  assert.equal(g40.lockdownUsedRound, g40.round);

  // Test 28-tile board
  const { g: g28, p1: p1_28, p2: p2_28 } = createTestGame(28);
  start(g28, p1_28.id);

  // Use the real quick board so feature parity cannot be hidden by a synthetic layout.
  for (const tile of g28.board.filter(t => t.type === "utility"))
    g28.props[tile.id] = { owner: p1_28.id, level: 0, mortgaged: false };
  p1_28.cash = 1000;

  // Enemy districts on 28-tile board includes 0..5, but NOT 6 or 7
  const enemyDistricts28 = getEnemyDistricts(g28, p1_28.id);
  assert.ok(enemyDistricts28.includes(0));
  assert.ok(enemyDistricts28.includes(5));
  assert.ok(!enemyDistricts28.includes(6));
  assert.ok(!enemyDistricts28.includes(7));

  // Valid activation on district 5 on 28-tile board
  action(g28, p1_28.id, { type: "grid-lockdown", district: 5 });
  assert.equal(g28.blackoutDistrict, 5);

  // Reject district 6 on 28-tile board
  g28.lockdownUsedRound = null; // reset cooldown
  assert.throws(
    () => action(g28, p1_28.id, { type: "grid-lockdown", district: 6 }),
    /district/,
  );

  // Verify rent is halved on blacked out district for 28-tile board
  const propGroup5 = g28.board.find((t) => t.group === 5 && t.type === "property");
  assert.ok(propGroup5, "Must have property in district 5");
  g28.props[propGroup5.id] = { owner: p2_28.id, level: 0, mortgaged: false };
  const standardRent = propGroup5.rent;
  const blackedOutRent = rent(g28, propGroup5);
  assert.equal(blackedOutRent, Math.round(standardRent * 0.5), "Blackout must halve property rent on 28-tile board");
});

test("Utilities & Transits: calculate rent accurately according to active board length", () => {
  // --- 40-tile Board Transit & Utility Rent ---
  const { g: g40, p1: p1_40 } = createTestGame(40);
  start(g40, p1_40.id);
  g40.dice = [3, 4]; // sum = 7

  // Utility rent on 40-tile: 1 utility = 4x dice (28), 2 utilities = 15x dice (105)
  g40.props[12] = { owner: p1_40.id, level: 0, mortgaged: false };
  assert.equal(rent(g40, BOARD_40[12]), 28);
  g40.props[33] = { owner: p1_40.id, level: 0, mortgaged: false };
  assert.equal(rent(g40, BOARD_40[12]), 105);

  // Transit rent on 40-tile: 25 * 2^(n-1) => 25, 50, 100, 200
  const transitIds40 = [5, 15, 25, 35];
  g40.props[transitIds40[0]] = { owner: p1_40.id, level: 0, mortgaged: false };
  assert.equal(rent(g40, BOARD_40[transitIds40[0]]), 25);
  g40.props[transitIds40[1]] = { owner: p1_40.id, level: 0, mortgaged: false };
  assert.equal(rent(g40, BOARD_40[transitIds40[0]]), 50);
  g40.props[transitIds40[2]] = { owner: p1_40.id, level: 0, mortgaged: false };
  assert.equal(rent(g40, BOARD_40[transitIds40[0]]), 100);
  g40.props[transitIds40[3]] = { owner: p1_40.id, level: 0, mortgaged: false };
  assert.equal(rent(g40, BOARD_40[transitIds40[0]]), 200);

  // --- 28-tile Board Transit Rent ---
  const { g: g28, p1: p1_28 } = createTestGame(28);
  start(g28, p1_28.id);
  const transitTiles28 = g28.board.filter((t) => t.type === "transit");
  assert.equal(transitTiles28.length, 2, "28-tile board has 2 transit stations");

  const t1 = transitTiles28[0];
  const t2 = transitTiles28[1];
  const baseFare = t1.rent || 45;

  // 1 transit owned: base fare ($45)
  g28.props[t1.id] = { owner: p1_28.id, level: 0, mortgaged: false };
  assert.equal(rent(g28, t1), baseFare);

  // 2 transits owned: base fare * 2 ($90)
  g28.props[t2.id] = { owner: p1_28.id, level: 0, mortgaged: false };
  assert.equal(rent(g28, t1), baseFare * 2);

  // --- DeedCardPopover Transit Ladder Parity ---
  const deedCode = readFileSync(resolve("src/components/DeedCardPopover.jsx"), "utf8");
  assert.ok(
    deedCode.includes("legacyTransitRates") && deedCode.includes("Fare schedule"),
    "DeedCardPopover must dynamically adapt transit fare ladder based on board length (is28)",
  );
  assert.ok(
    deedCode.includes("45") && deedCode.includes("25"),
    "DeedCardPopover must support both 28-tile ($45) and 40-tile ($25) base transit fares",
  );
});
