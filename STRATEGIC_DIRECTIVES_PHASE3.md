# STRATEGIC DIRECTIVES: PHASE 3 IMPROVEMENTS
**Game Title:** Spin the Block (Hood Warfare Monopoly)  
**Author:** Lead Game Director & Strategic Overlord  
**Date:** October 2026  
**Audience:** Implementer 1, Implementer 2, Implementer 3, Code Reviewer  

---

## 1. Executive Vision & Strategic Pillars

*Spin the Block* is a gritty, high-stakes urban warfare adaptation of classic property trading. Its creative and mechanical pillars remain non-negotiable:
1. **100% Server Authority**: The server alone resolves dice, combat hitboxes, bank rolls, property deeds, auctions, trades, counters, and chat.
2. **Authentic Pacing & Tactical Depth**: High tension around every perimeter turn, quick-thinking property barters, and cutthroat auction bidding.
3. **Immersive Street Aesthetics & Voice**: Unapologetic urban street culture, rap bravado, colorful districts, mechanical tactile feedback, and expressive character presence.

In Phase 3, we execute three concurrent workstreams designed to elevate player negotiations, tactical responsiveness, and visual immersiveness:
- **Workstream 1 (Implementer 1):** Richup-style Trade Popover Modal & Smooth Auction Bidding UI (accessible from player avatars + smooth numeric/stepper bid inputs).
- **Workstream 2 (Implementer 2):** Dynamic Responsive Monopoly Board Tiles & Overhead Token Speech Bubbles (fluid tile scaling across 1920x1080 to 360x640 + overhead speech bubbles on board tokens for chat barks).
- **Workstream 3 (Implementer 3):** Monopoly-Aware Bot Trade Valuation / Auto-Counters & Quick-Chat Radial Emote Wheel (strategic AI valuation protecting set completions + fast human mobile radial wheel).

---

## 2. File Ownership & Boundary Isolation Matrix

To prevent code conflicts and merge contention during concurrent implementation, each team is assigned strict file boundaries:

| Team / Implementer | Primary Scope | Permitted Files to Touch | Forbidden Files |
|---|---|---|---|
| **Implementer 1** | Trade Modal & Auction Bidding UI | `src/components/CrewRoster.jsx`<br>`src/components/TradePopover.jsx` (New)<br>`src/components/VisualTrade.jsx`<br>`src/Extras.jsx` (`Auction` component only)<br>`src/main.jsx` (Modal wiring)<br>`src/style.css` (Section 1 only) | `server/*`<br>`src/components/GameBoard.jsx`<br>`src/components/QuickChatWheel.jsx` |
| **Implementer 2** | Responsive Board & Overhead Speech Bubbles | `src/components/GameBoard.jsx`<br>`src/style.css` (Section 2 only)<br>`tests/responsive_board_speech.test.js` (New) | `server/*`<br>`src/Extras.jsx`<br>`src/components/VisualTrade.jsx`<br>`src/components/QuickChatWheel.jsx` |
| **Implementer 3** | Bot Trade AI & Quick-Chat Radial Wheel | `server/botTrade.js` (New)<br>`server/index.js` (Line 899 trade hook)<br>`server/botBarks.js` (Trade bark triggers)<br>`src/components/QuickChatWheel.jsx` (New)<br>`src/main.jsx` (Radial wheel trigger)<br>`src/style.css` (Section 3 only)<br>`tests/bot_trade.test.js` (New) | `src/components/GameBoard.jsx`<br>`src/Extras.jsx` |

> [!IMPORTANT]
> **CSS Discipline in `src/style.css`:**
> Each implementer must append their custom rules within designated commented sections at the end of `src/style.css`:
> - Implementer 1: `/* ================= TEAM 1: TRADE MODAL & AUCTION STEPPER ================= */`
> - Implementer 2: `/* ================= TEAM 2: RESPONSIVE TILES & SPEECH BUBBLES ================= */`
> - Implementer 3: `/* ================= TEAM 3: QUICK-CHAT RADIAL WHEEL ================= */`
> Do not modify or delete existing CSS selectors!

