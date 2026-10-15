import { chromium } from "/Users/aman/Desktop/hw-monopoly/node_modules/playwright/index.mjs";
import { mkdirSync, writeFileSync } from "fs";
const URL = "https://spin-the-block.up.railway.app";
const OUT = "/Users/aman/Desktop/hw-monopoly/game-audit/evidence/s4";
mkdirSync(OUT, { recursive: true });
const R = [];
const note = (k, v) => { console.log(k, "=>", typeof v === "string" ? v : JSON.stringify(v)); R.push({ k, v }); };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, recordVideo: { dir: OUT + "/video", size: { width: 960, height: 540 } } });
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
page.on("console", (m) => ["error", "warning"].includes(m.type()) && errs.push(`${m.type()}: ${m.text()}`));
const fresh = async () => { await page.goto(URL); await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); }); await page.goto(URL, { waitUntil: "networkidle" }); if (await page.getByRole("button", { name: "Continue as guest" }).count()) await page.getByRole("button", { name: "Continue as guest" }).click(); };
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
await page.goto(URL, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Continue as guest" }).click();

// T1: long / hostile names
const nameField = page.getByLabel("YOUR STREET NAME");
await nameField.fill("<img src=x onerror=alert(1)>WWWWWWWWWWWW");
note("T1 name input maxlength-enforced value", await nameField.inputValue());
await page.getByRole("button", { name: "Create a private room" }).click();
await page.waitForTimeout(1500);
await shot("T1_hostile_name_lobby");
note("T1 lobby shows literal name (escaped)", (await page.locator("body").innerText()).includes("<img src=x"));
note("T1 dialog fired", await page.evaluate(() => !!window.__xss));
const code = await page.locator(".invite-box strong").textContent().catch(() => null);
note("T1 room code", code);

// T2: empty name
await fresh();
await page.getByLabel("YOUR STREET NAME").fill("");
await page.getByRole("button", { name: /Play solo vs bots/ }).click();
await page.waitForTimeout(1500);
note("T2 empty-name solo start -> heading/body", (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 200));
await shot("T2_empty_name");

// T3: invalid room code join
await fresh();
await page.getByLabel("YOUR STREET NAME").fill("Edge");
await page.getByLabel("ROOM CODE").fill("ZZZZZZ");
await page.getByRole("button", { name: "Join room" }).click();
await page.waitForTimeout(1500);
note("T3 invalid code message", (await page.locator("[role=alert], .error, .toast, .notice").allInnerTexts().catch(() => [])).join(" | ") || "(no alert element found) body: " + (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 300));
await shot("T3_invalid_code");

// T4: solo game, rapid-click roll, refresh, back/forward
await page.getByLabel("YOUR STREET NAME").fill("Edge");
await page.locator("#solo-bots").selectOption("2");
await page.getByRole("button", { name: /Play solo vs bots/ }).click();
await page.waitForTimeout(2000);
const roll = page.getByRole("button", { name: /^Roll the dice/ });
const before = await page.locator(".crew-list, aside").first().innerText();
await Promise.all(Array.from({ length: 8 }, () => roll.click({ timeout: 800, force: true }).catch(() => {})));
await page.waitForTimeout(2500);
note("T4 rapid 8x roll: log lines", (await page.locator("body").innerText()).match(/rolled \d+/g));
await shot("T4_after_rapid_roll");
const url1 = page.url();
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(2000);
note("T4 after reload: in game?", { room: await page.locator(".room-code").first().innerText().catch(() => "none"), heading: await page.locator(".turn-heading").first().innerText().catch(() => "none") });
await shot("T4_after_reload");
await page.goBack().catch(() => {}); await page.waitForTimeout(1500);
note("T4 after browser Back: url", page.url());
note("T4 after Back: still in game?", await page.locator(".turn-heading").count());
await shot("T4_after_back");
await page.goForward().catch(() => {}); await page.waitForTimeout(1500);
await shot("T4_after_forward");

// T5: offline / reconnect
await ctx.setOffline(true);
await page.waitForTimeout(4000);
await shot("T5_offline");
note("T5 offline indicator text", (await page.locator("header").first().innerText().catch(() => "")).replace(/\s+/g, " "));
await ctx.setOffline(false);
await page.waitForTimeout(5000);
await shot("T5_back_online");
note("T5 after reconnect header", (await page.locator("header").first().innerText().catch(() => "")).replace(/\s+/g, " "));
note("T5 after reconnect: in game", await page.locator(".turn-heading").count());

// T6: keyboard-only play
await page.keyboard.press("Tab");
const focusables = [];
for (let i = 0; i < 25; i++) { await page.keyboard.press("Tab"); focusables.push(await page.evaluate(() => { const a = document.activeElement; return (a.getAttribute("aria-label") || a.innerText || a.tagName).trim().replace(/\s+/g, " ").slice(0, 30); })); }
note("T6 first 25 tab stops in-game", focusables);

// T7: zoom 200% (emulate by halving viewport CSS px) & 400%
for (const [label, w, h] of [["zoom200", 683, 384], ["zoom400", 341, 192]]) {
  await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(800);
  note(`T7 ${label} horizontal overflow px`, await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth));
  await shot(`T7_${label}`);
}
await page.setViewportSize({ width: 1366, height: 768 });

