# 04 — Verified Bug Report & Quality Assurance Defect Log

This document records all verified, reproducible defects identified through automated test harnesses, live browser interaction, and source code audit.

---

### BUG-001: Authentication Form Submission Does Not Automatically Advance to Main Lobby

**Severity:** High  
**Category:** UI / UX / Authentication  
**Environment:** All browsers, all viewports (Chromium, Firefox, WebKit on Desktop/Mobile)  
**Preconditions:** User is on the initial landing page (`https://spin-the-block.up.railway.app`).  

**Reproduction Steps:**
1. Click the "Create account" tab or "Sign in" tab under "OR SAVE YOUR REPUTATION".
2. Enter a valid username (min 3 chars) and password (min 12 chars).
3. Click the submit button: `Create your account` or `Sign in`.
4. Observe the screen after network request completes.

**Expected Result:**  
Upon successful authentication, the entry screen should automatically dismiss and navigate the player directly into the main game lobby.

**Actual Result:**  
The authentication request succeeds, but the player remains trapped on the `EntryPage`. The screen updates to display `WELCOME BACK, [USERNAME]. Own your corner of the city.` with an email verification form and an extra button labeled `Enter the city ->`. The player must click this secondary button to reach the lobby.

**Evidence:**  
- Screenshot: [`evidence/s5/03_after_signup_submission.png`](./evidence/s5/03_after_signup_submission.png)
- Screenshot: [`evidence/s5/04_lobby_authenticated.png`](./evidence/s5/04_lobby_authenticated.png)
- Code Reference: `src/LoginMaps.jsx:198-205` and `src/main.jsx:1363-1382`.

**Frequency:** Always (100% reproducible).  
**Suspected Cause:**  
In `src/LoginMaps.jsx`, the form submission handler invokes `authenticated(r)`:
```javascript
const r = await run("profile-" + mode, { username, password });
if (r) {
  authenticated(r);
  setPassword("");
}
```
However, in `src/main.jsx`, `authenticated()` only stores the credentials in `localStorage` and updates React state:
```javascript
const authenticated = (r) => {
  persist("stb-profile", r.token);
  setProfile(r.profile);
  setName(r.profile.name);
  persist("stb-name", r.profile.name);
};
```
It fails to call `enter()`, which sets `setEntry(false)`. Consequently, `entry` remains `true`, preventing `EntryPage` from unmounting.

**Suggested Fix:**  
Pass `enter` into `authenticated` or call `enter()` immediately inside `authenticated(r)` in `src/main.jsx`:
```javascript
const authenticated = (r) => {
  persist("stb-profile", r.token);
  setProfile(r.profile);
  setName(r.profile.name);
  persist("stb-name", r.profile.name);
  enter();
};
```

**Regression Test:**  
Playwright test: fill signup form, click `Create your account`, and assert `expect(page.getByRole("button", { name: "Create a private room" })).toBeVisible({ timeout: 3000 })`.

---

### BUG-002: Continuous $10 Auction Bids Indefinitely Reset Clock to 20 Seconds

**Severity:** Medium  
**Category:** Gameplay Balancing / Pacing  
**Environment:** Multiplayer / Solo with Bots, all platforms  
**Preconditions:** An unowned property is auctioned (via `Put it up for auction` or player skip).  

**Reproduction Steps:**
1. Land on an expensive unowned property (e.g. *Final Boss Estate*).
2. Click `Put it up for auction`.
3. Allow each player/bot to alternate bidding in minimum $10 increments.
4. Observe the remaining countdown timer.

**Expected Result:**  
The auction countdown should accelerate or decay on successive bids (e.g., 20s initial ➔ 10s ➔ 5s floor) to prevent pacing griefing and finalize the sale within a reasonable duration (<45s).

**Actual Result:**  
Every single bid resets the auction clock back to a full 20 seconds (`d.clock = 20`). With 4 competitive bidders raising bids in $10 steps, an auction can take 2 to 4 minutes of uninterrupted delay.

**Evidence:**  
- Log snippet from Session 2: `#52 to #69` remained in auction state for over 60 seconds with 18 consecutive resets (`evidence/s2/log.txt`).
- Screenshot: [`evidence/s2/idle_67.png`](./evidence/s2/idle_67.png).
- Code Reference: `server/game.js:880-893`.

**Frequency:** Always.  
**Suspected Cause:**  
In `server/game.js`:
```javascript
au.highBid = a.amount;
au.highBidder = id;
au.clock = 20; // Hardcoded reset to 20 seconds on every bid
```

**Suggested Fix:**  
Implement dynamic decaying countdown:
```javascript
au.highBid = a.amount;
au.highBidder = id;
au.clock = Math.max(5, Math.min(au.clock, 10)); // Decays to 10s max, 5s floor after first bid
```

