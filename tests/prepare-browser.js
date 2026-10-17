// Deterministic browser fixtures are loaded into an isolated test-only directory.
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { player, room, start, land, action } from "../server/game.js";
import { BOARD as LEGACY_BOARD } from "../shared/legacy-board.js";
if (!process.env.DATA_DIR?.includes("stb-playwright-"))
  throw new Error("Refusing to seed outside a browser test directory");
const fixtures = [];
const sessions = [];
// Rent-duel elimination fixtures use a bot challenger with a locked final
// tactic. The landlord can settle the duel deterministically from the browser.
for (const killerTakesAll of [false, true]) {
  const landlord = player("Landlord"),
    challenger = player("Challenger Bot", true),
    witness = player("Witness Bot", true),
    code = killerTakesAll ? "KTABOT" : "DEF BOT".replace(" ", ""),
    g = room(code, landlord, { settings: { autoFill: false, killerTakesAll } });
  g.players.push(challenger, witness);
  g.board = LEGACY_BOARD;
  g.schemaVersion = 1;
  g.settings.auctions = false;
  g.settings.doubles = false;
  start(g, landlord.id);
  // The bot owes rent; the landlord is one turn after the eliminated bot so
  // the server can show the settled result without an unrelated roll.
  g.players = [challenger, landlord, witness];
  g.turn = 0;
  challenger.cash = 0;
  challenger.pos = 1;
  landlord.cash = 1500;
  g.props[1] = { owner: landlord.id, level: 0, mortgaged: false };
  g.props[2] = { owner: challenger.id, level: 2, mortgaged: false };
  g.props[6] = { owner: challenger.id, level: 0, mortgaged: true };
  land(g);
  action(g, challenger.id, { type: "shootout" });
  delete g.duel.mode;
  delete g.duel.arena;
  g.duel.scores[landlord.id] = 1;
  g.duel.choices[challenger.id] = "fire";
  fixtures.push(g);
  sessions.push([`elimination-${killerTakesAll ? "enabled" : "default"}-landlord`, { code, id: landlord.id }]);
}
// A post-elimination turn where the returned deed is the active purchase.
// Resolve the loss through the same authoritative game action before seeding
// this browser state, then leave the landlord at the returned block.
const reclaimLandlord = player("Reclaim Landlord"),
  reclaimBot = player("Reclaim Bot", true),
  reclaimWitness = player("Reclaim Witness", true),
  reclaim = room("KTAREB", reclaimLandlord, { settings: { autoFill: false } });
reclaim.players.push(reclaimBot, reclaimWitness);
reclaim.board = LEGACY_BOARD;
reclaim.schemaVersion = 1;
reclaim.settings.auctions = false;
reclaim.settings.doubles = false;
start(reclaim, reclaimLandlord.id);
reclaim.players = [reclaimBot, reclaimLandlord, reclaimWitness];
reclaim.turn = 0;
reclaimBot.cash = 0;
reclaimBot.pos = 1;
reclaim.props[1] = { owner: reclaimLandlord.id, level: 0, mortgaged: false };
reclaim.props[2] = { owner: reclaimBot.id, level: 2, mortgaged: false };
land(reclaim);
action(reclaim, reclaimBot.id, { type: "shootout" });
delete reclaim.duel.mode;
delete reclaim.duel.arena;
reclaim.duel.scores[reclaimLandlord.id] = 1;
reclaim.duel.choices[reclaimBot.id] = "fire";
action(reclaim, reclaimLandlord.id, { type: "duel-choice", choice: "guard" });
// The debtor is eliminated; advance to the landlord's turn and stage the
// returned deed at the market for an ordinary purchase through the UI.
action(reclaim, reclaimBot.id, { type: "end" });
reclaim.turn = 1;
reclaimLandlord.pos = 2;
reclaim.phase = "buy";
reclaim.pending = null;
fixtures.push(reclaim);
sessions.push(["elimination-reclaim-landlord", { code: reclaim.code, id: reclaimLandlord.id }]);

// Lobby rule settings are exercised from both connected clients before start.
const ruleHost = player("Rule Host"),
  ruleGuest = player("Rule Guest"),
  ruleLobby = room("KTARUL", ruleHost, { settings: { autoFill: false } });
