# 05 — Visual, UX & VFX Redesign Blueprint

This specification defines the unified design system, component hierarchy, motion standards, and screen-by-screen UX blueprint for the commercial-grade release of *Spin the Block*.

---

## 1. Design System & Design Tokens

### 1.1 Color Tokens
The aesthetic builds upon authentic street culture: raw asphalt darks, graffiti-inspired neon lime action accents, warning reds for tactical combat, and distinct, saturated pastel district colors.

```css
:root {
  /* Surface & Background */
  --color-bg-canvas: #0e1310;         /* Primary deep canvas behind app */
  --color-bg-surface: #161e19;        /* Board interior and base container panels */
  --color-bg-card: #1f2923;           /* Elevated interactive cards, sidebar tabs */
  --color-bg-card-hover: #26332c;     /* Card interactive hover state */
  --color-bg-overlay: rgba(10, 14, 12, 0.82); /* Modal backdrop with blur */

  /* Primary Interactive Brand: Electric Lime */
  --color-accent-lime: #c4f53c;       /* Primary CTA, active buttons, rolling dice */
  --color-accent-lime-hover: #d5ff54; /* Button hover state */
  --color-accent-lime-active: #b0e02c;/* Button click / active press */
  --color-accent-lime-muted: rgba(196, 245, 60, 0.15); /* Subdued badge backgrounds */

  /* Tactical & Danger: Gunmetal Red */
  --color-danger-red: #ff4336;        /* Shootout, debts, combat reticle, kicks */
  --color-danger-red-hover: #ff5c52;  /* Danger hover */
  --color-danger-red-muted: rgba(255, 67, 54, 0.18);

  /* Typography Colors */
  --color-text-primary: #f2f5f3;      /* Primary headers, large numerals */
  --color-text-secondary: #9caa9f;    /* Body descriptions, card subtitles */
  --color-text-muted: #647368;        /* Footers, micro-notes, disabled state */
  --color-text-on-accent: #0f1711;    /* High-contrast dark text on Lime CTA */

  /* District Palette (High Contrast & Color-Blind Discernible) */
  --district-bodega: #9c6644;         /* Brown: Auntie's Bodega, Broke Boy */
  --district-lackin: #2ec4b6;         /* Cyan: No Cap Cuts, Caught Lackin */
  --district-trenches: #e056fd;       /* Industrial Pink: The Trenches, Trap House */
  --district-lick: #ff9f43;           /* Warm Orange: Cookout Corner, Chain Snatch */
  --district-drip: #ee5253;           /* Bold Crimson: Studio 808, Mall */
  --district-steppers: #feca57;       /* Street Gold: No Snitch, Side Quest */
  --district-mansion: #10ac84;        /* Emerald Green: Money Gardens, Motion Mansion */
  --district-boss: #3867d6;           /* Royal Midnight: Auntie Row, Final Boss */

  /* Borders & Dividers */
  --border-subtle: 1px solid rgba(156, 170, 159, 0.12);
  --border-card: 1px solid rgba(196, 245, 60, 0.18);
  --border-focus: 2px solid #c4f53c;

  /* Shadows & Elevation */
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.35);
  --shadow-md: 0 8px 24px rgba(0, 0, 0, 0.45);
  --shadow-glow: 0 0 16px rgba(196, 245, 60, 0.35);
  --shadow-danger-glow: 0 0 16px rgba(255, 67, 54, 0.4);
}
```

### 1.2 Typography Hierarchy
- **Display & Headers:** `Barlow Condensed`, sans-serif (Weights: 700 Bold, 800 ExtraBold, 900 Black). Uppercase, tracking +0.02em to +0.05em.
- **Body & Data:** `Barlow`, sans-serif (Weights: 400 Regular, 500 Medium, 600 SemiBold).
- **Scale:**
  - Hero Title (`H1`): `2.75rem` (44px) / Line height `1.05` / Weight 800
  - Section Header (`H2`): `1.75rem` (28px) / Line height `1.15` / Weight 800
  - Subsection / Card Title (`H3`): `1.25rem` (20px) / Line height `1.2` / Weight 700
  - Body Text: `0.95rem` (15px) / Line height `1.45` / Weight 400
  - Micro-Data / Badge Labels: `0.75rem` (12px) / Line height `1.2` / Weight 600 / All-caps

