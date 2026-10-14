import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { io } from "socket.io-client";
import { room, player, start, land, action } from "../server/game.js";
const data = mkdtempSync(join(tmpdir(), "stb-test-"));
const port = 4387,
  url = `http://127.0.0.1:${port}`;
let proc;
async function boot() {
  proc = spawn(process.execPath, ["server/index.js"], {
    env: { ...process.env, PORT: String(port), DATA_DIR: data },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Server startup timed out")),
      8000,
    );
    proc.stdout.on("data", (b) => {
      if (String(b).includes("listening")) {
        clearTimeout(timeout);
        resolve();
      }
    });
    proc.on("error", reject);
  });
}
async function stop() {
  if (!proc) return;
  await new Promise((resolve) => {
    proc.once("exit", resolve);
    proc.kill("SIGTERM");
  });
  proc = null;
}
async function client() {
  const s = io(url, { transports: ["websocket"], reconnection: false });
  await new Promise((resolve, reject) => {
    s.once("connect", resolve);
    s.once("connect_error", reject);
  });
  s.on("state", (g) => (s.game = g));
  return s;
}
const send = (s, e, d = {}) =>
  new Promise((resolve, reject) =>
    s.timeout(3000).emit(e, d, (err, r) => (err ? reject(err) : resolve(r))),
  );
