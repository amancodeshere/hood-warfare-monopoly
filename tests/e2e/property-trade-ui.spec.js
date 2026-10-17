import { test, expect } from "@playwright/test";
import { BOARD } from "../../shared/board.js";

test.use({reducedMotion: "reduce", extraHTTPHeaders: {"X-Forwarded-For": "192.0.2.51"}});
async function resume(page, seat) {
  await page.addInitScript(token=>localStorage.setItem("stb-seat", token), seat);
  await page.goto("/");
}
async function openProperty(page, name) {
  await page.getByRole("button", {name:new RegExp(`^${name},`)}).click();
  return page.getByRole("dialog", {name, exact:true});
}

for (const [seat, partner] of [["trading-ace","Trade Rival"],["quick-builder-ace","Quick Rival"]]) {
  test(`${seat}: exclusive trade chooser, synchronized sliders, draft reset and keyboard focus`, async ({page}) => {
    const errors=[];
    page.on("pageerror", error=>errors.push(error.message));
    await resume(page,seat);
    await expect(page.locator(".exchange")).toHaveCount(0);
    await page.getByRole("button", {name:"Create trade",exact:true}).click();
    const dialog=page.getByRole("dialog", {name:"Trade negotiation"});
    await expect(dialog.locator(".trade-chooser")).toBeVisible();
    if (process.env.STB_SCREENSHOT_DIR) await page.screenshot({path:`${process.env.STB_SCREENSHOT_DIR}/${seat}-chooser.png`});
    await dialog.getByRole("button", {name:`Trade with ${partner}`,exact:true}).click();
    await expect(dialog.getByRole("button", {name:"Choose a different player"})).toBeFocused();
    await expect(dialog.getByRole("button", {name:"Send offer",exact:true})).toBeDisabled();
    const cash=dialog.getByLabel("Cash to give", {exact:true});
    const slider=dialog.getByLabel("Cash to give slider", {exact:true});
    const max=await slider.getAttribute("max");
    await cash.fill("999999");
    await expect(cash).toHaveValue(max);
    await expect(slider).toHaveValue(max);
    await slider.focus();
    await slider.press("Home");
    await slider.press("ArrowRight");
    await expect(cash).toHaveValue("1");
    await dialog.getByRole("button", {name:"Choose a different player"}).click();
    await dialog.getByRole("button", {name:`Trade with ${partner}`,exact:true}).click();
    await expect(cash).toHaveValue("0");
    for (const [width,height] of [[1366,768],[390,844],[320,740]]) {
      await page.setViewportSize({width,height});
      const sendButton=dialog.getByRole("button", {name:"Send offer",exact:true});
      const sendBounds=await sendButton.boundingBox();
      expect(sendBounds.y).toBeGreaterThanOrEqual(0);
      expect(sendBounds.y+sendBounds.height).toBeLessThanOrEqual(height);
      expect(await sendButton.evaluate(button=>{
        const r=button.getBoundingClientRect();
        return button.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));
      })).toBeTruthy();
      if (width===1366) {
        const review=dialog.locator("summary").filter({hasText:"Review deal value"});
        await review.click();
        const expanded=await sendButton.boundingBox();
        expect(Math.abs(expanded.y-sendBounds.y)).toBeLessThan(2);
        await review.click();
        await dialog.locator(".trade-composer-content").evaluate(el=>{el.scrollTop=0;});
      }
      const bounds=await dialog.boundingBox();
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.y).toBeGreaterThanOrEqual(0);
      expect(bounds.x+bounds.width).toBeLessThanOrEqual(width+1);
      expect(bounds.y+bounds.height).toBeLessThanOrEqual(height+1);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth && document.documentElement.scrollHeight<=innerHeight)).toBeTruthy();
      await dialog.getByLabel("Cash to receive",{exact:true}).scrollIntoViewIfNeeded();
      expect(await dialog.getByLabel("Cash to receive",{exact:true}).evaluate(input=>{
        const r=input.getBoundingClientRect();
        if(r.top<0 || r.bottom>innerHeight) return true;
        return input.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));
      })).toBeTruthy();
      await dialog.locator(".trade-composer-content").evaluate(el=>{el.scrollTop=0;});
      if (process.env.STB_SCREENSHOT_DIR && width!==320) await page.screenshot({path:`${process.env.STB_SCREENSHOT_DIR}/${seat}-trade-${width}.png`});
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("button", {name:"Create trade",exact:true})).toBeFocused();
    await expect(page.locator(".exchange")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test("quick board compact controls mortgage, redeem, build and sell with accurate rent and even-building locks", async ({page}) => {
  const errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  await resume(page,"quick-builder-ace");
  const dialog=await openProperty(page,"Bronx Cut");
  await expect(dialog.locator(".building-section-title")).toContainText("$48");
  await expect(dialog.locator(".building-rent-row.is-current")).toContainText("Full district");
  await expect(dialog.getByRole("button",{name:/^Mortgage/})).toBeEnabled();
  await dialog.getByRole("button",{name:/^Mortgage/}).click();
  await expect(dialog.locator(".building-section-title")).toContainText("Paused");
  await expect(dialog.locator(".building-rent-row.is-current")).toHaveCount(0);
  await dialog.getByRole("button",{name:/^Redeem/}).click();
  await expect(dialog.locator(".building-section-title")).toContainText("$48");
  await dialog.getByRole("button",{name:/^Build/}).click();
  await expect(dialog.locator(".building-rent-row.is-current")).toContainText("1 house");
  await expect(dialog.locator(".building-section-title")).toContainText("$72");
  await expect(dialog.getByRole("button",{name:/^Build/})).toBeDisabled();
  await expect(dialog.getByRole("button",{name:/^Mortgage/})).toBeDisabled();
  await expect(dialog).toContainText("Build evenly");
  for (const [width,height] of [[1366,768],[390,844],[320,740]]) {
    await page.setViewportSize({width,height});
    const box=await dialog.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x+box.width).toBeLessThanOrEqual(width+1);
    expect(box.y+box.height).toBeLessThanOrEqual(height+1);
    if(process.env.STB_SCREENSHOT_DIR && width!==320) await page.screenshot({path:`${process.env.STB_SCREENSHOT_DIR}/building-${width}.png`});
  }
  await dialog.getByRole("button",{name:/^Sell/}).click();
  await expect(dialog.locator(".building-section-title")).toContainText("$48");
  await page.keyboard.press("Escape");
  expect(errors).toEqual([]);
});