---

## 3. Directive 1: Richup-style Trade Popover Modal & Smooth Auction Bidding UI (Implementer 1)

### 3.1 Creative & Mechanical Vision
In competitive Monopoly games like Richup.io, players need fast, frictionless access to negotiations. Waiting to click a tab on a sidebar breaks game flow. Players must be able to click directly on any rival crew's avatar or row to initiate a trade deal in an ergonomic popover modal. Furthermore, live property auctions require rapid, tactile bidding rather than cumbersome manual typing on mobile keypads.

### 3.2 Target Architecture & Specifications

#### A. Avatar-Initiated Trade Trigger
- In `src/components/CrewRoster.jsx`, update `CrewRow`:
  - When in playing mode (`game.status === "playing"`) and the row represents an active opponent (`p.id !== game.me && !p.out`):
  - Add an accessible trade trigger button (or wrap the avatar/row action) with `className="crew-trade-btn"` and `aria-label={`Trade with ${p.name}`}`.
  - Clicking this triggers `onOpenTrade(p.id)`, opening the Trade Popover Modal with that player pre-selected as the `trade-partner`.
  - Maintain existing elements: `.player-name`, presence dot, cash delta badge, held escape cards, and `.crew-balance`.

#### B. Richup-Style Trade Popover Modal (`src/components/TradePopover.jsx`)
- Create a focused modal/popover dialog wrapper that hosts `ExchangePanel` or provides a centered glassmorphic negotiation experience:
  - Container must preserve the `.exchange` root class so all automated tests and selectors continue to function seamlessly.
  - Keyboard accessibility: pressing `Escape` closes the popover modal.
  - Clicking outside the modal backdrop closes the modal (with confirm prompt if trade draft has modified cash/properties).
  - The modal header includes the rival's crew color badge, name, current net worth, and quick switch selector to other players.
  - The modal can also be opened via the existing `"Trade"` tab button in `src/main.jsx` (`getByRole("button", { name: "Trade" })`), maintaining 100% test compatibility.

#### C. Smooth Auction Bidding UI (`src/Extras.jsx:435-521`)
- In `Auction({ game, act, disabled, now })`:
  - Preserve the input with `id="auction-bid"`, matching `getByLabel(/Your bid/)`.
  - Preserve the primary bid button text: `Bid ${money(amount)}` (e.g. `"Bid $30"`).
  - Preserve the pass button text: `"Pass"`.
  - Add quick stepper increment buttons:
    - `+$10` (minimum legal increment)
    - `+$50`
    - `+$100`
    - `Max` (bids `me.cash`, all-in)
  - Steppers clamp automatically between `a.highBid + 10` and `me.cash`.
  - Add countdown urgency feedback: when `(game.deadline - now) <= 3000ms`, add an urgency pulsing class `.auction-urgent` to `.auction-price b`.

### 3.3 Non-Negotiable Test Guardrails & Regression Traps
> [!CAUTION]
> **Playwright E2E Test Contract (`tests/e2e/trading-chat-leave.spec.js`):**
> 1. `await page.getByRole("button", { name: "Trade", exact: true }).click()` must still find and activate trade.
> 2. `const editor = page.locator(".exchange")` must resolve the active trade UI container.
> 3. Partner radios: `editor.getByRole("radio", { name: "Trade Rival · $1,500", exact: true })`.
> 4. Property checkboxes: `editor.getByRole("checkbox", { name: /Auntie’s Tax-Free Corner/ })`.
> 5. Cash/Card inputs:
>    - `editor.getByLabel("Cash to give", { exact: true })`
>    - `editor.getByLabel("Cash to receive", { exact: true })`
>    - `editor.getByLabel("Escape cards to give", { exact: true })`
>    - `editor.getByLabel("Escape cards to receive", { exact: true })`
> 6. Buttons: `"Send offer"`, `"Counteroffer"`, `"Send counteroffer"`, `"Accept deal"`, `"Withdraw offer"`.
> 7. Post-deal balance note: `"Your cash after this deal: $..."`.
>
> **Playwright E2E Test Contract (`tests/e2e/table.spec.js:208-241`):**
> 1. `b.getByLabel(/Your bid/).fill("30")` must work directly on the bid input.
> 2. `b.getByRole("button", { name: "Bid $30", exact: true }).click()` must submit bid.
> 3. `a.getByRole("button", { name: "Pass", exact: true }).click()` must pass.
> 4. `.auction-price` must contain text `${leader} leads` and `${money(a.highBid)}`.

