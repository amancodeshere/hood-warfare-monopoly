import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS, settings } from "../shared/settings.js";
import {
  QUICK_BOARD,
  makeBoard,
  coordinates,
} from "../shared/board.js";
import { presetMap } from "../shared/maps.js";
import {
  room,
  player,
  action,
  start,
  rent,
} from "../server/game.js";

test("DEFAULT_SETTINGS has mapSize defaulting to 'standard'", () => {
  assert.equal(DEFAULT_SETTINGS.mapSize, "standard");
  const s = settings();
  assert.equal(s.mapSize, "standard");
});

test("settings() validates mapSize values: standard, quick, blitz, and rejects invalid", () => {
  assert.equal(settings({ mapSize: "standard" }).mapSize, "standard");
  assert.equal(settings({ mapSize: "quick" }).mapSize, "quick");
  assert.equal(settings({ mapSize: "blitz" }).mapSize, "blitz");

  assert.throws(
    () => settings({ mapSize: "large" }),
    /Choose a valid map size\./,
  );
  assert.throws(
    () => settings({ mapSize: 40 }),
    /Choose a valid map size\./,
  );
  assert.throws(
    () => settings({ mapSize: null }),
    /Choose a valid map size\./,
  );
  assert.throws(
    () => settings({ mapSize: true }),
    /Choose a valid map size\./,
  );
  assert.throws(
    () => settings({ mapSize: "" }),
    /Choose a valid map size\./,
  );
});

test("makeBoard() returns 40 tiles for standard and 28 tiles for quick/blitz", () => {
  assert.equal(makeBoard().length, 40);
  assert.equal(makeBoard("trenches").length, 40);
  assert.equal(makeBoard("trenches", "standard").length, 40);
  assert.equal(makeBoard("trenches", "quick").length, 28);
  assert.equal(makeBoard("trenches", "blitz").length, 28);
  assert.equal(makeBoard("quick").length, 28);
  assert.equal(makeBoard("blitz").length, 28);
  assert.equal(makeBoard({ map: "trenches", mapSize: "quick" }).length, 28);
  assert.equal(makeBoard({ map: "trenches", mapSize: "standard" }).length, 40);
});

test("QUICK_BOARD has exactly 28 tiles, 6 districts, 2 transits, 2 utilities, corners, cards, roulette, stoppa", () => {
  const quick = QUICK_BOARD;
  assert.equal(quick.length, 28);

  // Corners
  assert.equal(quick[0].type, "start");
  assert.equal(quick[7].type, "jail");
  assert.equal(quick[14].type, "parking");
  assert.equal(quick[21].type, "raid");

  // 6 districts
  const propertyGroups = new Set(
    quick.filter((t) => t.type === "property").map((t) => t.group),
  );
  assert.deepEqual([...propertyGroups].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5]);

  // 2 transits
  const transits = quick.filter((t) => t.type === "transit");
  assert.equal(transits.length, 2);
  assert.equal(transits[0].id, 5);
  assert.equal(transits[1].id, 19);

  // Both utility plugs remain available
  const utilities = quick.filter((t) => t.type === "utility");
  assert.equal(utilities.length, 2);
  assert.equal(utilities[0].id, 13);
  assert.equal(utilities[0].price, 150);

  // Cards, roulette, and stoppa
  const cards = quick.filter((t) => t.type === "card");
  assert.equal(cards.length, 1);

  const roulettes = quick.filter((t) => t.type === "roulette");
  assert.equal(roulettes.length, 2);

  const stoppas = quick.filter((t) => t.type === "stoppa");
  assert.equal(stoppas.length, 1);
  assert.equal(stoppas[0].id, 27);

  // 28 unique perimeter coordinates on an 8x8 grid
  const coordSet = new Set(quick.map((t) => JSON.stringify(coordinates(t.id, 28))));
  assert.equal(coordSet.size, 28);
  for (const t of quick) {
    const { row, col } = coordinates(t.id, 28);
    assert(row >= 1 && row <= 8 && col >= 1 && col <= 8);
    assert(row === 1 || row === 8 || col === 1 || col === 8);
  }
});

test("presetMap generates board according to mapSize parameter", () => {
  const standardPreset = presetMap("trenches", "standard");
  assert.equal(standardPreset.board.length, 40);

  const quickPreset = presetMap("trenches", "quick");
  assert.equal(quickPreset.board.length, 28);
});

test("room() initializes with standard 40 tiles by default or 28 tiles when configured", () => {
  const host = player("Host");
  const defaultRoom = room("RM001", host);
  assert.equal(defaultRoom.settings.mapSize, "standard");
  assert.equal(defaultRoom.board.length, 40);

  const quickRoom = room("RM002", host, { settings: { mapSize: "quick" } });
  assert.equal(quickRoom.settings.mapSize, "quick");
  assert.equal(quickRoom.board.length, 28);
});

