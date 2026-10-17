import { test, expect } from "@playwright/test";

test.use({ extraHTTPHeaders: { "X-Forwarded-For": "198.51.100.85" } });

async function resume(page, token) {
  await page.addInitScript(
    (seat) => localStorage.setItem("stb-seat", seat),
    token,
  );
  await page.goto("/");
}

test("chat audiences filter bot messages and retain public chat across sidebar tabs", async ({
  page,
  browser,
}) => {
  await resume(page, "chat-channels-host");
  const context = await browser.newContext({
    extraHTTPHeaders: { "X-Forwarded-For": "198.51.100.86" },
  });
  const peer = await context.newPage();
  await resume(peer, "chat-channels-peer");
  const chatTab = page
    .locator(".panel-tabs")
    .getByRole("button", { name: /^Chat/ });
  await chatTab.click();
  const panel = page.locator(".sidebar-chat-tab .chat-panel").first();
  const log = panel.getByRole("log");

  await expect(panel.getByRole("button", { name: "Players", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(log).toContainText("Human public message");
  await expect(log).not.toContainText("Bot public message");

  const textbox = panel.getByRole("textbox", { name: "Chat message" });
  await textbox.fill("Public from Players");
  await panel.getByRole("button", { name: "Send chat message" }).click();
  await expect(log).toContainText("Public from Players");
  await expect(peer.getByRole("log")).toContainText("Public from Players");

  const combined = panel.getByRole("button", {
    name: "Players & Bots",
    exact: true,
  });
  await combined.click();
  await expect(combined).toHaveAttribute("aria-pressed", "true");
  await expect(log).toContainText("Human public message");
  await expect(log).toContainText("Bot public message");
  await expect(
    log.locator("p > span").filter({ hasText: /^Public from Players$/ }),
  ).toHaveCount(1);

  await textbox.fill("Public from combined view");
  await panel.getByRole("button", { name: "Send chat message" }).click();
  await expect(log).toContainText("Public from combined view");
  await expect(peer.getByRole("log")).toContainText("Public from combined view");
  await expect(peer.getByRole("log")).not.toContainText("Bot public message");
  const peerPanel = peer.locator(".chat-panel").first();
  await peerPanel
    .getByRole("button", { name: "Players & Bots", exact: true })
    .click();
  await expect(peer.getByRole("log")).toContainText("Bot public message");

  // Both audience views route new human messages to public room chat.
  await peerPanel
    .getByRole("textbox", { name: "Chat message" })
    .fill("Peer public from combined view");
  await peerPanel.getByRole("button", { name: "Send chat message" }).click();
  await expect(log).toContainText("Peer public from combined view");

  // Switching the sidebar view remounts ChatPanel; the audience selection
  // belongs to the game screen and must survive that transition.
  await page
    .locator(".panel-tabs")
    .getByRole("button", { name: "The move", exact: true })
    .click();
  await chatTab.click();
  const reopened = page.locator(".sidebar-chat-tab .chat-panel").first();
  const reopenedLog = reopened.getByRole("log");
  await expect(
    reopened.getByRole("button", { name: "Players & Bots", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(reopenedLog).toContainText("Bot public message");
  await expect(
    reopenedLog.locator("p > span").filter({ hasText: /^Public from Players$/ }),
  ).toHaveCount(1);
  await expect(
    reopenedLog
      .locator("p > span")
      .filter({ hasText: /^Public from combined view$/ }),
  ).toHaveCount(1);
  await expect(
    reopenedLog
      .locator("p > span")
      .filter({ hasText: /^Peer public from combined view$/ }),
  ).toHaveCount(1);

  await page.setViewportSize({ width: 1280, height: 900 });
  await reopened.screenshot({ path: "work/chat-channels/desktop.png" });
  await context.close();
});

test("audience controls and public composer remain usable at mobile width after the trade overlay", async ({
  page,
  browser,
}) => {
  await resume(page, "trading-ace");
  const context = await browser.newContext({
    extraHTTPHeaders: { "X-Forwarded-For": "198.51.100.87" },
  });
  const rival = await context.newPage();
  await resume(rival, "trading-rival");

  await page.getByRole("button", { name: "Create trade", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Trade negotiation" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");

  await page.setViewportSize({ width: 390, height: 844 });
  const boardChat = page.locator(".board-chat");
  const panel = boardChat.locator(".chat-panel");
  await expect(panel.getByRole("button", { name: "Players", exact: true })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Players & Bots", exact: true })).toBeVisible();
  await panel.getByRole("button", { name: "Players & Bots", exact: true }).click();
  await panel.getByRole("textbox", { name: "Chat message" }).fill("Mobile public message");
  await panel.getByRole("button", { name: "Send chat message" }).click();
  await expect(rival.getByRole("log")).toContainText("Mobile public message");
  await expect
    .poll(async () => (await boardChat.boundingBox())?.width || 0)
    .toBeLessThanOrEqual(390);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await boardChat.screenshot({ path: "work/chat-channels/mobile-trade-closed.png" });
  await context.close();
});