---

## 4. Directive 2: Dynamic Responsive Monopoly Board Tiles & Overhead Token Speech Bubbles (Implementer 2)

### 4.1 Creative & Mechanical Vision
The Monopoly board is the battlefield. It must feel razor-sharp and fluid on every display—from a 4K 144Hz desktop monitor down to an iPhone SE (360x640) in portrait mode. When players or bots speak in chat, their words should visibly emerge from their street tokens right on the board in animated overhead speech bubbles, bringing the neighborhood to life.

### 4.2 Target Architecture & Specifications

#### A. Fluid Responsive Board Tiles (`src/components/GameBoard.jsx` & `src/style.css`)
- **Viewport Fluidity**:
  - The board must scale cleanly across the full resolution matrix without creating any horizontal page scroll:
    - 1920x1080 & 2560x1440: large readable tiles, rich textures, prominent building pieces (`StreetBuilding`).
    - 1366x768 & 1280x800: balanced desktop/laptop view.
    - 768x1024 (iPad portrait/tablet): proportional scaling.
    - 390x844 & 375x667 (iPhone standard): compact, high-contrast, touch-accessible tiles.
    - 360x640 (narrow Android): tight compact mode, zero overflow.
- **CSS Responsive Matrix**:
  - Use `clamp()` for tile typography:
    ```css
    .tile .tile-name {
      font-size: clamp(6.5px, 0.75vw, 12px);
      line-height: 1.1;
      max-width: 96%;
    }
    .tile .tile-price {
      font-size: clamp(5.5px, 0.6vw, 10px);
    }
    ```
  - For narrow mobile screens (`@media (max-width: 600px)`):
    - Reduce tile padding: `padding: 4px 1px 3px;`.
    - Adjust building icons (`.building-pieces`) to scale cleanly without overlapping tile text.
    - Ensure `.board-shell` and `.board-grid` enforce `max-width: 100vw; box-sizing: border-box;`.

#### B. Overhead Token Speech Bubbles (`src/components/GameBoard.jsx`)
- **Speech Bubble State & Detection**:
  - Maintain a state of active barks/bubbles: `activeBubbles: Map<playerId, { text: string, timestamp: number }>`.
  - Listen to `game.chat`: when a new chat arrives (or bot bark from `server/botBarks.js`), register a bubble for the sending `player` ID.
  - Position: rendered directly above the player's token figure in `.token` or anchored to the tile's token container.
- **Visual Design**:
  - Class: `.token-speech-bubble`.
  - Glassmorphic dark styling: `background: rgba(20, 28, 22, 0.92); backdrop-filter: blur(6px);`.
  - Border: `1.5px solid var(--crew)`.
  - Downward triangular caret pointing directly at the token head.
  - Text: clamp to 48 characters with `...` if longer.
  - Animation: pop-in with slight vertical lift (`translateY(-4px)`), display for **4,500ms**, then fade out smoothly (`opacity 0.25s ease-out`).
  - Accessibility: `role="status"` and `aria-live="polite"`.

