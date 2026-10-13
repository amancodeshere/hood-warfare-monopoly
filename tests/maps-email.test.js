import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { profileStore } from "../server/profiles.js";
import { MAPS, BOARD } from "../shared/board.js";
import { draftMap, mapDefinition } from "../shared/maps.js";
function setup(t, send) {
  const dir = mkdtempSync(join(tmpdir(), "stb-email-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const mail = [];
  let time = 1000000;
  const s = profileStore(dir, {
    send: send || (async (m) => mail.push(m)),
    available: () => true,
    now: () => time,
  });
  return { s, dir, mail, tick: (n) => (time += n) };
}
async function account(s, username) {
  const a = s.authorize(null, username);
  await s.register(
    a.profile.id,
    { username, password: "a-long-password-for-testing" },
    username,
  );
  return a.profile.id;
}
test("verification codes expire, are single-use, private, rate-limited and persist without plaintext", async (t) => {
  const { s, mail, tick, dir } = setup(t),
    id = await account(s, "ace");
  assert.throws(() => s.resolveMap(id, "neon"), /Verify/);
  await s.requestEmail(id, { email: "ACE@example.com" }, "ip");
  assert.equal(mail[0].email, "ace@example.com");
  assert(
    !readFileSync(join(dir, "profiles.json"), "utf8").includes(mail[0].code),
  );
  assert(
    !JSON.stringify(s.safe(s.profile(id), null)).includes("ace@example.com"),
  );
  await assert.rejects(
    s.requestEmail(id, { email: "ace@example.com" }, "ip"),
    /Wait/,
  );
  assert.throws(() => s.verifyEmail(id, { code: "000000" }), /incorrect/);
  tick(900001);
  assert.throws(() => s.verifyEmail(id, { code: mail[0].code }), /expired/);
  await s.requestEmail(id, { email: "ace@example.com" }, "ip");
  const verified = s.verifyEmail(id, { code: mail[1].code });
  assert.equal(verified.profile.verified, true);
  assert.throws(() => s.verifyEmail(id, { code: mail[1].code }), /expired/);
  assert.equal(
    profileStore(dir).authorize(s.authorize(null, "other").token).profile
      .verified,
    false,
  );
  assert.equal(profileStore(dir).profile(id).email, "ace@example.com");
  assert.equal(s.resolveMap(id, "neon").board.length, 40);
});
test("five failed codes exhaust challenge, concurrent send is rejected and delivery failure creates no challenge", async (t) => {
  const { s, mail } = setup(t),
    id = await account(s, "rival");
  await s.requestEmail(id, { email: "rival@example.com" }, "ip");
  for (let i = 0; i < 5; i++)
    assert.throws(() => s.verifyEmail(id, { code: "000000" }), /incorrect/);
  assert.throws(() => s.verifyEmail(id, { code: mail[0].code }), /expired/);
  let release;
  const delayed = setup(
    t,
    () =>
      new Promise((r) => {
        release = r;
      }),
  );
  const d = await account(delayed.s, "slow");
  const task = delayed.s.requestEmail(d, { email: "slow@example.com" }, "slow");
  await assert.rejects(
    delayed.s.requestEmail(d, { email: "slow@example.com" }, "slow"),
    /already/,
  );
  release();
  await task;
  const failed = setup(t, async () => {
      throw new Error("Could not send");
    }),
    f = await account(failed.s, "failed");
  await assert.rejects(
    failed.s.requestEmail(f, { email: "f@example.com" }, "failed"),
    /Could not send/,
  );
  assert.equal(failed.s.profile(f).verification, undefined);
});
test("verified email uniqueness is checked on consumption; saved maps are scoped, validated and immutable snapshots", async (t) => {
  const { s, mail } = setup(t),
    a = await account(s, "alpha"),
    b = await account(s, "bravo");
  for (const id of [a, b])
    await s.requestEmail(id, { email: "same@example.com" }, id);
  s.verifyEmail(a, { code: mail[0].code });
  assert.throws(
    () => s.verifyEmail(b, { code: mail[1].code }),
    /already belongs/,
  );
  assert.throws(() => s.saveMap(b, { definition: draftMap() }), /Verify/);
  const d = draftMap("boardwalk");
  d.name = "My Cookout";
  d.names[1] = "Auntie Owes Me";
  d.events[2] = "stoppa";
  const { map } = s.saveMap(a, { definition: d });
  const selected = "custom:" + map.id;
  const snapshot = s.resolveMap(a, selected);
  assert.equal(snapshot.board[1].name, "Auntie Owes Me");
  assert.equal(snapshot.board[2].type, "stoppa");
  assert.throws(() => s.resolveMap(b, selected), /Verify/);
  d.names[1] = "Changed";
  s.saveMap(a, { id: map.id, definition: d });
  assert.equal(snapshot.board[1].name, "Auntie Owes Me");
  assert.throws(
    () => mapDefinition({ ...d, events: { 0: "stoppa" } }),
    /Only surprise/,
  );
  assert.throws(() => mapDefinition({ ...d, names: ["wrong"] }), /40 blocks/);
  assert.throws(() => mapDefinition({ ...d, name: "<script>" }), /markup/);
  assert.throws(
    () => s.saveMap(a, { id: "someone-else", definition: d }),
    /collection/,
  );
  s.deleteMap(a, { id: map.id });
  assert.equal(snapshot.board.length, 40);
  assert.throws(() => s.resolveMap(a, selected), /collection/);
  assert.equal(s.safe(s.profile(a), b).savedMaps, undefined);
});
test("all six city boards retain their economy and essential spaces", (t) => {
  const { s } = setup(t);
  const a = s.authorize(null, "guest");
  for (const map of MAPS.filter((m) => !m.verified))
    assert.equal(s.resolveMap(a.profile.id, map.id).board.length, 40);
  assert.equal(MAPS.length, 6);
  for (const m of MAPS) {
    const draft = draftMap(m.id);
    assert.equal(draft.names.length, 40);
    for (const tile of BOARD)
      if (!["card", "roulette", "stoppa"].includes(tile.type)) {
        assert.equal(mapDefinition(draft).names[tile.id], draft.names[tile.id]);
      }
  }
});

test("email transport uses the configured sender and keeps provider failures private", async (t) => {
  const { sendVerification, emailAvailable } =
    await import("../server/email.js");
  const previous = {
    key: process.env.RESEND_API_KEY,
    from: process.env.EMAIL_FROM,
    fetch: globalThis.fetch,
  };
  t.after(() => {
    if (previous.key === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previous.key;
    if (previous.from === undefined) delete process.env.EMAIL_FROM;
    else process.env.EMAIL_FROM = previous.from;
    globalThis.fetch = previous.fetch;
  });
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_FROM;
  assert.equal(emailAvailable(), false);
  await assert.rejects(
    sendVerification({ email: "a@example.com", code: "123456" }),
    /not available/,
  );
  process.env.RESEND_API_KEY = "test-only-key";
  process.env.EMAIL_FROM = "Spin the Block <play@example.com>";
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true };
  };
  await sendVerification({ email: "a@example.com", code: "123456" });
  assert.equal(request.url, "https://api.resend.com/emails");
  assert.equal(request.options.headers.Authorization, "Bearer test-only-key");
  const body = JSON.parse(request.options.body);
  assert.equal(body.from, process.env.EMAIL_FROM);
  assert.deepEqual(body.to, ["a@example.com"]);
  assert(body.text.includes("123456"));
  globalThis.fetch = async () => {
    throw new Error("secret provider internals");
  };
  await assert.rejects(
    sendVerification({ email: "a@example.com", code: "123456" }),
    (e) =>
      e.message.includes("Could not send") && !e.message.includes("internals"),
  );
});
