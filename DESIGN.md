---
name: Spin the Block
description: A street game cabinet for an original multiplayer property game.
colors:
  lime: "#c6ed72"
  lime-hover: "#d8f899"
  sunset: "#ecaa7c"
  royals: "#b7a2ed"
  harbor: "#83c9d3"
  asphalt: "#171b19"
  text: "#edf0e6"
  muted: "#a1aaa0"
  line: "#343d35"
  panel: "#202722"
  ink: "#192019"
  action-panel: "#222a23"
  crew-surface: "#1d231e"
  crew-active: "#253024"
  field: "#171e19"
  field-border: "#465043"
  field-text: "#f0f2e8"
  action-ink: "#1c2b19"
  secondary-text: "#d6e0cb"
  secondary-border: "#52634b"
  secondary-hover: "#354630"
  board-frame: "#333f34"
  board-border: "#53634a"
  board-center: "#2b382e"
  tile: "#c4cbb5"
  tile-ink: "#263326"
  tile-border: "#5a6854"
  tile-hover: "#e0e3cf"
  tile-selected: "#e1e6cc"
  tile-occupied: "#e7e9d7"
  tile-corner: "#9ea88d"
  tile-mortgaged: "#7e8875"
  low-end: "#a3ba86"
  eastside: "#95bdd2"
  old-town: "#d8a580"
  heights: "#b3a0cc"
  downtown: "#d399b2"
  millionaire-row: "#d9c784"
  modal: "#253025"
  modal-border: "#637d51"
  card-good: "#c1d494"
  card-bad: "#d1a48a"
  error-surface: "#49342a"
  error-text: "#f0d2bf"
typography:
  display:
    fontFamily: '"Barlow Condensed", sans-serif'
    fontSize: "clamp(48px, 7.3vw, 116px)"
    fontWeight: 800
    lineHeight: 0.83
    letterSpacing: "-0.025em"
  headline:
    fontFamily: '"Barlow Condensed", sans-serif'
    fontSize: "44px"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "-0.025em"
  title:
    fontFamily: '"Barlow Condensed", sans-serif'
    fontSize: "39px"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "-0.015em"
  body:
    fontFamily: '"Barlow", sans-serif'
    fontSize: "14px"
    fontWeight: 400
  label:
    fontFamily: '"Barlow", sans-serif'
    fontSize: "9px"
    fontWeight: 600
    letterSpacing: "0.1em"
  button:
    fontFamily: '"Barlow", sans-serif'
    fontSize: "12px"
    fontWeight: 600
rounded:
  tile: "2px"
  icon: "4px"
  button: "5px"
  field: "6px"
  crew: "7px"
  panel: "8px"
  board: "9px"
  modal: "10px"
  circle: "50%"
spacing:
  compact: "7px"
  small: "10px"
  control: "12px"
  medium: "18px"
  inset: "20px"
  large: "24px"
  gutter: "26px"
  wide: "32px"
components:
  button-primary:
    backgroundColor: "{colors.lime}"
    textColor: "{colors.action-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "12px 13px"
    width: "100%"
  button-primary-hover:
    backgroundColor: "{colors.lime-hover}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.secondary-text}"
    rounded: "{rounded.button}"
    padding: "12px 13px"
  button-secondary-hover:
    backgroundColor: "{colors.secondary-hover}"
  button-danger:
    backgroundColor: "{colors.sunset}"
    textColor: "#30251e"
    rounded: "{rounded.button}"
    padding: "12px 13px"
  field:
    backgroundColor: "{colors.field}"
    textColor: "{colors.field-text}"
    rounded: "{rounded.field}"
    padding: "13px 12px"
    width: "100%"
  action-panel:
    backgroundColor: "{colors.action-panel}"
    rounded: "{rounded.panel}"
    padding: "25px 22px"
  board-tile:
    backgroundColor: "{colors.tile}"
    textColor: "{colors.tile-ink}"
    rounded: "{rounded.tile}"
    padding: "7px 3px 5px"
  board-tile-selected:
    backgroundColor: "{colors.tile-selected}"
  crew-card:
    backgroundColor: "{colors.crew-surface}"
    rounded: "{rounded.crew}"
    padding: "15px 13px 13px"
  modal:
    backgroundColor: "{colors.modal}"
    rounded: "{rounded.modal}"
    padding: "28px"
    width: "490px"
