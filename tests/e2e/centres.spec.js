import { test, expect } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

test.use({ viewport:{width:1366,height:768},extraHTTPHeaders:{"X-Forwarded-For":"192.0.2.88"} });

test("six distinct desktop cities fit above the game log on both board sizes", async ({page}) => {
  const token=JSON.parse(readFileSync(join(process.env.STB_BROWSER_DATA_DIR,"map-token.json"),"utf8")).token;
  await page.addInitScript(token=>localStorage.setItem("stb-profile",token),token);
  await page.goto("/");
  await page.getByRole("button",{name:"Enter the city"}).click();
  await page.getByRole("button",{name:"Create a private room"}).click();
  const plans=new Set();
  for(const [id,name] of [["trenches","America Blocks"],["night-shift","India Gully"],["boardwalk","China Backstreets"],["snow-day","Europe Estates"],["neon","Mexico Barrios"],["festival","Brazil Favelas"]]) {
    await page.getByRole("button",{name:"House rules & room settings",exact:true}).click();
    const rules=page.getByRole("dialog",{name:"Make the house rules"});
    await rules.getByRole("button",{name:new RegExp(`^${name}\\b`)}).click();
    await rules.getByRole("button",{name:"Save house rules"}).click();
    const centre=page.locator(".board-center");
    await expect(centre.locator(".city-art")).toHaveAttribute("data-scene",id);
    await expect(centre.locator(".centre-heading")).toContainText(name);
    plans.add(await centre.locator(".city-building").evaluateAll(nodes=>nodes.map(n=>n.getAttribute("data-lot")).join(";")));
    for(const size of [28,40]) {
      await page.getByRole("button",{name:size===28?"28 Tiles · Quick Blitz":"40 Tiles · Standard"}).click();
      await expect(page.locator(".board-grid > .tile")).toHaveCount(size);
      const scene=await centre.locator(".centre-city").boundingBox();
      const log=await centre.getByRole("region",{name:"Game log"}).boundingBox();
      const bounds=await centre.boundingBox();
      expect(scene.height).toBeGreaterThan(100);
      expect(scene.y+scene.height).toBeLessThan(log.y);
      expect(log.y+log.height).toBeLessThanOrEqual(bounds.y+bounds.height+1);
      if(process.env.STB_SCREENSHOT_DIR) {
        mkdirSync(process.env.STB_SCREENSHOT_DIR,{recursive:true});
        await centre.screenshot({path:join(process.env.STB_SCREENSHOT_DIR,`${id}-${size}.png`)});
      }
    }
  }
  expect(plans.size).toBe(6);
});

test("saved map fallback renders India and the centre game log updates after a purchase",async({page})=>{
  await page.addInitScript(()=>localStorage.setItem("stb-seat","centre-live"));
  await page.goto("/");
  const centre=page.locator(".board-center");
  await expect(centre.locator(".city-art")).toHaveAttribute("data-scene","night-shift");
  const log=centre.getByRole("region",{name:"Game log"});
  await page.getByRole("button",{name:"Claim block",exact:false}).click();
  await expect(log).toContainText("Dharavi Lane");
  await expect(log).toContainText("Centre Crew");
  await expect(log.locator("li").first()).toContainText("Dharavi Lane");
  expect(await log.locator("li").count()).toBeGreaterThan(5);
  expect(await log.evaluate(el=>el.scrollHeight>el.clientHeight)).toBe(true);
  const cow=centre.locator(".city-cow");
  await expect(cow).toHaveCSS("animation-play-state","running");
  await centre.getByRole("button",{name:"Pause city traffic"}).click();
  await expect(cow).toHaveCSS("animation-play-state","paused");
  await page.emulateMedia({reducedMotion:"reduce"});
  await expect(cow).toHaveCSS("animation-name","none");
  if(process.env.STB_SCREENSHOT_DIR) await page.screenshot({path:join(process.env.STB_SCREENSHOT_DIR,"live-1366.png")});
});
