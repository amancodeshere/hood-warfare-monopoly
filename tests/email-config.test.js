import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { emailConfiguration } from "../server/email.js";

test("delivery configuration rejects missing and whitespace-only variables", () => {
  assert.deepEqual(emailConfiguration({}), {
    configured: false,
    missing: ["RESEND_API_KEY", "EMAIL_FROM"],
  });
  assert.deepEqual(
    emailConfiguration({ RESEND_API_KEY: "   ", EMAIL_FROM: "sender@example.com" }),
    { configured: false, missing: ["RESEND_API_KEY"] },
  );
});

test("configuration CLI reports readiness without exposing secrets or claiming delivery", () => {
  const key = "private-test-key-never-print";
  const sender = "private-sender@example.com";
  const run = (env) =>
    spawnSync(process.execPath, ["scripts/check-email.js"], {
      encoding: "utf8",
      env: { ...process.env, RESEND_API_KEY: key, EMAIL_FROM: sender, ...env },
    });
  const ready = run({});
  assert.equal(ready.status, 0);
  assert.match(ready.stdout, /No email was sent/);
  assert.match(ready.stdout, /live acceptance/);
  assert(!ready.stdout.includes(key));
  assert(!ready.stdout.includes(sender));
  const missing = run({ EMAIL_FROM: "" });
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /Missing: EMAIL_FROM/);
  assert(!missing.stderr.includes(key));
});
