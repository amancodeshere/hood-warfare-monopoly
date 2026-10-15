import { chromium } from "/Users/aman/Desktop/hw-monopoly/node_modules/playwright/index.mjs";
import { mkdirSync, writeFileSync } from "fs";
const URL = "https://spin-the-block.up.railway.app";
const OUT = "/Users/aman/Desktop/hw-monopoly/game-audit/evidence/s1";
mkdirSync(OUT, { recursive: true });
const log = [];
const L = (m) => { console.log(m); log.push(m); };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, recordVideo: { dir: OUT + "/video", size: { width: 960, height: 540 } } });
const page = await ctx.newPage();
const errs = [];
page.on("console", (m) => { if (["error", "warning"].includes(m.type())) errs.push(`[${m.type()}] ${m.text()}`); });
page.on("pageerror", (e) => errs.push("[pageerror] " + e.message));
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
const buttons = async () => (await page.locator("button:visible").allInnerTexts()).map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean);

await page.goto(URL, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Continue as guest" }).click();
await page.waitForTimeout(800);
await shot("01_after_guest");
L("After guest buttons: " + JSON.stringify(await buttons()));
await page.getByLabel("YOUR STREET NAME").fill("TestAce");
await page.locator("#solo-bots").selectOption("3");
await shot("02_lobby_filled");
await page.getByRole("button", { name: /Play solo vs bots/ }).click();
await page.waitForTimeout(2500);
await shot("03_game_start");
L("Game start buttons: " + JSON.stringify(await buttons()));
L("Body text sample: " + (await page.locator("body").innerText()).slice(0, 1500).replace(/\n+/g, " | "));

for (let i = 0; i < 40; i++) {
  const b = await buttons();
  const roll = page.getByRole("button", { name: /Roll the dice/ });
  if (await roll.count() && await roll.first().isVisible()) {
    await roll.first().click(); L(`step ${i}: rolled`);
  } else {
    const pick = ["Buy", "Pass", "Skip", "End turn", "Spin", "Continue", "OK", "Close", "Got it"];
    let done = false;
    for (const p of pick) {
      const loc = page.getByRole("button", { name: new RegExp("^" + p, "i") });
      if (await loc.count() && await loc.first().isVisible() && await loc.first().isEnabled()) {
        await loc.first().click(); L(`step ${i}: clicked ${p}`); done = true; break;
      }
    }
    if (!done) L(`step ${i}: waiting; buttons=${JSON.stringify(b.slice(0, 25))}`);
  }
  await page.waitForTimeout(1800);
  if (i % 4 === 0) await shot(`04_turn_${String(i).padStart(2, "0")}`);
}
await shot("05_final");
L("Final text: " + (await page.locator("body").innerText()).slice(0, 2500).replace(/\n+/g, " | "));
L("Console errors/warnings: " + JSON.stringify(errs));
writeFileSync(OUT + "/log.txt", log.join("\n"));
await ctx.close(); await browser.close();
