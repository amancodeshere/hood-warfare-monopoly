# 10 — Master Implementation Prompt for AI Coding Agent

> **Instructions for the Executing AI Coding Agent:**  
> You are tasked with implementing the approved commercial-grade improvements for **Spin the Block** (Hood Warfare Monopoly) based on the comprehensive audit conducted on 15 October 2026.  
> Read this document completely before modifying any code. Adhere strictly to the project architecture, preservation rules, and implementation milestones.

---

## 1. Project Context & Current Architecture

- **Codebase Path:** `/Users/aman/Desktop/hw-monopoly`
- **Application Type:** Real-time multiplayer web property strategy board game with an authoritative 2.5D DDA raycaster corridor combat minigame.
- **Frontend Stack:** React 18.3, Vite 6.1, Socket.IO Client 4.8, Lucide React icons, vanilla CSS (`src/style.css`).
- **Backend Stack:** Node.js 22, Express 4.21, Socket.IO 4.8, Helmet 8.1, Express Rate Limit 7.5.
- **Persistence:** Local JSON atomic snapshots (`data/rooms.json`, `data/profiles.json`).
- **Core Rules Engine:** Pure functional server-authoritative engine in `server/game.js` and `server/fps.js`.

---

## 2. Non-Negotiable Core Preservation Rules

1. **DO NOT BREAK WORKING CORE RULES:**
   - The 40-square perimeter board geometry, tile IDs, district groups, and pricing constants in `shared/board.js` must remain intact.
   - The 11-way uniform cryptographic dice distribution (2–12 at 1/11 each) in `server/game.js` must be preserved.
   - The first-person corridor shootout (`src/ArenaDuel.jsx`, `src/arenaRenderer.js`, `server/fps.js`) must retain its server-authoritative combat math (25 body / 40 headshot / 30 kick).
   - Reconnection via opaque `stb-seat` bearer tokens in `localStorage` must continue to recover games seamlessly.
2. **DO NOT MODIFY PRODUCTION DATABASE OR EXTERNAL HOSTS DIRECTLY:**
   - Execute all changes locally, test thoroughly against the Node test runner and Playwright suite, and ensure zero lint warnings.

---

## 3. High-Priority Implementation Backlog (Milestones 1 & 2)

### Task 1: Fix Post-Auth Transition Directly to Lobby (`GAME-001` / `BUG-001`)
- **File:** `src/main.jsx:1363-1368` and `src/LoginMaps.jsx:198-205`
- **Requirement:** When a user creates an account or signs in on `EntryPage`, invoke `enter()` immediately inside `authenticated(r)`.
- **Expected Behavior:** Player transitions with a smooth 200ms fade directly into the main lobby without getting stuck on the intermediate "WELCOME BACK" banner.

### Task 2: Auction Decaying Countdown Acceleration (`GAME-002` / `BUG-002`)
- **File:** `server/game.js:880-893`
- **Requirement:** Replace the hardcoded `au.clock = 20` with a decaying timer:
  ```javascript
  au.highBid = a.amount;
  au.highBidder = id;
  au.clock = Math.max(5, Math.min(au.clock, 8));
  ```
- **Expected Behavior:** Auctions resolve briskly within 30–45s without infinite $10 reset griefing.

### Task 3: Mobile Sticky Bottom Action Bar (`GAME-003` / `BUG-003`)
- **File:** `src/main.jsx` and `src/style.css`
- **Requirement:** On mobile viewports (<= 640px), pin the active turn action container (`Roll the dice`, `Buy`, `End turn`) to a fixed bottom action sheet with `z-index: 1000`.
- **Expected Behavior:** Action buttons remain permanently visible and clickable without being pushed offscreen by inspected property cards.

### Task 4: WCAG 2.2 AA ARIA & Landmark Remediation (`GAME-007` / `BUG-004`, `BUG-005`)
- **File:** `src/main.jsx`
- **Requirement:**
  1. Add `role="img"` to `.die` elements (`<div className="die" role="img" aria-label={`Die face ${value}`}>`).
  2. Provide unique `aria-label` tags to all `<aside>` containers (`.crew-sidebar` and `.action-sidebar`).

### Task 5: Step-by-Step Token Walking Animation (`GAME-004`)
- **File:** `src/main.jsx` and `src/StreetPieces.jsx`
- **Requirement:** Animate token movement perimeter hops (150ms per square) using `requestAnimationFrame`, updating tile coordinates step-by-step. Respect `prefers-reduced-motion`.

### Task 6: Floating Cash Transaction Badges (`GAME-005`)
- **File:** `src/main.jsx` and `src/style.css`
- **Requirement:** Trigger a floating `+$[amount]` or `-$[amount]` badge drifting upward from the player's crew card upon any cash delta.

---

## 4. Verification & Definition of Done

Before submitting the code changes, execute the following commands and ensure 100% pass rate:

```bash
# 1. Lint Check
npm run lint

# 2. Pure Game Engine & Multiplayer Tests
node --test tests/*.test.js

# 3. Production Client Build
npm run build

# 4. Playwright End-to-End Suite
export PATH="/Users/aman/.nvm/versions/node/v25.9.0/bin:$PATH"
npx playwright test
```

### Acceptance Checklist:
- [ ] Account registration transitions directly to lobby.
- [ ] Auction clock decays on successive bids.
- [ ] Mobile viewports (390×844) have zero horizontal scroll and visible sticky actions.
- [ ] Dice elements have valid `role="img"` with zero axe-core ARIA violations.
- [ ] All 66 Node engine tests and 9 Playwright browser tests pass cleanly.
