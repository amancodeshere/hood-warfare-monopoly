// Usage: node driver.mjs <session-id> <strategy: buyall|buynone|smart|explore> <bots> <steps> [viewportW viewportH] [mobile]
import { chromium } from "/Users/aman/Desktop/hw-monopoly/node_modules/playwright/index.mjs";
import { mkdirSync, writeFileSync } from "fs";
const [, , sid = "s1", strat = "buyall", bots = "3", steps = "80", vw = "1920", vh = "1080", mobile] = process.argv;
const URL = "https://spin-the-block.up.railway.app";
const OUT = `/Users/aman/Desktop/hw-monopoly/game-audit/evidence/${sid}`;
mkdirSync(OUT, { recursive: true });
const log = [];
const L = (m) => { const s = `[${((Date.now() - T0) / 1000).toFixed(1)}s] ${m}`; console.log(s); log.push(s); };
const T0 = Date.now();
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: +vw, height: +vh },
  hasTouch: !!mobile, isMobile: !!mobile,
  recordVideo: { dir: OUT + "/video", size: { width: 960, height: 540 } },
});
const page = await ctx.newPage();
const errs = [];
page.on("console", (m) => { if (["error", "warning"].includes(m.type())) errs.push(`[${m.type()}] ${m.text()}`); });
page.on("pageerror", (e) => errs.push("[pageerror] " + e.message));
page.on("requestfailed", (r) => errs.push("[reqfail] " + r.url() + " " + r.failure()?.errorText));
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` }).catch(() => {});
await page.goto(URL, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Continue as guest" }).click();
await page.getByLabel("YOUR STREET NAME").fill("Tester_" + sid);
await page.locator("#solo-bots").selectOption(bots);
if (process.env.LIMIT) await page.locator("#match-length").selectOption(process.env.LIMIT);
await page.getByRole("button", { name: /Play solo vs bots/ }).click();
await page.waitForTimeout(2000);
await shot("00_start");
const panelText = async () => (await page.locator(".turn-hero, .street-card, .turn-summary, .purchase-price").allInnerTexts().catch(() => [])).join(" / ").replace(/\s+/g, " ").slice(0, 160);
const click = async (re) => {
  const l = page.getByRole("button", { name: re });
  if (await l.count()) { const f = l.first(); if (await f.isVisible() && await f.isEnabled()) { await f.click({ timeout: 2000 }).catch(() => {}); return true; } }
  return false;
};
let idle = 0, shots = 0;
for (let i = 0; i < +steps; i++) {
  const heading = await page.locator(".turn-heading").first().innerText().catch(() => "?");
  const txt = await panelText();
  const gameOver = await page.getByRole("button",{name:/Find your next block/}).isVisible().catch(() => false);
  const cash = await page.locator(".crew-list, aside").first().innerText().catch(() => "");
  let did = null;
  if (await click(/^Roll the dice/)) did = "roll";
  else if (await click(/^Play this card/)) did = "card";
  else if (await click(/^Pay \$/)) did = "pay";
  else if (/Challenge to a shootout/.test(await page.locator("body").innerText()) && strat === "explore") { did = "shootout?"; await click(/Challenge to a shootout/); }
  else if (await click(/^Pay \$/)) did = "pay";
  else if (/PURCHASE PRICE/.test(txt) && strat !== "buynone") {
    if (await click(/^Claim this block/)) did = "buy"; else { await click(/Put it up for auction|Pass on this block/); did = "skip(no cash)"; }
  } else if (/PURCHASE PRICE/.test(txt)) { await click(/Put it up for auction|Pass on this block/); did = "skip"; }
  else if (await click(/^End your turn/)) did = "end";
  else if (await click(/^Post bail|^Roll for doubles|^Serve a turn/)) did = "jail";
  else if (await click(/^(Spin the Stoppa|Pay the Stoppa)/)) did = "stoppa";
  else if (await click(/^Pass$/)) did = "auction-pass";
  else if (await click(/^(Spin|Take|Collect|Continue|Accept|Got it|OK)\b(?!.*(traffic|bus))/i)) did = "misc";
  L(`#${i} ${heading.replace(/\s+/g, " ")} | did=${did} | ${txt}`);
  if (!did) { idle++; if (idle % 10 === 5) { L("BUTTONS: " + JSON.stringify((await page.locator("button:visible").allInnerTexts()).map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 30))); await shot(`idle_${i}`); } }
  else idle = 0;
  if (did && (did === "buy" || did === "shootout?" || i % 12 === 0) && shots < 14) { await shot(`step_${String(i).padStart(3, "0")}_${did}`); shots++; }
  if (gameOver) { L("GAME OVER TEXT VISIBLE"); await shot("game_over"); break; }
  await page.waitForTimeout(did ? 1200 : 2500);
}
await shot("final");
L("BODY: " + (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 1200));
L("ERRORS: " + JSON.stringify(errs.slice(0, 20)));
writeFileSync(OUT + "/log.txt", log.join("\n"));
await ctx.close(); await browser.close();
