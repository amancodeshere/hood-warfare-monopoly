import { chromium } from "playwright";
import { writeFileSync, copyFileSync, existsSync, mkdirSync } from "fs";
import { resolve } from "path";

const URL = "http://127.0.0.1:4175";
const EVIDENCE_LOCAL = "/Users/aman/Desktop/hw-monopoly/game-audit/evidence/beta-test-trade";
const EVIDENCE_ARTIFACT = "/Users/aman/.gemini/antigravity/brain/4629293b-46a2-4a57-a438-b32ee4a423a5/evidence";

mkdirSync(EVIDENCE_LOCAL, { recursive: true });
mkdirSync(EVIDENCE_ARTIFACT, { recursive: true });

const logs = [];
function L(msg) {
  console.log(msg);
  logs.push(`[${new Date().toISOString()}] ${msg}`);
}

async function saveScreen(page, name) {
  const p1 = `${EVIDENCE_LOCAL}/${name}.png`;
  const p2 = `${EVIDENCE_ARTIFACT}/${name}.png`;
  await page.screenshot({ path: p1, fullPage: false });
  try {
    copyFileSync(p1, p2);
  } catch (e) {
    // ignore
  }
  L(`Saved screenshot: ${name}.png`);
}

async function run() {
  L("=== STARTING TRADE & BOT BARKS PLAYTEST AUDIT ===");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 860 },
  });
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") L(`[BROWSER ERROR] ${msg.text()}`);
  });

  // 1. Visit landing page
  L(`Navigating to ${URL}...`);
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  // Guest login
  const guestBtn = page.getByRole("button", { name: /Continue as guest/i });
  if (await guestBtn.count() && await guestBtn.isVisible()) {
    await guestBtn.click();
    L("Guest login clicked");
    await page.waitForTimeout(500);
  }

  // Set player name & bots
  const nameInput = page.getByLabel(/YOUR STREET NAME/i);
  if (await nameInput.count() && await nameInput.isVisible()) {
    await nameInput.fill("DonMega");
    L("Set player name: DonMega");
  }

  const botsSelect = page.locator("#solo-bots");
  if (await botsSelect.count()) {
    await botsSelect.selectOption("3");
    L("Selected 3 solo bots");
  }

  await saveScreen(page, "01_trade_lobby");

  // Start solo match
  const startSoloBtn = page.getByRole("button", { name: /Play solo vs bots/i });
  await startSoloBtn.click();
  L("Clicked Play solo vs bots");
  await page.waitForTimeout(2000);

  // Helper to handle any active popups or dialogs
  async function dismissModals() {
    const dialog = page.getByRole("dialog");
    if (await dialog.count() && await dialog.isVisible()) {
      const dBtn = dialog.locator("button:visible:enabled");
      if (await dBtn.count()) {
        await dBtn.first().click();
        await page.waitForTimeout(300);
      }
    }
    const passBtn = page.getByRole("button", { name: /^(Pass|Skip|Continue|OK|Got it|Decline)/i });
    if (await passBtn.count() && await passBtn.first().isVisible() && await passBtn.first().isEnabled()) {
      await passBtn.first().click();
      await page.waitForTimeout(300);
    }
  }

  // Play through multiple turn cycles so human & bots acquire properties
  L("\n--- Starting Active Turns to Acquire Properties ---");
  let myTurns = 0;
  for (let loop = 0; loop < 45 && myTurns < 5; loop++) {
    await page.waitForTimeout(1000);
    await dismissModals();

    const isMyTurn = await page.evaluate(() => {
      const heading = document.querySelector(".turn-heading");
      return heading ? heading.innerText.includes("YOUR TURN") : false;
    });

    if (isMyTurn) {
      // Check for buy button
      const buyBtn = page.getByRole("button", { name: /^(Buy|Claim block)/i });
      if (await buyBtn.count() && await buyBtn.first().isVisible() && await buyBtn.first().isEnabled()) {
        const bText = await buyBtn.first().innerText();
        L(`[My Turn ${myTurns}] Buying block: "${bText}"`);
        await buyBtn.first().click();
        await page.waitForTimeout(1000);
      }

      // Check for roll button
      const rollBtn = page.getByRole("button", { name: /Roll the dice/i });
      if (await rollBtn.count() && await rollBtn.isVisible() && await rollBtn.isEnabled()) {
        L(`[My Turn ${myTurns}] Rolling dice...`);
        await rollBtn.click();
        await page.waitForTimeout(1400);

        // Check if landing triggers buy
        const postRollBuy = page.getByRole("button", { name: /^(Buy|Claim block)/i });
        if (await postRollBuy.count() && await postRollBuy.first().isVisible() && await postRollBuy.first().isEnabled()) {
          const pbText = await postRollBuy.first().innerText();
          L(`[My Turn ${myTurns}] Post-roll buying block: "${pbText}"`);
          await postRollBuy.first().click();
          await page.waitForTimeout(1000);
        }
      }

      // Check for end turn button
      const endBtn = page.getByRole("button", { name: /End turn/i });
      if (await endBtn.count() && await endBtn.isVisible() && await endBtn.isEnabled()) {
        L(`[My Turn ${myTurns}] Ending turn...`);
        await endBtn.click();
        await page.waitForTimeout(1000);
        myTurns++;
      }
    }
  }

  await saveScreen(page, "02_gameplay_turn");

  // ----------------------------------------------------
  // SECTION 2: TEST DEED CARD POPOVER
  // ----------------------------------------------------
  L("\n--- SECTION 2: AUDITING DEED CARD POPOVER ---");
  const tiles = page.locator(".tile");
  const count = await tiles.count();
  L(`Found ${count} tiles on the board`);

  // Inspect several tiles: street property (1), transit (5), utility (12)
  for (const idx of [1, 5, 12]) {
    const tile = tiles.nth(idx);
    if (await tile.count() && await tile.isVisible()) {
      await tile.click();
      await page.waitForTimeout(600);
      const popover = page.locator(".deed-card-popover");
      if (await popover.count() && await popover.isVisible()) {
        L(`Tile ${idx} clicked, deed popover is visible!`);
        await saveScreen(page, `03_deed_popover_tile_${idx}`);

        const popoverInfo = await page.evaluate(() => {
          const el = document.querySelector(".deed-card-popover");
          if (!el) return null;
          const header = el.querySelector(".deed-header, #property-heading, h2, h3")?.innerText;
          const ladder = el.querySelector(".deed-rent-ladder, .property-rent-table");
          const ladderText = ladder ? ladder.innerText : "NO_LADDER";
          const finance = el.querySelector(".deed-finance-grid")?.innerText;
          const residents = el.querySelector(".deed-residents-section")?.innerText;
          const closeBtn = el.querySelector(".deed-close-btn");
          return {
            header,
            ladderText,
            finance,
            residents,
            hasCloseBtn: !!closeBtn,
          };
        });
        L(`Deed Popover Inspection for Tile ${idx}:\n${JSON.stringify(popoverInfo, null, 2)}`);

        // Close popover
        const closeBtn = page.locator(".deed-close-btn");
        if (await closeBtn.count() && await closeBtn.isVisible()) {
          await closeBtn.click();
          await page.waitForTimeout(400);
        } else {
          await page.keyboard.press("Escape");
          await page.waitForTimeout(400);
        }
      }
    }
  }

  // ----------------------------------------------------
  // SECTION 3: AUDITING TRADE INTERFACE
  // ----------------------------------------------------
  L("\n--- SECTION 3: AUDITING TRADE INTERFACE ---");
  // Find the Trade tab
  const tradeTabBtn = page.locator(".hud-tab, button").filter({ hasText: /^Trade$/i });
  if (await tradeTabBtn.count()) {
    L("Switching to Trade tab...");
    await tradeTabBtn.first().click();
    await page.waitForTimeout(600);
    await saveScreen(page, "05_trade_tab_view");

    // Extract trade DOM info
    const tradeAudit = await page.evaluate(() => {
      const exchange = document.querySelector(".exchange");
      if (!exchange) return { found: false };

      const partners = Array.from(exchange.querySelectorAll(".trade-crew-choices label")).map(l => ({
        text: l.innerText.replace(/\n/g, " ").trim(),
        checked: l.querySelector("input")?.checked,
        disabled: l.querySelector("input")?.disabled,
      }));

      const fields = Array.from(exchange.querySelectorAll(".exchange-fields")).map(f => {
        const legend = f.querySelector("legend")?.innerText;
        const checks = Array.from(f.querySelectorAll(".asset-check")).map(c => ({
          name: c.querySelector("span")?.childNodes[0]?.textContent?.trim(),
          sub: c.querySelector("small")?.innerText.trim(),
          checked: c.querySelector("input")?.checked,
          disabled: c.querySelector("input")?.disabled,
        }));
        const cashInput = f.querySelector(".amount-fields input[type='number']");
        return {
          legend,
          assetCount: checks.length,
          checks,
          cashVal: cashInput?.value,
          cashMax: cashInput?.max,
        };
      });

      const buttons = Array.from(exchange.querySelectorAll("button")).map(b => ({
        text: b.innerText.trim(),
        disabled: b.disabled,
      }));

      const notices = Array.from(exchange.querySelectorAll(".panel-notice, .micro-note, .empty-copy")).map(p => p.innerText.trim());

      return {
        found: true,
        partners,
        fields,
        buttons,
        notices,
      };
    });
    L(`Trade Audit Details:\n${JSON.stringify(tradeAudit, null, 2)}`);

    // Select partner 1 (the first bot)
    const partnerRadio = page.locator(".trade-crew-choices label").first();
    if (await partnerRadio.count()) {
      await partnerRadio.click();
      await page.waitForTimeout(400);
      L("Selected first bot trading partner");
    }

    // Try selecting an asset under You Give if available
    const giveAssetCheck = page.locator(".exchange-fields").first().locator(".asset-check input[type='checkbox']:not(:disabled)").first();
    if (await giveAssetCheck.count()) {
      await giveAssetCheck.check();
      L("Checked an asset to give");
    } else {
      // Offer cash
      const giveCashInput = page.locator(".exchange-fields").first().locator("input[type='number']").first();
      if (await giveCashInput.count()) {
        await giveCashInput.fill("120");
        L("Filled $120 cash to give");
      }
    }

    // Try selecting an asset under You Receive if available
    const receiveAssetCheck = page.locator(".exchange-fields").nth(1).locator(".asset-check input[type='checkbox']:not(:disabled)").first();
    if (await receiveAssetCheck.count()) {
      await receiveAssetCheck.check();
      L("Checked an asset to receive from bot");
    } else {
      const takeCashInput = page.locator(".exchange-fields").nth(1).locator("input[type='number']").first();
      if (await takeCashInput.count()) {
        await takeCashInput.fill("60");
        L("Filled $60 cash to receive from bot");
      }
    }

    await page.waitForTimeout(500);
    await saveScreen(page, "06_trade_offer_configured");

    // Inspect preview
    const dealPreview = await page.evaluate(() => {
      const summary = document.querySelector(".deal-summary");
      const title = document.querySelector(".deal-preview-title");
      const note = document.querySelector(".micro-note");
      return {
        title: title?.innerText,
        summary: summary?.innerText.replace(/\n/g, " | "),
        note: note?.innerText,
      };
    });
    L(`Configured Deal Preview:\n${JSON.stringify(dealPreview, null, 2)}`);
    await saveScreen(page, "07_trade_preview");

    // Send offer
    const sendBtn = page.locator(".exchange button").filter({ hasText: /Send offer/i });
    if (await sendBtn.count() && await sendBtn.isEnabled()) {
      L("Sending trade offer to bot...");
      await sendBtn.click();
      await page.waitForTimeout(500);
      await saveScreen(page, "08_trade_sent_status");

      // Wait 1.5s for bot automated evaluation
      await page.waitForTimeout(1500);
      const postSendAudit = await page.evaluate(() => {
        const waiting = document.querySelector(".waiting")?.innerText;
        const exchangeText = document.querySelector(".exchange")?.innerText.slice(0, 300);
        return { waiting, exchangeText };
      });
      L(`Post-send trade state: ${JSON.stringify(postSendAudit)}`);
    }
  }

  // ----------------------------------------------------
  // SECTION 4: AUDITING CHAT FEED & BOT SILENCE
  // ----------------------------------------------------
  L("\n--- SECTION 4: AUDITING CHAT FEED & BOT SILENCE ---");
  const chatTabBtn = page.locator(".hud-tab, button").filter({ hasText: /^Chat/i });
  if (await chatTabBtn.count()) {
    L("Switching to Chat tab...");
    await chatTabBtn.first().click();
    await page.waitForTimeout(600);
  }

  const initialChat = await page.evaluate(() => {
    const messages = Array.from(document.querySelectorAll(".chat-messages p")).map(p => p.innerText.trim());
    return {
      count: messages.length,
      messages,
    };
  });
  L(`Chat audit after 5 rounds of gameplay:\n${JSON.stringify(initialChat, null, 2)}`);
  await saveScreen(page, "09_chat_feed_empty");

  // Send a human chat message
  const chatInput = page.locator("#chat-message, input[placeholder*='Say something']");
  if (await chatInput.count() && await chatInput.isVisible()) {
    L("Human sending chat message: 'Yo bots, who wants to trade Bronzeville?'");
    await chatInput.fill("Yo bots, who wants to trade Bronzeville?");
    const sendBtn = page.locator("button[aria-label='Send chat message']");
    if (await sendBtn.count()) {
      await sendBtn.click();
      await page.waitForTimeout(600);
    }
  }

  // Take 5 more quick turns
  for (let i = 0; i < 5; i++) {
    await page.waitForTimeout(800);
    await dismissModals();
    const roll = page.getByRole("button", { name: /Roll the dice/i });
    if (await roll.count() && await roll.isVisible() && await roll.isEnabled()) {
      await roll.click();
      await page.waitForTimeout(1000);
    }
    const buy = page.getByRole("button", { name: /^(Buy|Claim block)/i });
    if (await buy.count() && await buy.isVisible() && await buy.isEnabled()) {
      await buy.click();
      await page.waitForTimeout(600);
    }
    const end = page.getByRole("button", { name: /End turn/i });
    if (await end.count() && await end.isVisible() && await end.isEnabled()) {
      await end.click();
      await page.waitForTimeout(600);
    }
  }

  const finalChat = await page.evaluate(() => {
    const msgs = Array.from(document.querySelectorAll(".chat-messages p")).map(p => p.innerText.trim());
    return {
      count: msgs.length,
      msgs,
    };
  });
  L(`Final Chat feed after more turns:\n${JSON.stringify(finalChat, null, 2)}`);
  await saveScreen(page, "10_chat_final_state");

  // Close browser
  await browser.close();
  writeFileSync(`${EVIDENCE_LOCAL}/playtest_trade_logs.json`, JSON.stringify(logs, null, 2));
  L("=== TRADE & BOT BARKS PLAYTEST COMPLETE ===");
}

run().catch((err) => {
  console.error("Playtest failed:", err);
  process.exit(1);
});