---

## 2. Component Design & State Matrix

### 2.1 Buttons
| Variant | Background | Border | Text Color | Hover Effect | Focus State |
|---|---|---|---|---|---|
| **Primary (CTA)** | `#c4f53c` (Lime) | None | `#0f1711` (Black) | Glow shadow + `#d5ff54` | 2px solid `#ffffff`, offset 2px |
| **Secondary (Outline)** | `transparent` | `1px solid rgba(196,245,60,0.3)` | `#f2f5f3` | Background `rgba(196,245,60,0.08)` | 2px solid `#c4f53c` |
| **Danger (Duel / Surrender)**| `#ff4336` (Red) | None | `#ffffff` | Danger glow + `#ff5c52` | 2px solid `#ffffff`, offset 2px |
| **Tab / Sub-nav** | `transparent` (Active: `#26332c`) | None (Active: bottom 2px lime) | `#9caa9f` (Active: `#f2f5f3`) | Color `#f2f5f3` | Subtle outline |

---

## 3. Major Screens Redesign Specification

### 3.1 Main Menu & Landing
- **Problem:** Currently, upon registration, the page stays on `EntryPage` with an awkward "WELCOME BACK" banner requiring a redundant second click on "Enter the city".
- **Redesign Solution:**
  1. Once authentication succeeds, immediately transition with a 200ms opacity fade into the Main Lobby.
  2. Clearly segregate:
     - **Quick Play Solo:** Big primary card: "Solo Turf War (vs 3 Bots)" with 1-click start.
     - **Host Room:** "Create Street Table" with quick-share link generation.
     - **Join Room:** 6-character room code input with auto-formatting and paste listener.
     - **Public Directory:** Real-time lobby list showing open rooms, active capacity, and city map.

### 3.2 In-Game Layout & Action HUD
- **Desktop (1920×1080 / 1366×768):**
  - **Left Rail (Crew Standing):** Shows all 2–8 seated players with color badges, live cash balance, property block count, jail indicator, and connection status. Hovering a crew card highlights all their owned properties on the board with a pulsing crew-colored glow.
  - **Center Playfield:** 40-square perimeter board with clean isometric central city. Ambient traffic animations pause automatically in low-power modes.
  - **Right Rail (Action HUD):** Tabbed interface with clear active badges:
    - `The Move`: Dice visual, immediate event card, primary CTA (`Roll the dice`, `Claim block $120`, `End turn`).
    - `My Turf`: Grouped by district set. Directly displays build house ($50) and mortgage actions with clear delta indicators.
    - `Trade`: Simplified bilateral trade card. Drag-and-drop or checkbox asset selection, instantaneous net-worth impact calculator.
    - `Chat`: Real-time room chat with team-filtered channels.
- **Mobile Adaptation (390×844 & 360×640):**
  - **Sticky Bottom Action Sheet:** The active turn controls (`Roll the dice`, `Buy`, `End turn`) remain pinned to a floating 64px bottom bar with clear visual contrast.
  - **Board Zoom & Pan:** Pinch-to-zoom and double-tap zoom to inspect specific district sectors. Inspecting a property square opens a half-screen dismissible drawer rather than shifting page content.

### 3.3 Event Modals (Oppa Stoppa, Roulette, Auctions)
- **Problem:** When an event occurs, players experience dual-focus confusion between the center modal and the right sidebar.
- **Redesign Solution:**
  - Modal acts as a focused stage: the background board and right sidebar dim with a 60% dark blur (`backdrop-filter: blur(4px)`).
  - All actionable buttons (`Spin the Stoppa`, `Pay $135`, `Place Bid $190`) are centered within the primary modal card with clear countdown bars.
  - Inactive spectator players see a dedicated "Spectator Banner" showing the live spinner with an optional "Cheer / Taunt" reaction pill.

