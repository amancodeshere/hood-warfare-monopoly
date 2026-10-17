import { test, expect } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Keep the added map acceptance traffic separate from the existing suite.
test.use({ extraHTTPHeaders: { "X-Forwarded-For": "192.0.2.83" } });

const token = () => {
  const dir = process.env.STB_BROWSER_DATA_DIR;
  if (!dir) throw new Error("Browser fixture directory missing");
  return JSON.parse(readFileSync(join(dir, "map-token.json"), "utf8")).token;
};

test("all six regional maps update the lobby board and keep both board sizes readable", async ({ page }) => {
  const screenshotDir = process.env.STB_SCREENSHOT_DIR;
  if (screenshotDir) mkdirSync(screenshotDir, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript((profileToken) => localStorage.setItem("stb-profile", profileToken), token());
  await page.goto("/");
  await page.getByRole("button", { name: "Enter the city" }).click();
  await page.getByRole("button", { name: "Create a private room" }).click();

  const maps = [
    ["trenches", "America Blocks", "Bronx Cut", "america"],
    ["night-shift", "India Gully", "Dharavi Lane", "india"],
    ["boardwalk", "China Backstreets", "Hutong Steps", "china"],
    ["snow-day", "Europe Estates", "Brixton Steps", "europe"],
    ["neon", "Mexico Barrios", "Tepito Corner", "mexico"],
    ["festival", "Brazil Favelas", "Rocinha Steps", "brazil"],
  ];
  for (const [id, name, firstBlock, scene] of maps) {
    await page.getByRole("button", { name: "House rules & room settings", exact: true }).click();
    const rules = page.getByRole("dialog", { name: "Make the house rules" });
    await rules.getByRole("button", { name: new RegExp(`^${name}\\b`) }).click();
    await rules.getByRole("button", { name: "Save house rules" }).click();
    await expect(page.locator(".board-grid > .tile")).toHaveCount(40);
    await expect(page.locator(".board-center .city-art")).toHaveClass(new RegExp(`city-theme-${id}`));
    await expect(page.locator(".board-grid > .tile").nth(1)).toHaveAttribute("aria-label", new RegExp(firstBlock));
    const city = page.locator(".board-center .city-art");
    if (id === "night-shift") {
      await expect(city.locator(".city-details-india")).toHaveCount(1);
      await expect(city.locator(".city-drawing")).toHaveAttribute("aria-label", /cow crossing/);
    }
    if (screenshotDir)
      await page.screenshot({ path: join(screenshotDir, `${scene}-40.png`), fullPage: true });
  }

  await page.getByRole("button", { name: "House rules & room settings", exact: true }).click();
  const indiaRules = page.getByRole("dialog", { name: "Make the house rules" });
  await indiaRules.getByRole("button", { name: /^India Gully\b/ }).click();
  await indiaRules.getByRole("button", { name: "Save house rules" }).click();
  const city = page.locator(".board-center .city-art");
  const cow = city.locator(".city-cow");
  await expect(cow).toHaveCSS("animation-name", "city-drive");
  await expect(cow).toHaveCSS("animation-play-state", "running");
  await page.getByRole("button", { name: "Pause city traffic" }).click();
  await expect(city).toHaveClass(/traffic-paused/);
  await expect(cow).toHaveCSS("animation-play-state", "paused");
  await expect(page.getByRole("button", { name: "Resume city traffic" })).toBeVisible();
  await page.getByRole("button", { name: "Resume city traffic" }).click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(cow).toHaveCSS("animation-name", "none");
  await expect(page.getByRole("button", { name: /city traffic/ })).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });

  await page.getByRole("button", { name: "House rules & room settings", exact: true }).click();
  const brazilRules = page.getByRole("dialog", { name: "Make the house rules" });
  await brazilRules.getByRole("button", { name: /^Brazil Favelas\b/ }).click();
  await brazilRules.getByRole("button", { name: "Save house rules" }).click();

  await page.getByRole("button", { name: "28 Tiles · Quick Blitz" }).click();
  await expect(page.locator(".board-grid > .tile")).toHaveCount(28);
  await expect(city).toHaveClass(/city-theme-festival/);
  await expect(page.locator(".board-grid > .tile").nth(1)).toHaveAttribute("aria-label", /Rocinha Steps/);
  await page.setViewportSize({ width: 390, height: 844 });
  if (screenshotDir)
    await page.screenshot({ path: join(screenshotDir, "brazil-quick-mobile-readable.png"), fullPage: true });
  await page.getByRole("button", { name: "See full map" }).click();
  await expect(page.locator(".board-viewport")).toHaveClass(/overview/);

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await expect(page.locator(".board-grid > .tile").nth(1)).toBeVisible();
  await expect(page.locator(".board-grid > .tile").nth(1).locator(".tile-name")).toHaveAttribute("title", "Rocinha Steps");
  if (screenshotDir)
    await page.screenshot({ path: join(screenshotDir, "brazil-quick-mobile-overview.png"), fullPage: true });
  await page.locator(".board-grid > .tile").nth(1).click();
  await expect(page.getByRole("dialog", { name: "Rocinha Steps" })).toBeVisible();
});

for (const [session, mapName, tileCount, property] of [
  ["regional-america-buy", "America Blocks", 40, "Bronx Cut"],
  ["regional-brazil-quick-buy", "Brazil Favelas", 28, "Rocinha Steps"],
]) {
  test(`${mapName} server fixture supports an authoritative property purchase (${tileCount} tiles)`, async ({ page }) => {
    await page.addInitScript((seat) => localStorage.setItem("stb-seat", seat), session);
    await page.goto("/");
    if (await page.getByRole("button", { name: "Continue as guest" }).count())
      await page.getByRole("button", { name: "Continue as guest" }).click();
    await expect(page.locator(".board-grid > .tile")).toHaveCount(tileCount);
    await expect(page.locator(".board-center .city-art")).toHaveClass(new RegExp(`city-theme-${tileCount === 28 ? "festival" : "trenches"}`));
    await expect(page.getByRole("heading", { name: property })).toBeVisible();
    await page.getByRole("button", { name: "Claim block" }).click();
    const deed = page.locator(".board-grid > .tile").nth(1);
    await expect(deed).toHaveClass(/owned/);
    await expect(deed).toHaveAttribute("aria-label", new RegExp(`${property}.*owned by Map Buyer`));
    await expect(page.getByRole("button", { name: "End your turn" })).toBeVisible();
    await page.getByRole("button", { name: "End your turn" }).click();
    await expect(page.locator(".turn-heading")).toContainText("MAP RIVAL’S TURN");
  });
}