### 4.3 Non-Negotiable Test Guardrails & Regression Traps
> [!IMPORTANT]
> **Mobile Overflow Invariant (`tests/e2e/table.spec.js:46-90`):**
> `expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();`
> The board grid and token speech bubbles MUST NOT cause horizontal overflow on viewport `{ width: 390, height: 844 }` or `{ width: 360, height: 640 }`.
> Ensure speech bubbles use `max-width: 140px;` and have overflow protection (`pointer-events: none; white-space: normal; word-break: break-word;`).
>
> **Component Architecture Invariant (`tests/modular_components.test.js`):**
> `GameBoard.jsx` must continue to export:
> - `export function BoardCenter(...)`
> - `export function GameBoard(...)`
> - `export const Board = GameBoard`
> - `export default GameBoard`
> - Must NOT import `main.jsx`.
> - Must maintain `aria-label=` on tiles and tokens.

---

## 5. Directive 3: Monopoly-Aware Bot Trade Valuation / Auto-Counters & Quick-Chat Radial Emote Wheel (Implementer 3)

### 5.1 Creative & Mechanical Vision
In Monopoly, naive linear property pricing is fatal. A bot that trades away the final property completing an opponent's monopoly commits strategic suicide. Bots in *Spin the Block* must possess street-smart valuation: aggressively defending against rival monopolies, coveting pieces that complete their own monopolies, and countering lowball human offers with shrewd counter-proposals. Concurrently, human players need a lightning-fast radial emote wheel on mobile to trash-talk, emote, and communicate without typing.

### 5.2 Target Architecture & Specifications

#### A. Monopoly-Aware Bot Valuation Engine (`server/botTrade.js`)
Create `server/botTrade.js` and integrate into `server/index.js:899`:

1. **District State Analysis**:
   - For any proposed trade, compute for each district/group:
     - Total properties in group: $N_{\text{group}}$.
     - Properties currently owned by Bot: $B_{\text{group}}$.
     - Properties currently owned by Opponent: $O_{\text{group}}$.
2. **Monopoly Threat Defense Multiplier**:
   - If giving a tile grants the opponent a complete monopoly ($O_{\text{group}} + 1 = N_{\text{group}}$):
     - **Base Threat Multiplier**: Apply a **3.5x to 4.5x** multiplier to that property's valuation!
     - **High-Tier District Ban**: If the monopoly is Orange, Yellow, Green, or Dark Blue, and the opponent has $\ge \$200$ cash to build, the bot **categorically rejects** unless the bot receives a matching or superior monopoly in the same trade!
3. **Self-Monopoly Acquisition Premium**:
   - If receiving a tile completes a monopoly for the bot ($B_{\text{group}} + 1 = N_{\text{group}}$):
     - Value that incoming property at **2.5x to 3.0x** list price.
4. **Liquidity Defense**:
   - The bot will never accept a trade if `bot.cash + netTradeCash < $150` (survival buffer for rent).
5. **Auto-Counteroffer Generation**:
   - When an offer is strategically plausible ($\text{Valuation Ratio} \ge 0.75$) but slightly unfavorable to the bot:
     - Instead of rejecting outright, the bot computes the cash difference:
       $$\Delta_{\text{needed}} = \text{Value}(\text{Given Assets}) - \text{Value}(\text{Received Assets})$$
     - If the human partner has sufficient cash, the bot creates a counteroffer setting `requestCash = \Delta_{\text{needed}}`.
     - Dispatches server action `{ type: "trade-offer", ... }` updating `g.trade` with `revision: g.trade.revision + 1`.
6. **Personality Trade Barks**:
   - Integrate with `server/botBarks.js`:
     - Rejecting unfair/monopoly deal: triggers `TRADE_REJECT` bark (e.g., Nova: *"You think I'm giving you the keys to the district for pocket change? Get out of here."*).
     - Sending counteroffer: triggers `TRADE_COUNTER` bark (e.g., Lil Receipt: *"The math doesn't check out. Run me another $150 and we got a deal."*).
     - Accepting a strong deal: triggers `TRADE_ACCEPT` bark.