---

# Design System: Spin the Block

## Overview

**Creative North Star: "Street game cabinet"**

This documents the implemented direction recorded in `index.html`: a street game table where land, luck, and duels meet. Dark asphalt surfaces surround a pale square board, painted district strips, condensed sporting type, lime controls, and an original isometric city. The cabinet carries the visual identity; the room and turn controls make the game playable.

The interface is dense around the board and more spacious around consequential actions. Friendly crew symbols and muted city colors give the original setting character without making players decode decoration. This is a record of the built system under the user's creative liberty. No approved visual comparisons, reference images, or image-generation assets were supplied.

**Key Characteristics:**

- Asphalt and olive surfaces with pale, readable board pieces.
- Condensed display type paired with direct, compact interface text.
- Lime action and focus treatments; crew and district colors carry game meaning.
- An authored vector city inside a real, interactive perimeter board.
- Responsive controls-first play and explicit keyboard focus.

## Colors

The palette combines desaturated street materials with clear painted accents. Frontmatter values are extracted from `src/style.css` and `shared/board.js`; the CSS remains the implementation source of truth. The five root CSS custom properties are `--lime`, `--muted`, `--line`, `--panel`, and `--ink`. Other listed colors are repeated literal assignments or functional board states. The sidecar's eight-step OKLCH ramps are synthesized previews for the design panel, not additional implemented colors.

### Primary

- **Lime:** Primary actions, current navigation, selected tiles, focus outlines, presence, and Grove Collective. The lighter hover tone belongs to primary buttons.

### Secondary

- **Sunset:** Sunset Syndicate, danger actions, risk cues, and offline status. Explain the consequence in words alongside the color.
- **Royals / Harbor:** Eastside Royals and Harbor Union. Pair each crew color with its symbol and name.

### Tertiary

- **Low End / Eastside / Old Town / Heights / Downtown / Millionaire Row:** The six district strips, district key, property heading rule, and property-list swatches. These identify land groups; crew colors identify players and owners.

### Neutral

- **Asphalt / Panel / Action Panel / Crew Surface:** The page and functional surfaces. Active crews use a distinct olive surface and crew-colored border.
- **Text / Muted / Line:** Primary text, lower-emphasis text, and structural separation.
- **Field / Field Border / Field Text:** Editable room and trade values.
- **Board Frame / Board Center / Tile:** The board cabinet, inset city, and pale playable blocks. Hover, selected, occupied, corner, and mortgaged tile tones are separate functional states.
- **Modal / Good Card / Bad Card / Error Surface:** Outcome and interruption surfaces with corresponding readable text.

**The Ownership Rule.** Keep district and crew identity separate: a property's upper strip shows its district, its bottom strip shows its owner, and its circular tokens show occupants.

## Typography

**Display Font:** Barlow Condensed, with sans-serif fallback. **Body Font:** Barlow, with sans-serif fallback. There is no separate monospace family.

Both families are self-hosted through local `@fontsource` package imports in `src/main.jsx`: Barlow Latin weights 400, 500, 600, and 700; Barlow Condensed Latin weights 600, 700, and 800. No runtime font CDN is needed. Font synthesis is disabled.

### Hierarchy

- **Display:** The stacked board brand uses the frontmatter display role, rotated slightly with a smaller upper line. During play its scale reduces so dice and city remain visible. Mobile uses separate viewport clamps.
- **Headline / Title:** Condensed headings describe the current decision. Base h1 and h2 are captured above; turn headings and modals apply contextual sizes, typically 35–48px.
- **Body:** Barlow is the root family. Panel copy commonly uses 12px with 1.6–1.65 line height; mobile decision copy uses 13px. Paragraphs generally use 1.55 line height.
- **Label:** Small uppercase labels, table metadata, and input headings use tracking. They supplement larger names and controls.
- **Numbers:** Purchase prices and turn summaries use condensed type at 56px and 48px respectively; crew balances use Barlow at 18px.
- **Tile text:** Board names and prices deliberately scale with the board; readable expanded property details accompany tile selection. Do not use tile-sized text for primary instructions or actions.