// T8: second independent context joins a private room (multiplayer)
const ctx2 = await browser.newContext({ viewport: { width: 1366, height: 768 } });
const hostPage = await ctx2.newPage();
await hostPage.goto(URL, { waitUntil: "networkidle" });
await hostPage.getByRole("button", { name: "Continue as guest" }).click();
await hostPage.getByLabel("YOUR STREET NAME").fill("HostH");
await hostPage.getByRole("button", { name: "Create a private room" }).click();
await hostPage.waitForSelector(".invite-box strong");
const rc = await hostPage.locator(".invite-box strong").textContent();
const ctx3 = await browser.newContext({ viewport: { width: 1366, height: 768 } });
const guest = await ctx3.newPage();
await guest.goto(URL + "/?room=" + rc, { waitUntil: "networkidle" });
if (await guest.getByRole("button", { name: "Continue as guest" }).count()) await guest.getByRole("button", { name: "Continue as guest" }).click();
await guest.getByLabel("YOUR STREET NAME").fill("GuestG");
await guest.getByRole("button", { name: "Join room", exact: true }).click();
await guest.waitForTimeout(1500);
await hostPage.screenshot({ path: `${OUT}/T8_host_lobby.png` });
await guest.screenshot({ path: `${OUT}/T8_guest_lobby.png` });
note("T8 guest sees", (await guest.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 220));
await hostPage.getByRole("button", { name: "Start the takeover" }).click();
await hostPage.waitForTimeout(2000);
await hostPage.screenshot({ path: `${OUT}/T8_host_started.png` });
await guest.screenshot({ path: `${OUT}/T8_guest_started.png` });
// guest tries to act out of turn
const gRoll = guest.getByRole("button", { name: /^Roll the dice/ });
note("T8 guest (off turn) sees Roll button?", await gRoll.count());
// disconnect host mid-game and see guest view
await ctx2.setOffline(true);
await guest.waitForTimeout(6000);
await guest.screenshot({ path: `${OUT}/T8_host_disconnected_guest_view.png` });
note("T8 guest view after host offline 6s", (await guest.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 400));
await ctx2.setOffline(false);
await guest.waitForTimeout(4000);
note("T8 host reconnect state", (await hostPage.locator(".turn-heading").first().innerText().catch(() => "no heading")).replace(/\s+/g, " "));
await ctx2.close(); await ctx3.close();
note("console/page errors", errs.slice(0, 15));
writeFileSync(OUT + "/results.json", JSON.stringify(R, null, 2));
await ctx.close(); await browser.close();
