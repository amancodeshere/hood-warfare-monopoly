# STRATEGIC DIRECTIVES: PHASE 2 IMPROVEMENTS
**Game Title:** Spin the Block (Hood Warfare Monopoly)  
**Author:** Lead Game Director & Strategic Overlord  
**Date:** October 2026  
**Audience:** Implementer 1, Implementer 2, Implementer 3, Code Reviewer  

---

## 1. Executive Vision & Creative Directives

*Spin the Block* is a gritty, high-stakes urban warfare adaptation of classic property trading. Its creative and mechanical pillars are:
1. **100% Server Authority**: The server alone resolves dice, combat hitboxes, bank rolls, property deeds, trades, and chat.
2. **Authentic Pacing & Tactical Depth**: High tension around every perimeter turn, street luck card stash, and rent shootout.
3. **Immersive Street Aesthetics & Voice**: Unapologetic urban street culture, rap bravado, colorful districts, and mechanical tactile feedback.

In Phase 2, we execute three concurrent improvements that significantly heighten player engagement and technical health:
- **Improvement 1 (Implementer 1):** Modularize monolithic `src/main.jsx` (GAME-006) without breaking a single unit or E2E test.
- **Improvement 2 (Implementer 2):** Deploy **Trading 2.0** in `src/Extras.jsx`—a tactile visual trade negotiation interface with district chips, offer trays, and a live net-worth fairness meter.
- **Improvement 3 (Implementer 3):** Launch the **AI Bot Personality & Bark Engine** (`server/botBarks.js`) giving life, rivalry, and humor to the 7 street bots with anti-spam cooldowns.

---

## 2. Directive 1: Modularize `src/main.jsx` (Implementer 1)

### 2.1 The Objective
`src/main.jsx` currently exceeds 3,010 lines, interweaving table rendering, HUD, popovers, and app-level state. Extract self-contained modular components into `src/components/` while strictly preserving DOM selectors, ARIA roles, and component signatures.

### 2.2 Target Architecture
Deconstruct `src/main.jsx` into the following structured directory tree:
```
src/
├── components/
│   ├── board/
│   │   └── GameBoard.jsx        # Perimeter 40-tile board, SVG center city, token movement
│   ├── hud/
│   │   ├── ActionPanel.jsx      # Turn controls, primary CTA shimmer buttons, buy/pay/jail/tactical stash
│   │   └── CrewRoster.jsx       # Standing list, cash badges, circular turn timer ring, elimination status
│   └── modals/
│       └── DeedCardPopover.jsx  # Floating glassmorphic deed card popover
```

### 2.3 Non-Negotiable Test Guardrails & Regression Traps
> [!CAUTION]
> **Unit Test Hazard (`tests/deed_card_popover.test.js:132-165`):**
> This unit test reads `src/main.jsx` via `readFileSync(resolve("src/main.jsx"), "utf8")` and directly asserts the following exact substrings:
> - `function DeedCardPopover`
> - `<DeedCardPopover`
> - `deed-card-popover`
> - `deed-close-btn`
> - `deed-rent-ladder`
> - `deed-finance-grid`
> - `deed-residents-section`
> - `cta-shimmer`
> - `Roll the dice`
> - `Claim block`
>
> **Mandatory Rule for Implementer 1:**
> Even if `DeedCardPopover` is extracted or wrapped, `src/main.jsx` **must explicitly declare** `function DeedCardPopover(...)` (either the full implementation or a cleanly exported wrapper preserving the required classes/markers) and must render `<DeedCardPopover`. Failure to keep these strings in `src/main.jsx` will fail the unit test suite!

### 2.4 Playwright E2E Selectors Contract
All existing CSS classes and landmarks must remain intact:
- `.game-layout`, `.crew-sidebar`, `.crew-list`, `.crew-row`
- `.board-area`, `.board`, `.tile`, `.corner`
- `.action-sidebar`, `.turn-heading`, `.room-code`
- Button labels: `"Roll the dice"`, `"Claim block"`, `"House rules"`, `"Let’s play"`, `"Play solo vs bots"`, etc.

---

## 3. Directive 2: Visual Trade Negotiation UI / Trading 2.0 (Implementer 2)

