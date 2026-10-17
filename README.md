# Spin the Block

A complete online property party game with an original street city, private invite rooms, first-person rent shootouts, and roulette cards. Built from scratch for Hood Warfare Monopoly.

**Play:** https://spin-the-block-production.up.railway.app

## Playing

Enter a street name and create a private room, browse public rooms, or use quick play. Rooms have 2–8 seats; the host can add bots individually, fill every spare seat, or start alone with automatic bot fill. **Play solo vs bots** starts immediately against your choice of 1–7 bots.

**Winner takes all is the default.** Keep playing until one crew or team remains. Optional 10/20/30-round caps choose the richest surviving crew or team. The host can configure starting cash, city map, capacity, teams, visibility, auctions, mortgages, even building, doubles, community payouts, prison rent, order shuffling, account-only rooms, and turn time before play. Rules stay visible during the match.

The standard board has **40 squares, eight districts, four transit routes, two utilities, two roulette stops, and three Oppa Stoppas**; Quick boards have 28 squares. Six regional hood maps cover America, India, China, Europe, Mexico, and Brazil, each with its own block names and street scene. India’s centerpiece shows chawl lanes, chai stalls, auto-rickshaws, and a cow crossing the street; the other scenes bring in brownstone stoops and a hoop court, Chinese alley homes and noodle stalls, European brick estates and a tram, a Mexican tiendita and lowrider, and Brazilian hillside homes and a football court. Board labels stay concise, while square inspection shows each full place name. Each Oppa Stoppa spins ten equally likely outcomes: **1–10% of the player's cash balance at the spin, rounded down**, then transfers that cash exactly once into the **Community Plot**. Land on the Plot to collect it when payouts are enabled. Its live balance appears on the square and in the inspection panel. The isometric artwork uses aligned road lanes, sidewalks, and building lots, with light CSS-driven traffic. Players can pause traffic; it also stops offscreen, in hidden tabs, and for reduced-motion preferences.

Claim blocks, bid in auctions, collect rent, complete districts, and build four houses plus a hotel. Utilities charge dice-based rent; transit rent grows with the number of lines your side owns. Teams share sets, pay no allied rent, use private team chat, and inherit a departing ally’s cash and escape cards. Eliminated crews’ properties return to the board unowned, with buildings and mortgages cleared. The optional **Killer Takes All** house rule instead awards a rent-shootout loser’s properties to the winning landlord, retaining their buildings and mortgages. Name your teams in the lobby. Held escape-card counts appear beneath each crew’s name. Trade multiple properties, cash, and escape cards in one atomic offer, or send rescue gifts. Every eligible trade partner is shown as a visible keyboard-accessible choice, without a nested dropdown to scroll. Any active crew can negotiate between events, including off-turn: send an offer, review the two-sided summary, counter, accept, decline, or withdraw. Counteroffers reverse and prefill the current deal for editing; each revision must be reviewed before acceptance. Offers expire at the end of the turn; the server rechecks cash, cards, ownership, and buildings before settlement. Debt trades cannot give an empire away below fair value.

The host can choose **Balanced** or **Regular** dice in the lobby; Balanced is the default for new rooms and older saved rooms. Balanced dice give every movement total from 2–12 the same 1-in-11 chance, then select uniformly from the valid ordered pairs for that total. Regular dice roll two independent uniform six-sided dice, so each ordered face pair has a 1-in-36 chance and totals follow the familiar 1:2:3:4:5:6:5:4:3:2:1 distribution. The server generates both modes for humans and bots. Doubles still grant another roll when enabled; three consecutive doubles send the crew to County.