## Layout

The main cabinet is centered at a maximum width of 1580px. Desktop uses three columns: a 210px crew rail, a flexible board of at least 400px, and a 276px action rail, separated by a 26px gutter. Page padding is 32px 30px 22px. At 1500px and wider, the rails become 220px and 300px, the board minimum becomes 500px, and the gap becomes 32px. At 1180px and below, the rails and gutters tighten.

The board is an 8 × 8 CSS grid with a square aspect ratio. Its 28 playable blocks form the perimeter; the city occupies columns and rows 2 through 7. The desktop grid gap is 3px inside a 7px padded frame. Keep the whole board geometry intact when resizing.

At 980px and below, the crew list spans a row above a two-column board and action layout. The district key, sidebar tip, and add-seat rail control are hidden at this size. At 720px and below, the cabinet becomes a single column with **actions first, crews second, board third**. The header navigation hides; essential header actions remain. Mobile page padding is 20px 14px, the board frame uses 5px padding and a 2px gap, and primary buttons reach a 48px minimum height. The action panel has 25px padding. This order is visual CSS ordering; the document's underlying order remains crew, board, actions.

Selecting a tile on a viewport at or below 720px focuses its property-detail region and scrolls it into view. That region lives in the action rail and carries the expanded name, identity, economics, and management actions. Preserve this bridge between the compact board and readable controls.

## Elevation & Depth

Depth combines dark tonal layers, fine green borders, and restrained object shadows. The board feels like a physical game surface; dice, tokens, and street cards sit above it. Modals use a dark translucent backdrop with 5px blur and a heavier shadow. Ordinary crew and action panels rely on surface and border changes instead of floating-card shadows.

### Shadow Vocabulary

- **Board:** `0 17px 32px #0c120f66` beneath the cabinet.
- **Token:** `0 2px 3px #15221460` beneath an occupant marker.
- **Dice:** `0 3px 5px #111a1160` beneath the dice.
- **Street card:** `0 9px 18px #11181166` beneath the tilted card.
- **Toast:** `0 8px 20px #10151070` beneath the temporary status surface.
- **Modal:** `0 24px 80px #0009` for interruptions.
- **Roulette wheel:** `0 7px 22px #10180b90` beneath the circular game object.

## Shapes

Use small radii for precise game surfaces and modest radii for larger containers: tiles are nearly square, controls are gently rounded, and the cabinet has a softer outer frame. The frontmatter captures observed radii, not a new abstract scale. Crew marks, tokens, dice pips, and the roulette wheel are circular. The header mark is a pointed shield silhouette, the roulette pointer a clipped triangle, and duel score pips are skewed rectangles.

District strips and ownership bars stay flush to tile edges. Street cards tilt by −2 degrees; the board brand tilts by −5 degrees. These fixed poses communicate printed game material without moving the surrounding control layout.

## Components

### Buttons

Primary actions are solid lime with dark text, a fine matching border, a small radius, and left-to-right label/icon alignment. Secondary actions are transparent with an olive stroke and light text; hover fills them with deeper green. Danger actions use Sunset with dark text. Desktop primary controls have a 45px minimum height, and mobile uses 48px. Smaller property-management actions use 38px minimum height. Disabled buttons use opacity 0.42 and a not-allowed cursor.

Buttons and links receive a 2px lime `:focus-visible` outline with a 4px offset. Hover generally brightens enabled buttons; primary and secondary button variants have explicit background hover states. There is no special pressed-state treatment in the current stylesheet.

### Inputs / Fields

Text fields and selects use a dark inset surface, an olive 1px stroke, a small radius, and a 45px minimum height. Associated labels name room, player, and trade values. Focus uses a 2px lime outline with a 2px offset. Room codes use tracked uppercase text. The compact match selector is 33px tall. Inline errors appear in a warm, bordered alert with a dismiss button; do not rely on a red field outline that is absent from the implementation.