### 3.1 The Objective
Transform the trade negotiation panel in `src/Extras.jsx` (`ExchangePanel`) from raw textual checkboxes into a visual, tactile deal table (**Trading 2.0**).

### 3.2 Key Features
1. **Interactive District-Colored Property Chips**:
   - Each purchasable property is displayed as a sleek visual chip featuring:
     - District color swatch/accent bar from `DISTRICTS[t.group]?.color` (or transit slate / utility gold).
     - Property name and price tag (`money(t.price)`).
     - Badge for mortgage status (`"MORTGAGED"` / `"NO RENT"`).
     - Active glow / selected border when included in the trade.
2. **Offer & Request Trays (The Street Negotiation Table)**:
   - Two visual drop/holding trays:
     - **"You Give" Tray**: Real-time summary of your offered chips, cash amount, and escape cards.
     - **"You Receive" Tray**: Real-time summary of requested partner chips, requested cash, and requested cards.
   - Selected items in trays have a 1-click remove (`×`) chip interaction.
3. **Real-Time Net-Worth Fairness / Balance Meter**:
   - Calculates total economic value for both sides:
     $$\text{GiveValue} = \sum(\text{price} \times (\text{mortgaged} ? 0.5 : 1)) + \text{cash} + (\text{escapes} \times 100)$$
     $$\text{TakeValue} = \sum(\text{price} \times (\text{mortgaged} ? 0.5 : 1)) + \text{requestCash} + (\text{requestEscapes} \times 100)$$
   - Computes Net Delta: $\Delta = \text{TakeValue} - \text{GiveValue}$.
   - Displays a dynamic visual balance bar with colored indicator:
     - **Gold / Green**: "Fair Trade" / "Even Deal" ($|\Delta| \le 50$)
     - **Emerald Lime**: "Finessing Partner (+$X)" ($\Delta > 50$)
     - **Crimson / Amber**: "Generous Offer / Taking a Hit (-$X)" ($\Delta < -50$)
   - Provides street-flavored deal assessment badges: *"Dead Even"*, *"Street Robbery"*, *"Generous Rescue"*, *"Bailout"*.

### 3.3 Non-Negotiable Test Guardrails & E2E Compatibility
> [!IMPORTANT]
> **Playwright E2E Hazard (`tests/e2e/trading-chat-leave.spec.js`):**
> The automated test suite executes exact interactions:
> - Container: `.exchange`
> - Partner selection: `getByRole("radio", { name: "Trade Rival · $1,500", exact: true })`
> - Property checkboxes: `getByRole("checkbox", { name: /Auntie’s Tax-Free Corner/ })` and `getByRole("checkbox", { name: /Broke Boy Blvd/ })`
> - Opponent property selection: `.exchange-fields:nth(1).getByRole("checkbox")`
> - Cash & Card inputs: `getByLabel("Cash to give")`, `getByLabel("Cash to receive")`, `getByLabel("Escape cards to give")`, `getByLabel("Escape cards to receive")`
> - Buttons: `getByRole("button", { name: "Send offer" })`, `getByRole("button", { name: "Counteroffer" })`, `getByRole("button", { name: "Send counteroffer" })`, `getByRole("button", { name: "Accept deal" })`, `getByRole("button", { name: "Withdraw offer" })`
> - Balance note: `"Your cash after this deal: $..."`
>
> **Mandatory Rule for Implementer 2:**
> The visual property chips **MUST wrap or maintain the underlying `<label className="asset-check">` with `<input type="checkbox">`** and accessible property names so `getByRole("checkbox")` continues to find and toggle them. Do not replace checkboxes with custom `div` clicks without preserving the accessible checkbox input!

---

## 4. Directive 3: AI Bot Personality & Contextual Chat Bark Engine (Implementer 3)

### 4.1 The Objective
Create `server/botBarks.js` to infuse the 7 autonomous bots with unique street personalities, rivalries, and authentic situational chat barks, giving multiplayer lobbies and solo games lively street atmosphere.

