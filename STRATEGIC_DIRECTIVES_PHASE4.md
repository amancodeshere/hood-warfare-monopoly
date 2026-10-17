# STRATEGIC DIRECTIVES: PHASE 4 IMPROVEMENTS
## Spin the Block (Hood Warfare Monopoly)
**Document Version:** 4.0.0  
**Author:** Lead Game Director & Strategic Overlord  
**Scope:** Implementer 1 (Map Size), Implementer 2 (Viewport Fit), Implementer 3 (Dynamic Board UI), Code Reviewer & QA

---

## 1. Executive Vision & Core Identity

Spin the Block is a gritty, fast-paced street warfare monopoly built with **100% server authority**, zero client trusting, authentic urban aesthetics (asphalt, sage, lime accents, graffiti energy), and snappy feedback.

In Phase 4, we elevate the game to premier web-boardgame standards (achieving parity with Richup.io while retaining our unmistakable hood warfare flavor):
1. **Pacing Choice:** Players and room hosts can choose between **Standard (40 blocks, 11x11, classic pacing)** and **Quick Blitz (28 blocks, 8x8, high-tempo, faster shootouts and rapid bankruptcies)**.
2. **True Single-Screen Immersion:** Eliminate frustrating window/page vertical scrolling during live gameplay on desktop. The entire arena fits precisely inside `100vh` / `100dvh`, centering the dynamic board with formulaic precision (`min(calc(100vh - 80px), calc(100vw - 520px))`) while sidebars scroll internally.
3. **Flawless Dynamic Presentation:** The board UI, center skyline, tokens, overhead barks, building pieces, and action HUD automatically adapt with pixel-perfect responsiveness whether on an 8x8 or 11x11 grid.

---

## 2. Division of Responsibilities & Subagent Charters

```
+-------------------------------------------------------------------------+
|                  STRATEGIC OVERLORD (Lead Game Director)                |
+-------------------------------------------------------------------------+
       |                                |                          |
       v                                v                          v
+------------------+         +--------------------+     +------------------+
|  IMPLEMENTER 1   |         |   IMPLEMENTER 2    |     |  IMPLEMENTER 3   |
| Dynamic Map Size |         | Single-Screen Fit  |     | 28 vs 40 Board UI|
| Config & Engine  |         | Richup-Parity GUI  |     | & Feature Parity |
+------------------+         +--------------------+     +------------------+
       |                                |                          |
       +--------------------------------+--------------------------+
                                        |
                                        v
                       +----------------------------------+
                       |       CODE REVIEWER & QA         |
                       | 162 Unit Tests + 20 E2E Regress  |
                       +----------------------------------+
```

### Implementer 1: Dynamic Map Size Configuration
- **Domain:** `shared/settings.js`, `shared/board.js`, `shared/maps.js`, `server/game.js`, `server/profiles.js`, `server/index.js`, `src/Extras.jsx`, `src/main.jsx`.
- **Primary Goals:**
  1. Add `mapSize` setting to `DEFAULT_SETTINGS` (`"standard"` default, `"blitz"` option).
  2. Define the canonical 28-tile Quick Blitz board specification in `shared/board.js` (`BLITZ_BOARD`), featuring:
     - 4 corners (Home Base, County Jail, Community Plot, Police Raid) at coordinates `0, 7, 14, 21`.
     - 6 districts (groups 0 through 5) with balanced property costs and rents.
     - 2 transit tiles (Spin the Bus, Lowrider Line).
     - 2 utility tiles (The Power Plug, The Water Plug) ensuring **Grid Lockdown** is 100% playable in Blitz!
     - 1 tax tile (Flex Tax).
     - 2 surprise card tiles (Street Luck).
     - 2 Oppa Stoppa tiles (stoppa).
     - 1 or 2 Street Roulette tiles.
  3. Support all 6 city themes (`trenches`, `night-shift`, `boardwalk`, `snow-day`, `neon`, `festival`) on both 40-tile and 28-tile maps.
  4. Expose map size selector in lobby room settings modal and host controls.
  5. Dynamically regenerate board on lobby `settings` socket action.

### Implementer 2: Single-Screen Viewport Fit GUI (Richup.io Parity)
- **Domain:** `src/style.css`, `src/main.jsx`.
- **Primary Goals:**
  1. Enforce desktop viewport fit during live gameplay (`live` / `in-play`):
     - Window/page vertical scrolling is strictly disabled (`overflow: hidden` on viewport/layout container on desktop).
     - Layout is bounded by `100vh` / `100dvh`.
  2. Board scaling rule:
     - Board scales dynamically to: `min(calc(100vh - 80px), calc(100vw - 520px))` on desktop.
     - Centered cleanly in `.table-area`.
  3. Internal sidebar scrolling:
     - `.crew-sidebar` and `.action-sidebar` scroll independently (`overflow-y: auto`, `height: 100%`, smooth dark scrollbars).
     - No clipping of critical buttons (Roll, Trade, End Turn, Shootout triggers).
  4. Mobile & responsive integrity:
     - Mobile screens (<=720px) retain vertical stacking and normal document scrolling so Playwright tests pass without layout collapse.

