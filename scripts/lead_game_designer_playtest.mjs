import { chromium } from "playwright";
import { writeFileSync, copyFileSync, existsSync } from "fs";
import { resolve } from "path";

const URL = "http://127.0.0.1:4173";
const EVIDENCE_LOCAL = "/Users/aman/Desktop/hw-monopoly/game-audit/evidence/beta-test";
const EVIDENCE_ARTIFACT = "/Users/aman/.gemini/antigravity/brain/ab5bf5bb-0ff4-4bde-8108-d1bc9714cf6b/evidence";

const logs = [];
function L(msg) {
  console.log(msg);
  logs.push(`[${new Date().toISOString()}] ${msg}`);
}

async function saveScreen(page, name) {
  const p1 = `${EVIDENCE_LOCAL}/${name}.png`;
  const p2 = `${EVIDENCE_ARTIFACT}/${name}.png`;
  await page.screenshot({ path: p1, fullPage: false });
  copyFileSync(p1, p2);
  L(`Saved screenshot: ${name}.png`);
}

async function runPlaytest() {
  L("=== STARTING LEAD GAME DESIGNER LIVE PLAYTEST ===");
  const browser = await chromium.launch({ headless: true });
  
  // ----------------------------------------------------
  // TEST PHASE 1: Desktop Main Gameplay Loop (1280x800)
  // ----------------------------------------------------
  L("\n--- PHASE 1: DESKTOP GAMEPLAY LOOP & BENCHMARK AUDIT ---");
  const desktopCtx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await desktopCtx.newPage();

  const consoleLogs = [];
  page.on("console", (msg) => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on("pageerror", (err) => consoleLogs.push(`[PAGEERROR] ${err.message}`));

  L("Navigating to " + URL);
  await page.goto(URL, { waitUntil: "networkidle" });
  await saveScreen(page, "01_landing_page");

  // Guest login
  const guestBtn = page.getByRole("button", { name: "Continue as guest" });
  if (await guestBtn.count() && await guestBtn.isVisible()) {
    await guestBtn.click();
    L("Clicked 'Continue as guest'");
    await page.waitForTimeout(500);
  }

  await saveScreen(page, "02_lobby_view");

  // Fill street name & select 3 bots
  const nameInput = page.getByLabel("YOUR STREET NAME");
  if (await nameInput.count() && await nameInput.isVisible()) {
    await nameInput.fill("DonMega");
    L("Entered player name: DonMega");
  }

  const botsSelect = page.locator("#solo-bots");
  if (await botsSelect.count() && await botsSelect.isVisible()) {
    await botsSelect.selectOption("3");
    L("Selected 3 solo bots");
  }

  await saveScreen(page, "03_lobby_configured");

  // Inspect Button Styling before starting
  const buttonStyles = await page.evaluate(() => {
    const btn = document.querySelector(".solo-button") || document.querySelector(".button");
    if (!btn) return null;
    const computed = window.getComputedStyle(btn);
    return {
      transition: computed.transition,
      transform: computed.transform,
      boxShadow: computed.boxShadow,
      borderRadius: computed.borderRadius,
      padding: computed.padding,
      fontFamily: computed.fontFamily,
      fontSize: computed.fontSize,
      backgroundColor: computed.backgroundColor,
    };
  });
  L(`Button styles analysis: ${JSON.stringify(buttonStyles, null, 2)}`);

  // Start solo match
  const startSoloBtn = page.getByRole("button", { name: /Play solo vs bots/ });
  await startSoloBtn.click();
  L("Clicked 'Play solo vs bots'");
  await page.waitForTimeout(2000);
  await saveScreen(page, "04_match_started");

  // Inspect Turn Timer
  const timerData = await page.evaluate(() => {
    const heading = document.querySelector(".turn-heading");
    const clock = heading ? heading.innerText : "NOT_FOUND";
    const timerRing = document.querySelector("svg.timer-ring, circle.timer-progress");
    return {
      turnHeadingText: clock,
      hasCircularTimerSvg: !!timerRing,
    };
  });
  L(`Turn Timer Audit: ${JSON.stringify(timerData, null, 2)}`);

  // Inspect Audio Toggle
  const audioBtn = page.locator(".icon-button[aria-label*='sound'], .icon-button[title*='sound']");
  if (await audioBtn.count()) {
    const audioLabel = await audioBtn.getAttribute("aria-label");
    L(`Audio toggle found. Current state: ${audioLabel}`);
    // Click toggle
    await audioBtn.click();
    await page.waitForTimeout(300);
    const audioLabelAfter = await audioBtn.getAttribute("aria-label");
    L(`Audio toggle clicked. New state: ${audioLabelAfter}`);
    await saveScreen(page, "05_audio_toggled");
  }

  // Live Play: Roll dice, inspect tokens, buy blocks
  L("\n--- Commencing Turn Loop (15 Actions) ---");
  let turnsTaken = 0;
  for (let step = 0; step < 25; step++) {
    await page.waitForTimeout(1000);

    const isMyTurn = await page.evaluate(() => {
      const heading = document.querySelector(".turn-heading");
      return heading ? heading.innerText.includes("YOUR TURN") : false;
    });

    const rollBtn = page.getByRole("button", { name: /Roll the dice/ });
    if (await rollBtn.count() && await rollBtn.isVisible() && await rollBtn.isEnabled()) {
      L(`[Step ${step}] Found 'Roll the dice' button. Clicking...`);
      await rollBtn.click();
      await page.waitForTimeout(1200); // Wait for dice rolling animation and movement
      await saveScreen(page, `06_turn_rolled_${step}`);
      turnsTaken++;
    }

    const buyBtn = page.getByRole("button", { name: /^Buy/i });
    if (await buyBtn.count() && await buyBtn.isVisible() && await buyBtn.isEnabled()) {
      const text = await buyBtn.innerText();
      L(`[Step ${step}] Found Buy button: "${text}". Purchasing property!`);
      await buyBtn.click();
      await page.waitForTimeout(1200);
      await saveScreen(page, `07_property_bought_${step}`);
    }

    const endTurnBtn = page.getByRole("button", { name: /End turn/i });
    if (await endTurnBtn.count() && await endTurnBtn.isVisible() && await endTurnBtn.isEnabled()) {
      L(`[Step ${step}] Found 'End turn' button. Ending turn...`);
      await endTurnBtn.click();
      await page.waitForTimeout(1000);
    }

    const passBtn = page.getByRole("button", { name: /^(Pass|Skip|Continue|OK|Got it)/i });
    if (await passBtn.count() && await passBtn.first().isVisible() && await passBtn.first().isEnabled()) {
      const pText = await passBtn.first().innerText();
      L(`[Step ${step}] Found prompt button: "${pText}". Clicking...`);
      await passBtn.first().click();
      await page.waitForTimeout(800);
    }

    // Check if dialog / wheel / auction popped up
    const dialog = page.getByRole("dialog");
    if (await dialog.count() && await dialog.isVisible()) {
      const title = await dialog.innerText();
      L(`[Step ${step}] Modal dialog active: ${title.slice(0, 100).replace(/\n/g, " ")}`);
      await saveScreen(page, `08_dialog_${step}`);
      const dialogBtn = dialog.locator("button:visible:enabled");
      if (await dialogBtn.count()) {
        await dialogBtn.first().click();
      }
    }
  }

  // ----------------------------------------------------
  // TEST PHASE 2: Property Inspection Audit
  // ----------------------------------------------------
  L("\n--- PHASE 2: PROPERTY DEED INSPECTION AUDIT ---");
  // Find board tiles
  const tiles = page.locator(".tile");
  const tileCount = await tiles.count();
  L(`Board has ${tileCount} tiles.`);

  // Click tile index 1 (Auntie's Bodega / first street)
  const targetTile = tiles.nth(1);
  if (await targetTile.count()) {
    const tileName = await targetTile.innerText();
    L(`Clicking tile index 1 (${tileName.replace(/\n/g, " ")}) to inspect property deed.`);
    await targetTile.click();
    await page.waitForTimeout(800);
    await saveScreen(page, "09_property_inspected_desktop");

    const deedInspectionData = await page.evaluate(() => {
      const detail = document.querySelector(".property-detail");
      if (!detail) return { found: false };
      const computed = window.getComputedStyle(detail);
      const isModal = computed.position === "fixed" || computed.position === "absolute";
      const rect = detail.getBoundingClientRect();
      const parentTag = detail.parentElement?.tagName;
      const parentClass = detail.parentElement?.className;
      return {
        found: true,
        parent: `${parentTag}.${parentClass}`,
        isFloatingModal: isModal,
        position: computed.position,
        width: rect.width,
        height: rect.height,
        left: rect.left,
        top: rect.top,
        heading: detail.querySelector("#property-heading")?.innerText,
        hasRentLadder: !!detail.querySelector(".property-rent-table, table, .rent-levels"),
        hasCloseButton: !!detail.querySelector("button[aria-label*='Close']"),
      };
    });
    L(`Property Deed Inspection Analysis: ${JSON.stringify(deedInspectionData, null, 2)}`);
  }

  // Also check "My turf" tab in sidebar
  const turfTab = page.getByRole("button", { name: /My turf/i });
  if (await turfTab.count() && await turfTab.isVisible()) {
    await turfTab.click();
    L("Switched to 'My turf' tab");
    await page.waitForTimeout(600);
    await saveScreen(page, "10_my_turf_tab");
  }

  // ----------------------------------------------------
  // TEST PHASE 3: Seeded First-Person Shootout Audit
  // ----------------------------------------------------
  L("\n--- PHASE 3: FIRST-PERSON SHOOTOUT (ARENA DUEL) AUDIT ---");
  const fpsCtx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const fpsPage = await fpsCtx.newPage();
  
  // Set session storage to seeded fps-ace session
  await fpsPage.addInitScript(() => {
    localStorage.setItem("stb-seat", "fps-ace");
  });
  await fpsPage.goto(URL, { waitUntil: "networkidle" });
  await fpsPage.waitForTimeout(1500);
  await saveScreen(fpsPage, "11_shootout_arena_view");

  const arenaData = await fpsPage.evaluate(() => {
    const arenaCanvas = document.querySelector("canvas");
    const duelContainer = document.querySelector(".fps-duel, .arena-duel, [class*='duel']");
    const weaponInfo = document.querySelector(".weapon-card, .duel-stat");
    return {
      hasCanvas: !!arenaCanvas,
      canvasSize: arenaCanvas ? { w: arenaCanvas.width, h: arenaCanvas.height } : null,
      duelText: duelContainer ? duelContainer.innerText.slice(0, 300).replace(/\n/g, " ") : "NOT_FOUND",
    };
  });
  L(`Shootout Arena Data: ${JSON.stringify(arenaData, null, 2)}`);
  await fpsCtx.close();

  // ----------------------------------------------------
  // TEST PHASE 4: Mobile Viewport Audit (390x844)
  // ----------------------------------------------------
  L("\n--- PHASE 4: MOBILE VIEWPORT & RESPONSIVE AUDIT (390x844) ---");
  const mobileCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const mobPage = await mobileCtx.newPage();
  await mobPage.goto(URL, { waitUntil: "networkidle" });

  const mobGuestBtn = mobPage.getByRole("button", { name: "Continue as guest" });
  if (await mobGuestBtn.count() && await mobGuestBtn.isVisible()) {
    await mobGuestBtn.click();
    await mobPage.waitForTimeout(400);
  }

  const mobBots = mobPage.locator("#solo-bots");
  if (await mobBots.count()) {
    await mobBots.selectOption("3");
  }
  const mobStart = mobPage.getByRole("button", { name: /Play solo vs bots/ });
  if (await mobStart.count()) {
    await mobStart.click();
    await mobPage.waitForTimeout(2000);
  }
  await saveScreen(mobPage, "12_mobile_board_view");

  // Test mobile property deed inspection
  const mobTiles = mobPage.locator(".tile");
  if (await mobTiles.count()) {
    await mobTiles.nth(3).click();
    await mobPage.waitForTimeout(800);
    await saveScreen(mobPage, "13_mobile_property_inspected");

    const mobInspectionData = await mobPage.evaluate(() => {
      const detail = document.querySelector(".property-detail");
      const board = document.querySelector(".board-wrapper, .board");
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      return {
        hasDetail: !!detail,
        scrollY,
        docHeight,
        windowInnerHeight: window.innerHeight,
        boardVisibleInViewport: board ? (board.getBoundingClientRect().top >= 0 && board.getBoundingClientRect().bottom <= window.innerHeight) : false,
      };
    });
    L(`Mobile Property Inspection Data: ${JSON.stringify(mobInspectionData, null, 2)}`);
  }

  await mobileCtx.close();
  await desktopCtx.close();
  await browser.close();

  writeFileSync(`${EVIDENCE_LOCAL}/playtest_logs.json`, JSON.stringify(logs, null, 2));
  L("\n=== LIVE PLAYTEST COMPLETED SUCCESSFULLY ===");
}

runPlaytest().catch((err) => {
  console.error("Playtest failed with error:", err);
  process.exit(1);
});