When player rent is unaffordable, raise cash or challenge the landlord to a live first-person arena shootout inspired by Red Handed’s outlined gray/black/white/red style. Both crews ready up within 25 seconds, followed by a three-second countdown and a 30-second duel. WASD/ZQSD moves freely; capture the mouse (Esc releases), drag, or use arrows to aim. Hold click/Enter to fire, Space kicks, and R reloads. Touch players drag to aim and hold labelled movement controls. Six-round magazines, a 280ms shot cooldown, 1.1-second reloads, visible travelling projectiles, solid cover, 25-damage body hits, 40-damage headshots, and directional 30-damage close-range kicks are enforced on the server. Combat simulates at 20 Hz and sends compact snapshots at 10 Hz; the canvas renders at the display refresh rate with local movement prediction and interpolated remote movement. Combat inputs do not block the board’s action acknowledgement flow. Zero health ends the duel; otherwise higher health at the time limit wins, with an exact tie protecting the landlord. Win wipes rent; lose eliminates your crew. Properties return to the board by default. With **Killer Takes All** enabled, a victorious landlord inherits the debtor’s properties, including buildings and mortgages. This includes concessions after a rent shootout starts; ordinary surrender, forfeits and idle elimination still return properties to the board. Bots use the same controls. Timers pause when all human seats disconnect, including combat clocks. Spectators cannot fire. Existing saved lane and tactic duels finish with their original rules. Original arena code and artwork; the rent duel is a multiplayer adaptation, not Red Handed’s single-player campaign.

Owned squares show a crew-colored owner badge, mortgage status, and a large illustrated house count or hotel. Hooded crew pieces wear chains, masks, sneakers, and crew colors, with earned cosmetic emblems retained. Crowded squares show your piece first plus the number of other crews; tap a square to see everyone on the block. Mobile offers a readable scrollable board and compact overview.

Roulette offers weighted jackpots, jail, payday, escape cards, and losses. Full odds are shown in the game.

Profiles work immediately as guests and can be registered with a username and password to use another device. Friends support requests, online presence, and lobby invitations. Completed games earn respect that unlocks token appearances without payments. Public games contribute to online ranks only when at least two distinct human profiles participate; solo wins are tracked separately. Private game history is visible only to its own participants. Room chat stays alongside the board during play and while editing trades; the Chat control jumps straight to the composer. Eliminated crews can leave immediately using the exit notice, including during special events, or choose to stay and chat. Leaving revokes the saved seat credential without interrupting the other crews. Mute hides chat, block prevents future matching and hides chat, and reports are retained with the room for operator review; there is no staffed moderation service.

The turn clock combines free thinking time with a personal reserve, replenished after manual turns. Debt adds 90 seconds; each other crew can add a minute once per turn. Human timeouts do not mortgage assets or open auctions. Two idle turns eliminate the player. Your browser stores opaque seat/profile tokens for reconnection. Timers pause when all humans disconnect; rooms expire after 24 hours without activity. Email verification unlocks extra maps; accounts have no password recovery in this release. Keep the password and browser seat credential safe.

See [FEATURES.md](FEATURES.md) for the Richup comparison and operating boundaries.

## Development

Node 22 recommended (required for Railway infrastructure tools).

```sh
npm ci
npm run dev
```

Vite serves http://localhost:5173 and proxies Socket.IO to the Node server on port 3000. To avoid an existing server, set `PORT=4311 API_PORT=4311 npm run dev`. The API proxy accepts `API_PORT`.

```sh
npm run lint          # ESLint, zero warnings
npm test              # Engine, profiles, real multiplayer/restart tests
npm run test:coverage # Node test coverage
npm run build         # Production client
npm run test:e2e      # 9 Chromium browser tests against production build
npm run check         # Lint + engine/integration tests + build
npm start             # Serve production build and Socket.IO together
```

Install the browser once with `npx playwright install chromium`. Browser fixtures are created only in an isolated temporary test directory. The server exposes no test, admin, money, dice, or teleport endpoints.

## CI and deployment

GitHub Actions runs on pull requests and main: clean install, lint, engine/integration tests with coverage, production build, then Chromium browser tests. Failed browser traces are retained for seven days. Railway's native GitHub source follows `main` with **Wait for CI** enabled (`checkSuites: true`). It deploys only after the workflow passes. No Railway token is stored in the repository or required by the CI workflow.

Infrastructure is tracked in `.railway/railway.ts`: Docker build, `/api/health` readiness check, restart policy, one server replica, persistent `/data` volume, and the GitHub source with its CI gate. Runtime variables are intentionally unmanaged; Railway holds `DATA_DIR=/data`. Public routing targets Railway's injected `PORT=8080`.

