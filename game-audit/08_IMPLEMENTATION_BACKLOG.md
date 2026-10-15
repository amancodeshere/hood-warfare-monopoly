# 08 — Implementation Backlog: Developer-Ready Ticket Specifications

This document defines the actionable, prioritized technical and design backlog for implementing all approved improvements to *Spin the Block*.

---

## Backlog Priority Matrix

| Ticket ID | Title | Category | Priority | Effort | Complexity | Impact |
|---|---|---|---|---|---|---|
| **GAME-001** | Fix Post-Auth Transition Directly to Main Lobby | UI / UX | **P0** | 1h | Low | High |
| **GAME-002** | Accelerate Auction Bidding Countdown to Prevent Stalling | Gameplay | **P1** | 2h | Low | High |
| **GAME-003** | Sticky Bottom Action Bar for Mobile Viewports | UI / Responsive | **P1** | 4h | Medium | High |
| **GAME-004** | Step-by-Step Perimeter Token Walking Animation | VFX / Motion | **P1** | 5h | Medium | High |
| **GAME-005** | Floating Cash Transaction Delta VFX | VFX / UI | **P1** | 3h | Low | High |
| **GAME-006** | Modular Decomposition of Monolithic `src/main.jsx` | Engineering | **P1** | 6h | Medium | High |
| **GAME-007** | WCAG 2.2 AA ARIA and Landmark Accessibility Remediation | Accessibility | **P2** | 2h | Low | Medium |
| **GAME-008** | Utility Monopoly Overhaul: City Grid Lockdown | Game Design | **P2** | 4h | Medium | Medium |
| **GAME-009** | Interactive Tactical Action Cards (Street Luck 2.0) | Game Design | **P2** | 6h | Medium | High |
| **GAME-010** | High-Stakes First-Person Shootout Modifiers & VFX | VFX / Combat | **P2** | 5h | Medium | High |
| **GAME-011** | Post-Match Statistics Summary & Highlight Celebration | UI / Retention | **P2** | 5h | Medium | High |
| **GAME-012** | Non-Blocking Asynchronous Persistence IO | Engineering | **P2** | 3h | Low | Medium |

---

## Detailed Developer-Ready Tickets

### GAME-001: Fix Post-Auth Transition Directly to Main Lobby
**Category:** UI / UX  
**Priority:** P0 (Critical Usability)  
**Status:** Ready for Implementation  
**Evidence:** `evidence/s5/03_after_signup_submission.png`, `evidence/s5/04_lobby_authenticated.png`  
**Current Problem:**  
When a user signs up or logs in on `EntryPage`, the server authenticates the profile, but the client remains on the entry screen displaying `"WELCOME BACK, [NAME]"` and requires an extra click on `"Enter the city ->"` to reach the lobby.  
**Why It Matters:**  
New and returning players think the app is broken or frozen upon submitting their credentials.  
**Desired Outcome:**  
Successful sign-in or account creation immediately transitions the player into the main lobby.  
**Proposed Solution:**  
In `src/main.jsx`, invoke `enter()` immediately inside `authenticated(r)`.  
**Implementation Guidance:**  
Update `authenticated` in `src/main.jsx:1363-1368`:
```javascript
const authenticated = (r) => {
  persist("stb-profile", r.token);
  setProfile(r.profile);
  setName(r.profile.name);
  persist("stb-name", r.profile.name);
  persist("stb-entry", "yes");
  setEntry(false);
};
```
**Affected Files:** `src/main.jsx`, `src/LoginMaps.jsx`  
**Dependencies:** None  
**Acceptance Criteria:**  
1. Submitting the "Create your account" form immediately displays the lobby with room controls.
2. Submitting the "Sign in" form immediately displays the lobby.
3. Refreshing the browser preserves authenticated state in the lobby.  
**Regression Tests:** `tests/e2e/table.spec.js`  
**Estimated Complexity:** Low (10 minutes)

---

### GAME-002: Accelerate Auction Bidding Countdown to Prevent Stalling
**Category:** Gameplay Balancing / Pacing  
**Priority:** P1 (High)  
**Status:** Ready for Implementation  
**Evidence:** `evidence/s2/log.txt` (Session 2 auction stalled over 60s with 18 consecutive resets)  
**Current Problem:**  
`server/game.js` hardcodes `au.clock = 20` on every bid, allowing players to reset the 20s timer indefinitely with $10 incremental bids.  
**Why It Matters:**  
Destroys match pacing and frustrates spectators.  
**Desired Outcome:**  
Auctions conclude briskly within 30–45 seconds while still allowing competitive bidding.  
**Proposed Solution:**  
Implement decaying auction clock:
- Opening timer: 15s.
- Consecutive bids set `au.clock = Math.max(5, Math.min(au.clock, 8))`.
- Bids in final 3s grant a 4s grace period (capped at 5s).
- When all active rivals click `Pass`, settle immediately.  
**Implementation Guidance:**  
In `server/game.js:880-893` (`action` handler for `auction-bid`):
```javascript
au.highBid = a.amount;
au.highBidder = id;
au.clock = Math.max(5, Math.min(au.clock, 8));
```
**Affected Files:** `server/game.js`  
**Dependencies:** None  
**Acceptance Criteria:**  
1. Placing a bid when clock is 12s drops clock to 8s.
2. Placing a bid when clock is 2s resets clock to 5s.
3. Auction finishes automatically when timer hits 0s.  
**Regression Tests:** `tests/game.test.js` auction test suite  
**Estimated Complexity:** Low (30 minutes)

---

