# 09 — Quality Assurance & Validation Plan

This document establishes the test strategy, automated verification pipeline, and release-readiness criteria for *Spin the Block*.

---

## 1. Multi-Tier Testing Strategy

```
┌────────────────────────────────────────────────────────┐
│               End-to-End Browser Tests                 │
│   Playwright (Multi-User Sessions, Viewports, A11y)    │
├────────────────────────────────────────────────────────┤
│             Integration & Multiplayer Tests            │
│   Socket.IO Server Authority, Reconnect, Persistence   │
├────────────────────────────────────────────────────────┤
│                Core Game Engine Tests                  │
│   Pure Node Tests (`tests/*.test.js`) — Deterministic  │
└────────────────────────────────────────────────────────┘
```

---

## 2. Automated Test Matrix

### 2.1 Pure Game Engine Unit Tests (`tests/*.test.js`)
All game rules must execute deterministically without network overhead:
- **Dice Probabilities:** Verify uniform 11-way total distribution (2–12 at 1/11 each) over 10,000 iterations.
- **Cash Conservation:** Assert that total currency in circulation equals `(Players × StartingCash) + PassedHomeBase - OppaStoppaLosses + PlotPayouts`.
- **Monopoly Validation:** Full color sets must double unimproved base rent; mortgages on any district property disable building across the entire set.
- **Building Rules:** Enforce even building and selling across district properties; hotel cap at level 5.
- **Mortgage Math:** Assert 50% cash payout on mortgage; 55% cash required for redemption.
- **First-Person Shootout Mechanics:**
  - Enforce bounds: x (0 to 1), y (0 to 1).
  - Enforce magazine capacity: 6 shots max before reload.
  - Enforce cooldown: 280ms minimum between shots.
  - Assert headshot (40 damage) vs body shot (25 damage) hitboxes.
  - Assert exact ties protect the defending landlord.

### 2.2 Integration & Persistence Tests (`tests/multiplayer.test.js`)
- **Session Re-attachment:** Assert that an opaque `stb-seat` bearer token reconnects a disconnected browser context to its exact room, cash, and seat.
- **Persistence Recovery:** Kill the Node server process (`SIGTERM`), restart it, and assert that all active rooms restore from `data/rooms.json`.
- **Multi-Player Action Isolation:** Assert that out-of-turn actions emitted over WebSocket are rejected with error code `NOT_YOUR_TURN`.

### 2.3 Playwright End-to-End Scenarios (`tests/e2e/`)
1. **Scenario 1: Happy Path First-Time Match (`table.spec.js`):**
   - Guest entry ➔ Street name input ➔ Create private room ➔ Friend joins via URL `/?room=CODE` ➔ Host starts match ➔ Both roll, buy property, and pass turn.
2. **Scenario 2: Rent Shootout Resolution (`fps.spec.js`):**
   - Challenger lands on rival property with $0 cash ➔ Clicks `Challenge to a shootout` ➔ Both ready up ➔ 3s countdown ➔ Fire projectiles ➔ Winner wipes rent; loser eliminated.
3. **Scenario 3: Multi-Viewport Responsive Integrity:**
   - Run across Desktop (1920×1080), Laptop (1366×768), Tablet (768×1024), Mobile (390×844), Small Mobile (360×640). Assert horizontal overflow = 0px.
4. **Scenario 4: Automated Accessibility Audit:**
   - Execute `axe.run()` on landing, lobby, table, and modal dialogs. Target: 0 violations for WCAG 2.2 AA.

---

## 3. Regression Checklist (Pre-Deployment Gate)

Before any release build is approved for production deployment, every item on this checklist must pass:

- [ ] **Lobby & Auth:**
  - [ ] Guest play works without registration.
  - [ ] Account creation navigates directly into the lobby (`BUG-001` fix).
  - [ ] Room code inputs enforce uppercase 6-character length and reject invalid rooms.
- [ ] **Perimeter Board & Dice:**
  - [ ] Dice total is cryptographically random (2–12).
  - [ ] Doubles award an additional roll.
  - [ ] 3 consecutive doubles send the token to County Jail.
  - [ ] Passing Home Base pays $200; landing on Home Base pays $200.
- [ ] **Property Transactions:**
  - [ ] Unowned properties offer Buy vs Auction.
  - [ ] Auctions decay timer dynamically on consecutive bids (`BUG-002` fix).
  - [ ] Mortgaging awards 50% face value; unmortgaging costs 55%.
  - [ ] Building requires owning the full color district set.
- [ ] **Special Tiles:**
  - [ ] Oppa Stoppa spins 1–10% cash into the Community Plot.
  - [ ] Landing on Community Plot sweeps the pot (when enabled).
  - [ ] Street Roulette wheel executes 6 weighted outcomes accurately.
- [ ] **The Shootout (FPS Duel):**
  - [ ] Triggers only on unaffordable rival rent.
  - [ ] Both players must ready up within 25 seconds.
  - [ ] 30-second live combat window.
  - [ ] Challenger victory wipes debt completely.
  - [ ] Landlord victory eliminates challenger and transfers all assets.
- [ ] **Responsive & Mobile:**
  - [ ] 0px horizontal scroll on 360×640 mobile viewports.
  - [ ] Turn action buttons remain pinned and accessible at bottom of screen (`BUG-003` fix).
- [ ] **Reliability & Security:**
  - [ ] Reconnecting restores game session seamlessly.
  - [ ] XSS payloads in player names are safely escaped.
  - [ ] Socket rate limiter caps abusive input spamming.

---

## 4. Release-Readiness Criteria

A release candidate is deemed **Commercial Grade Ready** when:
1. **Zero P0 / P1 Defects:** All critical usability, gameplay stalling, and layout bugs are resolved.
2. **Automated Coverage:** Node engine tests achieve >= 95% branch coverage.
3. **E2E Stability:** All 9 Playwright browser tests pass consistently across 5 consecutive runs with zero flakes.
4. **Accessibility:** Automated axe-core score reports 0 WCAG 2.2 AA violations.
5. **Performance:** Initial load time remains under 2.5s on desktop and 4.0s on 3G mobile networks.