test("standard board supports hotel upgrade and downgrade, and district colour remains prominent under buildings", async ({page}) => {
  await resume(page,"pieces-ace");
  const dialog=await openProperty(page,"Bronx Cut");
  await expect(dialog.getByRole("button",{name:/^Hotel/})).toBeEnabled();
  await dialog.getByRole("button",{name:/^Hotel/}).click();
  await expect(dialog.locator(".building-rent-row.is-current")).toContainText("Hotel");
  await expect(dialog.getByRole("button",{name:/^Build/})).toBeDisabled();
  await expect(dialog.locator(".building-section-title")).toContainText(`$${BOARD[1].rent*25}`);
  await dialog.getByRole("button",{name:/^Sell/}).click();
  await expect(dialog.locator(".building-rent-row.is-current")).toContainText("4 houses");
  await page.keyboard.press("Escape");
  for(const width of [1366,390]) {
    await page.setViewportSize({width,height:width===390?844:768});
    const props=await page.locator(".tile.district-tile").first().evaluate(tile=>({background:getComputedStyle(tile).backgroundColor,stripe:getComputedStyle(tile.querySelector(".district-stripe")).height,padding:parseFloat(getComputedStyle(tile).paddingTop)}));
    expect(props.background).not.toBe("rgb(196, 203, 181)");
    expect(parseFloat(props.stripe)).toBeGreaterThanOrEqual(8);
    if (width > 720) expect(props.padding).toBeGreaterThanOrEqual(28);
    if(process.env.STB_SCREENSHOT_DIR) await page.screenshot({path:`${process.env.STB_SCREENSHOT_DIR}/tiles-${width}.png`});
  }
});
