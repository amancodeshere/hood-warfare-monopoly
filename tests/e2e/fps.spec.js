import { test, expect } from "@playwright/test";
test("two browsers ready, dodge and fire an authoritative first-person rent duel", async ({
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
  await expect(a.getByRole("button", { name: "Ready up" })).toBeVisible();
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
  await b.getByRole("button", { name: "Dodge right" }).click();
  await expect(a.locator(".fps-opponent")).toHaveAttribute("style", /73%/);
  const arena = a.locator(".fps-viewport");
  const bounds = await arena.boundingBox();
  await arena.click({
    position: { x: bounds.width * 0.5, y: bounds.height * 0.53 },
  });
  await expect(a.getByText("MISSED", { exact: true })).toBeVisible();
  await expect(b.getByRole("meter", { name: "Your health" })).toHaveAttribute(
    "value",
    "100",
  );
  await page.waitForTimeout(450);
  for (let i = 0; i < 3; i++) {
    await arena.click({
      position: { x: bounds.width * 0.73, y: bounds.height * 0.35 },
    });
    if (i < 2) {
      await expect(
        b.getByRole("meter", { name: "Your health" }),
      ).toHaveAttribute("value", String(100 - (i + 1) * 40));
      await page.waitForTimeout(450);
    }
  }
  await expect(
    page.getByRole("dialog", { name: "The score is settled." }),
  ).toBeVisible();
  await expect(
    page.getByText("Rent wiped. Live to own another block."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back to the block" }).click();
  await expect(page.locator(".fps-viewport")).not.toBeVisible();
  expect(errors).toEqual([]);
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
