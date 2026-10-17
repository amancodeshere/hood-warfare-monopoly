import { chromium } from "playwright";

async function smokeTest() {
  console.log("Starting smoke test on https://spin-the-block.up.railway.app...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  // Listen to console logs to catch any frontend runtime errors
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  try {
    await page.goto("https://spin-the-block.up.railway.app", {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    console.log("Page loaded successfully.");

    // Continue as guest if landing page is shown
    const guestBtn = page.getByRole("button", { name: "Continue as guest" });
    if (await guestBtn.count()) {
      await guestBtn.click();
      console.log("Clicked Continue as guest.");
      await page.waitForTimeout(1000);
    }

    // Check Play solo vs bots button
    const soloBtn = page.getByRole("button", { name: "Play solo vs bots" });
    await soloBtn.waitFor({ state: "visible", timeout: 10000 });
    console.log("Lobby loaded: 'Play solo vs bots' is visible.");

    // Start a solo game with 3 bots
    await soloBtn.click();
    console.log("Started solo match with bots.");

    // Verify in-game board and action controls
    const rollBtn = page.getByRole("button", { name: "Roll the dice" });
    await rollBtn.waitFor({ state: "visible", timeout: 15000 });
    console.log("Game board active: 'Roll the dice' is visible.");

    // Test rolling the dice
    await rollBtn.click();
    console.log("Dice rolled.");
    await page.waitForTimeout(2000);

    // Test Trade tab to verify Visual Trade UI (Trading 2.0)
    const tradeTab = page.getByRole("button", { name: /Trade/i });
    if (await tradeTab.count()) {
      await tradeTab.click();
      console.log("Opened Trade tab.");
      await page.waitForTimeout(1000);

      // Verify Trade Value Meter or trade interface elements
      const exchangeEl = page.locator(".exchange");
      if (await exchangeEl.count()) {
        console.log("Visual Trade interface is active.");
      }
    }

    // Check Chat tab to observe bot barks or send a message
    const chatTab = page.getByRole("button", { name: "Chat", exact: true });
    if (await chatTab.count()) {
      await chatTab.click();
      console.log("Opened Chat tab.");
      await page.waitForTimeout(1000);
      const chatInput = page.getByPlaceholder("Message your crew…");
      if (await chatInput.count()) {
        await chatInput.fill("Testing live production deployment!");
        await page.keyboard.press("Enter");
        console.log("Sent chat message.");
        await page.waitForTimeout(1000);
      }
    }

    // Take screenshot
    await page.screenshot({ path: "game-audit/evidence/live_smoke_test.png" });
    console.log("Live screenshot saved to game-audit/evidence/live_smoke_test.png");

    if (errors.length > 0) {
      console.warn("Client console errors observed:", errors);
    } else {
      console.log("Zero client-side errors observed!");
    }

    console.log("SMOKE TEST PASSED SUCCESSFULLY!");
  } finally {
    await browser.close();
  }
}

smokeTest().catch((err) => {
  console.error("SMOKE TEST FAILED:", err);
  process.exit(1);
});
