# 02 — Playtest Report: Multi-Session Gameplay Audit

**Audit Target:** Spin the Block (`https://spin-the-block.up.railway.app`)  
**Test Harness:** Automated and Interactive Playwright Chromium Engine, multi-context browser instances, network interceptors, and simulated touch devices.  
**Evidence Directory:** [`game-audit/evidence/`](./evidence/)  

---

## 1. Playtest Sessions Summary

| Session | Playstyle Focus | Mode & Opponents | Turn Count / Duration | Primary Investigation | Key Outcome |
|---|---|---|---|---|---|
| **Session 1** | First-Time Player | Solo vs 3 Bots (The Trenches) | 60 turns / ~150s | Onboarding, discoverability, turn cycle, Oppa Stoppa | Smooth onboarding; modal overlay button label confusion |
| **Session 2** | Competitive Player | Solo vs 2 Bots, Limit=10 | 70 turns / ~160s | Monopolies, aggressive buying, auction pacing | Solid auction system; 20s clock reset on bids can stall |
| **Session 3** | Casual Player | Solo vs 1 Bot, Limit=10 (Pass All) | 75 turns / ~140s | Pacing, visual feedback, event wheels, surrender | Fun event wheels; Community Plot pot accumulation works |
| **Session 4** | Exploratory / QA | Multi-Context & Hostile Inputs | 45 test actions / ~180s | XSS, empty inputs, reload, back/forward, disconnects | High security resilience; seat recovery rock solid |
| **Session 5** | Returning Player | Registered Account & Solo 1v1 | Full lifecycle / ~210s | Profiles, cosmetic unlocks, trade tab, Shootout arena | Registered account lobby transition bug; raycaster duel verified |

---

## 2. Chronological Playtest Session Logs