**Regression Test:**  
Unit test in `tests/game.test.js`: verify that placing three consecutive bids drops `au.clock` to <= 10 seconds.

---

### BUG-003: Property Inspection Card Displaces Primary Turn Action Panel on Small Mobile Screens

**Severity:** Medium  
**Category:** UI / Responsive Layout  
**Environment:** Viewports <= 390px width (iPhone 14, Android Galaxy S-series)  
**Preconditions:** Player is currently taking an active turn on mobile.  

**Reproduction Steps:**
1. Load match table in 360×640 or 390×844 viewport.
2. It is the player's turn to roll or buy a property.
3. Tap on any property square on the board to inspect its rent values.
4. Observe the viewport scroll position.

**Expected Result:**  
The property details card should appear as an accessible bottom-sheet overlay or modal without displacing the active turn controls (`Roll the dice`, `Buy`, `End turn`).

**Actual Result:**  
The inspected square card renders inline below the board, pushing the active turn action container down to `y = 1,800px+`. The player cannot see their action buttons without scrolling past multiple full-height screen sections.

**Evidence:**  
- Screenshot: [`evidence/responsive/mobile_390x844_3_game.png`](./evidence/responsive/mobile_390x844_3_game.png).
- Responsive measurement: `gamePageHeight: 2358px` on 390×844.

**Frequency:** Always on mobile viewports.  
**Suspected Cause:**  
In `src/style.css`, the `.layout-grid` stacks columns into a single vertical flex container on mobile (`flex-direction: column`), placing `.board-view` first, `.property-inspector` second, and `.action-panel` third.

**Suggested Fix:**  
Introduce a sticky floating action bar (`position: sticky; bottom: 0; z-index: 100;`) for `.action-panel-mobile` when the player is on active turn, or convert the property inspector into a dismissible slide-up drawer.

**Regression Test:**  
Playwright assertion on 390×844: verify that `page.getByRole("button", { name: "Roll the dice" })` is within the initial viewport bounds (`boundingBox().y < 844`).

---

### BUG-004: ARIA Prohibited Attribute Violation on Board Dice Elements

**Severity:** Low  
**Category:** Accessibility (WCAG 2.2 AA)  
**Environment:** All browsers  
**Preconditions:** Match board is rendered.  

**Reproduction Steps:**
1. Navigate to an active match.
2. Run axe-core accessibility audit on the DOM.
3. Inspect `.board-dice > .die`.

**Expected Result:**  
Interactive and graphic elements comply with WAI-ARIA 1.2 rules without prohibited attributes.

**Actual Result:**  
Axe-core flags 4 nodes with `aria-prohibited-attr`:
`Elements must only use permitted ARIA attributes: .board-dice > .die[aria-label="Dice 1"]`.

**Evidence:**  
- Axe-core JSON output: `evidence/responsive/report.json` line 34:
  `{"id": "aria-prohibited-attr", "impact": "serious", "nodes": 4}`.
- Code Reference: `src/main.jsx:480-495`.

**Frequency:** Always.  
**Suspected Cause:**  
`div.die` has an `aria-label` without a supporting semantic role (e.g. `role="img"`). In HTML5/ARIA, generic `div` containers cannot have accessible names without a widget or landmark role.

**Suggested Fix:**  
Add `role="img"` to the `.die` container:
```jsx
<div className="die" role="img" aria-label={`Die showing ${value}`}>
```

**Regression Test:**  
Automated axe-core scan in E2E tests: zero violations for rule `aria-prohibited-attr`.

---

### BUG-005: Duplicate Landmark Aside Elements Without Unique Labels

**Severity:** Low  
**Category:** Accessibility (WCAG 2.2 AA)  
**Environment:** Screen readers (VoiceOver, NVDA, JAWS)  
**Preconditions:** Match table is loaded.  

**Reproduction Steps:**
1. Navigate to the game table.
2. Inspect landmark regions using screen reader or browser accessibility tree.

**Expected Result:**  
Every `<aside>` tag on the page must have a distinct, unique accessible name via `aria-label` or `aria-labelledby`.

**Actual Result:**  
Multiple `<aside>` containers (`.crew-sidebar` and `.action-sidebar`) are unlabelled or share identical roles, causing confusion for screen-reader users attempting landmark navigation.

**Evidence:**  
- Axe report: `evidence/responsive/report.json`: `{"id": "landmark-unique", "impact": "moderate"}`.

**Frequency:** Always.  
**Suggested Fix:**  
Add distinct labels:
```jsx
<aside className="crew-sidebar" aria-label="Crew roster and player standings">
<aside className="action-sidebar" aria-label="Turn actions and turf controls">
```

**Regression Test:**  
Axe check passes with zero `landmark-unique` violations.
