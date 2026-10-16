import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const outDir = "/Users/aman/Desktop/Personal Projects/hw-monopoly/game-audit/evidence/richup";
fs.mkdirSync(outDir, { recursive: true });

async function main() {
  console.log("Launching Chromium with realistic settings...");
  const browser = await chromium.launch({
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  });

  const page = await context.newPage();
  page.on("pageerror", (err) => console.log("[PageError]:", err.message || err));

  try {
    console.log("Navigating to https://richup.io...");
    await page.goto("https://richup.io", { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(outDir, "01_landing.png") });

    // Click "Create a private game"
    console.log("Looking for 'Create a private game'...");
    const privateBtn = page.getByRole("button", { name: /create a private game/i }).or(page.getByText(/create a private game/i)).first();
    await privateBtn.click();
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(outDir, "02_lobby.png") });
    console.log("In lobby at URL:", page.url());

    // Inspect buttons in lobby
    const lobbyButtons = await page.evaluate(() =>
      Array.from(document.querySelectorAll("button, a")).map((el) => el.innerText.trim()).filter(Boolean)
    );
    console.log("Lobby clickable items:", lobbyButtons);

    // Look for add bot or bot buttons
    const addBotBtn = page.getByRole("button", { name: /add bot|bot/i }).or(page.getByText(/add bot|\+ bot/i)).first();
    if (await addBotBtn.isVisible()) {
      console.log("Adding Bot 1...");
      await addBotBtn.click();
      await page.waitForTimeout(1500);
      console.log("Adding Bot 2...");
      await addBotBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(outDir, "03_lobby_with_bots.png") });
    }

    // Check game settings in lobby
    const settingsBtn = page.getByRole("button", { name: /settings|rules|options/i }).first();
    if (await settingsBtn.isVisible()) {
      console.log("Opening lobby settings...");
      await settingsBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(outDir, "03b_lobby_settings.png") });
    }

    // Start game
    const startBtn = page.getByRole("button", { name: /start game|start/i }).first();
    if (await startBtn.isVisible()) {
      console.log("Starting match...");
      await startBtn.click();
      await page.waitForTimeout(6000);
      await page.screenshot({ path: path.join(outDir, "04_gameplay_board.png") });
    }

    // Analyze board DOM
    const boardInspection = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button")).map((b) => ({
        text: b.innerText.trim(),
        ariaLabel: b.getAttribute("aria-label"),
        disabled: b.disabled,
      }));
      const players = Array.from(document.querySelectorAll("[class*='player'], [class*='Player'], [class*='user']")).map((p) => p.innerText.slice(0, 100));
      return {
        url: window.location.href,
        buttons,
        sampleText: document.body.innerText.slice(0, 1000),
      };
    });
    console.log("Board inspection:", boardInspection);

    // Simulate 5 turns of active gameplay
    for (let turn = 1; turn <= 6; turn++) {
      console.log(`\n--- Playing Turn ${turn} ---`);
      await page.waitForTimeout(3000);

      // Check for Roll button
      const rollBtn = page.getByRole("button", { name: /roll/i }).first();
      if (await rollBtn.isVisible() && !(await rollBtn.isDisabled())) {
        console.log("Clicking Roll...");
        await rollBtn.click();
        await page.waitForTimeout(3500);
        await page.screenshot({ path: path.join(outDir, `05_turn_${turn}_rolled.png`) });
      }

      // Check for Buy / Auction / Pass / End turn
      const buyBtn = page.getByRole("button", { name: /buy|purchase/i }).first();
      const endBtn = page.getByRole("button", { name: /end turn|pass|continue|next/i }).first();
      const auctionBtn = page.getByRole("button", { name: /auction/i }).first();

      if (await buyBtn.isVisible() && !(await buyBtn.isDisabled())) {
        console.log("Buying property...");
        await buyBtn.click();
        await page.waitForTimeout(2000);
      } else if (await auctionBtn.isVisible()) {
        console.log("Triggering auction...");
        await auctionBtn.click();
        await page.waitForTimeout(2000);
      } else if (await endBtn.isVisible() && !(await endBtn.isDisabled())) {
        console.log("Ending turn...");
        await endBtn.click();
        await page.waitForTimeout(2000);
      }

      await page.screenshot({ path: path.join(outDir, `05_turn_${turn}_settled.png`) });
    }

    // Inspect property card / modal
    const tiles = page.locator("[class*='tile'], [class*='square'], [class*='property']");
    const count = await tiles.count();
    console.log(`Found ${count} tiles on board.`);
    if (count > 5) {
      console.log("Clicking tile 5 to inspect property details card...");
      await tiles.nth(5).click({ force: true });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(outDir, "06_property_inspection.png") });
    }

    // Check trade interface
    const tradeBtn = page.getByRole("button", { name: /trade/i }).first();
    if (await tradeBtn.isVisible()) {
      console.log("Opening trade dialog...");
      await tradeBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(outDir, "07_trade_modal.png") });
    }

  } catch (err) {
    console.error("Error during live exploration:", err);
    await page.screenshot({ path: path.join(outDir, "error_live.png") });
  } finally {
    await browser.close();
    console.log("Live exploration finished successfully. Evidence in:", outDir);
  }
}

main();