### Session 1: First-Time Player (Learnability & Onboarding)
- **Goal:** Experience the first 10 minutes as a brand-new player entering the live URL.
- **Actions:**
  1. Loaded `https://spin-the-block.up.railway.app` at 1920×1080.
  2. Clicked `Continue as guest`. Entered street name `"Tester_s1"`.
  3. Configured 3 bot opponents on default map (*The Trenches*). Clicked `Play solo vs bots`.
  4. Rolled dice on Turn 0 (`rolled 2` ➔ landed on *Auntie's Bodega*).
  5. Inspected action panel: `Claim this block ($60)` vs `Pass on this block`. Clicked `Claim this block`.
  6. Action panel updated to `End your turn`. Clicked `End your turn`.
  7. Watched automated turns for *Remy (Eastside Royals)*, *Jax (Sunset Syndicate)*, and *Nova (Harbor Union)*.
  8. Landed on *Oppa Stoppa* on Turn 34.
- **Observations & Friction:**
  - *Positive:* First impression is striking. The dark forest green aesthetic (`#171b19`), isometric SVG city with rolling traffic, and condensed typography immediately set an authentic urban tone.
  - *Friction:* When landing on *Oppa Stoppa*, an interactive modal popup appears over the board with an animated dial. The dial spun to 9%, computing "$135 to the Plot (9% of $1,500)". The button read `"Pay the Stoppa"`. Until clicked, the main action panel on the right continues displaying generic informational text (`Caught lackin. Oppa Stoppa is eyeing your pockets.`), causing dual-focus confusion between the center modal and the right sidebar.
- **Evidence:** `evidence/s1/00_start.png`, `evidence/s1/03_game_start.png`, `evidence/s1/step_001_buy.png`, `evidence/s1/log.txt`.
- **Errors:** 0 console errors, 0 network failures.

---

### Session 2: Competitive Player (Strategy, Auctions & Balancing)
- **Goal:** Evaluate strategic depth, auction competitiveness, and capital management.
- **Actions:**
  1. Configured match with 2 bots (*Remy* and *Jax*), setting round cap `LIMIT=10`.
  2. Aggressively purchased every landed property (*Auntie's Bodega*, *No Cap Cuts*, *Backdoor Alley*, *Slide Thru Station*).
  3. When cash depleted below property cost on *Motion Mansion ($440)*, the game correctly prevented purchase and triggered the table auction.
  4. Participated in the 20-second bidding war: *Remy* bid $190, *Tester_s2* passed, *Jax* passed.
- **Observations & Friction:**
  - *Positive:* Auctions create intense micro-tension. Every player gets a 20-second bidding window. Passing removes that player from the current auction without blocking other participants.
  - *Friction:* Whenever any bot or human places a bid, the 20-second timer resets back to 20s (`d.clock = 20`). With 4+ competitive bidders bidding in small $10 increments, an auction can take 90+ seconds, significantly disrupting the rhythm of turn flow.
- **Evidence:** `evidence/s2/00_start.png`, `evidence/s2/step_012_buy.png`, `evidence/s2/idle_67.png` (showing Motion Mansion auction).

---

### Session 3: Casual Player (Pacing, Wheel Spins & Enjoyment)
- **Goal:** Test casual, passive play—bypassing property buys, observing event wheels, roulette odds, and Community Plot sweeps.
- **Actions:**
  1. Configured 1 bot opponent, selecting `Winner takes all · Default`.
  2. Intentionally skipped purchasing all landed properties, forcing them to auction or pass.
  3. Landed on *Street Roulette* (Pos 28). Watched 6-slice wheel spin and land on `Payday · Collect $300`.
  4. Landed on *Oppa Stoppa* twice, depositing $135 and $120 into the Community Plot.
  5. Bot *Remy* landed on *Community Plot* (Pos 20) and collected the accumulated $255 jackpot.
- **Observations & Friction:**
  - *Positive:* The animations on the Roulette wheel and Oppa Stoppa dial are snappy and visually clear. The pot counter directly on tile 20 (`Community Plot $255`) updates in real time.
  - *Friction:* When another player is spinning a wheel or in an auction, the inactive player's UI is locked behind a dark scrim overlay. While it informs the user ("Watching Remy's spin"), inactive players cannot inspect other squares or review trade proposals during someone else's modal event.
- **Evidence:** `evidence/s3/idle_16.png`, `evidence/s3/video/`.

---

### Session 4: Exploratory & QA Stress Testing (Edge Cases & Boundaries)
- **Goal:** Probe client/server trust boundaries, rapid input spamming, disconnect recovery, XSS, and layout scaling.
- **Executed Test Cases & Empirical Results:**
  1. **XSS Injection in Street Name:** Input `<img src=x onerror=alert(1)>WWWWWWWWWWWW`.  
     *Result:* Handled securely. Client HTML input enforces `maxLength={20}`. Server sanitizes and escapes all characters. Rendered safely as plain text; zero JavaScript execution.
  2. **Empty Street Name Submission:** Left name field blank.  
     *Result:* Server auto-assigned default name `"New crew"`. Game initialized without errors.
  3. **Invalid Room Code Join:** Attempted to join room `"ZZZZZZ"`.  
     *Result:* Immediate server rejection toast: `"That room does not exist or has expired."`
  4. **Rapid-Fire Click Spamming:** Emitted 8 rapid clicks on `Roll the dice` within 100ms.  
     *Result:* Only 1 dice roll event executed (`"rolled 11"`). Server state machine correctly locked phase to `"buy"`, rejecting duplicate actions.
  5. **Page Reload & State Restoration:** Reloaded browser tab mid-turn (`F5`).  
     *Result:* Local storage seat token (`stb-seat`) seamlessly recovered player identity. Room code `ROOM 84C886`, board tokens, property badges, and turn timer resumed without dropping the game.
  6. **Network Sever & Offline Recovery:** Set browser offline (`net::ERR_INTERNET_DISCONNECTED`) for 4 seconds, then restored connection.  
     *Result:* Topbar status pill switched from green `CONNECTED` to yellow `RECONNECTING`. Upon reconnection, socket re-established within 800ms and returned to `CONNECTED`.
  7. **Multiplayer Split-Context Isolation:** Hosted private room `BCE0FA` in Context A (`HostH`). Joined from Context B (`GuestG`).  
     *Result:* Guest could not roll dice on Host's turn. When Host was disconnected for 6s, Guest's UI cleanly indicated Host disconnect while keeping room state intact.
- **Evidence:** `evidence/s4/T1_hostile_name_lobby.png`, `evidence/s4/T4_after_rapid_roll.png`, `evidence/s4/T5_offline.png`, `evidence/s4/T8_guest_lobby.png`, `evidence/s4/results.json`.

---

### Session 5: Returning Player & Deep Systems Audit
- **Goal:** Audit registered account creation, profile tabs, cosmetic unlock systems, house rules configuration, trade modal, and the First-Person Shootout arena.
- **Actions & Discoveries:**
  1. **Registration & Entry Flaw:** Created registered account `og_boss_3d3l`. Submitted form.  
     *Finding:* Submitting the form successfully authenticated the profile on the server, but the UI stayed on the Entry screen presenting `"WELCOME BACK, OG_BOSS_3D3L"` and requiring an extra click on `"Enter the city ->"`.
  2. **Profile & Cosmetics:** Inspected *Looks* tab in the profile modal. Token customisation features 6 unlockable avatars (`Crew colors`, `Chain Snatcher`, `Lowrider Legend`, `Block Royalty`, `Ghost Mode`, `Final Boss`) unlocked at 0, 0, 5, 15, 30, and 50 respect points. Respect is earned exclusively through completed matches (Online win = 10, Solo win = 2), preventing pay-to-win mechanics.
  3. **In-Game Trading:** Opened the *Trade* sidebar tab. Tested bilateral asset selection: properties, cash sliders, and escape cards. The UI displays an atomic proposal summary with clear partner selection radios.
  4. **The Arena Shootout (Live Raycaster Audit):** Loaded test fixture `fps` with seats `fps-ace` and `fps-rival`.
     - *Visual Presentation:* 2.5D DDA raycaster corridor with gray walls, black outlines, red handgun in bottom right, pixelated rival figure holding weapon, and center reticle.
     - *Controls:* Movement WASD, space kick, R reload, mouse capture or on-screen directional buttons for touch.
     - *Combat Feel:* 6-round magazine with visible ballistic projectile trajectories. Hitting rival's head dealt 40 damage; body dealt 25 damage. Kicking at point-blank range dealt 30 damage. Zero client damage authority—all hitboxes evaluated on server.
- **Evidence:** `evidence/s5/05_auth_lobby_main.png`, `evidence/s5/06_profile_dialog.png`, `evidence/s5/07_profile_looks.png`, `evidence/s5/08_room_settings_dialog.png`, `evidence/s5/13_tab_trade.png`, `evidence/duel/arena-desktop.png`, `evidence/duel/arena-mobile.png`.

---

## 3. Responsive Screen Configuration Audit

The game was tested across all five mandatory device viewports:

| Viewport Configuration | Dimensions | Device Category | Load Time | Layout Overflow | Usability & Visual Verdict |
|---|---|---|---|---|---|
| **Desktop Ultra** | 1920 × 1080 | Desktop Monitor | 4,132 ms | 0 px horizontal overflow | **Optimal.** Central isometric board, left crew roster, right action HUD all visible without scrolling. |
| **Laptop Standard** | 1366 × 768 | Laptop Screen | 4,743 ms | 0 px horizontal overflow | **Good.** Action buttons and board fit comfortably. Bottom footer links occasionally clipped by taskbar. |
| **Tablet Portrait** | 768 × 1024 | iPad / Tablet | 4,476 ms | 0 px horizontal overflow | **Acceptable.** Board scales down; right HUD wraps underneath. Requires vertical scrolling to review properties. |
| **Modern Mobile** | 390 × 844 | iPhone 14 / Pixel | 4,189 ms | 0 px horizontal overflow | **Passable but dense.** Board requires horizontal panning or downscaling. Turn actions pinned at top. |
| **Small Mobile** | 360 × 640 | Galaxy S-series / Budget | 4,692 ms | 0 px horizontal overflow | **Cramped.** Text size on square prices ($60, $120) drops to 9px. Tap targets on board squares under 24px. |

### Visual Evidence Cross-References:
- Desktop: [`evidence/responsive/desktop_1920x1080_3_game.png`](./evidence/responsive/desktop_1920x1080_3_game.png)
- Laptop: [`evidence/responsive/laptop_1366x768_3_game.png`](./evidence/responsive/laptop_1366x768_3_game.png)
- Tablet: [`evidence/responsive/tablet_768x1024_3_game.png`](./evidence/responsive/tablet_768x1024_3_game.png)
- Mobile: [`evidence/responsive/mobile_390x844_3_game.png`](./evidence/responsive/mobile_390x844_3_game.png)
- Small Mobile: [`evidence/responsive/small_360x640_3_game.png`](./evidence/responsive/small_360x640_3_game.png)