### Implementer 3: Dynamic 28 vs 40 Tile Board UI & Full Feature Parity
- **Domain:** `src/components/GameBoard.jsx`, `src/City.jsx`, `src/style.css`.
- **Primary Goals:**
  1. Adapt `GameBoard.jsx` dynamically to `size = BOARD.length / 4 + 1` (8 for Blitz, 11 for Standard).
  2. Polish `BoardCenter` across both 8x8 (columns 2..7) and 11x11 (columns 2..10):
     - City SVG skyline scales cleanly without overflowing center bounds.
     - Center branding (`SPIN THE BLOCK`), round indicators, and dice use responsive clamps.
  3. Token, figure, and badge rendering:
     - `HoodFigure` and `token-emblem` scale gracefully on larger 8x8 tiles.
     - Multi-crew stacking and `token-stack-count` badge render smoothly.
     - Overhead speech bubbles (`token-bark-bubble`) adjust tail and positioning, and flip downward on row 1 to prevent top clipping.
  4. Property pieces:
     - Street buildings (Houses ×1-4 and Hotel) position crisply on both board sizes.
     - Owner bar (`.tile-owner-bar`) displays crew color and name legibly.
  5. Action interoperability:
     - Tile clicks, deed popover inspection, upgrade/mortgage/sell buttons work identical across both sizes.

### Code Reviewer & QA
- **Domain:** `tests/`, test execution, diff auditing.
- **Primary Goals:**
  1. Guarantee all 162 existing unit/integration tests pass 100%.
  2. Guarantee all 20 Playwright e2e tests pass 100%.
  3. Add dedicated unit tests for:
     - Blitz board generation, tile count (28), corner coordinates, utility presence, and theme mapping.
     - Room settings validation for `mapSize`.
     - 28-tile grid coordinate math.
     - Viewport fit CSS class assertions.

---

## 3. Data Models & Interface Contracts

### 3.1 Settings Contract (`shared/settings.js`)
```javascript
export const DEFAULT_SETTINGS = {
  maxPlayers: 4,
  startingCash: 1500,
  map: "trenches",
  mapSize: "standard", // "standard" (40 tiles) | "blitz" (28 tiles)
  visibility: "private",
  autoFill: true,
  teams: false,
  doubleRent: true,
  communityCash: true,
  auctions: true,
  prisonRent: true,
  mortgage: true,
  evenBuild: true,
  randomOrder: false,
  doubles: true,
  turnSeconds: 90,
  registeredOnly: false,
};
```
In `settings(input, previous)`:
- Validate `mapSize`: must be `"standard"` or `"blitz"`. (Numeric `40` maps to `"standard"`, `28` maps to `"blitz"` for backwards compatibility).
- Default remains `"standard"`.

