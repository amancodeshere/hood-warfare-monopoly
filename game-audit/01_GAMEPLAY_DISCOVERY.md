# 01 — Gameplay Discovery & System Architecture Report

**Game Title:** Spin the Block (Hood Warfare Monopoly)  
**Live Production URL:** [https://spin-the-block.up.railway.app](https://spin-the-block.up.railway.app)  
**Inspection Date:** 15 October 2026  
**Auditor:** Multidisciplinary Video Game Audit Team  
**Evaluation Methodology:** Direct browser play (Playwright/Chromium on Node 25), full-stack repository code analysis (`server/`, `src/`, `shared/`, `tests/`), network tracing, performance profiling, axe-core WCAG analysis, and multi-session concurrency testing.

---

## 1. Executive Product Overview

*Spin the Block* is an original web-based multiplayer property strategy board game fused with real-time tactical mechanics. While inspired by classic roll-and-move financial board games (e.g., *Monopoly*, *Richup*), it reframes the genre around modern urban street culture, featuring custom isometric SVG cityscapes, a "no quiet corners" risk economy, Oppa Stoppa wealth redistributions, weighted street roulette wheels, and a signature feature: **a real-time, first-person 2.5D corridor raycaster shootout to settle unaffordable rent debts**.

---

## 2. Core Game Loop & Turn Mechanics

### 2.1 Game Lifecycle
```
[Landing Entry]
      │ (Guest / Sign-in / Create Account)
      ▼
[Main Lobby] ─── Configure (Map, Limit, Rules, Bots, Teams)
      │
      ▼
[Active Match Table]
      │
      ├── Turn 1..N ──────────────────────────────────────┐
      │     │                                             │
      │     ├─► Roll Dice (Cryptographic 11-way total)    │
      │     ├─► Move Token along 40-Square Perimeter     │
      │     ├─► Resolve Tile Event                        │
      │     │     ├─ Unowned Property: Buy or Auction     │
      │     │     ├─ Rival Property: Pay Rent or Shootout │
      │     │     ├─ Oppa Stoppa: 1–10% Cash to Plot      │
      │     │     ├─ Community Plot: Collect Accumulated  │
      │     │     ├─ Street Roulette: Spin Wheel Event    │
      │     │     ├─ Street Luck: Draw Action Card        │
      │     │     └─ County Jail: Wait, Bail, or Roll     │
      │     ├─► Manage Turf (Upgrade, Sell, Mortgage)     │
      │     ├─► Negotiate Trades (Atomic multi-asset)     │
      │     └─► End Turn                                  │
      │                                                   │
      └───────────────────────────────────────────────────┘
      │
      ▼
[Victory / Match Settlement]
  (Last Crew Standing or Round Cap Net Worth Check)
```

### 2.2 Turn Sequencing & The Turn Clock
- **Turn Flow:** Rolling `[roll]` ➔ Event Resolution `[buy / auction / rent / stoppa / roulette / card / jail]` ➔ Management & End `[end]`.
- **Clock Mechanics:**
  - Standard turns combine a free thinking timer (default **90 seconds**) with a persistent player **reserve pool** (default 60s, replenishing up to +15s per manual completed turn).
  - Debt state grants an extra **90-second extension**.
  - Other seated players can generously donate **+1 minute** once per turn.
  - Two consecutive idle timeouts result in automatic crew elimination (`afk >= 2`).
  - Timers automatically freeze when all human players disconnect.

---

## 3. Economy & Board Geometry

The board is composed of a continuous **40-square perimeter grid** enclosing an isometric central city district with dynamic CSS-animated street traffic.

### 3.1 District & Square Breakdown
- **8 Color Districts (22 Properties):**
  1. *The Bodega Belt (Brown):* Auntie’s Bodega ($60), Broke Boy Blvd ($80) — Build: $50
  2. *Caught Lackin (Cyan):* No Cap Cuts ($100), Caught Lackin Lane ($120), Backdoor Alley ($140) — Build: $50
  3. *The Trenches (Pink):* The Trenches ($160), Trap House Towers ($180), Rent Due Lil Bro ($200) — Build: $100
  4. *Hit a Lick (Orange):* Cookout Corner ($220), Hit a Lick Heights ($240), Chain Snatch City ($260) — Build: $100
  5. *Drip District (Red):* Studio 808 ($280), Main Character Mall ($300), Drip Check Drive ($320) — Build: $150
  6. *Big Steppers (Yellow):* No Snitch Studios ($340), Side Quest Square ($360), Big Stepper Block ($380) — Build: $150
  7. *Motion Mansion (Green):* Get Money Gardens ($400), Don’t Fold Flats ($420), Motion Mansion ($440) — Build: $200
  8. *Final Boss Row (Dark Blue):* Rich Auntie Row ($460), Final Boss Estate ($500) — Build: $200
- **4 Transit Routes:** Spin the Bus, Slide Thru Station, Lowrider Line, Escape Route Express ($200 each). Rent doubles with each route held: $25 ➔ $50 ➔ $100 ➔ $200.
- **2 Utilities:** The Power Plug, The Water Plug ($150 each). Rent is $4× dice total (1 plug) or $10× dice total (both plugs).
- **Special Corner Spaces:**
  - *Home Base (Pos 0):* Passing awards $200; landing awards $200.
  - *County Jail (Pos 10):* "Just Visiting" for passers-by; inmates serve up to 2 turns, can post $100 bail, use escape cards, or roll doubles.
  - *Community Plot (Pos 20):* Accumulates taxes, fines, and all Oppa Stoppa losses. When payouts are enabled, landing on it sweeps the pot.
  - *Police Raid (Pos 30):* Sends token directly to County Jail.
- **3 Oppa Stoppas (Pos 7, 22, 36):**
  - Triggers a 10-slice spinning dial with uniform 1% to 10% cash deduction.
  - Extracted money is transferred directly into the Community Plot.
- **2 Street Roulette Stops (Pos 28, 38):**
  - Weighted wheel: Jackpot $900 (1/12), Jail (2/12), Payday $300 (3/12), Escape Card (2/12), Bust -$150 (2/12), Big Bag $500 (2/12).
- **Street Luck (Chance Cards):** 8 event cards including immediate cash prizes, street tax repairs, and escape cards.

### 3.2 Property Upgrades & Mortgages
- **Monopoly Rule:** Owning all properties in a district doubles base unimproved rent.
- **Building:** Requires owning the full district set. Up to 4 businesses (houses) and 1 hotel (level 5) per lot.
- **Even Building Enforced:** Must build and sell evenly across all properties in a district set.
- **Mortgage Economics:** Mortgaging pays 50% face value to player; unmortgaging requires 55% repayment (10% interest penalty). Mortgaged properties collect $0 rent.

---

## 4. Distinctive Feature: The First-Person Rent Duel (Shootout)

Unlike standard board games where inability to pay rent results in immediate bankruptcy and surrender, *Spin the Block* introduces a real-time tactical trial:
- **Condition:** Challenger lands on a rival property with less cash than the rent due.
- **Mechanic:** Challenger can choose `Challenge to a shootout`.
- **Arena Engine:** Authoritative 2.5D DDA raycaster corridor rendered via HTML5 `<canvas>` (`src/arenaRenderer.js`).
- **Phase 1: Ready Up (25s max):** Both players must confirm ready; countdown initiates 3... 2... 1...
- **Phase 2: Live Combat (30s limit):**
  - Server simulation runs at **20 Hz**, compact state broadcasts at **10 Hz**, canvas renders at display refresh rate (60–144 Hz).
  - **Weapons & Damage:** Handgun with 6-round magazine; body shot = **25 damage**, headshot = **40 damage**, close-range directional kick = **30 damage**.
  - **Cooldowns & Reloads:** 280ms shot cooldown, 1.1s reload duration (`R` key or button).
  - **Controls:** Desktop uses WASD/ZQSD movement, mouse capture / drag / arrow keys to aim, click/Enter to fire, Space to kick. Mobile renders full on-screen directional buttons and fire/kick touch buttons.
  - **Cover:** Solid geometric pillars and corridor alcoves block raycasted ballistic paths.
- **Outcomes:**
  - First to reach 0 HP loses immediately.
  - If 30-second timer expires, highest remaining HP wins.
  - Exact tie protects the defending landlord.
  - **Challenger Wins:** Entire rent debt is completely wiped! No cash is paid to landlord, challenger remains alive on the board.
  - **Landlord Wins:** Challenger is eliminated from the game; all their cash and properties transfer to the landlord (or living ally).

---

## 5. Multiplayer Architecture & Room Management

### 5.1 Room Coordination & Authority
- **Authority Model:** 100% server-authoritative (`server/game.js`, `server/index.js`, `server/fps.js`). The client cannot dictate position, cash, rolls, card effects, or combat hits.
- **Transport:** Socket.IO over WebSocket with JSON state views.
- **Capacity:** 2 to 8 player seats per room.
- **Bots:** Single-player solo mode against 1 to 7 heuristic bots (`fpsBot`, `defaultAction`). Host can autofill empty seats with bots.
- **Teams Mode:** Up to 4 teams (Eastside, Sunset, Northside, After Hours). Teammates pay no rent to each other, share district monopolies for building, use filtered team-only chat, and inherit surviving assets upon elimination.
- **Atomic Trading:** Any active player can negotiate off-turn; multi-asset trades (properties + cash + escape cards) execute atomically after server verification.

### 5.2 Persistence & Session Restoration
- Atomic snapshotting to `data/rooms.json` and `data/profiles.json` with temporary file swapping (`.tmp` -> rename).
- Opaque UUID tokens stored in browser `localStorage` (`stb-seat`, `stb-profile`).
- Page refresh or temporary network drops automatically reconnect players to their active seat, room code, and exact turn clock.

---

## 6. Observed Features Inventory & Completeness Status

| Feature Family | Implementation State | Verification Status | Notes |
|---|---|---|---|
| Landing & Authentication | Guest, Username/Password Account | Verified Live | Password min 12 chars, salted scrypt hashes. |
| Email Verification | Code challenge (15m expiry, 5 tries) | Code Verified | Requires Railway provider (Brevo/Resend). |
| City Maps | 6 maps (2 free, 4 verified/custom) | Verified Live | *The Trenches*, *Night Shift* active out of box. |
| Map Studio | In-browser 40-square editor | Code Verified | Locked until email verified. |
| Board & Isometric Art | Original code-authored SVG | Verified Live | Animated traffic, pausing toggle, responsive scaling. |
| Movement & Dice | 11-way equal total distribution | Verified Live | Cryptographic `randomInt`; doubles repeat up to 3x. |
| Property Economics | 22 lots, 4 transit, 2 utilities | Verified Live | Full district double rent, 4 houses + 1 hotel. |
| Auctions | 20s countdown, open to all alive | Verified Live | Auto-pass option, $10 minimum increment. |
| Oppa Stoppa | 1–10% cash to Community Plot | Verified Live | Animated 10-slice dial, settled once per turn. |
| Community Plot | Pot accumulation & sweep | Verified Live | Configurable on/off in house rules. |
| Street Roulette | 6-outcome weighted wheel | Verified Live | Jackpot, Jail, Payday, Escape, Bust, Bag. |
| First-Person Shootout | 2.5D corridor raycaster | Verified Live | Headshots, kicks, cover, 30s duel, touch controls. |
| Trading & Gifts | Atomic bilateral multi-asset | Verified Live | Property, cash, escape cards, debt fairness checks. |
| Teams Mode | 4 teams, shared sets & chat | Verified Live | Rent exemption, asset inheritance. |
| Profiles & Respect | Friend codes, respect progression | Verified Live | 6 token cosmetics unlocked with earned respect. |
| Audio System | Web Audio API synthesizer | Verified Live | Procedural tone oscillators for clicks, dice, shots. |
