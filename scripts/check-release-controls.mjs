import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true});
try {
 for(const width of [375,393,1280]){
  const page=await browser.newPage({viewport:{width,height:850},isMobile:width<500,hasTouch:width<500});
  await page.goto('http://localhost:3108/example');
  await page.locator('.GravityTypingPrompt-input').waitFor();
  await page.waitForTimeout(2500);
  await page.getByRole('button',{name:'Restart',exact:true}).filter({visible:true}).click();
  await page.getByRole('button',{name:"Let's go",exact:true}).waitFor();
  for(const selector of ['.GravitySiteHeader','.GravityModeLayout-sidebar'])if(await page.locator(selector).count())throw Error('Controls visible in options');
  await page.getByRole('button',{name:"Let's go",exact:true}).click();
  await page.getByRole('button',{name:'Start Game',exact:true}).waitFor();
  for(const selector of ['.GravitySiteHeader','.GravityModeLayout-sidebar'])if(await page.locator(selector).count())throw Error('Controls visible in directions');
  await page.getByRole('button',{name:'Start Game',exact:true}).click();
  await page.locator('.GravityTerm-text').first().waitFor();
  if(width<500){
   const esc=page.getByRole('button',{name:'ESC: skip this answer'});
   await esc.waitFor({state:'visible'});
   const overflow=await page.locator('.GravitySiteHeader').evaluate(e=>e.scrollWidth>e.clientWidth);
   if(overflow)throw Error('Controls overflow');
   await esc.click();
  }else await page.keyboard.press('Escape');
  await page.locator('.GravityCopyTermView-input').waitFor();
  console.log('PASS options/directions controls, start and ESC',width);
  await page.close();
 }
} finally {await browser.close()}