function nextState(socket, predicate) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off("state", onState);
      reject(new Error("Expected multiplayer state did not arrive"));
    }, 3000);
    function onState(state) {
      if (!predicate(state)) return;
      clearTimeout(timeout);
      socket.off("state", onState);
      resolve(state);
    }
    socket.on("state", onState);
  });
}
test("real multiplayer: authority, room capacity, reconnect, origin checks, and persistence", async (t) => {
  const captain = player("Captain"),
    finished = room("REPLAY", captain);
  finished.players.push(player("Bot", true));
  start(finished, captain.id);
  Object.assign(finished, {
    status: "finished",
    phase: "finished",
    winner: captain.id,
    winners: [captain.id],
    statsRecorded: true,
    finishedAt: Date.now(),
    auction: { tile: 1 },
    lastMove: { id: "old" },
    teamNames: { 1: "Custom crew" },
  });
  const fighter = player("Arena Ace"),
    landlord = player("Arena Rival"),
    arena = room("ARENA1", fighter);
  arena.players.push(landlord, player("Arena Watcher"));
  start(arena, fighter.id);
  arena.props[1] = { owner: landlord.id, level: 0, mortgaged: false };
  fighter.pos = 1;
  fighter.cash = 0;
  land(arena);
  action(arena, fighter.id, { type: "shootout" });
  Object.assign(arena.duel, {
    stage: "live",
    ready: [fighter.id, landlord.id],
    startsAt: Date.now() - 100,
    endsAt: Date.now() + 30000,
    tickAt: Date.now() - 100,
  });
  arena.deadline = arena.duel.endsAt;
  writeFileSync(
    join(data, "rooms.json"),
    JSON.stringify({
      rooms: [finished, arena],
      sessions: [
        ["rematch-host", { code: "REPLAY", id: captain.id }],
        ["arena-ace", { code: arena.code, id: fighter.id }],
        ["arena-rival", { code: arena.code, id: landlord.id }],
      ],
    }),
  );
  await boot();
  const clients = [];
  t.after(async () => {
    clients.forEach((s) => s.disconnect());
    await stop();
    rmSync(data, { recursive: true, force: true });
  });
  const a = await client(),
    b = await client();
  clients.push(a, b);
  const arenaClient = await client(),
    arenaRival = await client();
  clients.push(arenaClient, arenaRival);
  const compact = [];
  arenaRival.on("arena-state", (packet) => compact.push(packet));
  assert((await send(arenaClient, "resume", { token: "arena-ace" })).ok);
  assert((await send(arenaRival, "resume", { token: "arena-rival" })).ok);
  let fullUpdates = 0;
  arenaRival.on("state", () => fullUpdates++);
  for (let seq = 1; seq <= 300; seq++)
    assert(
      (
        await send(arenaClient, "action", {
          type: "duel-input",
          seq,
          forward: 0,
          strafe: 0,
          yaw: 0,
          pitch: 0,
        })
      ).ok,
    );
  assert(
    (
      await send(arenaClient, "chat", {
        text: "Movement does not consume the chat budget",
      })
    ).ok,
  );
  await new Promise((resolve) => setTimeout(resolve, 250));
  assert(compact.length >= 1);
  assert(compact.length < 15);
  assert(fullUpdates <= 2);
  assert(
    !("board" in compact[0]) &&
      !("chat" in compact[0]) &&
      !("players" in compact[0]),
  );
  assert.equal(compact.at(-1).fighters[fighter.id].x, 2.5);
  assert(
    (await send(arenaClient, "action", { type: "duel-fire", yaw: 0, pitch: 0 }))
      .ok,
  );
  await new Promise((resolve) => setTimeout(resolve, 650));
  assert.equal(compact.at(-1).fighters[landlord.id].hp, 75);
  let throttled = false;
  for (let seq = 301; seq <= 410; seq++) {
    const r = await send(arenaClient, "action", {
      type: "duel-input",
      seq,
      forward: 0,
      strafe: 0,
      yaw: 0,
      pitch: 0,
    });
    if (r.error) {
      assert.match(r.error, /Too many/);
      throttled = true;
      break;
    }
  }
  assert(throttled);
  assert((await send(arenaClient, "action", { type: "forfeit" })).ok);
  assert((await send(arenaClient, "leave")).ok);
  arenaClient.disconnect();
  arenaRival.disconnect();
  assert.match(
    (await send(a, "create", { settings: { map: "neon" } })).error,
    /Verify/,
  );
  assert.match((await send(a, "map-save", { definition: {} })).error, /Verify/);
  assert((await send(a, "action", { type: {} })).error);
  const created = await send(a, "create", { name: "Ace", limit: 10 });
  assert(created.token.length === 64);
  const joined = await send(b, "join", { name: "Rival", code: created.code });
  assert(joined.ok);
  assert.equal(b.game.players.length, 2);
  assert(!JSON.stringify(b.game).includes(created.token));
  assert((await send(b, "lobby", { type: "start" })).error);
  await send(a, "lobby", { type: "add-bot" });
  await send(a, "lobby", { type: "add-bot" });
  const outsider = await client();
  clients.push(outsider);
  assert(
    (
      await send(outsider, "join", { name: "Fifth", code: created.code })
    ).error.includes("full"),
  );
  assert((await send(outsider, "resume", { token: "fake" })).error);
  await send(a, "lobby", { type: "start" });
  assert((await send(b, "action", { type: "roll" })).error.includes("turn"));
  const before = a.game.players[0].cash;
  const roll = await send(a, "action", {
    type: "roll",
    dice: [6, 6],
    cash: 999999,
  });
  assert(roll.ok);
  assert(a.game.dice.every((n) => n >= 1 && n <= 6));
  assert(a.game.players[0].cash <= before + 200);
  assert((await send(a, "action", { type: "roll" })).error);
  const pos = a.game.players[0].pos;
  a.disconnect();
  const resumed = await client();
  clients.push(resumed);
  assert((await send(resumed, "resume", { token: created.token })).ok);
  assert.equal(resumed.game.players[0].pos, pos);
  clients.forEach((s) => s.disconnect());
  await stop();
  await boot();
  const afterRestart = await client();
  clients.push(afterRestart);
  assert((await send(afterRestart, "resume", { token: created.token })).ok);
  assert.equal(afterRestart.game.players[0].pos, pos);
  assert.equal(afterRestart.game.status, "playing");
  // Public discovery, team chat secrecy, spectator restrictions, social settings.
  const host = await client(),
    ally = await client(),
    enemy = await client(),
    watch = await client();
  clients.push(host, ally, enemy, watch);
  const hp = await send(host, "profile-auth", { name: "Host" }),
    ap = await send(ally, "profile-auth", { name: "Ally" }),
    _ep = await send(enemy, "profile-auth", { name: "Enemy" });
  await send(host, "profile-change", {
    type: "friend-request",
    to: ap.profile.code,
  });
  assert(
    (
      await send(ally, "profile-change", {
        type: "friend-accept",
        to: hp.profile.id,
      })
    ).ok,
  );
  const pub = await send(host, "create", {
    name: "Host",
    settings: { maxPlayers: 8, visibility: "public", teams: true },
    limit: 0,
  });
  assert.equal(host.game.limit, null);
  assert.equal(host.game.board.length, 40);
  assert(
    (
      await send(host, "profile-change", {
        type: "invite",
        to: ap.profile.id,
        code: pub.code,
      })
    ).ok,
  );
  const list = await send(ally, "rooms");
  assert(list.rooms.some((g) => g.code === pub.code));
  assert(!list.rooms.some((g) => g.code === created.code));
  assert((await send(ally, "join", { name: "Ally", code: pub.code })).ok);
  assert((await send(enemy, "join", { name: "Enemy", code: pub.code })).ok);
  await send(host, "team", { team: "1" });
  await send(ally, "team", { team: "1" });
  await send(enemy, "team", { team: "2" });
  assert(
    (await send(watch, "spectate", { code: pub.code, name: "Watcher" })).ok,
  );
  assert((await send(watch, "chat", { text: "Spectator spam" })).error);
  const secretReceived = nextState(ally, (g) =>
    g.chat.some((m) => m.text === "Secret plan"),
  );
  assert((await send(host, "chat", { text: "Secret plan", team: true })).ok);
  await secretReceived;
  assert(ally.game.chat.some((m) => m.text === "Secret plan"));
  assert(!enemy.game.chat.some((m) => m.text === "Secret plan"));
  assert(!watch.game.chat.some((m) => m.text === "Secret plan"));
  const publicReceived = nextState(watch, (g) =>
    g.chat.some((m) => m.text === "Hello table"),
  );
  await send(host, "chat", { text: "Hello table" });
  await publicReceived;
  assert(watch.game.chat.some((m) => m.text === "Hello table"));
  const changingRole = await client();
  clients.push(changingRole);
  const observing = await send(changingRole, "spectate", { code: pub.code });
  assert(
    (await send(changingRole, "join", { code: pub.code, name: "Fresh seat" }))
      .ok,
  );
  assert(!changingRole.game.spectators.some((p) => p.id === observing.id));
  await send(enemy, "profile-change", { type: "mute", to: hp.profile.id });
  assert(!enemy.game.chat.some((m) => m.text === "Hello table"));
  await send(host, "lobby", { type: "start" });
  assert.equal(host.game.players.length, 8);
  assert((await send(watch, "action", { type: "roll" })).error);
  const secondDevice = await client();
  clients.push(secondDevice);
  await send(secondDevice, "profile-auth", { token: hp.token });
  const recovered = await send(secondDevice, "join", { code: pub.code });
  assert(recovered.ok);
  assert.equal(recovered.id, pub.id);
  assert.equal(secondDevice.game.players.length, 8);
  const profileLookup = await send(watch, "profile-find", {
    query: hp.profile.id,
  });
  assert(!JSON.stringify(profileLookup).includes(hp.token));
  assert(
    (await send(enemy, "profile-change", { type: "block", to: hp.profile.id }))
      .ok,
  );
  assert(!(await send(enemy, "rooms")).rooms.some((g) => g.code === pub.code));
  assert(
    (
      await send(watch, "report", {
        id: host.game.players[0].id,
        reason: "Integration test report",
      })
    ).ok,
  );
  await send(host, "action", { type: "roll" });
  assert(!JSON.stringify(host.game).includes("Integration test report"));
  // Single-player creation supports seven opponents and no implicit round cap.
  const solo = await client();
  clients.push(solo);
  const soloCreated = await send(solo, "create", {
    solo: true,
    settings: { maxPlayers: 8 },
  });
  assert(soloCreated.ok);
  solo.savedToken = soloCreated.token;
  assert.equal(solo.game.players.filter((p) => p.bot).length, 7);
  assert.equal(solo.game.limit, null);
  const replay = await client();
  clients.push(replay);
  await send(replay, "resume", { token: "rematch-host" });
  assert((await send(replay, "lobby", { type: "rematch" })).ok);
  assert.equal(replay.game.status, "lobby");
  assert.equal(replay.game.winner, undefined);
  assert.equal(replay.game.statsRecorded, undefined);
  assert.equal(replay.game.auction, undefined);
  assert.equal(replay.game.lastMove, undefined);
  assert.equal(replay.game.teamNames["1"], "Custom crew");
  // The solo room freezes its clock while no human is connected.
  const deadline = solo.game.deadline;
  solo.disconnect();
  await new Promise((resolve) => setTimeout(resolve, 2000));
  const soloReconnect = await client();
  clients.push(soloReconnect);
  assert((await send(soloReconnect, "resume", { token: solo.savedToken })).ok);
  assert(soloReconnect.game.deadline >= deadline + 1200);
  await send(watch, "spectate", { code: soloCreated.code });
  assert((await send(soloReconnect, "action", { type: "forfeit" })).ok);
  assert((await send(soloReconnect, "leave")).ok);
  assert.equal(watch.game.players[0].connected, false);
  const stoppedRevision = watch.game.revision;
  await new Promise((resolve) => setTimeout(resolve, 1800));
  assert.equal(watch.game.revision, stoppedRevision);
  const health = await fetch(url + "/api/health");
  assert.equal(health.status, 200);
  const blocked = io(url, {
    transports: ["websocket"],
    extraHeaders: { Origin: "https://attacker.example" },
    reconnection: false,
    timeout: 2000,
  });
  clients.push(blocked);
  await new Promise((resolve, reject) => {
    blocked.once("connect", () => reject(new Error("Foreign origin accepted")));
    blocked.once("connect_error", resolve);
  });
});