test("lobby settings dispatch toggles map size between 40 and 28 tiles", () => {
  const host = player("Host");
  const g = room("LOBBY1", host);

  assert.equal(g.settings.mapSize, "standard");
  assert.equal(g.board.length, 40);

  // Dispatch mapSize quick
  action(g, host.id, {
    type: "settings",
    settings: { mapSize: "quick" },
  });
  assert.equal(g.settings.mapSize, "quick");
  assert.equal(g.board.length, 28);

  // Dispatch mapSize standard
  action(g, host.id, {
    type: "settings",
    settings: { mapSize: "standard" },
  });
  assert.equal(g.settings.mapSize, "standard");
  assert.equal(g.board.length, 40);

  // Dispatch mapSize blitz
  action(g, host.id, {
    type: "settings",
    settings: { mapSize: "blitz" },
  });
  assert.equal(g.settings.mapSize, "blitz");
  assert.equal(g.board.length, 28);
});

test("lobby settings dispatch enforces host authority and lobby phase", () => {
  const host = player("Host");
  const guest = player("Guest");
  const g = room("LOBBY2", host);
  g.players.push(guest);

  // Non-host dispatch must fail
  assert.throws(
    () => action(g, guest.id, { type: "settings", settings: { mapSize: "quick" } }),
    /Only the host can change settings\./,
  );

  // Start the match
  start(g, host.id);
  assert.equal(g.status, "playing");

  // Attempting to change settings while playing must fail
  assert.throws(
    () => action(g, host.id, { type: "settings", settings: { mapSize: "quick" } }),
    /Settings can only be changed in the lobby\./,
  );
});

test("gameplay operates cleanly on a 28-tile quick board", () => {
  const host = player("Host");
  const guest = player("Guest");
  const g = room("PLAY28", host);
  g.players.push(guest);

  // Configure quick map
  action(g, host.id, { type: "settings", settings: { mapSize: "quick" } });
  assert.equal(g.board.length, 28);

  start(g, host.id);
  assert.equal(g.status, "playing");
  assert.equal(g.board.length, 28);

  // Player rolls: moves from 0 with steps 2 to tile 2
  action(g, host.id, { type: "roll" }, () => 0); // dice [1, 1], steps 2
  assert.equal(host.pos, 2);
  assert.equal(g.board[host.pos].name, "Grove Street");

  // Buy property on 28-tile board
  action(g, host.id, { type: "buy" });
  assert.equal(g.props[2].owner, host.id);
});

test("custom maps retain their custom board without being clobbered by makeBoard", () => {
  const host = player("Host");
  const g = room("CUSTOM1", host);
  // Simulate custom map definition assigned to room
  const customBoard = [
    { name: "My Base", type: "start", id: 0 },
    { name: "My Block", type: "property", group: 0, price: 100, rent: 20, id: 1 },
  ];
  g.settings.map = "custom:00000000-0000-0000-0000-000000000001";
  g.board = customBoard;

  // Updating other settings should not blow away custom board
  action(g, host.id, {
    type: "settings",
    settings: { mapSize: "quick" },
  });
  assert.equal(g.settings.mapSize, "quick");
  assert.equal(g.board[1].name, "My Block");
});

test("all six city themes properly format names on 28-tile quick boards", () => {
  const themes = ["trenches", "night-shift", "boardwalk", "snow-day", "neon", "festival"];
  for (const theme of themes) {
    const quickBoard = makeBoard(theme, "quick");
    assert.equal(quickBoard.length, 28, `${theme} must have 28 tiles`);
    const props = quickBoard.filter((t) => t.type === "property");
    assert.equal(props.length, 16, `${theme} must have 16 properties`);
    for (const p of props) {
      assert.ok(p.name && p.name.length > 0, `${theme} prop ${p.id} must have a name`);
    }
  }
});

test("quick matches preserve utility bonus and grid lockdown on the actual board", () => {
  const host = player("Host"), rival = player("Rival");
  const g = room("QUICKU", host, {settings: {mapSize: "quick"}});
  g.players.push(rival);
  start(g, host.id);
  g.dice = [3, 4];
  const plugs = g.board.filter(t => t.type === "utility");
  g.props[plugs[0].id] = {owner: host.id, level: 0, mortgaged: false};
  assert.equal(rent(g, plugs[0]), 28);
  g.props[plugs[1].id] = {owner: host.id, level: 0, mortgaged: false};
  assert.equal(rent(g, plugs[0]), 105);
  action(g, host.id, {type: "grid-lockdown", district: 5});
  assert.equal(g.blackoutDistrict, 5);
});
