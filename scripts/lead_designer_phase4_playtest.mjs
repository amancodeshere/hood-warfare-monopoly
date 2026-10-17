import { chromium } from "playwright";
import { spawn } from "child_process";
import { writeFileSync, copyFileSync, mkdirSync } from "fs";

const PORT = 4177;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const DATA_DIR = "/tmp/stb-beta-p4";
const EVIDENCE_LOCAL = "/Users/aman/Desktop/hw-monopoly/game-audit/evidence/beta-test-phase4";
const EVIDENCE_ARTIFACT = "/Users/aman/.gemini/antigravity/brain/32958e0d-7711-44dc-b51a-c3cb7698d01d/evidence";

mkdirSync(EVIDENCE_LOCAL, { recursive: true });
mkdirSync(EVIDENCE_ARTIFACT, { recursive: true });

const auditData = {
  timestamp: new Date().toISOString(),
  port: PORT,
  viewports: {},
  lobbyMapSettings: {},
  chatScrollAudit: {},
  gameplayPacing: {},
};

function log(msg) {
  console.log(`[BETA AUDIT] ${msg}`);
}

async function saveScreen(page, name, fullPage = false) {
  const p1 = `${EVIDENCE_LOCAL}/${name}.png`;
  const p2 = `${EVIDENCE_ARTIFACT}/${name}.png`;
  await page.screenshot({ path: p1, fullPage });
  try {
    copyFileSync(p1, p2);
  } catch (e) {
    // ignore
  }
  log(`Screenshot saved: ${name}.png (fullPage: ${fullPage})`);
}

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status === 200 || res.status === 404 || res.status === 304) {
        return true;
      }
    } catch (e) {
      // wait
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Server at ${url} did not start within ${timeoutMs}ms`);
}

async function runAudit() {
  log(`Starting temporary local server on PORT=${PORT}...`);
  const serverProc = spawn(process.execPath, ["server/index.js"], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR },
    stdio: "pipe",
  });

  serverProc.stdout.on("data", (d) => {
    // console.log(`[SERVER STDOUT] ${d.toString().trim()}`);
  });
  serverProc.stderr.on("data", (d) => {
    console.error(`[SERVER STDERR] ${d.toString().trim()}`);
  });

  let browser;
  try {
    await waitForServer(`${BASE_URL}/`, 15000);
    log(`Server is responding at ${BASE_URL}! Launching Playwright...`);

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1366, height: 768 },
    });
    const page = await context.newPage();

    // 1. Visit landing page
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);

    // Guest login
    const guestBtn = page.getByRole("button", { name: /Continue as guest/i });
    if ((await guestBtn.count()) && (await guestBtn.isVisible())) {
      await guestBtn.click();
      log("Clicked Continue as guest");
      await page.waitForTimeout(600);
    }

    // Set name
    const nameInput = page.getByLabel(/YOUR STREET NAME/i);
    if ((await nameInput.count()) && (await nameInput.isVisible())) {
      await nameInput.fill("DonMega");
    }

    // 2. Audit Lobby Map Settings
    log("Inspecting Room Settings on Entry Page...");
    const settingsBtn = page.getByRole("button", {
      name: /Room settings|House rules & room settings/i,
    });
    let mapOptionsList = [];
    let mapSizeOptionFound = false;

    if ((await settingsBtn.count()) && (await settingsBtn.isVisible())) {
      await settingsBtn.click();
      await page.waitForTimeout(600);
      await saveScreen(page, "01_lobby_map_settings_modal");

      const mapSelect = page.getByRole("combobox", { name: /City map/i });
      if (await mapSelect.count()) {
        mapOptionsList = await mapSelect.evaluate((sel) =>
          Array.from(sel.options).map((o) => ({
            value: o.value,
            text: o.text,
            disabled: o.disabled,
          })),
        );
      }

      // Check for any map size selector (e.g. 28 tiles, blitz, small board)
      const allSelects = await page.$$eval("select", (sels) =>
        sels.map((s) => ({
          label: s.getAttribute("aria-label") || s.previousElementSibling?.textContent || "",
          options: Array.from(s.options).map((o) => o.text),
        })),
      );

      mapSizeOptionFound = allSelects.some(
        (s) =>
          /size|tiles|blocks/i.test(s.label) ||
          s.options.some((opt) => /28|blitz|small/i.test(opt)),
      );

      auditData.lobbyMapSettings = {
        mapOptions: mapOptionsList,
        allLobbySelects: allSelects,
        mapSizeOptionFound,
        finding: mapSizeOptionFound
          ? "Map size option exists"
          : "CRITICAL: Only city theme skins exist (The Trenches, Night Shift, etc.). No map size or blitz tile count option.",
      };

      // Close modal
      const closeBtn = page.getByRole("button", { name: /Close|Save/i });
      if (await closeBtn.count()) {
        await closeBtn.first().click();
        await page.waitForTimeout(400);
      }
    }

    // Configure 3 solo bots
    const botsSelect = page.locator("#solo-bots");
    if (await botsSelect.count()) {
      await botsSelect.selectOption("3");
    }

    // Start solo game
    const startSolo = page.getByRole("button", { name: /Play solo vs bots/i });
    await startSolo.click();
    log("Clicked Play solo vs bots. Waiting for game board...");
    await page.waitForTimeout(2500);

    // Ensure we are in game
    await page.waitForSelector(".board-grid", { timeout: 10000 });
    log("Game board active!");

    // Helper to extract layout metrics
    async function measureLayoutMetrics(vpName) {
      return await page.evaluate((vpName) => {
        const docEl = document.documentElement;
        const body = document.body;

        const winW = window.innerWidth;
        const winH = window.innerHeight;
        const scrollW = Math.max(docEl.scrollWidth, body.scrollWidth);
        const scrollH = Math.max(docEl.scrollHeight, body.scrollHeight);

        const header = document.querySelector(".site-header");
        const tableArea = document.querySelector(".table-area");
        const boardShell = document.querySelector(".board-shell");
        const boardGrid = document.querySelector(".board-grid");
        const actionSidebar = document.querySelector(".action-sidebar");
        const actionSticky = document.querySelector(".action-panel-sticky");
        const rollBtn = Array.from(document.querySelectorAll("button")).find(
          (b) => /Roll the dice/i.test(b.textContent),
        );
        const boardChat = document.querySelector(".board-chat");
        const crewSidebar = document.querySelector(".crew-sidebar");

        const getBox = (el) => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return {
            x: Math.round(r.x),
            y: Math.round(r.y),
            top: Math.round(r.top),
            bottom: Math.round(r.bottom),
            width: Math.round(r.width),
            height: Math.round(r.height),
            visibleInWindow: r.top >= 0 && r.bottom <= winH,
            partiallyVisible: r.bottom > 0 && r.top < winH,
            isBelowFold: r.top >= winH,
          };
        };

        return {
          viewport: vpName,
          window: { width: winW, height: winH },
          document: {
            scrollWidth: scrollW,
            scrollHeight: scrollH,
            hasVerticalScroll: scrollH > winH + 1,
            hasHorizontalScroll: scrollW > winW + 1,
            verticalOverflowPx: Math.max(0, scrollH - winH),
            horizontalOverflowPx: Math.max(0, scrollW - winW),
          },
          elements: {
            header: getBox(header),
            crewSidebar: getBox(crewSidebar),
            tableArea: getBox(tableArea),
            boardShell: getBox(boardShell),
            boardGrid: getBox(boardGrid),
            actionSidebar: getBox(actionSidebar),
            actionSticky: getBox(actionSticky),
            rollBtn: getBox(rollBtn),
            boardChat: getBox(boardChat),
          },
        };
      }, vpName);
    }

    // 3. Viewport Audits:
    // A) 1920x1080 FHD Desktop
    log("Testing Viewport 1: 1920x1080 (FHD Desktop)...");
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);
    const m1920 = await measureLayoutMetrics("1920x1080");
    auditData.viewports["1920x1080"] = m1920;
    await saveScreen(page, "02_desktop_1920x1080_viewport", false);
    await saveScreen(page, "02_desktop_1920x1080_fullpage", true);

    // B) 1366x768 Standard Laptop
    log("Testing Viewport 2: 1366x768 (Standard Laptop)...");
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.waitForTimeout(500);
    const m1366 = await measureLayoutMetrics("1366x768");
    auditData.viewports["1366x768"] = m1366;
    await saveScreen(page, "03_laptop_1366x768_viewport", false);
    await saveScreen(page, "03_laptop_1366x768_fullpage", true);

    // Scroll down to bottom to observe chat sitting below the fold
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(400);
    await saveScreen(page, "03_laptop_1366x768_scrolled_bottom", false);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);

    // C) 390x844 Mobile iPhone 14
    log("Testing Viewport 3: 390x844 (Mobile iPhone 14)...");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);
    const m390 = await measureLayoutMetrics("390x844");
    auditData.viewports["390x844"] = m390;
    await saveScreen(page, "04_mobile_390x844_top", false);
    await saveScreen(page, "04_mobile_390x844_fullpage", true);

    // Scroll to action button on mobile
    const rollBtnMobile = page.getByRole("button", { name: /Roll the dice/i });
    if (await rollBtnMobile.count()) {
      await rollBtnMobile.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      await saveScreen(page, "04_mobile_390x844_action_scrolled", false);
    }

    // Scroll to bottom on mobile
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(400);
    await saveScreen(page, "04_mobile_390x844_bottom", false);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);

    // 4. Test Chat Jump behavior
    log("Testing Chat Tab click and page scroll jump...");
    // Reset to laptop resolution
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.waitForTimeout(500);

    const initialScrollY = await page.evaluate(() => window.scrollY);
    const chatTab = page.getByRole("button", { name: "Chat", exact: true });
    if (await chatTab.count()) {
      await chatTab.click();
      await page.waitForTimeout(800); // wait for smooth scroll

      const afterChatClickScrollY = await page.evaluate(() => window.scrollY);
      const chatBBox = await page.evaluate(() => {
        const c = document.querySelector(".board-chat");
        return c ? c.getBoundingClientRect().top : null;
      });

      auditData.chatScrollAudit = {
        initialScrollY,
        afterChatClickScrollY,
        scrolledDownPx: afterChatClickScrollY - initialScrollY,
        chatTopRelativeToViewport: chatBBox,
        verdict:
          afterChatClickScrollY > 100
            ? "CRITICAL UX FLAW: Clicking Chat tab triggers smooth scroll jump down below board (scrollY: " +
              afterChatClickScrollY +
              "px), completely losing board visibility."
            : "Chat stayed on screen",
      };

      await saveScreen(page, "05_chat_tab_scroll_jump", false);
    }

    // 5. Play live turns: roll dice, buy / auction, observe pacing
    log("Playing active game turns to test feel and pacing...");
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);

    const rollBtn = page.getByRole("button", { name: /Roll the dice/i });
    if ((await rollBtn.count()) && (await rollBtn.isEnabled())) {
      await rollBtn.click();
      log("Dice rolled! Waiting for token movement...");
      await page.waitForTimeout(2500);
      await saveScreen(page, "06_post_roll_action_phase", false);

      // Check what action is presented
      const claimBtn = page.getByRole("button", { name: /Claim block/i });
      const auctionBtn = page.getByRole("button", {
        name: /Put it up for auction|Pass on this block/i,
      });

      if (await claimBtn.count()) {
        log("Landed on unowned property. Testing property acquisition.");
        await saveScreen(page, "07_property_buy_phase", false);
        await claimBtn.click();
        await page.waitForTimeout(1000);
      } else if (await auctionBtn.count()) {
        log("Testing auction trigger...");
        await auctionBtn.click();
        await page.waitForTimeout(1500);
        await saveScreen(page, "07_auction_active", false);
      }

      // Check End Turn button
      const endBtn = page.getByRole("button", { name: /End your turn/i });
      if ((await endBtn.count()) && (await endBtn.isVisible())) {
        await saveScreen(page, "08_end_turn_panel", false);
        await endBtn.click();
        log("Clicked End your turn.");
        await page.waitForTimeout(2000);
      }
    }

    // Write audit telemetry
    const auditJsonLocal = `${EVIDENCE_LOCAL}/phase4_audit_data.json`;
    const auditJsonArtifact = `${EVIDENCE_ARTIFACT}/phase4_audit_data.json`;
    writeFileSync(auditJsonLocal, JSON.stringify(auditData, null, 2));
    try {
      copyFileSync(auditJsonLocal, auditJsonArtifact);
    } catch (e) {}

    log("Phase 4 Playtest Audit completed successfully!");
  } catch (err) {
    console.error("Audit encountered error:", err);
    throw err;
  } finally {
    if (browser) {
      log("Closing Playwright browser...");
      await browser.close();
    }
    log("Terminating test server...");
    serverProc.kill("SIGKILL");
  }
}

runAudit()
  .then(() => {
    log("Audit script finished cleanly.");
    process.exit(0);
  })
  .catch((e) => {
    console.error("Audit failed:", e);
    process.exit(1);
  });