#### B. Quick-Chat Radial Emote Wheel (`src/components/QuickChatWheel.jsx`)
- **Wheel Mechanics**:
  - Sleek circular overlay with 8 radial slices.
  - Can be toggled via a floating quick-chat icon button (`💬`) near the action panel or by long-pressing the player's own avatar.
  - Slices contain street barks with emoji accents:
    1. 💥 *"Spin the block!"*
    2. 💰 *"Run my money!"*
    3. 🧢 *"That’s pure cap"*
    4. 🎯 *"Target locked"*
    5. 💀 *"Broke boy alert"*
    6. 🤝 *"Let’s do business"*
    7. 🔥 *"Too easy"*
    8. 🛑 *"Fold now"*
  - Touch/Mouse gesture: swipe/drag to wedge and release to select, or tap wedge.
  - Emits socket event: `socket.emit("chat", { text: selectedBark })`.
  - Rate limited: 1.5s client-side cooldown to prevent spamming.
  - Accessibility: keyboard navigable via arrow keys, `Enter` to select, `Escape` to close.

### 5.3 Non-Negotiable Test Guardrails & Regression Traps
> [!CAUTION]
> **Server Trade Hook Stability (`server/index.js:899-918`):**
> 1. In `server/index.js`, replace naive linear comparison with `evaluateBotTrade(g, tr)` from `server/botTrade.js`.
> 2. Wrap all bot trade logic in `try { ... } catch (err) { g.trade = null; publish(g); }` to guarantee the server never crashes or deadlocks on malformed client offers.
> 3. Existing unit test `tests/game.test.js` and `tests/expansion.test.js` contain bot trade simulations—all must pass 100%.
> 4. Author comprehensive test suite in `tests/bot_trade.test.js` asserting:
>    - Bot rejects giving away 3rd property of a district for simple list price + cash.
>    - Bot values acquiring 3rd property of a district with 2.5x+ premium.
>    - Bot generates counteroffer with adjusted cash when offer is near parity.
>    - Bot preserves emergency cash liquidity.

---

## 6. Master Verification & Quality Assurance Matrix

Every implementer must run and pass the full verification matrix prior to declaring work complete.

### 6.1 Test Execution Standards

```bash
# 1. Code Style & Syntax Linting (Zero errors, zero warnings)
npm run lint

# 2. Complete Unit Test Suite (All 135+ tests passing)
# Use concurrency=1 to prevent race conditions during child server test spawns
node --test --test-concurrency=1 tests/*.test.js

# 3. Playwright End-to-End Tests (All 20 tests green in Chromium)
# NOTE: Playwright requires Node 20+. Use the installed Node v25 binary:
PATH="/Users/aman/.nvm/versions/node/v25.9.0/bin:$PATH" npx playwright test

# 4. Production Build Verification
npm run build
```

### 6.2 Key Invariants Checklist
- [ ] **Authority**: 100% server authority maintained; no client-authoritative state mutations.
- [ ] **DOM Selectors**: `.exchange`, `.crew-row`, `.tile`, `.action-sidebar`, `.board-chat` preserved.
- [ ] **ARIA Landmarks**: All accessibility roles (`region`, `dialog`, `status`, `radiogroup`) intact.
- [ ] **Zero Mobile Overflow**: Document scrollWidth $\le$ innerWidth on 390px and 360px viewports.
- [ ] **Unit Tests**: 135/135 tests passing cleanly.
- [ ] **E2E Tests**: 20/20 Playwright scenarios passing cleanly.

---

## 7. Strategic Overlord Sign-Off
All 3 implementation teams have distinct file domains, explicit regression traps, and clear mathematical and architectural contracts. Proceed with surgical execution. Keep the block hot, the authority server-side, and the code pristine.
