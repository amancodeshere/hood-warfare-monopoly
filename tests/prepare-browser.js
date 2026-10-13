// Deterministic browser fixtures are loaded into an isolated test-only directory.
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { player, room, start, land, action } from "../server/game.js";
if (!process.env.DATA_DIR?.includes("stb-playwright-"))
  throw new Error("Refusing to seed outside a browser test directory");
const fixtures = [];
const sessions = [];
for (const kind of ["wheel", "duel"]) {
  const a = player("Ace"),
    b = player("Rival"),
    c = player("Watcher"),
    g = room(kind === "wheel" ? "WHEEL1" : "DUEL01", a);
  g.players.push(b, c);
  start(g, a.id);
  if (kind === "wheel") {
    a.pos = 10;
    land(g);
  } else {
    g.props[1] = { owner: b.id, level: 0, mortgaged: false };
    a.pos = 1;
    a.cash = 0;
    land(g);
    action(g, a.id, { type: "shootout" });
  }
  fixtures.push(g);
  sessions.push(
    [kind + "-ace", { code: g.code, id: a.id }],
    [kind + "-rival", { code: g.code, id: b.id }],
  );
}
mkdirSync(process.env.DATA_DIR, { recursive: true });
writeFileSync(
  resolve(process.env.DATA_DIR, "rooms.json"),
  JSON.stringify({ rooms: fixtures, sessions }),
);
