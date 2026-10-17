import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

test("Modular Components: all extracted modules exist and are valid JavaScript files", () => {
  const commonPath = resolve("src/components/common.jsx");
  const popoverPath = resolve("src/components/DeedCardPopover.jsx");
  const rosterPath = resolve("src/components/CrewRoster.jsx");
  const boardPath = resolve("src/components/GameBoard.jsx");

  assert.ok(existsSync(commonPath), "src/components/common.jsx must exist");
  assert.ok(existsSync(popoverPath), "src/components/DeedCardPopover.jsx must exist");
  assert.ok(existsSync(rosterPath), "src/components/CrewRoster.jsx must exist");
  assert.ok(existsSync(boardPath), "src/components/GameBoard.jsx must exist");
});

test("Modular Components: common.jsx exports essential UI primitives without circular imports", () => {
  const content = readFileSync(resolve("src/components/common.jsx"), "utf8");

  assert.ok(content.includes("export const icons ="), "Must export icons map");
  assert.ok(content.includes("export function Icon("), "Must export Icon component");
  assert.ok(content.includes("export function CrewMark("), "Must export CrewMark component");
  assert.ok(content.includes("export function Die("), "Must export Die component");
  assert.ok(content.includes("export function Button("), "Must export Button component");

  // Verify no circular dependencies back to main or Extras
  assert.ok(!content.includes("from \"../main.jsx\""), "Must not import main.jsx");
  assert.ok(!content.includes("from \"../Extras.jsx\""), "Must not import Extras.jsx");
  assert.ok(!content.includes("from \"./GameBoard.jsx\""), "common must not depend on GameBoard");
  assert.ok(!content.includes("from \"./CrewRoster.jsx\""), "common must not depend on CrewRoster");
});

test("Modular Components: CrewRoster.jsx exports CrewRoster, CrewRow, AvatarTimerRing with ARIA support", () => {
  const content = readFileSync(resolve("src/components/CrewRoster.jsx"), "utf8");

  assert.ok(content.includes("export function AvatarTimerRing("), "Must export AvatarTimerRing");
  assert.ok(content.includes("export function CrewRow("), "Must export CrewRow");
  assert.ok(content.includes("export function CrewRoster("), "Must export CrewRoster");
  assert.ok(content.includes("export default CrewRoster"), "Must default export CrewRoster");

  // ARIA & timer attributes
  assert.ok(content.includes("avatar-timer-ring"), "Must contain avatar-timer-ring class");
  assert.ok(content.includes("aria-label={`Turn timer:"), "Must provide turn timer ARIA label");
  assert.ok(content.includes("presence"), "Must render presence indicator");
  assert.ok(!content.includes("from \"../main.jsx\""), "Must not import main.jsx");
});

test("Modular Components: GameBoard.jsx exports BoardCenter, GameBoard, Board with perimeter tiles", () => {
  const content = readFileSync(resolve("src/components/GameBoard.jsx"), "utf8");

  assert.ok(content.includes("export function BoardCenter("), "Must export BoardCenter");
  assert.ok(content.includes("export function GameBoard("), "Must export GameBoard");
  assert.ok(content.includes("export const Board = GameBoard"), "Must alias Board for backward compatibility");
  assert.ok(content.includes("export default GameBoard"), "Must default export GameBoard");

  // Walking step animation and keyboard/accessible labels
  assert.ok(content.includes("setWalking"), "Must support walking animation");
  assert.ok(content.includes("aria-label="), "Tiles and tokens must contain aria-labels");
  assert.ok(!content.includes("from \"../main.jsx\""), "Must not import main.jsx");
});

test("Modular Components: DeedCardPopover.jsx preserves dialog semantics and escape handling", () => {
  const content = readFileSync(resolve("src/components/DeedCardPopover.jsx"), "utf8");

  assert.ok(content.includes("export function DeedCardPopover("), "Must export DeedCardPopover");
  assert.ok(content.includes('role="dialog"'), "Must have role=dialog on deed popover");
  assert.ok(content.includes('event.key === "Escape"'), "Must handle Escape key to dismiss popover");
  assert.ok(content.includes("building-rent-list"), "Must render full rent ladder");
  assert.ok(content.includes("building-cost-line"), "Must render finance grid");
  assert.ok(!content.includes("from \"../main.jsx\""), "Must not import main.jsx");
});

test("Modular Components: main.jsx cleanly imports modular components and re-exports them", () => {
  const mainContent = readFileSync(resolve("src/main.jsx"), "utf8");

  // Imports
  assert.ok(
    mainContent.includes('from "./components/common.jsx"'),
    "main.jsx must import from ./components/common.jsx",
  );
  assert.ok(
    mainContent.includes('from "./components/GameBoard.jsx"'),
    "main.jsx must import from ./components/GameBoard.jsx",
  );
  assert.ok(
    mainContent.includes('from "./components/DeedCardPopover.jsx"'),
    "main.jsx must import from ./components/DeedCardPopover.jsx",
  );
  assert.ok(
    mainContent.includes('from "./components/CrewRoster.jsx"'),
    "main.jsx must import from ./components/CrewRoster.jsx",
  );

  // Backward compatibility re-exports
  assert.ok(
    mainContent.includes("export { DeedCardPopover, CrewRoster, GameBoard, Board }"),
    "main.jsx must re-export DeedCardPopover, CrewRoster, GameBoard, Board",
  );

  // Landmarks preserved in main layout
  assert.ok(mainContent.includes('className="crew-sidebar"'), "crew-sidebar landmark must be preserved");
  assert.ok(mainContent.includes('className="action-sidebar"'), "action-sidebar landmark must be preserved");
  assert.ok(mainContent.includes("board-viewport"), "board-viewport container must be preserved");
});
