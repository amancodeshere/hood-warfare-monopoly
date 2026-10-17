import { test, expect } from "@playwright/test";

test.use({
  reducedMotion: "reduce",
  extraHTTPHeaders: { "X-Forwarded-For": "192.0.2.61" },
});

async function resume(page, seat) {
  await page.addInitScript((token) => localStorage.setItem("stb-seat", token), seat);
  await page.goto("/");
}

test("a bot challenger loss returns deeds by default and preserves them for the landlord when enabled", async ({
  browser,
}) => {
  let ip = 61;
  for (const [seat, inherits] of [
    ["elimination-default-landlord", false],
    ["elimination-enabled-landlord", true],
  ]) {
    const context = await browser.newContext({
      extraHTTPHeaders: { "X-Forwarded-For": `192.0.2.${ip++}` },
    });
    const page = await context.newPage();
    try {
      await resume(page, seat);
      const duel = page.getByRole("dialog", { name: "Rent due. Guns up." });
      await expect(duel).toBeVisible();
      await expect(duel).toContainText("Challenger Bot");
      await expect(duel).toContainText("Landlord");
      await duel.getByRole("button", { name: "Guard Beats fire" }).click();

      // The server resolves a real losing rent duel. The board then exposes the
      // same deeds either as unclaimed or inherited, including their deed state.
      const developed = page.getByRole("button", { name: /Grove Street, \$120/ });
      const mortgaged = page.getByRole("button", { name: /East Market, \$160/ });
      if (inherits) {
        await expect(developed).toHaveAttribute("aria-label", /owned by Landlord/);
        await expect(developed.locator(".building-pieces")).toHaveAttribute(
          "aria-label",
          "2 houses",
        );
        await expect(mortgaged).toHaveAttribute("aria-label", /owned by Landlord/);
        await expect(mortgaged.locator(".owner-badge")).toContainText("MORTGAGED");
      } else {
        await expect(developed).toHaveAttribute("aria-label", "Grove Street, $120");
        await expect(developed.locator(".building-pieces")).toHaveCount(0);
        await expect(mortgaged).toHaveAttribute("aria-label", "East Market, $160");
        await expect(mortgaged.locator(".owner-badge")).toHaveCount(0);
      }
    } finally {
      await context.close();
    }
  }
});

test("a deed returned after a bot's rent-duel loss can be claimed on a later turn", async ({
  page,
}) => {
  await resume(page, "elimination-reclaim-landlord");
  await expect(page.getByRole("heading", { name: "Grove Street" })).toBeVisible();
  await expect(page.getByText("This block is open.")).toBeVisible();
  await page.getByRole("button", { name: "Claim block", exact: false }).click();
  await expect(
    page.getByRole("button", { name: /Grove Street, \$120, owned by Reclaim Landlord/ }),
  ).toBeVisible();
});

test("Killer Takes All saves in the lobby, syncs to another player, and locks after start", async ({
  page,
  browser,
}) => {
  await resume(page, "elimination-rules-host");
  await page.getByRole("button", { name: "House rules & room settings" }).click();
  const hostSettings = page.getByRole("dialog", { name: "Make the house rules" });
  const rule = hostSettings.getByRole("checkbox", { name: /Killer Takes All/ });
  await expect(rule).not.toBeChecked();
  await rule.check();
  await hostSettings.getByRole("button", { name: "Save house rules" }).click();

  const guestContext = await browser.newContext({
    extraHTTPHeaders: { "X-Forwarded-For": "192.0.2.62" },
  });
  const guest = await guestContext.newPage();
  try {
    await resume(guest, "elimination-rules-guest");
    await guest.getByRole("button", { name: "House rules & room settings" }).click();
    const guestSettings = guest.getByRole("dialog", { name: "This room’s house rules" });
    const guestRule = guestSettings.getByRole("checkbox", { name: /Killer Takes All/ });
    await expect(guestRule).toBeChecked();
    await expect(guestRule).toBeDisabled();
    await expect(guestSettings).toContainText(
      "When a landlord wins a rent shootout, they inherit the debtor’s properties.",
    );
    await guest.keyboard.press("Escape");

    await page.getByRole("button", { name: "Start the takeover" }).click();
    await expect(page.getByRole("button", { name: "Room rules", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Room rules", exact: true }).click();
    const startedHostSettings = page.getByRole("dialog", { name: "This room’s house rules" });
    await expect(
      startedHostSettings.getByRole("checkbox", { name: /Killer Takes All/ }),
    ).toBeChecked();
    await expect(
      startedHostSettings.getByRole("checkbox", { name: /Killer Takes All/ }),
    ).toBeDisabled();
    await page.keyboard.press("Escape");

    await guest.getByRole("button", { name: "Room rules", exact: true }).click();
    const startedGuestSettings = guest.getByRole("dialog", { name: "This room’s house rules" });
    await expect(
      startedGuestSettings.getByRole("checkbox", { name: /Killer Takes All/ }),
    ).toBeChecked();
    await expect(
      startedGuestSettings.getByRole("checkbox", { name: /Killer Takes All/ }),
    ).toBeDisabled();
  } finally {
    await guestContext.close();
  }
});
