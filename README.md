# Spin the Block

A complete online property party game with an original street city, private invite rooms, tactical rent shootouts, and roulette cards. Built from scratch for Hood Warfare Monopoly.

**Play:** https://spin-the-block-production.up.railway.app

## Playing

Enter a street name and create a private room, browse public rooms, or use quick play. Rooms have 2–8 seats; the host can add bots individually, fill every spare seat, or start alone with automatic bot fill. **Play solo vs bots** starts immediately against your choice of 1–7 bots.

**Winner takes all is the default.** Keep playing until one crew or team remains. Optional 10/20/30-round caps choose the richest surviving crew or team. The host can configure starting cash, city map, capacity, teams, visibility, auctions, mortgages, even building, doubles, community payouts, prison rent, order shuffling, account-only rooms, and turn time before play. Rules stay visible during the match.

The city has **40 squares, eight districts, four transit routes, two utilities, two roulette stops, and three Oppa Stoppas**. Street names include Caught Lackin Lane, Rent Due Lil Bro, Hit a Lick Heights, and Final Boss Estate. The Night Shift map changes property names and swaps a roulette/card location. Each Oppa Stoppa spins ten equally likely outcomes: **1–10% of the player's cash balance at the spin, rounded down**, then transfers that cash exactly once into the **Community Plot**. Land on the Plot to collect it when payouts are enabled.

Claim blocks, bid in auctions, collect rent, complete districts, and build four houses plus a hotel. Utilities charge dice-based rent; transit rent grows with the number of lines your side owns. Teams share sets, pay no allied rent, use private team chat, and inherit a departing ally’s cash and turf. Name your teams in the lobby. Trade multiple properties, cash, and escape cards in one atomic offer, or send rescue gifts. Debt trades cannot give an empire away below fair value.

When player rent is unaffordable, raise cash or challenge the landlord to a simultaneous tactic shootout. Fire beats flank, flank beats guard, guard beats fire. Win wipes rent; lose eliminates your crew and passes assets to a living teammate, otherwise the landlord. Roulette offers weighted jackpots, jail, payday, escape cards, and losses. Full odds are shown in the game.

Profiles work immediately as guests and can be registered with a username and password to use another device. Friends support requests, online presence, and lobby invitations. Completed games earn respect that unlocks token appearances without payments. Public games contribute to online ranks only when at least two distinct human profiles participate; solo wins are tracked separately. Private game history is visible only to its own participants. Mute hides chat, block prevents future matching and hides chat, and reports are retained with the room for operator review; there is no staffed moderation service.

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

The entry page supports guest play and username/password sign-in. Guests can host The Trenches and Night Shift, and join any host-selected city. Email-verified accounts can host Lackin’ by the Beach, Cold Streets, Neon Problems, and Cookout County, and save up to ten personal maps in Map Studio. The editor customizes all 40 names, eight district names/colors, and surprise-space event types; prices and essential spaces retain the base economy. Rooms capture their own board snapshot, so editing/deleting a saved map cannot change an existing table. Saved maps are private to their owner; room participants receive the selected board.

Production email delivery needs these private Railway service variables:

- `RESEND_API_KEY`: a sending API key from Resend.
- `EMAIL_FROM`: an address on your verified Resend sending domain, for example `Spin the Block <play@your-domain.com>`.

Configure these in Railway Variables, never in Git or chat. Resend domain verification must be completed before sending to real players. See [Resend’s sending API](https://resend.com/docs/api-reference/emails/send-email). Until configured, the UI explains that delivery is unavailable and leaves guest maps playable; verification is never faked. Codes expire after 15 minutes, allow five attempts, can be resent after a minute, and are consumed once. Only a salted digest is stored, and email addresses and saved maps are omitted from other players’ profile views. Verification unlocks map features; it is not a password-reset service. Existing username/password accounts can verify through Profile → Account.
