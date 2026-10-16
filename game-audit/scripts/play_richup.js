import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const outDir = "/Users/aman/Desktop/Personal Projects/hw-monopoly/game-audit/evidence/richup";
fs.mkdirSync(outDir, { recursive: true });

async function main() {
  console.log("Launching Chromium to inspect richup.io...");
  const browser = await chromium.launch({
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  });

  // Block ad and tracking networks to prevent timeouts
  await context.route("**/*", (route) => {
    const url = route.request().url();
    if (
      url.includes("google") ||
      url.includes("vdo.ai") ||
      url.includes("ad") ||
      url.includes("track") ||
      url.includes("analytics") ||
      url.includes("liadm") ||
      url.includes("prebid")
    ) {
      return route.abort();
    }
    return route.continue();
  });

  const page = await context.newPage();

  try {
    console.log("Navigating to https://richup.io with domcontentloaded...");
    await page.goto("https://richup.io", { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(outDir, "01_landing_page.png") });
    console.log("Saved landing page screenshot.");

    // Inspect buttons on landing page
    const landingButtons = await page.evaluate(() =>
      Array.from(document.querySelectorAll("button, a")).map((el) => ({
        tag: el.tagName,
        text: el.innerText.trim(),
        class: el.className,
      })).filter((x) => x.text)
    );
    console.log("Landing elements:", landingButtons);

    // Look for "Create a private game" or "Play"
    const privateBtn = page.getByText(/create a private game/i).first();
    const playBtn = page.getByText(/^play$/i).first();

    if (await privateBtn.isVisible()) {
      console.log("Clicking 'Create a private game'...");
      await privateBtn.click();
      await page.waitForTimeout(4000);
      await page.screenshot({ path: path.join(outDir, "02_private_room_lobby.png") });
    } else if (await playBtn.isVisible()) {
      console.log("Clicking 'Play'...");
      await playBtn.click();
      await page.waitForTimeout(4000);
      await page.screenshot({ path: path.join(outDir, "02_play_clicked.png") });
    }

    console.log("Current URL:", page.url());

    // In lobby, check for Add Bot or Game Settings
    const lobbyInfo = await page.evaluate(() => {
      return {
        url: window.location.href,
        buttons: Array.from(document.querySelectorAll("button")).map((b) => b.innerText.trim()).filter(Boolean),
        text: document.body.innerText.slice(0, 1200),
      };
    });
    console.log("Lobby info:", lobbyInfo);

    // Try finding "Add Bot" or "Start Game"
    const botBtn = page.getByText(/add bot|\+ bot/i).first();
    if (await botBtn.isVisible()) {
      console.log("Clicking Add Bot...");
      await botBtn.click();
      await page.waitForTimeout(1000);
      await botBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(outDir, "03_lobby_bots.png") });
    }

    const startBtn = page.getByRole("button", { name: /start/i }).first();
    if (await startBtn.isVisible()) {
      console.log("Clicking Start Game...");
      await startBtn.click();
      await page.waitForTimeout(5000);
      await page.screenshot({ path: path.join(outDir, "04_game_started.png") });
    }

    // Capture board elements and styles
    const boardAnalysis = await page.evaluate(() => {
      return {
        title: document.title,
        bodySnippet: document.body.innerText.slice(0, 1500),
        canvasCount: document.querySelectorAll("canvas").length,
        svgCount: document.querySelectorAll("svg").length,
        buttons: Array.from(document.querySelectorAll("button")).map((b) => b.innerText.trim()).filter(Boolean),
      };
    });
    console.log("Board analysis:", boardAnalysis);

    // If game is active, try rolling or clicking action buttons
    for (let i = 1; i <= 3; i++) {
      console.log(`Action step ${i}...`);
      const rollBtn = page.getByRole("button", { name: /roll/i }).first();
      const endBtn = page.getByRole("button", { name: /end turn|next/i }).first();
      const buyBtn = page.getByRole("button", { name: /buy/i }).first();

      if (await rollBtn.isVisible()) {
        console.log("Clicking Roll...");
        await rollBtn.click();
        await page.waitForTimeout(3000);
      } else if (await buyBtn.isVisible()) {
        console.log("Clicking Buy...");
        await buyBtn.click();
        await page.waitForTimeout(2000);
      } else if (await endBtn.isVisible()) {
        console.log("Clicking End Turn...");
        await endBtn.click();
        await page.waitForTimeout(2000);
      }
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(outDir, `05_step_${i}.png`) });
    }

    console.log("Completed Richup session recording.");

  } catch (err) {
    console.error("Error during richup exploration:", err);
    await page.screenshot({ path: path.join(outDir, "error_screenshot.png") });
  } finally {
    await browser.close();
    console.log("Exploration finished. Screenshots saved in:", outDir);
  }
}

main();
