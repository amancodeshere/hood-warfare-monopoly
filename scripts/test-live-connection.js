import { chromium } from "playwright";
import { mkdirSync } from "fs";

mkdirSync("game-audit/evidence", { recursive: true });

async function run() {
  console.log("Launching Chromium...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  const logs = [];
  const errors = [];
  page.on("console", msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on("pageerror", err => errors.push(err.message));

  console.log("Navigating to https://spin-the-block.up.railway.app ...");
  const start = Date.now();
  const response = await page.goto("https://spin-the-block.up.railway.app", { waitUntil: "networkidle" });
  const duration = Date.now() - start;

  console.log(`Navigation status: ${response ? response.status() : "none"} in ${duration}ms`);
  const title = await page.title();
  console.log(`Page title: ${title}`);

  await page.screenshot({ path: "game-audit/evidence/01_landing_desktop_1920.png", fullPage: true });
  console.log("Captured landing page screenshot!");

  console.log("Console logs:", logs.slice(0, 10));
  console.log("Errors:", errors);

  await browser.close();
  console.log("Done test run.");
}

run().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
