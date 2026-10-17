import test from "node:test";
import assert from "node:assert/strict";
import { makeBoard, MAPS } from "../shared/board.js";
import { BOARD as LEGACY_BOARD } from "../shared/legacy-board.js";
import { getBoardDisplayName } from "../src/utils/board-display-name.js";

test("long names retain their key words and themed street suffix", () => {
  assert.equal(getBoardDisplayName("Caught Lackin Lane"), "Lackin Lane");
  assert.equal(getBoardDisplayName("Main Character Mall"), "Main Mall");
  assert.equal(getBoardDisplayName("Hit a Lick Heights"), "Lick Heights");
  assert.equal(getBoardDisplayName("Pier Pressure Corner"), "Pier Corner");
  assert.equal(getBoardDisplayName("Sand in the Jordans Heights"), "Jordans Heights");
  assert.equal(getBoardDisplayName("Auntie’s Tax-Free Corner"), "Tax-Free Corner");
  assert.equal(getBoardDisplayName("Custom Shortname"), "Custom Shortname");
  assert.equal(getBoardDisplayName("Pier Pressure Heights"), "Pier Heights");
  assert.equal(getBoardDisplayName("Pier Pressure Row"), "Pier Row");
  assert.equal(getBoardDisplayName("Pier Pressure Corner"), "Pier Corner");
  assert.equal(getBoardDisplayName("No Cap Cuts"), "No Cap Cuts");
});

test("property labels stay distinct across built-in maps and board sizes", () => {
  const boards = MAPS.flatMap(({ id }) => [
    makeBoard(id, "standard"),
    makeBoard(id, "quick"),
  ]);
  boards.push(LEGACY_BOARD);

  for (const board of boards) {
    const properties = board
      .filter((tile) => tile.type === "property")
      .map((tile) => ({
        name: tile.name.toLocaleLowerCase(),
        label: getBoardDisplayName(tile.name).toLocaleLowerCase(),
      }));
    assert.equal(
      new Set(properties.map(({ name }) => name)).size,
      new Set(properties.map(({ label }) => label)).size,
    );
  }
});