Manual deployment via Railway CLI:

```sh
npx @railway/cli link --project e4b53995-5f92-45a1-a3d0-0da85f2db10f --environment production --service spin-the-block
npx @railway/cli config plan
npx @railway/cli config apply --yes
npx @railway/cli up --ci
```

Inspect every infrastructure plan before applying, especially volume changes. The Docker image uses Node 22 and includes only production dependencies and the compiled client.

## Architecture and operating limits

React/Vite client, Express/Socket.IO server, shared board/card definitions, and a pure game engine tested independently. The server owns dice randomness, cash, movement, legal actions, trades, roulette results, and secret duel choices. Client-supplied state cannot overwrite the game. Cryptographic random draws, same-origin socket checks, HTTP/socket rate limits, payload limits, CSP/security headers, and escaped player names are included.

Room snapshots and private seat tokens are written atomically to a persistent volume and restored on restart. This deployment intentionally uses **one replica**: room coordination is in memory, with disk recovery. Horizontal scaling requires a shared database plus Socket.IO adapter and distributed turn scheduling. This release has not been load-tested for large public traffic. Health checks verify readiness; external uptime monitoring and volume backups remain operator responsibilities. Clearing browser storage loses the current seat credential. Profile sign-in restores history and cosmetics; joining the original room code recovers its seat for that authenticated profile. A guest that clears all browser credentials cannot recover its seat. Account credentials use salted scrypt hashes; profile/seat tokens never appear in room state. Profiles persist atomically in `profiles.json` alongside `rooms.json`. Back up both privately. Upgrades restore old rooms with their original board and rules.

## Assets and design

Original code-authored SVG city, eight fictional crews, eight districts, and self-hosted Barlow fonts. No Hood Warfare game files or Monopoly artwork are included. DESIGN.md records the built interface. All currency and roulette stakes are fictional; there are no payments.

### Email verification and custom maps

The entry page supports guest play and username/password sign-in. Guests can host America Blocks and India Gully, and join any host-selected city. Email-verified accounts can host China Backstreets, Europe Estates, Mexico Barrios, and Brazil Favelas, and save up to ten personal maps in Map Studio. The editor customizes all 40 names, eight district names/colors, and surprise-space event types; prices and essential spaces retain the base economy. Custom maps use the neutral city centerpiece. Rooms capture their own board snapshot, so editing/deleting a saved map cannot change an existing table. Saved maps are private to their owner; room participants receive the selected board.

Production email delivery supports Brevo or Resend. Configure the selected provider in private Railway service variables, never in Git or chat:

- **Brevo:** `EMAIL_PROVIDER=brevo`, `BREVO_API_KEY`, and `EMAIL_FROM` set to a verified sender email (plain email or `Spin the Block <email@example.com>`). Complete account activation/approval and verify the sender first. See [Brevo’s transactional API](https://developers.brevo.com/reference/send-transac-email).
- **Resend:** `EMAIL_PROVIDER=resend` (the default), `RESEND_API_KEY`, and `EMAIL_FROM` on your verified sending domain, for example `Spin the Block <play@your-domain.com>`. See [Resend’s sending API](https://resend.com/docs/api-reference/emails/send-email).

Brevo documents a [temporary fallback for free or unauthenticated sender addresses](https://help.brevo.com/hc/en-us/articles/14925263522578-Comply-with-Gmail-Yahoo-and-Microsoft-s-requirements-for-email-senders): it rewrites the transactional sender onto its managed domain. Account eligibility and actual inbox delivery must be tested; a domain you own remains the recommended long-term setup. There is no automatic switch between providers after a delivery failure. Brevo requests are accepted only when its API returns a message ID, which confirms acceptance rather than inbox delivery.

Until configured, the UI explains that delivery is unavailable and leaves guest maps playable; verification is never faked. Codes expire after 15 minutes, allow five attempts, can be resent after a minute, and are consumed once. Only a salted digest is stored, and email addresses and saved maps are omitted from other players’ profile views. Verification unlocks map features; it is not a password-reset service. Existing username/password accounts can verify through Profile → Account.
