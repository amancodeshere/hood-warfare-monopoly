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
  const joinBox = await page
    .getByRole("button", { name: "Join room", exact: true })
    .boundingBox();
  expect(joinBox.y + joinBox.height).toBeLessThan(844);
  await page.getByRole("button", { name: "House rules" }).click();
  await expect(
    page.getByRole("dialog", { name: "Know the block" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Let’s play" }).focus();
  await page.waitForTimeout(2200);
  await expect(page.getByRole("button", { name: "Let’s play" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Practice against bots" }).click();
  await expect(
    page.getByRole("button", { name: "Roll the dice" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Corner Store, $100", exact: true })
    .click();
  const detail = page.getByRole("region", { name: "Corner Store" });
  await expect(detail).toBeFocused();
  await expect
    .poll(async () => {
      const box = await detail.boundingBox();
      return box.y >= 0 && box.y + box.height <= 844;
    })
    .toBeTruthy();
});

test("roulette animation resolves to a collectible server result", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("stb-seat", "wheel-ace"));
  await page.goto("/");
  const dialog = page.getByRole("dialog", { name: "The street wheel" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Spin the wheel" }).click();
  await expect(
    dialog.getByRole("button", { name: "Collect result" }),
  ).toBeEnabled({ timeout: 6000 });
  await dialog.getByRole("button", { name: "Collect result" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator(".turn-heading")).toContainText("YOUR TURN");
});
test("online shootout keeps tactics locked until both crews choose", async ({
  page,
  browser,
}) => {
  await page.addInitScript(() => localStorage.setItem("stb-seat", "duel-ace"));
  await page.goto("/");
  const friendContext = await browser.newContext();
  await friendContext.addInitScript(() =>
    localStorage.setItem("stb-seat", "duel-rival"),
  );
  const friend = await friendContext.newPage();
  await friend.goto("/");
  const a = page.getByRole("dialog", { name: "Rent due. Guns up." }),
    b = friend.getByRole("dialog", { name: "Rent due. Guns up." });
  await expect(a).toBeVisible();
  for (let round = 0; round < 2; round++) {
    await a.getByRole("button", { name: "Fire Beats flank" }).click();
    await expect(
      a.getByText("Tactic locked. Waiting for your rival."),
    ).toBeVisible();
    await expect(
      a.getByRole("button", { name: "Guard Beats fire" }),
    ).toBeDisabled();
    await b.getByRole("button", { name: "Flank Beats guard" }).click();
    if (round === 0) await expect(a.getByText(/Round 2/)).toBeVisible();
  }
  await expect(
    page.getByRole("dialog", { name: "The score is settled." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back to the block" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await friendContext.close();
});
