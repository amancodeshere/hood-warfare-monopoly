import { test, expect } from "@playwright/test";

test("city traffic can pause and respects reduced motion; entry fits desktop and mobile", async ({
  page,
}) => {
  await page.goto("/");
  const city = page.locator(".entry-city .city-art");
  await expect(city.locator(".city-car")).toHaveCount(3);
  await expect
    .poll(() =>
      city
        .locator(".city-car")
        .first()
        .evaluate((el) => getComputedStyle(el).animationPlayState),
    )
    .toBe("running");
  await city.getByRole("button", { name: "Pause city traffic" }).click();
  await expect
    .poll(() =>
      city
        .locator(".city-car")
        .first()
        .evaluate((el) => getComputedStyle(el).animationPlayState),
    )
    .toBe("paused");
  await city.getByRole("button", { name: "Resume city traffic" }).click();
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const pause = city.getByRole("button", { name: "Pause city traffic" });
    const control = await pause.boundingBox();
    expect(control.x).toBeGreaterThanOrEqual(0);
    expect(control.x + control.width).toBeLessThanOrEqual(width);
    if (width === 390) expect(control.height).toBeGreaterThanOrEqual(44);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.screenshot({
      path: `work/city-entry-${width}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 390, height: 400 });
  await page.getByLabel("Password", { exact: true }).scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      city
        .locator(".city-car")
        .first()
        .evaluate((el) => getComputedStyle(el).animationPlayState),
    )
    .toBe("paused");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() =>
      city
        .locator(".city-car")
        .first()
        .evaluate((el) => getComputedStyle(el).animationName),
    )
    .toBe("none");
  await expect(city.getByRole("button")).toBeHidden();
});

test("Community Plot shows its live balance on the board and in inspection", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("stb-seat", "pieces-ace"),
  );
  await page.goto("/");
  await expect(page.locator(".community-balance")).toHaveText("$325");
  await page
    .getByRole("button", { name: /Community Plot, community balance \$325/ })
    .click();
  await expect(page.locator(".property-detail")).toContainText(
    "Community Plot balance",
  );
  await expect(page.locator(".property-detail")).toContainText("$325");
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({
      path: `work/city-table-${width}.png`,
      fullPage: true,
    });
  }
});
