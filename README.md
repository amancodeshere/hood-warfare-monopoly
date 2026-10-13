# Spin the Block

A complete online property party game with an original street city, private invite rooms, tactical rent shootouts, and roulette cards. Built from scratch for Hood Warfare Monopoly.

**Play:** https://spin-the-block-production.up.railway.app

## Playing

Enter a street name and create a private room. Send the invite link to friends; 2–4 crews can play. The host can fill spare seats with bots, choose 10/20/30 rounds, then start. Practice mode starts immediately against three bots.

Each crew starts with $1,500. Claim blocks, collect rent, complete districts, and build businesses. When player rent is unaffordable, raise cash by mortgaging turf or selling businesses, or challenge the landlord to a simultaneous tactic shootout. Fire beats flank, flank beats guard, guard beats fire. Win and rent is wiped. Lose and the landlord inherits your remaining cash and turf. Roulette spaces offer weighted jackpots, jail, payday, escape cards, and losses. Full rules and odds are available in the game.

Last crew standing wins, or the richest active crew at the round limit. Turn timeouts keep online matches moving. Your browser stores an opaque seat token so refreshes and disconnects can restore the seat. Do not clear browser storage while a match is running. Matches expire after 24 hours without activity; timers pause while no human is connected.

## Development

Node 22 recommended (required for Railway infrastructure tools).

```sh
npm ci
npm run dev
```

Vite serves http://localhost:5173 and proxies Socket.IO to the Node server on port 3000. To avoid an existing server, set `PORT=4311 API_PORT=4311 npm run dev`. The API proxy accepts `API_PORT`.

```sh
npm run lint          # ESLint, zero warnings
npm test              # 26 engine tests + real multiplayer/restart integration test
npm run test:coverage # Node test coverage
npm run build         # Production client
npm run test:e2e      # 4 Chromium browser tests against production build
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

Room snapshots and private seat tokens are written atomically to a persistent volume and restored on restart. This deployment intentionally uses **one replica**: room coordination is in memory, with disk recovery. Horizontal scaling requires a shared database plus Socket.IO adapter and distributed turn scheduling. This release has not been load-tested for large public traffic. Health checks verify readiness; external uptime monitoring and volume backups remain operator responsibilities. Clearing browser storage loses the seat credential; no account recovery system is included.

## Assets and design

Original code-authored SVG city, four fictional crews, six districts, and self-hosted Barlow fonts. No Hood Warfare game files or Monopoly artwork are included. DESIGN.md records the built interface. All currency and roulette stakes are fictional; there are no payments.
