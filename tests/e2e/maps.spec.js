import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
function fixtureToken() {
  if (!process.env.STB_BROWSER_DATA_DIR) throw new Error("Browser fixture directory missing");
  return JSON.parse(readFileSync(join(process.env.STB_BROWSER_DATA_DIR, "map-token.json"), "utf8")).token;
}

test("login page welcomes guests on mobile and gated maps explain verification", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Claim your street name." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Continue as guest" }).click();
  await page
    .getByRole("button", { name: "Room settings", exact: true })
    .click();
  await expect(page.locator(".map-choice")).toHaveCount(6);
  await page.getByRole("button", { name: /Neon Problems/ }).click();
  await expect(
    page.getByRole("button", { name: "Open login page" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open login page" }).click();
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page
    .getByLabel("Username", { exact: true })
    .fill("entry_" + Date.now().toString().slice(-8));
  await page.getByLabel(/Password/).fill("new-account-secure-password");
  await page.getByRole("button", { name: "Create your account" }).click();
  await expect(
    page.getByRole("region", { name: "Email verification" }),
  ).toBeVisible();
  await expect(page.getByText("Email delivery is being set up.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send code" })).toBeDisabled();
  const email = page.getByLabel("Email address", { exact: true });
  await email.fill("long.street.name@example.com");
  await expect(email).toHaveValue("long.street.name@example.com");
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect((await email.boundingBox()).width).toBeGreaterThan(200);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
  await page.getByRole("button", { name: "Enter the city" }).click();
  await page.getByRole("button", { name: "Profile and friends" }).click();
  await page.getByRole("button", { name: "Account", exact: true }).click();
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect((await email.boundingBox()).width).toBeGreaterThan(200);
    await email.fill("modal.street.name@example.com");
    await expect(email).toHaveValue("modal.street.name@example.com");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
});
test("verified map studio saves, selects and shares a custom map with guests; edits do not mutate a running map", async ({
  page,
  browser,
}) => {
  await page.addInitScript(
    (token) => localStorage.setItem("stb-profile", token),
    fixtureToken(),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Enter the city" }).click();
  await page
    .getByRole("button", { name: "Room settings", exact: true })
    .click();
  await page.getByRole("button", { name: "Map Studio" }).click();
  await page
    .getByLabel("Map name", { exact: true })
    .fill("Auntie’s Custom Cookout");
  await page.getByLabel("Block 1 name", { exact: true }).fill("Ribs Are Rent");
  await page
    .getByLabel("Block 2 event", { exact: true })
    .selectOption("stoppa");
  await page.getByRole("button", { name: "Save map", exact: true }).click();
  await expect(
    page.getByText("Map saved. Ready for your next table."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Use saved map" }).click();
  await expect(page.getByLabel("City map", { exact: true })).toContainText(
    "Auntie’s Custom Cookout",
  );
  await page.getByRole("button", { name: "Save house rules" }).click();
  await page.getByRole("button", { name: "Create a private room" }).click();
  await expect(
    page.getByRole("button", { name: "Ribs Are Rent, $60", exact: true }),
  ).toBeVisible();
  const code = await page.locator(".invite-box strong").textContent();
  const context = await browser.newContext(),
    guest = await context.newPage();
  await guest.goto("/?room=" + code);
  await guest.getByRole("button", { name: "Continue as guest" }).click();
  await guest.getByLabel("YOUR STREET NAME").fill("Cookout Guest");
  await guest.getByRole("button", { name: "Join room", exact: true }).click();
  await expect(
    guest.getByRole("button", { name: "Ribs Are Rent, $60", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "House rules & room settings", exact: true })
    .click();
  await page.getByRole("button", { name: "Map Studio" }).click();
  await page
    .getByRole("button", { name: "Auntie’s Custom Cookout", exact: true })
    .click();
  await page
    .getByLabel("Block 1 name", { exact: true })
    .fill("Changed for next time");
  await page.getByRole("button", { name: "Save map", exact: true }).click();
  await expect(
    page.getByText("Map saved. Ready for your next table."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(
    guest.getByRole("button", { name: "Ribs Are Rent, $60", exact: true }),
  ).toBeVisible();
  await context.close();
});
