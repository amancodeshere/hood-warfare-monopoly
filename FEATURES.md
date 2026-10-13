# Richup comparison and this release

The comparison uses Richup’s public room settings and its official release notes, checked on 14 October 2026. This is an original implementation with its own board, art, economy, cards, and shootouts. The table records observable feature families rather than claiming identical rules or the same commercial service.

| Richup feature family                        | Spin the Block implementation                                                                                                                                         |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public/private rooms, 2–8 players, bot seats | Public directory, quick play, private invite links, 2–8 seats, bot autofill, solo with 1–7 opponents                                                                  |
| Maps and house rules                         | Two 40-square city maps; configurable starting cash, doubles, auctioning, mortgages, prison rent, even building, community payouts, order and capacity                |
| Property, utility and transport economy      | Eight districts, four transit lines, two utilities, four houses plus hotel, auctioning and mortgage/redeem                                                            |
| Trading                                      | Atomic offers containing multiple properties, cash in both directions, and escape cards; rescue gifts; fair-value checks during rent debt                             |
| Team alliances                               | Up to four named teams, no allied rent, shared district/transit/utility sets, teammate inheritance and server-filtered team chat                                      |
| Turn clock                                   | Free thinking time plus personal reserve, debt extension, donated minutes, idle elimination and disconnect pause                                                      |
| Chat and spectators                          | Global/team chat, readable spectator seats, per-profile mute/block, rate limits and saved reports                                                                     |
| Friends and account-only rooms               | Guest profiles, optional username/password accounts, friend requests, online status, invitations, registered-only room setting                                        |
| Statistics and history                       | Online wins/games, completion count, separate practice wins, leaderboard, last 30 games, participant-only private histories                                           |
| Appearance/store                             | Six token appearances unlocked with earned respect. No payment processing, PayPal store, purchased currency, arbitrary avatar uploads, or copied Richup assets        |
| Animation and ownership inspection           | Authored SVG city, walking tokens, roster hover highlights, selectable square details, reduced-motion support                                                         |
| Added street mechanics                       | Rent-debt first-person 1v1 shootout, weighted roulette, three equal-odds Oppa Stoppa spins feeding a shared Community Plot, unlimited last-crew/team-standing default |

Primary references:

- [Richup lobby and game information](https://richup.io)
- [Teams mode](https://blog.richup.io/richup-v1-16-introducing-teams-mode/)
- [Turn clock](https://blog.richup.io/richup-v1-17-the-turn-clock/)
- [Friendships and blocks](https://blog.richup.io/richup-v1-15-friendships-and-blocks/)
- [Store and appearances](https://blog.richup.io/richup-v1-11-introducing-the-store/)
- [Statistics](https://blog.richup.io/getting-to-know-user-statistics/)

## Persistence and service boundaries

One authoritative Node process coordinates rooms. Atomic snapshots recover games and profiles from the Railway volume. Opaque bearer tokens protect seats and profiles; salted scrypt protects registered passwords. Legacy rooms keep original square IDs, original prices, and original optional rules after upgrade. Rematches reset match state and statistics recording while preserving the connected crew and house settings.

This release does not provide payment commerce, email verification/recovery, uploaded avatars, an external staffed moderation team, or cross-server shared-room storage. Reports are available in the private server snapshot for an operator, not broadcast to players. Rooms and reports expire after 24 hours of inactivity. Profiles retain only 30 game records. Rankings require multiple distinct human profiles, but are not an anti-collusion rating system. Public traffic has not been load-tested at scale; the one-replica deployment is deliberate.

## Verification

CI runs lint, Node engine/profile/multiplayer tests with coverage, production build, and 16 Chromium browser tests. Game tests exercise legacy preservation, 40-space geometry, optional limits, cash conservation, auctions, team ownership/inheritance, fair trades, human timeouts, secret choices, and seeded full-match simulations. Integration tests exercise real sockets, origin rejection, private/public discovery, capacity, bot filling, team-chat secrecy, spectators, profile preferences, and restart recovery. Browser tests exercise desktop/mobile room play, roulette, shootouts, solo opponents, house settings, Oppa Stoppa, auctions, team chat, cosmetics, and account sign-in.

## Accounts and cities

- Dedicated sign-in entry with guest continuation and account creation.
- Real email code verification with expiry, attempt limits, resend throttling, and private addresses; requires Resend sender configuration in Railway.
- Six city themes with different block names, palettes, and surprise-space layouts; two guest maps and four verified account maps.
- Verified Map Studio: up to ten saved maps, 40 square names, eight district names/colors, and card/roulette/Oppa Stoppa event placement.
- Owner-only map editing and server-side selection permissions; guests can join custom cities.
- Immutable room maps, including rematches, even after the source map is edited or deleted.

## First-person shootouts and readable board pieces

New challenges use an authoritative 2D first-person alley duel with ready/countdown, aiming, dodge lanes, duck cover, head/body hit boxes, six-round magazines, reloads, health, a 30-second cap, bots, pause/recovery, and spectator restrictions. An exact timed tie protects the landlord; no hidden coin toss. Saved tactic duels remain compatible.

Ownership has a named crew badge and explicit mortgage state. Larger illustrated hooded crew figures, house counts, and hotel silhouettes remain readable on the detailed mobile board. Stacks show a primary piece and count; the property panel lists every resident crew. Earned token emblems remain visible.

## Negotiation, chat, and eliminated seats

Any active crew can propose multi-property/cash/escape-card deals between events without waiting for their turn. Counteroffers prefill reversed assets and replace an offer atomically; unique offer IDs reject stale responses. Summaries use the current map names, show mortgage status and cash after settlement, and preserve mortgage flags. Acceptance rechecks ownership, balances, cards, unbuilt districts, and debt fair-value constraints. Declining or withdrawing works during events; offers expire on turn advance.

Room chat appears beside the board, remains available while editing deals, retains private team channels and mute/block filtering, and has a direct composer shortcut. Eliminated seats get a prominent leave action, are not trapped by event overlays, clear browser seat state on exit, and cannot resume a revoked seat. Browser coverage includes two-crew counters, cross-browser chat, and mobile exit during an event.

Richup’s live game connection was unavailable during this implementation. These negotiation behaviors are implemented and tested; exact parity with its current trading UI/rules has not been verified.
