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

const errs = [];
page.on("pageerror", (e) => errs.push("[pageerror] " + e.message));
page.on("console", (m) => ["error", "warning"].includes(m.type()) && errs.push(`[${m.type()}] ${m.text()}`));

const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });

L("1. Loading landing page...");
await page.goto(URL, { waitUntil: "networkidle" });
await shot("01_landing_entry");

// Inspect registration / sign-in tab
await page.getByRole("button", { name: "Create account" }).click();
await page.waitForTimeout(500);

// Sign up a unique test account
const testUser = "vetplayer_" + Math.random().toString(36).slice(2, 7);
await page.locator("#entry-user").fill(testUser);
await page.locator("#entry-password").fill("SuperSecret123!");
await shot("02_create_account_filled");

// Click "Create your account" submit button
await page.getByRole("button", { name: /Create your account/i }).click();
await page.waitForTimeout(1500);
await shot("03_after_signup_submission");

// Check if EntryPage is still displayed
const stillOnEntry = await page.getByRole("button", { name: "Continue as guest" }).count();
L(`Still on EntryPage after sign up? ${stillOnEntry > 0}`);

// Click Continue as guest to enter lobby
if (stillOnEntry) {
  L("Clicking Continue as guest to enter lobby...");
  await page.getByRole("button", { name: "Continue as guest" }).click();
  await page.waitForTimeout(1500);
}
await shot("04_lobby_authenticated");
L("Lobby text: " + (await page.locator("body").innerText()).slice(0, 500).replace(/\s+/g, " "));

// Check topbar profile button
const profileBtn = page.getByRole("button", { name: new RegExp(testUser, "i") }).or(page.locator("button.profile-trigger")).or(page.getByRole("button", { name: /Profile/i })).first();
if (await profileBtn.count() && await profileBtn.isVisible()) {
  L("Opening profile modal...");
  await profileBtn.click();
  await page.waitForTimeout(1000);
  await shot("05_profile_modal");

  const modalText = await page.locator(".modal, [role=dialog]").innerText().catch(() => "");
  L("Profile modal content: " + modalText.replace(/\s+/g, " "));

  // Look for tabs inside Profile (Stats, Appearance, Friends, Account, Maps)
  const buttonsInModal = await page.locator(".modal button, [role=dialog] button").allInnerTexts();
  L("Buttons in profile modal: " + JSON.stringify(buttonsInModal));

  // Click Map Studio tab if present
  const mapsTab = page.locator(".modal button, [role=dialog] button").filter({ hasText: /Map|Maps|Studio/i }).first();
  if (await mapsTab.count() && await mapsTab.isVisible()) {
    await mapsTab.click();
    await page.waitForTimeout(800);
    await shot("06_map_studio_tab");
  }

  // Click Appearance / Cosmetics tab if present
  const looksTab = page.locator(".modal button, [role=dialog] button").filter({ hasText: /Look|Appearance|Cosmetics/i }).first();
  if (await looksTab.count() && await looksTab.isVisible()) {
    await looksTab.click();
    await page.waitForTimeout(800);
    await shot("07_appearance_tab");
  }

  // Close profile modal
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
} else {
  L("Profile button not found on topbar");
}

// Inspect Room settings modal
const settingsBtn = page.getByRole("button", { name: "Room settings" });
if (await settingsBtn.count() && await settingsBtn.isVisible()) {
  L("Opening Room settings...");
  await settingsBtn.click();
  await page.waitForTimeout(1000);
  await shot("08_room_settings");
  L("Settings content: " + (await page.locator(".modal, [role=dialog]").innerText().catch(() => "")).replace(/\s+/g, " "));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
}

// Inspect Public rooms
const publicRoomsBtn = page.getByRole("button", { name: "Public rooms" });
if (await publicRoomsBtn.count() && await publicRoomsBtn.isVisible()) {
  L("Opening Public rooms...");
  await publicRoomsBtn.click();
  await page.waitForTimeout(1000);
  await shot("09_public_rooms");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
}

// Check "How to play" modal from lobby
const howToPlay = page.getByRole("button", { name: /How to play/i }).or(page.getByRole("link", { name: /How to play/i })).first();
if (await howToPlay.count() && await howToPlay.isVisible()) {
  L("Opening How to play...");
  await howToPlay.click();
  await page.waitForTimeout(1000);
  await shot("10_how_to_play");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
}

// Start solo match
L("Starting solo match to inspect in-game tabs...");
await page.locator("#solo-bots").selectOption("1");
await page.getByRole("button", { name: /Play solo vs bots/ }).click();
await page.waitForTimeout(2500);
await shot("11_in_game_table");

// Check "My turf" tab
const myTurfTab = page.getByRole("button", { name: /My turf/i });
if (await myTurfTab.count() && await myTurfTab.isVisible()) {
  await myTurfTab.click();
  await page.waitForTimeout(800);
  await shot("12_my_turf_tab");
}

// Check "Trade" tab
const tradeTab = page.getByRole("button", { name: /Trade/i });
if (await tradeTab.count() && await tradeTab.isVisible()) {
  await tradeTab.click();
  await page.waitForTimeout(800);
  await shot("13_trade_tab");
}

// Check "Chat" tab
const chatTab = page.getByRole("button", { name: /Chat/i });
if (await chatTab.count() && await chatTab.isVisible()) {
  await chatTab.click();
  await page.waitForTimeout(800);
  await shot("14_chat_tab");
}

L("Session 5 complete!");
writeFileSync(OUT + "/log.txt", log.join("\n"));
await ctx.close();
await browser.close();
