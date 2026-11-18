import assert from 'node:assert/strict';
import {chromium,expect as baseExpect} from '@playwright/test';
const expect=baseExpect.configure({timeout:90000});
const base=process.env.SMOKE_BASE||'http://localhost:4390';
const path='/ch/1181229873/voci-mission-6-flash-cards';
const browser=await chromium.launch();
async function newContext(options){const ctx=await browser.newContext(options);if(process.env.SMOKE_ACCESS_FILE){const {readFile}=await import('node:fs/promises');const access=await readFile(process.env.SMOKE_ACCESS_FILE,'utf8');const bootstrap=await ctx.newPage();await bootstrap.goto(access.trim());await bootstrap.close();}return ctx;}
const session={session:{id:'smoke-session',userId:'smoke-user',expiresAt:new Date(Date.now()+3600000).toISOString()},user:{id:'smoke-user',name:'Smoke Player',username:'smokeplayer',displayUsername:'Smoke Player',isAnonymous:false,email:'smoke@example.invalid',emailVerified:true,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}};
try{
 const context=await newContext({javaScriptEnabled:false});const crawler=await context.newPage();
 await crawler.goto(base+path,{timeout:180000});
 await expect(crawler.locator('.community-terms>div')).toHaveCount(62);
 assert.match(await crawler.locator('.community-terms').textContent(),/accueillir/);
 assert.match(await crawler.locator('.community-terms').textContent(),/empfangen/);
 assert.equal(await crawler.locator('details').first().getAttribute('open'),null);
 await expect(crawler.getByRole('button',{name:'Play this game',exact:true})).toHaveCount(1);
 await expect(crawler.getByRole('heading',{name:'Your username'})).toHaveCount(0);
 console.log('PASS: all 62 terms in server HTML, preview collapsed, one play button, no sign-in panel.');
 const ctx=await newContext();const page=await ctx.newPage();page.setDefaultTimeout(90000);let authenticated=false;let setFetches=0;
 await page.route('**/api/**',async route=>{
  const url=new URL(route.request().url());
  if(url.pathname==='/api/auth/get-session')return route.fulfill({json:authenticated?session:null});
  if(url.pathname==='/api/auth/sign-in/username'){authenticated=true;return route.fulfill({json:{redirect:false,token:'test-only',user:session.user}});}
  if(url.pathname==='/api/community/config')return route.fulfill({json:{google:false,apple:false,recovery:false}});
  if(/^\/api\/community\/sets\/[^/]+$/.test(url.pathname))setFetches++;
  return route.fulfill({status:200,body:''});
 });
 await page.goto(base+path,{timeout:180000});
 await page.getByRole('button',{name:'Play this game',exact:true}).click();
 await expect(page.getByRole('dialog')).toBeVisible();
 await expect(page.getByRole('heading',{name:'Your username'})).toBeVisible();
 await expect(page.locator('.community-tabs').getByRole('button',{name:'Create account',exact:true})).toHaveAttribute('aria-pressed','true');
 assert.deepEqual(await page.getByRole('button',{name:'Guest',exact:true}).evaluate(e=>({background:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color})),{background:'rgb(212, 175, 55)',color:'rgb(0, 0, 0)'});
 await page.getByRole('button',{name:'Close account'}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await expect(page.locator('h1')).toHaveText('Voci Mission 6');
 await expect(page.locator('.community-terms>div')).toHaveCount(62);
 assert.equal(setFetches,0,'Public game data must not depend on crawler-blocked API calls');
 await page.getByText('Preview terms',{exact:true}).click();
 await expect(page.getByText('accueillir',{exact:true})).toBeVisible();
 console.log('PASS: empty API responses cannot replace title/terms; preview opens; sign-in opens only on play and can be cancelled.');
 await page.getByRole('button',{name:'Play this game',exact:true}).click();
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.getByLabel('Username',{exact:true}).fill('smokeplayer');
 await page.getByLabel('Password',{exact:true}).fill('test-password');
 await page.getByRole('button',{name:'Sign in',exact:true}).last().click();
 await expect(page.locator('.GravityStartView').first()).toBeVisible();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 console.log('PASS: play → sign in → existing game setup, without a second play click.');
 await page.goto(base+path);
 await expect(page.locator('h1')).toHaveText('Voci Mission 6');
 await page.getByRole('button',{name:'Play this game',exact:true}).click();
 await expect(page.locator('.GravityStartView').first()).toBeVisible();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 console.log('PASS: existing signed-in players proceed straight to game setup.');
 // Simulate leaving for OAuth after clicking play, then returning with a session.
 authenticated=false;await page.goto(base+path);await page.getByRole('button',{name:'Play this game',exact:true}).click();
 await expect(page.getByRole('dialog')).toBeVisible();authenticated=true;await page.reload();
 await expect(page.locator('.GravityStartView').first()).toBeVisible();
 assert.equal(await page.evaluate(()=>Object.keys(sessionStorage).filter(k=>k.startsWith('gravity-play-intent:')).length),0);
 console.log('PASS: sign-in redirect resumes the requested game and clears its pending intent.');
}finally{await browser.close();}
