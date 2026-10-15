import { chromium } from "/Users/aman/Desktop/hw-monopoly/node_modules/playwright/index.mjs";
import { readFileSync, mkdirSync, writeFileSync } from "fs";
const URL = "https://spin-the-block.up.railway.app";
const OUT = "/Users/aman/Desktop/hw-monopoly/game-audit/evidence/responsive";
mkdirSync(OUT, { recursive: true });
const axeSrc = readFileSync("/tmp/axe/node_modules/axe-core/axe.min.js", "utf8");
const VPS = [["desktop_1920x1080", 1920, 1080, false], ["laptop_1366x768", 1366, 768, false], ["tablet_768x1024", 768, 1024, true], ["mobile_390x844", 390, 844, true], ["small_360x640", 360, 640, true]];
const report = {};
const browser = await chromium.launch();
for (const [name, w, h, touch] of VPS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, bypassCSP: true, hasTouch: touch, isMobile: touch && w < 800 });
  const page = await ctx.newPage();
  const r = (report[name] = { simulatedTouch: touch });
  const errs = []; page.on("pageerror", (e) => errs.push(e.message)); page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  const t0 = Date.now();
  await page.goto(URL, { waitUntil: "networkidle" });
  r.loadMs = Date.now() - t0;
  await page.screenshot({ path: `${OUT}/${name}_1_landing.png` });
  r.landingOverflowX = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await page.getByRole("button", { name: "Continue as guest" }).click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${name}_2_lobby.png`, fullPage: true });
  r.lobbyOverflowX = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await page.getByLabel("YOUR STREET NAME").fill("Resp_" + name.slice(0, 6));
  await page.locator("#solo-bots").selectOption("2");
  await page.getByRole("button", { name: /Play solo vs bots/ }).click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/${name}_3_game.png` });
  await page.screenshot({ path: `${OUT}/${name}_3_game_full.png`, fullPage: true });
  r.gameOverflowX = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  r.gamePageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  // touch target audit
  r.smallTargets = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll("button, a, input, select, [role=button], [role=tab]")) {
      const b = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      if (b.width === 0 || b.height === 0 || cs.visibility === "hidden") continue;
      if (b.width < 24 || b.height < 24) out.push(`${el.tagName}:${(el.getAttribute("aria-label") || el.innerText || "").trim().slice(0, 25)}:${Math.round(b.width)}x${Math.round(b.height)}`);
    }
    return out.slice(0, 25);
  });
  r.targetsUnder44 = await page.evaluate(() => [...document.querySelectorAll("button, a, input, select")].filter((el) => { const b = el.getBoundingClientRect(); return b.width > 0 && (b.width < 44 || b.height < 44); }).length);
  r.totalInteractive = await page.evaluate(() => document.querySelectorAll("button, a, input, select").length);
  if (name === "desktop_1920x1080" || name === "mobile_390x844") {
    await page.addScriptTag({ content: axeSrc });
    const ax = await page.evaluate(async () => { const res = await axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"] }); return res.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help, sample: v.nodes.slice(0, 2).map((n) => n.target.join(" ")) })); });
    r.axe = ax;
  }
  // zoom 200% emulation via CSS zoom is not exact; use deviceScaleFactor-free approach: shrink viewport to 50%
  r.consoleErrors = errs.slice(0, 5);
  await ctx.close();
}
// keyboard + focus + reduced motion + perf on desktop
{
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "networkidle" });
  const nav = await page.evaluate(() => { const e = performance.getEntriesByType("navigation")[0]; const res = performance.getEntriesByType("resource"); return { domContentLoaded: Math.round(e.domContentLoadedEventEnd), loadEvent: Math.round(e.loadEventEnd), resources: res.length, transferKB: Math.round(res.reduce((a, x) => a + (x.transferSize || 0), 0) / 1024), decodedKB: Math.round(res.reduce((a, x) => a + (x.decodedBodySize || 0), 0) / 1024), biggest: res.sort((a, b) => b.transferSize - a.transferSize).slice(0, 5).map((x) => `${x.name.split("/").pop()}:${Math.round(x.transferSize / 1024)}KB`) }; });
  report.navigationTiming = nav;
  const tabs = [];
  for (let i = 0; i < 12; i++) { await page.keyboard.press("Tab"); tabs.push(await page.evaluate(() => { const a = document.activeElement; const cs = getComputedStyle(a); return `${a.tagName}:${(a.getAttribute("aria-label") || a.innerText || a.id || "").trim().slice(0, 25)} outline=${cs.outlineStyle}/${cs.outlineWidth} boxShadow=${cs.boxShadow !== "none"}`; })); }
  report.landingTabOrder = tabs;
  report.reducedMotionAnimations = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running").length);
  await ctx.close();
}
writeFileSync(OUT + "/report.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2).slice(0, 9000));
await browser.close();
