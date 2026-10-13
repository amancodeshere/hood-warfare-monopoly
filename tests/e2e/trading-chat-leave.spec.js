import { test, expect } from "@playwright/test";
import { io } from "socket.io-client";

async function resume(page, token) {
  await page.addInitScript(
    (seat) => localStorage.setItem("stb-seat", seat),
    token,
  );
  await page.goto("/");
}

test("two crews negotiate properties, cash and cards through an editable counteroffer", async ({
  page,
  browser,
}) => {
  await resume(page, "trading-ace");
  const context = await browser.newContext();
  const rival = await context.newPage();
  await resume(rival, "trading-rival");
  await page.getByRole("button", { name: "Trade", exact: true }).click();
  const editor = page.locator(".exchange");
  await editor
    .getByLabel("Trade with")
    .selectOption({ label: "Trade Rival · $1,500" });
  await editor
    .getByRole("checkbox", { name: /Auntie’s Tax-Free Corner/ })
    .check();
  await editor.getByRole("checkbox", { name: /Broke Boy Blvd/ }).check();
  // Select the opponent's one owned property using its live rendered label.
  await editor.locator("fieldset").nth(1).getByRole("checkbox").check();
  await editor.getByLabel("Cash to give", { exact: true }).fill("100");
  await editor.getByLabel("Cash to receive", { exact: true }).fill("200");
  await editor.getByLabel("Escape cards to give", { exact: true }).fill("2");
  await editor.getByLabel("Escape cards to receive", { exact: true }).fill("1");
  await editor.getByRole("button", { name: "Send offer", exact: true }).click();
  const inbox = rival.locator(".trade-inbox");
  await expect(inbox).toContainText("Auntie’s Tax-Free Corner");
  await expect(inbox).toContainText("mortgaged; no rent");
  await page
    .locator(".action-sidebar")
    .screenshot({ path: "work/trade-desktop.png" });
  await inbox
    .getByRole("button", { name: "Counteroffer", exact: true })
    .click();
  const counter = rival.locator(".exchange");
  await expect(counter.getByLabel("Cash to give", { exact: true })).toHaveValue(
    "200",
  );
  await counter.getByLabel("Cash to give", { exact: true }).fill("0");
  await counter.getByLabel("Cash to receive", { exact: true }).fill("150");
  await counter.screenshot({ path: "work/counter-desktop.png" });
  await counter
    .getByRole("button", { name: "Send counteroffer", exact: true })
    .click();
  await expect(page.locator(".trade-inbox")).toContainText(
    "Your cash after this deal: $1,350",
  );
  await rival.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(async () => (await rival.locator(".board-chat").boundingBox()).width)
    .toBeLessThanOrEqual(390);
  await rival
    .locator(".action-sidebar")
    .screenshot({ path: "work/trade-mobile.png" });
  expect(
    await rival.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page
    .locator(".trade-inbox")
    .getByRole("button", { name: "Accept deal", exact: true })
    .click();
  await expect(page.locator(".trade-inbox")).toHaveCount(0);
  await expect(
    page.locator(".crew-row").filter({ hasText: "Trade Ace" }),
  ).toContainText("$1,350");
  await expect(
    rival.locator(".crew-row").filter({ hasText: "Trade Rival" }),
  ).toContainText("$1,650");
  await rival.getByRole("button", { name: "Trade", exact: true }).click();
  await counter
    .getByLabel("Trade with")
    .selectOption({ label: "Trade Ace · $1,350" });
  await counter.getByLabel("Cash to give", { exact: true }).fill("10");
  await counter
    .getByRole("button", { name: "Send offer", exact: true })
    .click();
  await counter
    .getByRole("button", { name: "Withdraw offer", exact: true })
    .click();
  await expect(page.locator(".trade-inbox")).toHaveCount(0);
  await context.close();
});

test("room chat stays available while viewing trade controls and messages arrive in another browser", async ({
  page,
  browser,
}) => {
  await resume(page, "trading-ace");
  const context = await browser.newContext();
  const rival = await context.newPage();
  await resume(rival, "trading-rival");
  await page.getByRole("button", { name: "Trade", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Chat message" })
    .fill("Let’s talk about that corner.");
  await page.getByRole("button", { name: "Send chat message" }).click();
  await expect(rival.getByRole("log")).toContainText(
    "Let’s talk about that corner.",
  );
  await page
    .locator(".board-chat")
    .screenshot({ path: "work/chat-desktop.png" });
  await rival.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(async () => (await rival.locator(".board-chat").boundingBox()).width)
    .toBeLessThanOrEqual(390);
  await rival
    .locator(".board-chat")
    .screenshot({ path: "work/chat-mobile.png" });
  await expect(
    page.getByRole("heading", { name: "Let’s make a deal." }),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Chat message" })).toHaveValue(
    "",
  );
  await page
    .getByRole("button", { name: /Chat/ })
    .filter({ hasText: "Chat" })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Chat message" }),
  ).toBeFocused();
  await context.close();
});

test("eliminated mobile player exits even during an event, clears seat and cannot resume the abandoned session", async ({
  page,
}) => {
  await resume(page, "lost-ace");
  await page
    .locator(".action-sidebar")
    .screenshot({ path: "work/leave-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("region", { name: "Your crew is out" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .locator(".action-sidebar")
    .screenshot({ path: "work/leave-mobile.png" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page
    .getByRole("button", { name: "Leave game session", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Create a private room", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("stb-seat")),
  ).toBeNull();
  expect(new URL(page.url()).search).toBe("");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Create a private room", exact: true }),
  ).toBeVisible();
  const socket = io("http://127.0.0.1:4173", {
    transports: ["websocket"],
    reconnection: false,
  });
  try {
    await new Promise((resolve, reject) => {
      socket.once("connect", resolve);
      socket.once("connect_error", reject);
    });
    const result = await new Promise((resolve, reject) =>
      socket
        .timeout(3000)
        .emit("resume", { token: "lost-ace" }, (err, r) =>
          err ? reject(err) : resolve(r),
        ),
    );
    expect(result.error).toBeTruthy();
  } finally {
    socket.disconnect();
  }
});
