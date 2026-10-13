// Deterministic browser fixtures are loaded into an isolated test-only directory.
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { player, room, start, land, action } from "../server/game.js";
import { BOARD as LEGACY_BOARD } from "../shared/legacy-board.js";
if (!process.env.DATA_DIR?.includes("stb-playwright-"))
  throw new Error("Refusing to seed outside a browser test directory");
const fixtures = [];
const sessions = [];
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
    if (kind === "duel") delete g.duel.mode; // Preserve a legacy tactic-duel fixture.
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
