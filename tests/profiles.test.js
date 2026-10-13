import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { profileStore } from "../server/profiles.js";
import { player, room, start } from "../server/game.js";
function store(t) {
  const dir = mkdtempSync(join(tmpdir(), "stb-profiles-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return { dir, s: profileStore(dir) };
}
test("registered credentials are salted, tokens survive restart and secrets never enter views", async (t) => {
  const { s, dir } = store(t),
    a = s.authorize(null, "Ace"),
    b = s.authorize(null, "Rival");
  const input = { username: "ace", password: "a-long-secret-password" };
  const r = await s.register(a.profile.id, input, "first");
  await s.register(b.profile.id, { ...input, username: "rival" }, "second");
  assert.equal(r.profile.registered, true);
  assert.equal(s.authorize(a.token).profile.id, a.profile.id);
  assert.equal((await s.login(input, "third")).profile.id, a.profile.id);
  await assert.rejects(
    () => s.login({ ...input, password: "wrong" }, "fourth"),
    /incorrect/,
  );
  await assert.rejects(
    () => s.register(a.profile.id, input, "fifth"),
    /already/,
  );
  const disk = readFileSync(join(dir, "profiles.json"), "utf8");
  assert(!disk.includes(input.password));
  const p = JSON.parse(disk).profiles;
  assert.notEqual(p[0].salt, p[1].salt);
  assert.notEqual(p[0].passwordHash, p[1].passwordHash);
  assert(
    !JSON.stringify(s.safe(s.profile(a.profile.id), null)).includes("password"),
  );
  assert.equal(profileStore(dir).authorize(a.token).profile.id, a.profile.id);
});
test("friendship needs acceptance, blocks stop requests and only friends receive invitations", (t) => {
  const { s } = store(t),
    a = s.authorize(null, "Ace").profile,
    b = s.authorize(null, "Rival").profile,
    c = s.authorize(null, "Other").profile;
  s.change(a.id, { type: "friend-request", to: b.code });
  assert.equal(s.friends(b.id, new Set()).incoming[0].id, a.id);
  assert.throws(
    () => s.change(a.id, { type: "invite", to: b.id, code: "ABC123" }),
    /accepted/,
  );
  s.change(b.id, { type: "friend-accept", to: a.id });
  s.change(a.id, { type: "invite", to: b.id, code: "ABC123" });
  assert.equal(s.safe(s.profile(b.id)).invites.length, 1);
  assert.equal(s.friends(a.id, new Set([b.id])).friends[0].online, true);
  s.change(b.id, { type: "block", to: c.id });
  assert(s.blocked(c.id, b.id));
  assert.throws(() => s.change(c.id, { type: "friend-request", to: b.id }));
  assert.equal(s.safe(s.profile(b.id), a.id).invites, undefined);
});
test("private history stays private, stats are idempotent and bot practice cannot farm online ranks", (t) => {
  const { s } = store(t),
    a = s.authorize(null, "Ace").profile,
    b = s.authorize(null, "Rival").profile;
  const p = player("Ace"),
    q = player("Rival"),
    g = room("ABC123", p);
  p.profileId = a.id;
  q.profileId = b.id;
  g.players.push(q);
  start(g, p.id);
  g.status = "finished";
  g.winner = p.id;
  g.winners = [p.id];
  s.finish(g);
  g.statsRecorded = false;
  s.finish(g);
  assert.equal(s.safe(s.profile(a.id)).stats.wins, 1);
  assert.equal(s.safe(s.profile(b.id), a.id).history.length, 0);
  assert.equal(s.safe(s.profile(a.id)).history.length, 1);
  assert.equal(s.leaderboard()[0].history.length, 0);
  const solo = room("SOLO01", p);
  solo.players.push(player("Bot", true));
  start(solo, p.id);
  solo.status = "finished";
  solo.winner = p.id;
  s.finish(solo);
  assert.equal(s.safe(s.profile(a.id)).stats.wins, 1);
  assert.equal(s.safe(s.profile(a.id)).stats.practiceWins, 1);
  assert.equal(s.safe(s.profile(a.id)).respect, 12);
  assert.throws(() => s.change(a.id, { type: "equip", id: "boss" }));
  s.change(a.id, { type: "equip", id: "lowrider" });
  assert.equal(s.safe(s.profile(a.id)).appearance, "lowrider");
});
