import { test, expect } from "@playwright/test";
test("friends create, invite, start, and restore a live seat", async ({
  page,
  browser,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  if (await page.getByRole("button", { name: "Continue as guest" }).count())
    await page.getByRole("button", { name: "Continue as guest" }).click();
  await page.getByLabel("YOUR STREET NAME").fill("Ace");
  await page.getByRole("button", { name: "Create a private room" }).click();
  await expect(
    page.getByRole("heading", { name: /Get the crew together/ }),
  ).toBeVisible();
  const code = await page.locator(".invite-box strong").textContent();
  const context = await browser.newContext();
  const friend = await context.newPage();
  await friend.goto("/?room=" + code);
  if (await friend.getByRole("button", { name: "Continue as guest" }).count())
    await friend.getByRole("button", { name: "Continue as guest" }).click();
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
  if (await page.getByRole("button", { name: "Continue as guest" }).count())
    await page.getByRole("button", { name: "Continue as guest" }).click();
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
  await page.getByRole("button", { name: "Play solo vs bots" }).click();
  await expect(
    page.getByRole("button", { name: "Roll the dice" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Auntie’s Bodega, $60", exact: true })
    .click();
  const detail = page.getByRole("dialog", { name: "Auntie’s Bodega" });
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
  if (await page.getByRole("button", { name: "Continue as guest" }).count())
    await page.getByRole("button", { name: "Continue as guest" }).click();
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
  if (await page.getByRole("button", { name: "Continue as guest" }).count())
    await page.getByRole("button", { name: "Continue as guest" }).click();
  const friendContext = await browser.newContext();
  await friendContext.addInitScript(() =>
    localStorage.setItem("stb-seat", "duel-rival"),
  );
  const friend = await friendContext.newPage();
  await friend.goto("/");
  if (await friend.getByRole("button", { name: "Continue as guest" }).count())
    await friend.getByRole("button", { name: "Continue as guest" }).click();
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

test("solo bot count, default match length and rich house settings are usable", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  if (await page.getByRole("button", { name: "Continue as guest" }).count())
    await page.getByRole("button", { name: "Continue as guest" }).click();
  await expect(page.getByLabel("Match length", { exact: true })).toHaveValue(
    "0",
  );
  await page
    .getByRole("button", { name: "Room settings", exact: true })
    .click();
  const rules = page.getByRole("dialog", { name: "Make the house rules" });
  await rules.getByLabel("City map").selectOption("night-shift");
  await rules.getByLabel("Starting cash").selectOption("2000");
  await rules.getByRole("button", { name: "Save house rules" }).click();
  await page.getByLabel("Bot opponents").selectOption("7");
  await page.getByRole("button", { name: "Play solo vs bots" }).click();
  await expect(page.locator(".crew-list .bot-tag")).toHaveCount(7);
  await expect(page.locator(".round-tag")).toContainText("ALL IN");
  await expect(
    page.getByRole("button", { name: "Midnight Bodega, $60", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Room rules", exact: true }).click();
  await expect(
    page.getByRole("dialog").getByLabel("Starting cash"),
  ).toHaveValue("2000");
  await expect(
    page.getByRole("dialog").getByLabel("Starting cash"),
  ).toBeDisabled();
  assertNoErrors(errors);
});

test("Oppa Stoppa spins a server percentage and sends the loss to Community Plot", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("stb-seat", "stoppa-ace"),
  );
  await page.goto("/");
  if (await page.getByRole("button", { name: "Continue as guest" }).count())
    await page.getByRole("button", { name: "Continue as guest" }).click();
  const dial = page.getByRole("dialog", {
    name: "Oppa Stoppa caught you lackin.",
  });
  await expect(dial).toBeVisible();
  await dial.getByRole("button", { name: "Spin the Stoppa" }).click();
  const collect = dial.getByRole("button", { name: "Pay the Stoppa" });
  await expect(collect).toBeEnabled({ timeout: 6000 });
  const result = await dial.locator(".stoppa-result h3").textContent(),
    amount = Number(result.match(/[\d,]+/)[0].replaceAll(",", ""));
  expect(amount).toBeGreaterThanOrEqual(15);
  expect(amount).toBeLessThanOrEqual(150);
  await collect.click();
  await expect(dial).not.toBeVisible();
  await expect(page.locator(".table-footer")).toContainText(
    `Community pot: $${amount}`,
  );
});

test("online auction lets another crew bid and collects only when others pass", async ({
  page,
  browser,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("stb-seat", "auction-ace"),
  );
  await page.goto("/");
  if (await page.getByRole("button", { name: "Continue as guest" }).count())
    await page.getByRole("button", { name: "Continue as guest" }).click();
  const context = await browser.newContext();
  await context.addInitScript(() =>
    localStorage.setItem("stb-seat", "auction-rival"),
  );
  const rival = await context.newPage();
  await rival.goto("/");
  if (await rival.getByRole("button", { name: "Continue as guest" }).count())
    await rival.getByRole("button", { name: "Continue as guest" }).click();
  const a = page.getByRole("dialog"),
    b = rival.getByRole("dialog");
  await expect(a).toContainText("Who’s buying Auntie’s Bodega?");
  await b.getByLabel(/Your bid/).fill("30");
  await b.getByRole("button", { name: "Bid $30", exact: true }).click();
  await expect(a.locator(".auction-price")).toContainText("Rival leads");
  await a.getByRole("button", { name: "Pass", exact: true }).click();
  await expect(b.locator(".auction-price")).toContainText("$30");
  await expect(b.getByLabel(/Your bid/)).not.toBeVisible();
  // The third human fixture remains in, so no cash moves until its clock expires.
  await expect(
    rival.locator(".crew-row").filter({ hasText: "Rival" }),
  ).toContainText("$1,500");
  await context.close();
});

test("private team chat and earned appearances work across browsers", async ({
  page,
  browser,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  if (await page.getByRole("button", { name: "Continue as guest" }).count())
    await page.getByRole("button", { name: "Continue as guest" }).click();
  await page.getByLabel("YOUR STREET NAME").fill("Host");
  await page
    .getByRole("button", { name: "Room settings", exact: true })
    .click();
  await page.getByLabel("Teams mode").check();
  await page.getByRole("button", { name: "Save house rules" }).click();
  await page.getByRole("button", { name: "Create a private room" }).click();
  const code = await page.locator(".invite-box strong").textContent();
  const context = await browser.newContext(),
    ally = await context.newPage();
  await ally.goto("/?room=" + code);
  if (await ally.getByRole("button", { name: "Continue as guest" }).count())
    await ally.getByRole("button", { name: "Continue as guest" }).click();
  await ally.getByLabel("YOUR STREET NAME").fill("Ally");
  await ally.getByRole("button", { name: "Join room", exact: true }).click();
  await page.getByLabel("Your team", { exact: true }).selectOption("1");
  await ally.getByLabel("Your team", { exact: true }).selectOption("1");
  await page.getByRole("button", { name: "Start the takeover" }).click();
  await page.getByRole("button", { name: "Chat", exact: true }).click();
  await ally.getByRole("button", { name: "Chat", exact: true }).click();
  await page.getByRole("button", { name: "Team 1", exact: true }).click();
  await ally.getByRole("button", { name: "Team 1", exact: true }).click();
  await page
    .getByLabel("Chat message", { exact: true })
    .fill("Our private move");
  await page.getByRole("button", { name: "Send chat message" }).click();
  await expect(ally.getByRole("log")).toContainText("Our private move");
  await page.getByRole("button", { name: "Profile and friends" }).click();
  await page.getByRole("button", { name: "Looks", exact: true }).click();
  await page.getByRole("button", { name: "Chain Snatcher Free" }).click();
  await expect(
    page.getByRole("button", { name: "Chain Snatcher Equipped" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  assertNoErrors(errors);
  await context.close();
});

test("guest can register, save a profile, and sign in from another device", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  if (await page.getByRole("button", { name: "Continue as guest" }).count())
    await page.getByRole("button", { name: "Continue as guest" }).click();
  await page.getByRole("button", { name: "Profile and friends" }).click();
  await page.getByRole("button", { name: "Account", exact: true }).click();
  const username = "test_" + Date.now().toString(36);
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel(/Password/).fill("long-browser-password");
  await page.getByRole("button", { name: "Create your account" }).click();
  await expect(page.getByRole("dialog")).toContainText(`@${username}`);
  const context = await browser.newContext(),
    other = await context.newPage();
  await other.goto("/");
  if (await other.getByRole("button", { name: "Continue as guest" }).count())
    await other.getByRole("button", { name: "Continue as guest" }).click();
  await other.getByRole("button", { name: "Profile and friends" }).click();
  await other.getByRole("button", { name: "Account", exact: true }).click();
  await other.getByRole("button", { name: "Sign in", exact: true }).click();
  await other.getByLabel("Username", { exact: true }).fill(username);
  await other.getByLabel(/Password/).fill("long-browser-password");
  await other
    .getByRole("button", { name: "Sign in", exact: true })
    .last()
    .click();
  await expect(other.getByRole("dialog")).toContainText(`@${username}`);
  await context.close();
});