### 3.4 The First-Person Rent Duel Arena
- **Visual Elevation:**
  - Maintain the beloved high-contrast Red Handed noir corridor aesthetic.
  - Upgrade the floor and wall textures with subtle grime and graffiti stencils (`NO RENT NO PEACE`, `SPIN THE BLOCK`).
  - Introduce dynamic gun recoil and a visible 3D muzzle flash sprite.
  - Add visual hit feedback: red peripheral screen vignette on damage received; yellow spark burst at hit location on opponent.
  - Mobile touch controls: semi-transparent virtual joystick for movement + large dedicated thumb buttons for Fire, Kick, and Reload.

### 3.5 Post-Match Summary & Celebration
- **New Screen:** Upon victory, trigger a full-screen victory celebration:
  - Winner's crew avatar crowned in gold with street graffiti animation.
  - **Match Highlights Grid:**
    - "Most Feared Landlord" (Highest rent collected).
    - "Quickest Draw" (Most shootout knockouts).
    - "Biggest Lick" (Largest single Community Plot or roulette payout).
    - "The Hustler" (Most profitable trade deal).
  - **Rewards Banner:** "+10 Respect Points Earned", updating the unlock progress bar for the next token cosmetic.
  - Action buttons: `Rematch with Same Crew` (Host trigger) and `Back to Street Lobby`.

---

## 4. Animation & VFX Motion Specification

| Event / Trigger | VFX & Motion Appearance | Duration | Easing | Audio Sync | Reduced Motion Mode |
|---|---|---|---|---|---|
| **Dice Roll** | Dice 3D tumbling rotation with soft shadow expansion | 600ms | `cubic-bezier(0.25, 1, 0.5, 1)` | Dice cup rattle & double bounce | Instant die face flip |
| **Token Movement** | Arc-hop along perimeter (1 hop per tile) with squash-and-stretch | 160ms / tile | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Soft tile step sound | Instant translation to target |
| **Cash Transaction** | Floating green (`+$200`) or red (`-$150`) badge drifting up | 1000ms | `cubic-bezier(0.16, 1, 0.3, 1)` | Cash register chime / paper rustle | Static badge in HUD |
| **Oppa Stoppa Spin** | Dial accelerates to 1200°/s, then decelerates to winning slice | 2200ms | `cubic-bezier(0.1, 0.9, 0.2, 1)` | Mechanical ratchet clicking | Instant 300ms fade to result |
| **Shootout Gunshot** | Yellow-red muzzle flare, 4 projectile sparks, 2px recoil kick | 80ms | Instant attack, linear decay | 9mm gunshot crack with reverb | Muzzle flare without camera recoil |
| **Shootout Headshot** | High-intensity red reticle bloom + screen edge pulse | 180ms | `ease-out` | High-pitched metallic impact | Solid red reticle for 200ms |
| **Kick Melee** | Canvas forward zoom (1.05x) + dust puff particle | 220ms | `cubic-bezier(0.2, 0.8, 0.4, 1)` | Heavy blunt thud | Simple text notification "KICK" |
| **Property Purchase** | Colored district border flashes once + owner badge drop-in | 350ms | `cubic-bezier(0.17, 0.89, 0.32, 1.25)` | Stamp / deed lock sound | Instant badge placement |
| **Hotel Construction** | Illustrated skyscraper lot grows from ground with gold dust | 450ms | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Power tool / construction sound | Instant level 5 badge update |
| **Victory Match End** | Confetti cannon burst in crew colors + slow zoom on winner | 3500ms | Smooth deceleration | Triumphant street horn riff | Modal summary without confetti |

---

## 5. Visual Asset Reference Prompts

For graphic design artists generating supplementary SVG / raster illustrations:

- **District Deeds:** *"Vector isometric property card, urban street architectural storefront, bold outlines, flat colors, street graffiti signage, asphalt border, retro sticker aesthetic, high contrast."*
- **Shootout Alley:** *"First-person corridor view, gritty concrete alleyway between brick tenements, fire escapes, DDA raycaster perspective, retro noir minimal, black outlines, red graffiti stencils, dramatic shadows."*
- **Crew Avatars:** *"Minimalist street characters wearing oversized hoodies, ski masks, gold chains, retro sneakers, stylized cel-shaded vector art, iconic silhouettes."*
