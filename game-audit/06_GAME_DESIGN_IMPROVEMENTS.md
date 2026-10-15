# 06 — Game Design Improvements & Balance Blueprint

This document details systemic gameplay rebalancing, pacing adjustments, and strategic mechanics enhancements designed to elevate *Spin the Block* from a casual web game into a deeply engaging competitive strategy title.

---

## 1. Pacing & Time-To-Complete (TTC) Architecture

### 1.1 The Stalling Problem in "Winner Takes All"
- **Observation:** In classic *Winner takes all* mode, 4 experienced players frequently reach an equilibrium where 2 players control opposing halves of the board. With rent shootouts wiping debts on upsets, games can exceed 60+ minutes, causing player fatigue and dropouts.
- **Root Cause:** Money injection from *Home Base* (+$200/lap) and *Roulette Paydays* ($300) outpaces net property burn until multi-house monopolies are constructed.

### 1.2 Proposed Systemic Solution: Escalating Turf Taxes (Late-Game Inflation)
- **Mechanic Rule:** Starting at **Round 15**, the city enacts the "City Heat Ordinance":
  - Passing *Home Base* bonus decays by $25 every 5 rounds (Round 15: $175, Round 20: $150, Round 25: $125, Round 30+: $100).
  - *Flex Tax* and property maintenance fines scale up by +20% every 5 rounds.
- **Player-Facing Impact:** Natural deflation forces decisive trading, building, or shootouts without arbitrarily killing players. Matches naturally resolve between 25 and 35 rounds.
- **UI Communication:** Top banner updates with an amber city badge: `CITY HEAT LEVEL 2: PASS HOME BASE $150 · TAXES +20%`.

---

## 2. Dynamic Auction Acceleration System

### 2.1 The Issue
As verified in `BUG-002`, the auction timer currently resets to 20 seconds on every bid (`au.clock = 20`), allowing players to drag out auctions for several minutes through incremental $10 raises.

### 2.2 The Solution: Fast-Gavel Countdown
- **Rules:**
  1. Initial auction opening countdown: **15 seconds**.
  2. Bids placed with >5 seconds remaining reduce the clock to `Math.min(currentClock, 8)`.
  3. Bids placed with <5 seconds remaining ("sniping") grant a short buffer of **+4 seconds**, capped at 6 seconds maximum.
  4. Each player has a single `Pass` button; clicking Pass locks the player out of that specific auction permanently. When all rivals pass, the auction closes immediately without waiting for the timer.
- **Example Scenario:**
  - *Motion Mansion ($440)* auctioned.
  - Player A bids $100 (clock: 8s).
  - Player B bids $150 (clock: 8s).
  - Player C clicks `Pass`.
  - At 2s, Player A bids $200 (clock extends to 6s).
  - Player B passes. Auction immediately awards property to Player A for $200. Total elapsed time: 18 seconds.

---

## 3. Utility Monopoly Overhaul: The "City Grid Lockdown"

### 3.1 The Issue
*The Power Plug* and *The Water Plug* cost $150 each, but generate only 4× or 10× dice roll ($28 to $70 average rent). They are statistically the worst investments on the board, lacking building upgrades or strategic leverage.

### 3.2 The Redesign: Grid Surcharge Monopoly
- **Rules:**
  - **Single Utility Held:** Rent remains `4× dice roll`.
  - **Both Utilities Held (The Grid Lockdown):**
    1. Rent increases from 10× dice roll to `15× dice roll` ($105 average rent).
    2. **Grid Surcharge Trait:** The owner of both utilities gains the ability to "Shut off the power" on any single rival district for 1 complete turn cycle by paying a $100 maintenance fee. While powered down, that district collects only 50% rent.
- **Strategic Impact:** Transforms utilities from passive dead spaces into active tactical counters against dominant hotel empires.

---

## 4. Tactical Action Cards Inventory (Street Luck 2.0)

### 4.1 The Issue
Currently, landing on *Street Luck* draws a random card that executes immediately (e.g., pay $50, collect $100). There is zero player decision-making.

### 4.2 The Redesign: Stored Tactical Cards
- **Rules:**
  - Players can hold up to **2 Tactical Cards** in their inventory.
  - When landing on *Street Luck*, player chooses between:
    - Executing an immediate cash reward card.
    - Keeping a tactical action card for later deployment.
  - **Tactical Card Examples:**
    1. *Switch Blade:* +15 bonus melee damage on your next First-Person Rent Duel.
    2. *Inside Informant:* Look at the next 3 cards in the Street Luck deck.
    3. *Getaway Car:* Move an exact number of squares (1 to 6) instead of rolling dice on your next turn.
    4. *Bail Bondsman:* Instant free exit from County Jail (replaces passive escape cards).
- **UI Integration:** Inventory slots appear directly in the `The move` and `My turf` sidebars with 1-click activation buttons.

---

## 5. First-Person Shootout Balancing & Duel Modifiers

### 5.1 Current Balance Assessment
- The 1v1 shootout (`src/ArenaDuel.jsx`) is technically solid:
  - 100 HP, 6-round magazine, 25 body damage, 40 headshot damage, 30 kick damage, 1.1s reload.
  - Ties protect the defending landlord (correct asymmetry for property owners).
- **Weakness:** Duels are mechanically identical regardless of where the debt occurred. A $50 debt on *Auntie's Bodega* triggers the exact same shootout as a $2,000 debt on *Final Boss Estate*.

### 5.2 The Improvement: High-Stakes Duel Stakes & Handicap Modifiers
- **Rules:**
  - **Low Stakes (<$300 Rent Debt):** Standard duel rules. Challenger 100 HP vs Landlord 100 HP.
  - **High Stakes (>$1,000 Rent Debt — "All or Nothing"):**
    - The landlord has "Home Turf Advantage": starting with 110 HP (+10 armor).
    - If the challenger wins against the odds, not only is their rent wiped, but they also loot **$200 street reputation cash** from the landlord's personal stash!
- **Impact:** Increases tension proportionally to property value. High-rent duels feel like climactic showdowns.

---

## 6. Team Alliances & Cooperative Strategy

### 6.1 Strengths to Retain
- Teams mode currently shares district completion, exempts allies from rent, and transfers assets to living teammates upon elimination.

### 6.2 Proposed Enhancement: Team Bank Loan & Rescue Bailouts
- **Problem:** Currently, when an ally lands on an unaffordable enemy hotel, their teammate cannot intervene before the shootout or bankruptcy.
- **Rule:** If an ally has sufficient liquid cash, allow an automated prompt: `"Bail out teammate? Transfer $[amount] to cover rent"`. If accepted within 10 seconds, rent is paid and the ally avoids the life-or-death shootout.
