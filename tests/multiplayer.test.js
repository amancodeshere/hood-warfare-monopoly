import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { io } from "socket.io-client";
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
test("real multiplayer: authority, room capacity, reconnect, origin checks, and persistence", async (t) => {
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
  assert((await send(host, "chat", { text: "Secret plan", team: true })).ok);
  assert(ally.game.chat.some((m) => m.text === "Secret plan"));
  assert(!enemy.game.chat.some((m) => m.text === "Secret plan"));
  assert(!watch.game.chat.some((m) => m.text === "Secret plan"));
  await send(host, "chat", { text: "Hello table" });
  assert(watch.game.chat.some((m) => m.text === "Hello table"));
  await send(enemy, "profile-change", { type: "mute", to: hp.profile.id });
  assert(!enemy.game.chat.some((m) => m.text === "Hello table"));
  await send(host, "lobby", { type: "start" });
  assert.equal(host.game.players.length, 8);
  assert((await send(watch, "action", { type: "roll" })).error);
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
  assert(
    (await send(solo, "create", { solo: true, settings: { maxPlayers: 8 } }))
      .ok,
  );
  assert.equal(solo.game.players.filter((p) => p.bot).length, 7);
  assert.equal(solo.game.limit, null);
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
