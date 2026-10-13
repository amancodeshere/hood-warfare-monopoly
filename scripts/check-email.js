import { emailConfiguration } from "../server/email.js";

const { configured, missing } = emailConfiguration();
if (!configured) {
  console.error(`Email delivery disabled. Missing: ${missing.join(", ")}.`);
  console.error("Follow docs/email-delivery.md to enable verification emails.");
  process.exitCode = 1;
} else {
  console.log("Email variables configured. No email was sent.");
  console.log(
    "Domain verification and inbox delivery still require the live acceptance check in docs/email-delivery.md.",
  );
}
