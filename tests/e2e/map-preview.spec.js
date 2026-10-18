import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test.use({viewport:{width:1366,height:768},extraHTTPHeaders:{'X-Forwarded-For':'192.0.2.89'}});

test('all six maps preview before a room exists and the chosen map carries into the lobby',async({page})=>{
  const token=JSON.parse(readFileSync(join(process.env.STB_BROWSER_DATA_DIR,'map-token.json'),'utf8')).token;
  await page.addInitScript(token=>localStorage.setItem('stb-profile',token),token);
  await page.goto('/');
  await page.getByRole('button',{name:'Enter the city'}).click();
  const select=page.getByRole('combobox',{name:'Preview map'});
  for(const [id,name] of [['trenches','Bronx Cut'],['night-shift','Dharavi Lane'],['boardwalk','Hutong Steps'],['snow-day','Brixton Steps'],['neon','Tepito Corner'],['festival','Rocinha Steps']]) {
    await select.selectOption(id);
    await expect(page.locator('.board-center .city-art')).toHaveAttribute('data-scene',id);
    await expect(page.locator('.board-grid > .tile').nth(1)).toHaveAttribute('aria-label',new RegExp(name));
    await expect(page.getByRole('button',{name:'Create a private room',exact:true})).toBeVisible();
  }
  await page.getByRole('button',{name:'Room settings',exact:true}).click();
  await page.getByRole('combobox',{name:'Map size',exact:true}).selectOption('quick');
  await page.getByRole('button',{name:'Save house rules',exact:true}).click();
  await expect(page.locator('.board-grid > .tile')).toHaveCount(28);
  await expect(page.locator('.board-center .city-art')).toHaveAttribute('data-scene','festival');
  if(process.env.STB_SCREENSHOT_DIR) await page.screenshot({path:join(process.env.STB_SCREENSHOT_DIR,'map-preview.png')});
  await page.getByRole('button',{name:'Create a private room',exact:true}).click();
  await expect(page.getByRole('button',{name:'Start the takeover'})).toBeVisible();
  await expect(page.locator('.board-grid > .tile')).toHaveCount(28);
  await expect(select).toHaveValue('festival');
  await select.selectOption('night-shift');
  await expect(page.locator('.board-center .city-art')).toHaveAttribute('data-scene','night-shift');
  await expect(page.getByRole('button',{name:'Start the takeover'})).toBeVisible();
});

test('guest can preview available maps without starting and locked maps remain locked',async({page})=>{
  await page.goto('/');
  await page.getByRole('button',{name:'Continue as guest'}).click();
  const select=page.getByRole('combobox',{name:'Preview map'});
  await select.selectOption('night-shift');
  await expect(page.locator('.board-center .city-art')).toHaveAttribute('data-scene','night-shift');
  await expect(select.locator('option[value="boardwalk"]')).toBeDisabled();
  await expect(page.getByRole('button',{name:'Create a private room',exact:true})).toBeVisible();
});
