import { chromium } from "/Users/aman/Desktop/hw-monopoly/node_modules/playwright/index.mjs";
import { mkdirSync, writeFileSync } from "fs";

const URL = "https://spin-the-block.up.railway.app";
const OUT = "/Users/aman/Desktop/hw-monopoly/game-audit/evidence/s5";
mkdirSync(OUT, { recursive: true });

const log = [];
const L = (m) => { console.log(m); log.push(m); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await ctx.newPage();

const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });

L("1. Loading landing page...");
await page.goto(URL, { waitUntil: "networkidle" });

// Sign up a unique test account
await page.getByRole("button", { name: "Create account" }).click();
await page.waitForTimeout(400);

const testUser = "og_boss_" + Math.random().toString(36).slice(2, 6);
await page.locator("#entry-user").fill(testUser);
await page.locator("#entry-password").fill("SuperSecret123!");
await page.getByRole("button", { name: /Create your account/i }).click();
await page.waitForTimeout(1500);

// Click "Enter the city"
L("Clicking Enter the city...");
await page.getByRole("button", { name: /Enter the city/i }).click();
await page.waitForTimeout(1500);
await shot("05_auth_lobby_main");

// Open Profile & friends from topbar
L("Opening profile from topbar...");
const topProfile = page.getByRole("button", { name: new RegExp(testUser, "i") }).or(page.getByRole("button", { name: /Profile and friends/i })).first();
if (await topProfile.count() && await topProfile.isVisible()) {
  await topProfile.click();
  await page.waitForTimeout(1000);
  await shot("06_profile_dialog");

  // Click through tabs in Profile dialog
  const tabs = ["Looks", "History", "Account", "Friends"];
  for (const t of tabs) {
    const tabLoc = page.locator(".modal button, [role=dialog] button").getByText(t, { exact: true });
    if (await tabLoc.count() && await tabLoc.isVisible()) {
      await tabLoc.click();
      await page.waitForTimeout(600);
      await shot(`07_profile_${t.toLowerCase()}`);
    }
  }
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
}

// Open Room settings
L("Opening Room settings...");
await page.getByRole("button", { name: "Room settings" }).click();
await page.waitForTimeout(1000);
await shot("08_room_settings_dialog");
await page.keyboard.press("Escape");
await page.waitForTimeout(500);

// Open Public rooms
L("Opening Public rooms...");
await page.getByRole("button", { name: "Public rooms" }).click();
await page.waitForTimeout(1000);
await shot("09_public_rooms_dialog");
await page.keyboard.press("Escape");
await page.waitForTimeout(500);

// Open How to play
L("Opening How to play...");
await page.getByRole("button", { name: /How to play/i }).first().click();
await page.waitForTimeout(1000);
await shot("10_how_to_play_dialog");
await page.keyboard.press("Escape");
await page.waitForTimeout(500);

// Start solo game with 1 bot
L("Starting solo game with 1 bot...");
await page.locator("#solo-bots").selectOption("1");
await page.getByRole("button", { name: /Play solo vs bots/ }).click();
await page.waitForTimeout(2500);
await shot("11_ingame_table");

// Inspect in-game tabs: My turf, Trade, Chat
L("Inspecting in-game tabs...");
await page.getByRole("button", { name: /My turf/i }).click();
await page.waitForTimeout(800);
await shot("12_tab_my_turf");

await page.getByRole("button", { name: /Trade/i }).click();
await page.waitForTimeout(800);
await shot("13_tab_trade");

await page.getByRole("button", { name: /Chat/i }).click();
await page.waitForTimeout(800);
await shot("14_tab_chat");

// Send a chat message
const chatInput = page.getByPlaceholder("Message your crew…");
if (await chatInput.count() && await chatInput.isVisible()) {
  await chatInput.fill("Spinning the block! Respect!");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(800);
  await shot("15_tab_chat_sent");
}

L("Finished Session 5 exploration!");
await ctx.close();
await browser.close();