### 3.2 Canonical Quick Blitz Board Specification (`shared/board.js`)
```javascript
export const BLITZ_DISTRICTS = [
  { name: "The Bodega Belt", color: "#a3ba86" },
  { name: "Caught Lackin", color: "#95bdd2" },
  { name: "The Trenches", color: "#d8a580" },
  { name: "Hit a Lick", color: "#b3a0cc" },
  { name: "Drip District", color: "#d399b2" },
  { name: "Final Boss Row", color: "#c4ad80" },
];

export const BLITZ_BOARD = [
  // Bottom Row (Edge 0: IDs 0 - 6) -> Row 8, Col 8 down to 2
  { name: "Home Base", type: "start" },                                      // ID 0 (Corner: row 8, col 8)
  p("Auntie’s Bodega", 0, 80, 16),                                          // ID 1
  { name: "Street Luck", type: "card" },                                    // ID 2
  p("Broke Boy Blvd", 0, 100, 20),                                          // ID 3
  { name: "Flex Tax", type: "tax" },                                        // ID 4
  { name: "Spin the Bus", type: "transit", price: 200, rent: 25 },          // ID 5
  p("No Cap Cuts", 1, 120, 26),                                             // ID 6
  
  // Left Column (Edge 1: IDs 7 - 13) -> Col 1, Row 8 up to 2
  { name: "County Jail", type: "jail" },                                    // ID 7 (Corner: row 8, col 1)
  p("Caught Lackin Lane", 1, 140, 30),                                      // ID 8
  { name: "Oppa Stoppa", type: "stoppa" },                                  // ID 9
  { name: "The Power Plug", type: "utility", price: 150, rent: 4 },         // ID 10
  p("The Trenches", 2, 180, 38),                                            // ID 11
  p("Trap House Towers", 2, 200, 42),                                       // ID 12
  p("Cookout Corner", 3, 220, 46),                                          // ID 13
  
  // Top Row (Edge 2: IDs 14 - 20) -> Row 1, Col 1 up to 7
  { name: "Community Plot", type: "parking" },                              // ID 14 (Corner: row 1, col 1)
  p("Hit a Lick Heights", 3, 240, 50),                                      // ID 15
  { name: "Street Luck", type: "card" },                                    // ID 16
  { name: "Lowrider Line", type: "transit", price: 200, rent: 25 },          // ID 17
  p("Studio 808", 4, 280, 58),                                              // ID 18
  { name: "Oppa Stoppa", type: "stoppa" },                                  // ID 19
  p("Drip Check Drive", 4, 320, 66),                                        // ID 20
  
  // Right Column (Edge 3: IDs 21 - 27) -> Col 8, Row 1 down to 7
  { name: "Police Raid", type: "raid" },                                    // ID 21 (Corner: row 1, col 8)
  p("Rich Auntie Row", 5, 360, 74),                                         // ID 22
  { name: "The Water Plug", type: "utility", price: 150, rent: 4 },         // ID 23
  p("Final Boss Estate", 5, 400, 84),                                       // ID 24
  { name: "Street Roulette", type: "roulette" },                            // ID 25
  p("Mob Ties Manor", 5, 450, 95),                                          // ID 26
  { name: "Street Roulette", type: "roulette" },                            // ID 27
].map((t, id) => ({ ...t, id }));
```

### 3.3 Theme System Integration (`makeBoard`)
Signature: `makeBoard(map = "trenches", mapSize = "standard")`
- When `mapSize === "blitz"` (or `mapSize === 28`):
  Uses `BLITZ_BOARD` as template, applying city theme names (`NIGHT_NAMES`, `THEME_WORDS`), colors, and roulette/stoppa substitutions matching the city aesthetic.
- When `mapSize === "standard"` (or omitted):
  Uses `BOARD` (40 tiles) exactly as before, maintaining 100% backward compatibility.

### 3.4 Profile & Map Resolver (`shared/maps.js` & `server/profiles.js`)
```javascript
export function presetMap(id, mapSize = "standard") {
  const isBlitz = mapSize === "blitz" || mapSize === 28;
  const m = MAPS.find((m) => m.id === id);
  if (!m) throw new Error("Choose a city map.");
  const baseDistricts = isBlitz ? BLITZ_DISTRICTS : DISTRICTS;
  const districts = baseDistricts.map((d, i) => ({
    ...d,
    color: m.colors?.[i] || d.color,
  }));
  return {
    board: makeBoard(id, mapSize),
    districts,
    mapName: m.name + (isBlitz ? " (Blitz)" : ""),
    mapTheme: id,
    mapSize: isBlitz ? "blitz" : "standard",
  };
}
```

---

## 4. UI & Layout Blueprint (Richup.io Parity)

### 4.1 Viewport Fit Hierarchy
```
+-----------------------------------------------------------------------------------+
| Topbar (height: ~54px)                                                            |
+-----------------------------------------------------------------------------------+
| .game-layout.viewport-locked (height: calc(100vh - 54px), overflow: hidden)       |
|                                                                                   |
|  +------------------+  +-----------------------------------+  +-----------------+ |
|  | .crew-sidebar    |  | .table-area                       |  | .action-sidebar | |
|  |                  |  |                                   |  |                 | |
|  | overflow-y: auto |  |  .board-shell                     |  | overflow-y:auto | |
|  | height: 100%     |  |  scale: min(                      |  | height: 100%    | |
|  | max-height: 100% |  |    calc(100vh - 80px),            |  | max-height:100% | |
|  |                  |  |    calc(100vw - 520px)            |  |                 | |
|  |                  |  |  )                                |  |                 | |
|  |                  |  |  aspect-ratio: 1 / 1              |  |                 | |
|  +------------------+  +-----------------------------------+  +-----------------+ |
+-----------------------------------------------------------------------------------+
```

