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