### 4.2 The 7 Bot Personalities
1. **Remy**: *The Hot-Headed Gunner*. Impatient, aggressive, eager to start shootouts, trash-talks anyone landing on his block.
2. **Jax**: *The Alley Enforcer*. Low tolerance for disrespect, physical threats, speaks like an unshakeable heavyweight.
3. **Nova**: *The High-Roller Flexer*. Condescending, flaunts net worth, mocks broke players, loves monopolies.
4. **Lil Receipt**: *The Petty Trenches Accountant*. Keeps ledger of every dollar, recites clauses, itemizes rent, quotes contracts.
5. **Unc**: *The Veteran OG*. Old-school street wisdom, shaking his head at rookie mistakes, reminisces about the block.
6. **Big Bag**: *The Greedy Mogul*. Obsessed with bags, utilities, and tax collection. Always counting paper.
7. **Miss Motion**: *The Untouchable Boss Lady*. Cold swagger, sharp tongue, effortless boss energy, dismisses clumsy deals.

### 4.3 Bark Event Triggers
- `TURF_CLAIM`: Bot buys a block or wins an auction.
- `RENT_COLLECT`: Bot collects rent from a human or rival bot (extra spicy on full districts or >$100).
- `RENT_PAID`: Bot has to pay rent to a rival.
- `LOW_CASH`: Bot's cash drops below $200.
- `SHOOTOUT_INITIATE`: Bot challenges a landlord to a shootout duel.
- `SHOOTOUT_DEFEND`: Bot is challenged to a shootout by an unaffordable tenant.
- `DUEL_WIN`: Bot wins a shootout.
- `DUEL_LOSE`: Bot loses a shootout.
- `BANKRUPTCY`: Bot eliminates an opponent or is eliminated.
- `TRADE_REJECT`: Bot rejects an unfair or lowball trade offer.

### 4.4 Technical Guardrails & Anti-Spam Architecture
> [!WARNING]
> **Anti-Spam & Rate Limiting Requirements:**
> 1. **Per-Bot Cooldown**: Maximum 1 bark per bot per **8,000 milliseconds**. Track `botLastBark = new Map<string, number>()`.
> 2. **Probability Tuning**: Barks should not fire on 100% of routine actions. High-impact events (duel victory, bankruptcy, shootouts) should have high probability (75–90%), while routine rent payments should have moderate probability (25–40%).
> 3. **Chat Message Schema**: Every bark must conform strictly to server chat format:
>    ```javascript
>    {
>      id: randomBytes(12).toString("hex"),
>      player: bot.id,
>      profileId: null,
>      name: bot.name,
>      text: barkText,
>      team: null,
>      time: Date.now()
>    }
>    ```
> 4. **Length Constraint**: All barks must be $\le 280$ characters, adhere to PG-13 gritty street theme (no slurs or ban-worthy language), and pass server chat sanitization.
> 5. **Server Authority**: Bot barks are created and appended server-side (`g.chat.push(...)`) and published via `publish(g)`. Clients never generate or push bot messages.
> 6. **Dedicated Unit Tests (`tests/bot_barks.test.js`)**: Must test all 7 personalities, all trigger types, cooldown enforcement, and fallback handling.

---

## 5. Master Verification Checklist

Before any implementer marks their ticket ready for review, the following must pass with zero errors:

| Check | Command | Target |
|---|---|---|
| **Lint** | `npm run lint` | 0 errors, 0 warnings (`--max-warnings 0`) |
| **Unit Tests** | `npm test` | All 105+ tests passing |
| **E2E Playwright** | `npx playwright test` | All 20 tests passing in Chromium |
| **Production Build** | `npm run build` | Vite build bundle completes cleanly |

---

## 6. Strategic Alignment Summary
All three implementers are cleared to proceed in parallel within their scoped boundaries:
- **Implementer 1**: `src/main.jsx` and new `src/components/` (Preserve all test strings!).
- **Implementer 2**: `src/Extras.jsx` and `src/style.css` (Trading 2.0 with accessible checkboxes!).
- **Implementer 3**: `server/botBarks.js`, `server/index.js`, and `tests/bot_barks.test.js` (8s cooldowns!).

Execute with precision. Keep the block hot, the authority 100% server-side, and the code pristine.