### 4.2 CSS Rules for Single-Screen GUI
```css
/* When match is active and viewport is desktop */
@media (min-width: 981px) {
  body.game-in-play {
    overflow: hidden !important;
    height: 100vh;
    height: 100dvh;
  }

  .game-layout.in-play {
    height: calc(100vh - 56px);
    height: calc(100dvh - 56px);
    max-height: calc(100vh - 56px);
    max-height: calc(100dvh - 56px);
    overflow: hidden;
    padding: 10px 16px;
    display: grid;
    grid-template-columns: 210px 1fr 276px;
    align-items: stretch;
    gap: 16px;
  }

  .game-layout.in-play .table-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }

  .game-layout.in-play .board-viewport {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    min-height: 0;
  }

  .game-layout.in-play .board-shell {
    width: min(calc(100vh - 80px), calc(100vw - 520px));
    height: min(calc(100vh - 80px), calc(100vw - 520px));
    max-width: 100%;
    max-height: 100%;
    aspect-ratio: 1 / 1;
    padding: 6px;
    margin: auto;
  }

  .game-layout.in-play .crew-sidebar,
  .game-layout.in-play .action-sidebar {
    height: 100%;
    max-height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;
  }
}
```

### 4.3 Overhead Speech Bubbles & Row 1 Flip
To prevent bubbles from clipping outside the top edge on row 1 tiles:
```css
/* Normal bubble placement */
.token-bark-bubble {
  position: absolute;
  bottom: calc(100% + 7px);
  left: 50%;
  transform: translate(-50%, 0);
  ...
}

/* Flip downward when on row 1 (top edge of board) */
.tile[style*="grid-row: 1"] .token-bark-bubble {
  bottom: auto;
  top: calc(100% + 7px);
}
.tile[style*="grid-row: 1"] .token-bark-bubble::before {
  top: auto;
  bottom: 100%;
  border-top: none;
  border-bottom: 6px solid var(--crew, #a2de3b);
}
.tile[style*="grid-row: 1"] .token-bark-bubble::after {
  top: auto;
  bottom: calc(100% - 1.5px);
  border-top: none;
  border-bottom: 5px solid #0d140e;
}
```

---

## 5. Non-Negotiable Quality Invariants & Guardrails

1. **Backwards Compatibility:**
   - Existing saved games, legacy schema version 1, and tests importing `shared/legacy-board.js` must NEVER break.
   - Calling `makeBoard()` without arguments MUST return the 40-tile standard board.
   - Calling `resolveMap(id, map)` without mapSize MUST return the 40-tile standard board.
2. **Server Authority Invariant:**
   - Client never dictates tile positions, dice rolls, rent calculations, or board layout indices.
   - All board indexing (`p.pos`, `q.owner`, `fullSet`, `rent`) uses `board(g)` on server.
3. **Grid Lockdown Integrity:**
   - Blitz board contains 2 utilities. The allied holding rule and maintenance cost ($100) execute seamlessly on both board sizes.
4. **Mobile Responsiveness:**
   - Screens <= 720px width MUST NOT have layout forced into 100vh lock. They must retain vertical stacking and fluid document scroll, as verified by `table.spec.js` and `trading-chat-leave.spec.js`.
5. **Zero Regressions:**
   - All 162 unit tests and 20 Playwright e2e tests must continue to pass 100%.

---

## 6. Implementation Order & Verification Gate

1. **Implementer 1 (Map Size Engine & Lobby):**
   - Implement `BLITZ_BOARD` and `BLITZ_DISTRICTS` in `shared/board.js`.
   - Update `shared/settings.js` and `shared/maps.js`.
   - Wire server room creation and lobby `settings` action in `server/index.js`.
   - Expose UI in lobby settings (`Extras.jsx`).
   - Run tests: verify 162 passing + add tests for 28-tile board generation.

2. **Implementer 2 (Viewport Fit GUI):**
   - Update `src/style.css` and `src/main.jsx` with viewport-fit desktop rules and internal sidebar scrolling.
   - Verify zero vertical page scroll during active match on desktop viewports.
   - Verify mobile screens retain normal fluid scrolling.

3. **Implementer 3 (Board UI & Feature Parity):**
   - Polish `GameBoard.jsx` and `BoardCenter` across both 8x8 and 11x11 sizes.
   - Verify tokens, speech bubbles (row 1 flipping), buildings, and owner badges on both sizes.
   - Verify tile clicks and DeedCardPopover interactions on 8x8.

4. **Code Reviewer & QA:**
   - Run full regression: `npm test` (all 162+ tests) and `PATH="/Users/aman/.nvm/versions/node/v25.9.0/bin:$PATH" npx playwright test` (all 20+ tests).
   - Review code diffs for clean code style, zero memory leaks, and documentation integrity.