ruleLobby.players.push(ruleGuest);
fixtures.push(ruleLobby);
sessions.push(
  ["elimination-rules-host", { code: ruleLobby.code, id: ruleHost.id }],
  ["elimination-rules-guest", { code: ruleLobby.code, id: ruleGuest.id }],
);
for (const kind of [
  "wheel",
  "duel",
  "stoppa",
  "auction",
  "fps",
  "fps-mobile",
]) {
  const a = player("Ace"),
    b = player("Rival"),
    c = player("Watcher"),
    g = room(
      {
        wheel: "WHEEL1",
        duel: "DUEL01",
        stoppa: "STOP01",
        auction: "BID001",
        fps: "FPS001",
        "fps-mobile": "FPM001",
      }[kind],
      a,
    );
  g.players.push(b, c);
  if (["wheel", "duel"].includes(kind)) {
    g.board = LEGACY_BOARD;
    g.schemaVersion = 1;
    g.settings.auctions = false;
    g.settings.doubles = false;
  }
  start(g, a.id);
  if (kind === "wheel") {
    a.pos = 10;
    land(g);
  } else if (kind === "stoppa") {
    a.pos = 7;
    land(g);
  } else if (kind === "auction") {
    a.pos = 1;
    land(g);
    action(g, a.id, { type: "skip" });
  } else {
    g.props[1] = { owner: b.id, level: 0, mortgaged: false };
    a.pos = 1;
    a.cash = 0;
    land(g);
    action(g, a.id, { type: "shootout" });
    if (kind === "duel") {
      delete g.duel.mode;
      delete g.duel.arena;
    } // Preserve a legacy tactic-duel fixture.
  }
  fixtures.push(g);
  sessions.push(
    [kind + "-ace", { code: g.code, id: a.id }],
    [kind + "-rival", { code: g.code, id: b.id }],
  );
}
const maker = player("Big Stepper"),
  pieces = room("PIECE1", maker);
for (let i = 1; i < 8; i++)
  pieces.players.push(
    player(
      [
        "Gold Chain",
        "Lowrider",
        "Uncle",
        "Auntie",
        "Side Quest",
        "Grove",
        "Final Boss",
      ][i - 1],
    ),
  );
maker.escapes = 2;
pieces.settings.maxPlayers = 8;
pieces.pot = 325;
pieces.players[1].escapes = 1;
pieces.players[7].name = "Final Boss With Drip";
start(pieces, maker.id);
pieces.players.forEach((p, i) => {
  p.crew = i;
  p.pos = i < 2 ? 1 : 0;
});
for (const id of [1, 3])
  pieces.props[id] = { owner: maker.id, level: 4, mortgaged: false };
for (const id of [6, 8, 9])
  pieces.props[id] = {
    owner: pieces.players[1].id,
    level: 5,
    mortgaged: false,
  };
pieces.props[11] = { owner: pieces.players[2].id, level: 0, mortgaged: true };
fixtures.push(pieces);
sessions.push(["pieces-ace", { code: pieces.code, id: maker.id }]);
for (const kind of ["trading", "lost"]) {
  const ace = player("Trade Ace"),
    rival = player("Trade Rival"),
    observer = player("Third Crew"),
    g = room(kind === "trading" ? "DEAL01" : "LOST01", ace);
  g.players.push(rival, observer);
  start(g, ace.id);
  g.board[1].name = "Auntie’s Tax-Free Corner";
  g.props[1] = { owner: ace.id, level: 0, mortgaged: true };
  g.props[3] = { owner: ace.id, level: 0, mortgaged: false };
  g.props[6] = { owner: rival.id, level: 0, mortgaged: false };
  ace.escapes = 2;
  rival.escapes = 1;
  if (kind === "lost") {
    ace.out = true;
    g.turn = 1;
    g.phase = "roulette";
    g.pending = null;
  }
  fixtures.push(g);
  sessions.push(
    [kind + "-ace", { code: g.code, id: ace.id }],
    [kind + "-rival", { code: g.code, id: rival.id }],
  );
}
// Quick-board property management: isolated from the trading/pieces scenarios.
const quickBuilder = player("Quick Builder"), quickRival = player("Quick Rival");
const quickBuild = room("QBUILD", quickBuilder, {settings: {mapSize: "quick", autoFill: false}});
quickBuild.players.push(quickRival);
start(quickBuild, quickBuilder.id);
quickBuilder.cash = 4000;
for (const tile of quickBuild.board.filter(t => t.group === 0))
  quickBuild.props[tile.id] = {owner: quickBuilder.id, level: 0, mortgaged: false};
fixtures.push(quickBuild);
sessions.push(["quick-builder-ace", {code: quickBuild.code, id: quickBuilder.id}]);
mkdirSync(process.env.DATA_DIR, { recursive: true });
writeFileSync(
  resolve(process.env.DATA_DIR, "rooms.json"),
  JSON.stringify({ rooms: fixtures, sessions }),
);
// Verified account fixture: no verification bypass exists in the production server.
const { profileStore } = await import("../server/profiles.js");
let code;
const profiles = profileStore(process.env.DATA_DIR, {
  send: async (m) => {
    code = m.code;
  },
});
const account = profiles.authorize(null, "Map Maker");
await profiles.register(
  account.profile.id,
  { username: "map_maker", password: "map-maker-test-password" },
  "fixture",
);
await profiles.requestEmail(
  account.profile.id,
  { email: "map@example.com" },
  "fixture",
);
profiles.verifyEmail(account.profile.id, { code });
writeFileSync(
  resolve(process.env.DATA_DIR, "map-token.json"),
  JSON.stringify({ token: account.token }),
);
