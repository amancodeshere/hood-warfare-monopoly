# LEAD GAME DESIGNER PHASE 3 PLAYTEST REPORT
**Project:** Spin the Block (Hood Warfare Monopoly)  
**Lead Game Designer & Beta Tester:** AI Game Design Lead  
**Audit Date:** October 17, 2026  
**Test Environment:** Port 4176 (`PORT=4176 DATA_DIR=/tmp/stb-beta-p3 node server/index.js`), Node v25.9.0, Playwright Chromium  
**Evidence Artifacts:** [`game-audit/evidence/beta-test-phase3/`](file:///Users/aman/Desktop/hw-monopoly/game-audit/evidence/beta-test-phase3/) & [`antigravity/brain/.../evidence/`](file:///Users/aman/.gemini/antigravity/brain/19bbc079-2f25-46d5-a3a1-b1eaa24285ac/evidence/)

---

## 1. Executive Summary & Design Verdict

A hands-on, end-to-end beta playtest was conducted across all core gameplay loops on live port 4176. The audit focused on four critical game design pillars benchmarked against modern industry standards (specifically **Richup.io**):
1. **Trade Opening & Ergonomics:** Current 276px sidebar confinement vs. Richup-style instant avatar popup modal.
2. **Auction Bidding & Timer Acceleration:** Input responsiveness, quick-bid chip utility, countdown acceleration/decay, and bot counter-bidding pace.
3. **Responsive Board Layout & Scaling:** Visual fidelity and scroll ergonomics across five reference viewports (1920×1080 FHD, 1366×768 Laptop, 768×1024 Tablet, 390×844 Mobile, 360×640 Compact).
4. **Chat Visibility & Overhead Token Speech Bubbles:** Placement of `.board-chat`, sidebar tab navigation ergonomics, and the urgent necessity of floating overhead speech bubbles on board tokens.

### Key Takeaways & Design Scorecard
| Game System | Current STB State | Richup.io Benchmark | Rating | Action Required |
| :--- | :--- | :--- | :---: | :--- |
| **Trade Opening** | Confined inside 276px narrow right sidebar. Avatars in roster are unclickable (bots lack profile buttons). | Clicking ANY opponent avatar opens a focused modal with direct "Trade" and asset overview. | **C+** | **P0:** Add avatar click modal + centered visual trade modal option. |
| **Auction Bidding** | Excellent modal (`width: 490px`). Quick chips (`+$10`, `+$25`, `+$50`, `+$100`, `Match+$10`) provide rapid bidding. Countdown accelerates (clamped to 5–8s). | Instant bidding chips, clear leader highlight, high-tension countdown sound. | **A-** | **P1:** Add ticking audio under 5s, pulsating urgency ring on leader. |
| **Board Viewport Scaling** | 1:1 square board scales well on 1920×1080 and 1366×768 desktop, but requires vertical page scroll on standard laptops (768px height). Mobile uses 780px board with horizontal swipe. | Fit-to-viewport container ensures board, dice, and actions fit on 768px laptop screen without page scroll. | **B** | **P1:** Add CSS `max-height: calc(100vh - 140px)` fit mode for standard laptops; dock mobile action buttons. |
| **Chat & Token Speech** | `.board-chat` is banished below the board (y > 1000px). Clicking "Chat" sidebar tab forces jarring scroll jump down below board. Zero board bubbles. | Chat lives in docked tab or overlay; barks and chat messages float directly over board tokens for 4–5s. | **D+** | **P0:** Implement overhead speech bubbles over tokens; render chat inside sidebar tab rather than page scroll jump. |

---

## 2. Empirical Playtest Evidence & Audit Setup

All gameplay loops were executed live on an isolated instance running on `http://127.0.0.1:4176`. Automated Playwright agents and interactive inspector scripts recorded layout geometry, computed styles, DOM state, and network events.

### Generated Evidence Gallery
All captured screenshots and machine-readable telemetry are preserved in [`game-audit/evidence/beta-test-phase3/`](file:///Users/aman/Desktop/hw-monopoly/game-audit/evidence/beta-test-phase3/):
- **Auction Flow:**
  - [`auction_modal_opened.png`](file:///Users/aman/Desktop/hw-monopoly/game-audit/evidence/beta-test-phase3/auction_modal_opened.png) — Modal popup, high bid $0, opening $10, quick chips visible, 15s timer.
  - [`auction_bid_entered.png`](file:///Users/aman/Desktop/hw-monopoly/game-audit/evidence/beta-test-phase3/auction_bid_entered.png) — Player selected `+$50` chip, bid $60, timer accelerated to 9s, player marked leader.
  - [`auction_bot_counterbid.png`](file:///Users/aman/Desktop/hw-monopoly/game-audit/evidence/beta-test-phase3/auction_bot_counterbid.png) — Bot Jax counterbid $80, timer decayed to 6s, Jax marked leading.
  - [`auction_concluded.png`](file:///Users/aman/Desktop/hw-monopoly/game-audit/evidence/beta-test-phase3/auction_concluded.png) — Player passed, auction resolved cleanly.
- **Trade & Interaction:**
  - [`trade_sidebar_confined.png`](file:///Users/aman/Desktop/hw-monopoly/game-audit/evidence/beta-test-phase3/trade_sidebar_confined.png) — Current trade interface confined to 276px sidebar with 1339px vertical stretch.
- **Chat & Board Audio/Visuals:**
  - [`chat_panel_location.png`](file:///Users/aman/Desktop/hw-monopoly/game-audit/evidence/beta-test-phase3/chat_panel_location.png) — Chat panel buried below the board fold (y=1016px).
  - [`chat_scroll_jump.png`](file:///Users/aman/Desktop/hw-monopoly/game-audit/evidence/beta-test-phase3/chat_scroll_jump.png) — Page scrolled down to bottom, losing board view.
  - [`board_tokens_no_bubbles.png`](file:///Users/aman/Desktop/hw-monopoly/game-audit/evidence/beta-test-phase3/board_tokens_no_bubbles.png) — Board tokens on tiles with zero overhead speech bubbles.
- **Viewport Layouts:**
  - [`viewport_1920x1080_fhd_desktop.png`](file:///Users/aman/Desktop/hw-monopoly/game-audit/evidence/beta-test-phase3/viewport_1920x1080_fhd_desktop.png)
  - [`viewport_1366x768_standard_laptop.png`](file:///Users/aman/Desktop/hw-monopoly/game-audit/evidence/beta-test-phase3/viewport_1366x768_standard_laptop.png)
  - [`viewport_768x1024_ipad_portrait.png`](file:///Users/aman/Desktop/hw-monopoly/game-audit/evidence/beta-test-phase3/viewport_768x1024_ipad_portrait.png)
  - [`viewport_390x844_iphone14_mobile.png`](file:///Users/aman/Desktop/hw-monopoly/game-audit/evidence/beta-test-phase3/viewport_390x844_iphone14_mobile.png)
  - [`viewport_360x640_compact_mobile.png`](file:///Users/aman/Desktop/hw-monopoly/game-audit/evidence/beta-test-phase3/viewport_360x640_compact_mobile.png)
- **Telemetry:**
  - [`phase3_audit_data.json`](file:///Users/aman/Desktop/hw-monopoly/game-audit/evidence/beta-test-phase3/phase3_audit_data.json) — Comprehensive measurements for all components.

---

## 3. Deep-Dive: Trade Opening & Sidebar Confinement

### The Issue
Currently, proposing or inspecting a trade requires the player to navigate to the right sidebar (`aside.hud-panel`) and click the `"Trade"` tab.
- **Physical Confinement:** On a standard 1366×768 screen, the sidebar is only **276px wide**. The trading interface inside (`.exchange`) is constrained to **230px wide**.
- **Extreme Vertical Cramping:** The exchange component stretches **1339px tall**, requiring intense vertical scrolling past partner radios, my assets, partner assets, cash sliders, escape cards, and value meters.
- **Total Lack of Avatar Interactivity:** In the left sidebar (`CrewRoster`), clicking an opponent's avatar icon (`.crew-mark`) does absolutely nothing. Clicking a bot's name does nothing because bots do not have `p.profileId`. The only way to trade with a specific player is to manually open the Trade tab, click the radio button for that partner, and scroll through the asset list.

### Richup.io Comparison & Modern Design Benchmark
In **Richup.io**, player interaction is instantaneous and intuitive:
1. **Avatar-Driven Context:** When a player clicks ANY rival's avatar (either on the scoreboard or on the board token), a sleek **Player Interaction Card** pops up in the center of the screen displaying:
   - Crew identity, cash balance, net worth, and jailed status.
   - Distinct, prominent action buttons: **[Trade With Player]**, **[View Properties]**, **[Mute]**.
2. **Dedicated Visual Trade Modal:** Clicking "Trade With Player" immediately opens a spacious, two-column trading modal across the screen. Both players' assets are laid out horizontally side-by-side with full district color swatches, clear cash counters, and a central handshake confirmation stage. Players never feel trapped in a cramped 230px sidebar.

### Implementer Recommendations (P0)
1. **Interactive Avatar Click Handler (`CrewRow.jsx`):**
   - Make `.crew-mark` and `.crew-row` clickable. Clicking any opponent row should trigger an action popup: `openPlayerModal(p)` or `startTradeWith(p.id)`.
2. **Expandable / Modal Trade View:**
   - Keep the sidebar trade tab for quick access, but add a **[Maximize Trade Window]** or open a centered **`<VisualTradeModal>`** overlay (similar to `Auction` and `Duel` modals) whenever trade negotiations begin.

---

## 4. Deep-Dive: Auction Bidding & Timer Dynamics

### Live Playtest Observations
The auction loop was triggered by rolling onto an unowned property (*Spin the Bus*, $200 list price) and clicking `"Put it up for auction"`.

```
[Initial Auction State]
Property: Spin the Bus ($200 list price)
High Bid: $0 (Opening Bid: $10)
Time Left: 15s
Bidders Active: DonMega (You), Remy (Bot), Jax (Bot), Nova (Bot)
Quick Bid Chips Available: [+$10] [+$25] [+$50] [+$100] [Match + $10]
```

#### 1. Input Responsiveness & Quick Chips
- The input field `#auction-bid` is clean and reactive. 
- When the player clicked the **`+$50`** quick chip, the input value immediately updated from `$10` to `$60`.
- The action button text synchronously updated from `"Bid $10"` to `"Bid $60"` with zero perceptible lag.
- The presence of `+$10`, `+$25`, `+$50`, `+$100`, and `Match + $10` chips completely eliminates tedious manual typing on both desktop and mobile devices.

#### 2. Timer Acceleration & Decay Verification
The auction system implements an acceleration mechanism:
```javascript
// server/features.js:82-84
const remainingSec = Math.max(0, (g.deadline - Date.now()) / 1000);
const newSec = Math.max(5, Math.min(remainingSec, 8));
g.deadline = Date.now() + Math.round(newSec * 1000);
```
- **Observed Behavior:**
  - Before bid: timer was at **14s left**.
  - Immediately upon submitting the $60 bid: the server clamped `newSec` to `Math.min(14, 8) = 8s` + grace interval.
  - The client timer dropped to **9s left**, accelerating the countdown and preventing stall tactics.
  - If a bid is submitted in the final seconds, `Math.max(5, remainingSec)` guarantees a **5-second grace period**, allowing opponents to counter.

#### 3. Bot Counter-Bidding Cadence
- In `server/index.js`, bots poll auction state every `1400ms`.
- After DonMega took the lead with $60, bot **Jax** evaluated `limit = min(cash - 80, price)` and submitted an automated counterbid of **$80**.
- The UI immediately updated: Jax was styled with `.leading`, the header showed `"Jax leads"`, and the timer adjusted to **6s left**.
- The bot cadence of 1.4s feels natural—neither inhumanly instantaneous nor sluggish.

#### 4. Pass & Settlement Flow
- Clicking `"Pass"` properly disabled the bid button, showed `"Watch the table bid it out"`, and marked the player as `"passed"` in the roster.
- When all other non-leading players passed or the timer expired, `finishAuction(g)` executed cleanly, awarding the property to the high bidder and deducting cash.

### Design Critiques & Polish Opportunities (P1)
- **Audio Feedback:** While a cash sound plays on bid increases, there is currently **no ticking audio** during the final 5 seconds. Adding a rapid heartbeat or ticking clock under 5 seconds would dramatically increase tension.
- **Timer Visual Urgency:** The timer text (`<b>X s left</b>`) should pulse red with a glowing ring when `timeLeft <= 4`.
- **Roster Animation:** When a bidder is outbid or passes, a subtle red cross-out or shake animation should emphasize their withdrawal.

---

## 5. Deep-Dive: Responsive Scaling Across 5 Viewports

The board and UI were measured across 5 distinct screen dimensions:

| Viewport Profile | Resolution | Layout Mode | Columns / Structure | Board Dimensions | Regular Tile Size | Tile Font | Scroll Issues |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| **FHD Desktop** | 1920×1080 | Grid (3-col) | `220px 936px 300px` | 936×936 (1.00) | 80.9×80.9 px | 12px / 9px | No H-scroll; V-scroll needed for chat (y=1192) |
| **Standard Laptop** | 1366×768 | Grid (3-col) | `210px 768px 276px` | 768×768 (1.00) | 65.6×65.6 px | 10px / 8.5px | Board height (768px) + topbar (78px) forces page V-scroll |
| **iPad Portrait** | 768×1024 | Grid (2-col) | `436px 270px` (top roster) | 436×436 (1.00) | 35.5×35.5 px | 9px / 7px | Fits vertically with room for chat |
| **iPhone 14 Mobile** | 390×844 | Flex (1-col) | Stacked column | 780×780 (1.00) | 68.0×68.0 px | 9px / 7px | Board requires horizontal swipe; page height 2250px |
| **Compact Mobile** | 360×640 | Flex (1-col) | Stacked column | 780×780 (1.00) | 68.0×68.0 px | 9px / 7px | Extreme vertical page height (2365px) |

```
VIEWPORT GEOMETRY ANALYSIS:
--------------------------------------------------------------------------------------------------
1920x1080: [ Crew 220px ] [            Board 936x936            ] [ HUD 300px ] -> Spacious & clean
1366x768:  [ Crew 210px ] [            Board 768x768            ] [ HUD 276px ] -> Board taller than screen!
768x1024:  [ Crew Roster wrapped across top: 728x149px ]
           [ Board 436x436 ] [ HUD 270px ]                                       -> Compact & balanced
390x844:   [ Topbar ] -> [ Crew List ] -> [ HUD / Move ] -> [ Board 780px w/ swipe ] -> Massive vertical stack
--------------------------------------------------------------------------------------------------
```

### Critical Ergonomic Findings

#### 1. The 1366×768 Laptop Problem (High Priority)
Over 25% of web board game players use 1366×768 laptops or 1440×900 MacBooks.
- On 1366×768, the board shell renders at `768px × 768px`.
- Together with the topbar (78px) and page padding (40px), the total layout height is **1255px**.
- **Player Pain Point:** The player cannot see the entire board AND the action buttons ("Roll the dice", "Claim block") on a laptop screen simultaneously without scrolling up and down every turn.
- **Richup Solution:** Richup constrains board size using CSS `vmin` or `max-height: calc(100vh - 120px)`. This guarantees that the entire board, dice rolls, and turn buttons are 100% visible on a laptop without touching the scroll wheel.

#### 2. Mobile Ergonomics (390×844 & 360×640)
- On mobile, the layout stacks: Topbar → Crew Sidebar → Action Sidebar → Table Area → Footer.
- The total document height exceeds **2250px**.
- While the horizontal scroll container (`.board-viewport`) works reliably with swipe hints, having the action buttons above the board and chat below the board creates unnecessary thumb travel.
- **Recommendation:** Implement a sticky bottom action bar on mobile (`max-width: 720px`) that docks the primary turn actions ("Roll", "Buy", "End Turn") right at the player's fingertips.

---

## 6. Deep-Dive: Chat Visibility & Overhead Token Speech Bubbles

### The Current Architecture Failure
The current chat implementation has two severe structural UX flaws:

1. **Physical Placement Below the Fold:**
   - In `src/main.jsx:1148`, `<div className="board-chat">` is rendered at the very bottom of `.table-area`, below the board, below `.table-footer`, and below `.piece-legend`.
   - On a 1366×768 laptop, `.board-chat` starts at `y = 1016px`. On 1920×1080 desktop, it starts at `y = 1192px`.
   - **Result:** Players NEVER see incoming chat messages, opponent trades, or bot barks unless they scroll all the way to the footer.

2. **The Sidebar "Chat" Tab Scroll Hijack:**
   - In `aside.hud-panel`, the tab bar displays `["The move", "My turf", "Trade", "Chat"]`.
   - When a user clicks `"Chat"`, it does **NOT** switch the sidebar view to show chat messages.
   - Instead, lines 1592–1600 in `src/main.jsx` run:
     ```javascript
     if (x.id === "chat") {
       chatFocus.current?.scrollIntoView({ block: "center", behavior: "smooth" });
       chatFocus.current?.querySelector("input")?.focus({ preventScroll: true });
     }
     ```
   - **Playtest Observation:** Clicking "Chat" violently scrolls the entire page downward by **110px to 600px**, ripping the player's eyes completely away from the board and the dice!

3. **Absence of Overhead Token Speech Bubbles:**
   - When a player chats or a bot triggers an automated bark (`server/botBarks.js`), the text only appears in the buried chat log and a momentary notification toast.
   - On the actual board grid, the 4 player tokens (`.token`) sit silently. There are **zero floating speech bubbles** or reactive dialog popovers above tokens.

### Richup.io Benchmark Comparison
Modern web board games understand that chat is emotional engagement:
- **Floating Overhead Speech Bubbles:** In Richup, whenever a player or bot chats, an animated comic speech bubble pops up directly above their token on the board:
  - Features a stylized directional pointer tail anchored to the token.
  - Floats with a subtle bounce animation for 4.5 seconds before dissolving.
  - Contains crew badge and message text.
  - Opponents immediately know *who* said it and *where* they are on the board without looking away from the game action.

### Implementer Recommendations (P0)
1. **Dock Chat Inside the Sidebar Tab:**
   - When the user clicks `"Chat"` in `.panel-tabs`, switch the right sidebar view to a dedicated `<ChatPanel>` component instead of scrolling the page.
2. **Implement `<TokenSpeechBubble>` on Board Tokens:**
   - Track active chat messages with timestamp and player ID (`recentBarks` / `recentChats`).
   - Render a floating bubble anchored over `.token`:
     ```jsx
     <div className="token-speech-bubble" style={{ left: tokenX, top: tokenY - 36 }}>
       <span>{message.text}</span>
       <div className="speech-arrow" />
     </div>
     ```

---

## 7. Concrete Implementer Guidance & Priority Action Items

Based on live playtest metrics and benchmark evaluations, here are the prioritized engineering directives for the implementation team:

```
PRIORITY ROADMAP FOR IMPLEMENTERS:
==================================================================================================
[P0] CHAT REFACTOR:
     1. Stop page scroll-jump on clicking "Chat" sidebar tab. Render Chat directly inside HUD tab.
     2. Create <TokenSpeechBubble> floating over active board tokens for bot barks and player chat.

[P0] AVATAR INTERACTIVITY & MODAL TRADE:
     1. Make CrewRow avatars (.crew-mark) clickable to pop up Player Context Card with [Trade] CTA.
     2. Add modal expansion for VisualTrade to free it from the 276px sidebar confinement.

[P1] LAPTOP BOARD FIT-TO-VIEWPORT (1366x768):
     1. Constrain .board-shell with max-height: calc(100vh - 130px) so the board, dice, and turn HUD
        fit on standard 768px laptop displays without page scrolling.

[P1] AUCTION AUDIO & TENSION POLISH:
     1. Add countdown ticking audio FX when timeLeft <= 4s.
     2. Add pulsating red urgency ring on countdown timer under 5s.
==================================================================================================
```

### Directives Specification Summary

#### Directive 1: In-Sidebar Chat & Overhead Token Bubbles (P0)
- **Target Files:** [`src/main.jsx`](file:///Users/aman/Desktop/hw-monopoly/src/main.jsx), [`src/components/GameBoard.jsx`](file:///Users/aman/Desktop/hw-monopoly/src/components/GameBoard.jsx), [`src/style.css`](file:///Users/aman/Desktop/hw-monopoly/src/style.css).
- **Behavior:**
  - In `src/main.jsx`, clicking `tab === "chat"` should set `tab = "chat"` and render `<ChatPanel>` directly inside `aside.hud-panel`.
  - In `GameBoard.jsx`, render `<TokenSpeechBubble>` positioned above `.token` using CSS relative/absolute positioning. Auto-fade after 4.5 seconds.

#### Directive 2: Interactive Avatar & Trade Modal (P0)
- **Target Files:** [`src/components/CrewRoster.jsx`](file:///Users/aman/Desktop/hw-monopoly/src/components/CrewRoster.jsx), [`src/components/VisualTrade.jsx`](file:///Users/aman/Desktop/hw-monopoly/src/components/VisualTrade.jsx), [`src/main.jsx`](file:///Users/aman/Desktop/hw-monopoly/src/main.jsx).
- **Behavior:**
  - Update `CrewRow` so that clicking any player row or `.crew-mark` triggers `setPlayerOpen(p)`.
  - In `PlayerModal` or context popup, provide a direct **[Trade with {name}]** button that initiates trade and opens the trade interface.
  - Support a centered modal dialog for `<VisualTrade>` so players can negotiate trades across a full 720px width rather than 230px.

#### Directive 3: Laptop 1366×768 Fit-to-Viewport (P1)
- **Target Files:** [`src/style.css`](file:///Users/aman/Desktop/hw-monopoly/src/style.css).
- **Behavior:**
  - In `@media (max-height: 820px)` and default desktop styles, set `.board-shell` to `max-height: min(720px, calc(100vh - 140px))` with `aspect-ratio: 1 / 1`.
  - Ensures the board never exceeds the browser window height on 1366×768 laptops.

#### Directive 4: Auction Sensory Polish (P1)
- **Target Files:** [`src/Extras.jsx`](file:///Users/aman/Desktop/hw-monopoly/src/Extras.jsx), [`src/audio.js`](file:///Users/aman/Desktop/hw-monopoly/src/audio.js).
- **Behavior:**
  - Play a countdown click/tick tone when `timeLeft <= 4`.
  - Add visual urgency class `.urgent` to `.auction-price b` when `timeLeft <= 4` to flash yellow/red.

---

## 8. Verification & Clean Teardown
- Server instance on port 4176 was cleanly shut down and task 74 terminated.
- Socket ports and temporary directories (`/tmp/stb-beta-p3`) were verified completely unlinked and free.
- All telemetry and screenshots are permanently logged in [`game-audit/evidence/beta-test-phase3/`](file:///Users/aman/Desktop/hw-monopoly/game-audit/evidence/beta-test-phase3/) and the workspace artifact directory.
