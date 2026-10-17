import { test, expect } from "@playwright/test";

// Simulate separate proxied clients so the full suite does not share one IP budget.
// These documentation-only addresses are sent to the local test server.
test.use({extraHTTPHeaders: {"X-Forwarded-For": "192.0.2.28"}});

async function enter(page) {
  await page.goto("/");
  await page.getByRole("button", {name: "Continue as guest"}).click();
}

for (const size of ["standard", "quick"]) {
  test(`${size} board and turn actions fit desktop, tablet, phone and landscape`, async ({page}) => {
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await enter(page);
    await page.getByRole("button", {name: "Create a private room"}).click();
    if (size === "quick")
      await page.getByRole("button", {name: "28 Tiles · Quick Blitz"}).click();
    await expect(page.locator(".board-grid > .tile")).toHaveCount(size === "quick" ? 28 : 40);
    await page.getByRole("button", {name: "Start the takeover"}).click();
    for (const [width, height] of [[1920,1080],[1366,768],[1024,768],[980,768],[768,1024],[390,844],[320,740],[844,390]]) {
      await page.setViewportSize({width,height});
      await expect(page.getByRole("button", {name: "Roll the dice"})).toBeVisible();
      const bounds = await page.evaluate(() => {
        const rect = selector => {
          const b = document.querySelector(selector).getBoundingClientRect();
          return {x:b.x,y:b.y,right:b.right,bottom:b.bottom,width:b.width,height:b.height};
        };
        return {width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,board:rect(".board-shell"),action:rect(".action-panel-sticky")};
      });
      expect(bounds.scrollWidth).toBeLessThanOrEqual(width);
      expect(bounds.scrollHeight).toBeLessThanOrEqual(height);
      for (const box of [bounds.board,bounds.action]) {
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.right).toBeLessThanOrEqual(width + 1);
        expect(box.bottom).toBeLessThanOrEqual(height + 1);
      }
      expect(bounds.board.width).toBeGreaterThan(width <= 720 ? 200 : height < 500 ? 150 : 280);
      expect(Math.abs(bounds.board.width - bounds.board.height)).toBeLessThan(2);
      if (process.env.STB_SCREENSHOT_DIR && [1366,390].includes(width))
        await page.screenshot({path: `${process.env.STB_SCREENSHOT_DIR}/${size}-${width}.png`});
      await page.getByRole("button", {name: /^Chat/}).click();
      await expect(page.getByLabel("Chat message", {exact:true})).toBeFocused();
      expect(await page.evaluate(() => scrollY)).toBe(0);
      await page.getByRole("button", {name: "The move"}).click();
    }
    await page.reload();
    await expect(page.locator(".board-grid > .tile")).toHaveCount(size === "quick" ? 28 : 40);
    expect(errors).toEqual([]);
  });
}

test("host board size selection syncs to guests and remains locked after start", async ({page,browser}) => {
  await enter(page);
  await page.getByRole("button", {name:"Create a private room"}).click();
  const code = await page.locator(".invite-box strong").textContent();
  const context = await browser.newContext({extraHTTPHeaders: {"X-Forwarded-For": "192.0.2.29"}});
  const guest = await context.newPage();
  await guest.goto("/?room="+code);
  await guest.getByRole("button", {name:"Continue as guest"}).click();
  await guest.getByLabel("YOUR STREET NAME").fill("Board Guest");
  await guest.getByRole("button", {name:"Join room",exact:true}).click();
  await expect(guest.getByRole("button", {name:"28 Tiles · Quick Blitz"})).toBeDisabled();
  await page.getByRole("button", {name:"28 Tiles · Quick Blitz"}).click();
  await expect(guest.locator(".board-grid > .tile")).toHaveCount(28);
  await page.reload();
  await expect(page.getByRole("button", {name:"28 Tiles · Quick Blitz"})).toHaveAttribute("aria-pressed","true");
  await page.getByRole("button", {name:"Start the takeover"}).click();
  await expect(guest.locator(".board-grid > .tile")).toHaveCount(28);
  await page.getByRole("button", {name:"House rules",exact:true}).click();
  await expect(page.getByLabel("Map size", {exact:true})).toBeDisabled();
  await context.close();
});