### GAME-003: Sticky Bottom Action Bar for Mobile Viewports
**Category:** UI / Responsive Layout  
**Priority:** P1 (High)  
**Status:** Ready for Implementation  
**Evidence:** `evidence/responsive/mobile_390x844_3_game.png` (Page height 2358px pushes actions out of view)  
**Current Problem:**  
On mobile viewports (<= 480px width), active turn buttons (`Roll the dice`, `Claim block`, `End turn`) scroll offscreen when property inspection cards or sidebars expand.  
**Why It Matters:**  
Mobile players cannot see their turn options without excessive vertical scrolling.  
**Desired Outcome:**  
Primary turn action buttons remain permanently visible in a sticky bottom action sheet on mobile.  
**Proposed Solution:**  
Wrap `.turn-hero` primary CTAs in a sticky container for mobile media queries:
```css
@media (max-width: 640px) {
  .action-panel-sticky {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #161e19;
    border-top: 1px solid rgba(196, 245, 60, 0.25);
    padding: 12px 16px;
    z-index: 1000;
    box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.6);
  }
}
```
**Affected Files:** `src/main.jsx`, `src/style.css`  
**Dependencies:** None  
**Acceptance Criteria:**  
1. In mobile viewport (390×844), `Roll the dice` button is visible at the bottom of the screen upon turn start without scrolling.
2. Tapping any board square opens property details without hiding the bottom action button.  
**Regression Tests:** `tests/e2e/table.spec.js` mobile test  
**Estimated Complexity:** Medium (3 hours)

---

### GAME-004: Step-by-Step Perimeter Token Walking Animation
**Category:** VFX / Animation  
**Priority:** P1 (High)  
**Status:** Ready for Implementation  
**Evidence:** Playtest Session 1 observation: tokens teleport instantly from starting tile to destination.  
**Current Problem:**  
Tokens translate instantly across the 40-square board, making it difficult for players to track which tiles were traversed.  
**Desired Outcome:**  
The active token smoothly hops square-by-square along the perimeter path (150ms per square) with squash-and-stretch easing, highlighting passed squares.  
**Proposed Solution:**  
In `src/main.jsx` and `src/StreetPieces.jsx`, manage an interpolated animation state `animPos` that iterates from `oldPos` to `newPos` (wrapping at 40) using `requestAnimationFrame`, updating the SVG coordinates at each step.  
**Affected Files:** `src/main.jsx`, `src/StreetPieces.jsx`  
**Dependencies:** None  
**Acceptance Criteria:**  
1. Rolling a 7 causes the token to hop 7 distinct times along the board.
2. Passing *Home Base* triggers a +$200 pulse at the exact moment the token traverses tile 0.
3. In `prefers-reduced-motion: reduce`, token translates instantly without hopping.  
**Estimated Complexity:** Medium (4 hours)

---

### GAME-005: Floating Cash Transaction Delta VFX
**Category:** VFX / UI Feedback  
**Priority:** P1 (High)  
**Status:** Ready for Implementation  
**Evidence:** Playtest Session 1 & 3: Cash updates silently without visual confirmation.  
**Current Problem:**  
When rent is paid or cash collected, the number in the HUD changes abruptly without visual feedback.  
**Desired Outcome:**  
A floating numeric badge (`+$200` in electric lime or `-$150` in crimson red) drifts upward from the affected player's avatar card and fades over 1.2s.  
**Proposed Solution:**  
Create a lightweight React floating badge hook `useFloatingDelta` triggered whenever `player.cash` changes.  
**Affected Files:** `src/main.jsx`, `src/style.css`  
**Dependencies:** None  
**Acceptance Criteria:**  
1. Collecting rent displays a floating `+$[amount]` above the owner's crew card.
2. Paying rent displays a floating `-$[amount]` above the paying player's crew card.  
**Estimated Complexity:** Low (2 hours)

---

### GAME-006: Modular Decomposition of Monolithic `src/main.jsx`
**Category:** Engineering / Maintainability  
**Priority:** P1 (High)  
**Status:** Ready for Implementation  
**Evidence:** `src/main.jsx` contains 2,411 lines mixing state, sockets, modals, and rendering.  
**Desired Outcome:**  
Clean domain separation of board, action HUD, and socket listeners into separate modules under `src/components/`.  
**Implementation Guidance:**  
Extract into:
- `src/components/board/GameBoard.jsx` (Perimeter board, SVG city centerpiece, street tokens).
- `src/components/hud/ActionPanel.jsx` (Turn controls, buy/auction/jail states).
- `src/components/hud/CrewRoster.jsx` (Player standings, cash, badges).
- `src/hooks/useGameSocket.js` (Socket.IO event handling and reconnection).  
**Affected Files:** `src/main.jsx`, new components under `src/components/`  
**Dependencies:** None  
**Acceptance Criteria:**  
1. All existing 66 automated tests pass without modification.
2. `src/main.jsx` reduced to < 400 lines acting solely as root orchestrator.  
**Estimated Complexity:** Medium (6 hours)

---

### GAME-007: WCAG 2.2 AA ARIA and Landmark Accessibility Remediation
**Category:** Accessibility  
**Priority:** P2 (Medium)  
**Status:** Ready for Implementation  
**Evidence:** Axe-core scan flagged `aria-prohibited-attr` on `.die` and `landmark-unique` on asides (`evidence/responsive/report.json`).  
**Proposed Solution:**  
1. Add `role="img"` to all dice elements (`<div className="die" role="img" aria-label={`Die face ${value}`}>`).
2. Provide unique `aria-label` attributes to `.crew-sidebar` and `.action-sidebar`.  
**Affected Files:** `src/main.jsx`  
**Dependencies:** None  
**Acceptance Criteria:**  
1. Automated axe-core scan reports 0 violations for `aria-prohibited-attr` and `landmark-unique`.  
**Estimated Complexity:** Low (1 hour)
