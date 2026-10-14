import { test, expect } from "@playwright/test";
test("two browsers move freely and settle a projectile rent duel without blocking inputs", async ({
  page,
  browser,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem("stb-seat", "fps-ace"));
  await page.goto("/");
  const context = await browser.newContext();
  await context.addInitScript(() =>
    localStorage.setItem("stb-seat", "fps-rival"),
  );
  const rival = await context.newPage();
  await rival.goto("/");
  const a = page.getByRole("dialog", { name: "Rent due. Guns up." }),
    b = rival.getByRole("dialog", { name: "Rent due. Guns up." });
  await expect(
    a.getByText("Win wipes your rent. Lose forfeits your cash and turf."),
  ).toBeVisible();
  await expect(
    b.getByText(
      "Win eliminates the challenger; a loss wipes the rent they owe you.",
    ),
  ).toBeVisible();
  await a.getByRole("button", { name: "Ready up" }).click();
  await expect(
    a.getByRole("button", { name: /Ready · waiting/ }),
  ).toBeDisabled();
  await b.getByRole("button", { name: "Ready up" }).click();
  await expect(
    a.getByRole("button", { name: "Fire", exact: true }),
  ).toBeEnabled({ timeout: 6000 });
  const canvas = a.locator(".arena-canvas"),
    before = await canvas.evaluate((el) => el.toDataURL());
  await page.keyboard.down("w");
  await page.waitForTimeout(350);
  await page.keyboard.up("w");
  await expect
    .poll(() => canvas.evaluate((el) => el.toDataURL()))
    .not.toBe(before);
  await expect(
    a.getByRole("button", { name: "Fire", exact: true }),
  ).toBeEnabled();
  const output = process.env.STB_SCREENSHOT_DIR;
  if (output)
    await page.screenshot({
      path: output + "/arena-desktop.png",
      fullPage: false,
    });
  // Body shots need real travel time and four hits; movement inputs stay active between shots.
  for (let i = 0; i < 4; i++) {
    await a.getByRole("button", { name: "Fire", exact: true }).click();
    if (i < 3)
      await expect(
        b.getByRole("meter", { name: "Your health" }),
      ).toHaveAttribute("value", String(100 - (i + 1) * 25));
  }
  await expect(
    page.getByRole("dialog", { name: "The score is settled." }),
  ).toBeVisible();
  await expect(
    page.getByText("Rent wiped. Live to own another block."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back to the block" }).click();
  await expect(canvas).not.toBeVisible();
  expect(errors).toEqual([]);
  await context.close();
});
test("touch arena supports held movement, aiming, ammunition and reload on a narrow screen", async ({
  page,
  browser,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() =>
    localStorage.setItem("stb-seat", "fps-mobile-ace"),
  );
  await page.goto("/");
  const context = await browser.newContext();
  await context.addInitScript(() =>
    localStorage.setItem("stb-seat", "fps-mobile-rival"),
  );
  const rival = await context.newPage();
  await rival.goto("/");
  await page.getByRole("button", { name: "Ready up" }).click();
  await rival.getByRole("button", { name: "Ready up" }).click();
  const fire = page.getByRole("button", { name: "Fire", exact: true });
  await expect(fire).toBeEnabled({ timeout: 6000 });
  const canvas = page.locator(".arena-canvas"),
    before = await canvas.evaluate((el) => el.toDataURL());
  const forward = page.getByRole("button", {
    name: "Move forward",
    exact: true,
  });
  await forward.scrollIntoViewIfNeeded();
  const box = await forward.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(300);
  await page.mouse.up();
  await expect
    .poll(() => canvas.evaluate((el) => el.toDataURL()))
    .not.toBe(before);
  await fire.click();
  await expect(page.locator(".arena-hud strong")).toHaveText("5 / 6");
  await page.getByRole("button", { name: "Reload", exact: true }).click();
  await expect(page.locator(".arena-hud strong")).toHaveText("RELOADING");
  await expect(page.locator(".arena-hud strong")).toHaveText("6 / 6");
  await canvas.scrollIntoViewIfNeeded();
  if (process.env.STB_SCREENSHOT_DIR)
    await page.screenshot({
      path: process.env.STB_SCREENSHOT_DIR + "/arena-mobile.png",
      fullPage: true,
    });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await context.close();
});
test("mobile ownership badges and large street pieces remain readable and keyboard inspectable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() =>
    localStorage.setItem("stb-seat", "pieces-ace"),
  );
  await page.goto("/");
  const tile = page.getByRole("button", {
    name: /Auntie’s Bodega, \$60, owned by Big Stepper/,
  });
  await expect(tile.locator(".owner-badge")).toContainText("YOU OWN");
  await expect(tile.locator(".building-pieces")).toHaveAttribute(
    "aria-label",
    "4 houses",
  );
  expect(
    (await tile.locator(".token").first().boundingBox()).height,
  ).toBeGreaterThanOrEqual(36);
  await tile.click();
  await expect(page.locator(".property-owner-summary")).toContainText(
    "Your block",
  );
  await expect(page.locator(".property-owner-summary")).toContainText(
    "4 houses",
  );
  await expect(
    page.getByRole("region", { name: "Auntie’s Bodega" }),
  ).toBeFocused();
  const hotel = page.getByRole("button", {
    name: /No Cap Cuts, \$100, owned by Gold Chain/,
  });
  await hotel.scrollIntoViewIfNeeded();
  await expect(hotel.locator(".street-hotel")).toBeVisible();
  await expect(hotel.locator(".building-pieces")).toHaveAttribute(
    "aria-label",
    "Hotel",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});
