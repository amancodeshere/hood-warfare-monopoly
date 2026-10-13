import { test, expect } from "@playwright/test";
test("friends create, invite, start, and restore a live seat", async ({
  page,
  browser,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByLabel("YOUR STREET NAME").fill("Ace");
  await page.getByRole("button", { name: "Create a private room" }).click();
  await expect(
    page.getByRole("heading", { name: /Get the crew together/ }),
  ).toBeVisible();
  const code = await page.locator(".invite-box strong").textContent();
  const context = await browser.newContext();
  const friend = await context.newPage();
  await friend.goto("/?room=" + code);
  await friend.getByLabel("YOUR STREET NAME").fill("Remy");
  await friend.getByRole("button", { name: "Join room", exact: true }).click();
  await expect(friend.getByText("Waiting for the host to start")).toBeVisible();
  await page.getByRole("button", { name: "Start the takeover" }).click();
  await expect(
    page.getByRole("button", { name: "Roll the dice" }),
  ).toBeVisible();
  await expect(
    friend.getByRole("heading", { name: "Ace’s move." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Roll the dice" }).click();
  await expect(
    page.getByRole("button", { name: "Roll the dice" }),
  ).not.toBeVisible();
  await page.reload();
  await expect(page.locator(".room-code")).toContainText(code);
  await expect(page.locator(".turn-heading")).toContainText("YOUR TURN");
  await expect(friend.locator(".crew-list")).toContainText("Ace");
  assertNoErrors(errors);
  await context.close();
});
function assertNoErrors(errors) {
  expect(errors).toEqual([]);
}
test("mobile table is usable without horizontal page overflow and rules are keyboard accessible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Create a private room" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "House rules" }).click();
  await expect(
    page.getByRole("dialog", { name: "Know the block" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Practice against bots" }).click();
  await expect(
    page.getByRole("button", { name: "Roll the dice" }),
  ).toBeVisible();
});