### Navigation

Desktop navigation uses understated Barlow text and a lime underline for the active location. The action panel's three button tabs — The move, My turf, Trade — use the same active underline and lime text. The turf count is a compact rectangular badge. Header navigation hides on mobile while panel controls remain available. Current panel tabs are regular buttons, not an ARIA tab widget; keyboard activation follows native button behavior.

### Crew Cards / Badges

Crew cards show the circular symbol, player name, crew name, cash, and property count. The active card changes both border and background and adds an IN PLAY label at roomy desktop sizes. Eliminated crews fade to opacity 0.45. Presence dots, BOT labels, and remove-bot buttons provide secondary status. Long names wrap on desktop and truncate in compact mobile cards. Crew badges combine the crew color with a 12% mixed background and 45% mixed border over the panel tone.

### Interactive Board / Property Details

Tiles are native buttons with accessible names describing the block, price, and owner. Tab reaches them; Enter or Space selects them. Hover lightens a tile, selection adds a lime outline, the current player's block uses an occupied tone, and mortgaged land uses a muted tone and reduced name opacity. Occupant tokens hide the small price line and lift the title slightly to prevent overlap. The property detail is a named region with a close control, a district-colored upper rule, stats, and conditionally enabled management buttons. Its programmatic focus has a lime outline with a 5px offset.

### Street Cards / Activity / Feedback

Street cards are pale, slightly tilted printed surfaces with an icon, condensed title, readable consequence, and faint cropped seal. Good and bad outcomes use different surface tones. Activity rows pair timestamps with text and tint positive or negative events. Status toasts have `role="status"`; errors have `role="alert"`. A visually hidden, polite and atomic status region announces the current player's turn, phase, location, latest event, room crew count, or match winner. Keep it free of the per-second timer so announcements remain useful.

### Dialogs / Roulette / Duels

Dialogs are labelled modal regions. They receive initial focus, loop Tab and Shift+Tab among controls, support Escape when a close callback exists, and restore the previously focused element on unmount. Rules are dismissible; active roulette and duel decisions are resolved through their game actions. Roulette is a labelled radial game object with a pointer and explicit outcome caption. Duels use named crew emblems, score pips, and three native tactic buttons with descriptions of their relationships.

### Motion and Assets

Control state transitions use 0.15s ease. Dice rattle lasts 0.6s ease-out; modal entry lasts 0.25s ease-out; waiting dots pulse over 1.4s with staggered delays. The wheel decelerates over 2.5s using `cubic-bezier(0.1, 0.8, 0.16, 1)`. The reduced-motion media query disables all CSS animations and transitions and uses automatic scrolling. The roulette result still waits for its existing 2.6-second result gate; the preference removes visual movement, not game timing.

The city is original source-authored SVG in `src/City.jsx`: isometric building faces, window grids, storefront signs, tree-lined roads, cars, street lamps, and a basketball court. It has an explicit image role and descriptive accessible label. The favicon is a source-authored SVG with a dark geometric glyph on a rounded lime square in `public/favicon.svg`; the header uses a separate shield silhouette. Interface and crew symbols come from the Lucide icon library; they are not claimed as original artwork. There are no supplied photographs, generated raster assets, or external image dependencies. Extend the city through its existing vector geometry and muted material palette.

## Do's and Don'ts

### Do:

- **Do** preserve the square perimeter board and the original city at its center.
- **Do** retain controls-first mobile presentation and focus the selected property detail.
- **Do** pair district and crew colors with names, symbols, strips, or explicit text.
- **Do** keep native keyboard activation, visible focus, dialog focus handling, and polite game announcements.
- **Do** self-host the existing Barlow families and honor reduced motion.
- **Do** state game consequences beside risky actions and outcomes.

### Don't:

- **Don't** reuse the district strip to imply ownership; the bottom owner bar has that job.
- **Don't** turn compact board metadata into primary instruction text.
- **Don't** remove disabled, selected, mortgaged, occupied, or eliminated state distinctions.
- **Don't** claim approved visual references or generated imagery that do not exist.
- **Don't** replace the authored city or crew identities with copied franchise artwork.
