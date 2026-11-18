import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium,expect} from '@playwright/test';
const base=process.env.SMOKE_BASE||'http://localhost:4390';
const browser=await chromium.launch();
try{
 const ctx=await browser.newContext();const page=await ctx.newPage();page.setDefaultTimeout(30000);
 if(process.env.SMOKE_ACCESS_FILE)await page.goto((await readFile(process.env.SMOKE_ACCESS_FILE,'utf8')).trim());
 const robots=await (await ctx.request.get(base+'/robots.txt')).text();
 assert.match(robots,/Allow: \/api\/community\/sets\/\*\/leaderboard/);assert.match(robots,/Disallow: \/api\//);
 let failLeaderboard=false;
 await page.route('**/api/**',route=>{
  const url=new URL(route.request().url());
  if(url.pathname.endsWith('/leaderboard'))return failLeaderboard?route.fulfill({status:200,body:''}):route.continue();
  if(url.pathname==='/api/auth/get-session')return route.fulfill({json:null});
  return route.fulfill({status:200,body:''});
 });
 await page.goto(base+'/34289851/hiragana-flash-cards');
 await expect(page.getByText('Be the first to finish a game.',{exact:true})).toBeVisible();
 console.log('PASS: empty real leaderboard loads when crawler access is allowed, even with other APIs blocked.');
 await page.getByRole('button',{name:'Play & learn',exact:true}).click();
 const tabs=page.locator('.community-panel .community-tabs');
 for(const theme of ['light','dark']){
  await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
  for(const name of ['Create account','Sign in','Guest','Create account']){
   const button=tabs.getByRole('button',{name,exact:true});await button.click();
   for(const hovering of [true,false]){
    if(!hovering)await page.mouse.move(5,5);
    await page.waitForTimeout(180);
    const style=await button.evaluate(el=>({bg:getComputedStyle(el).backgroundColor,color:getComputedStyle(el).color,shadow:getComputedStyle(el).boxShadow}));
    assert.equal(style.bg,name==='Guest'?(hovering?'rgb(198, 163, 50)':'rgb(212, 175, 55)'):'rgba(212, 175, 55, 0.15)');
    assert.equal(style.color,name==='Guest'?'rgb(0, 0, 0)':theme==='light'?'rgb(37, 99, 235)':'rgb(168, 181, 245)');
    assert.match(style.shadow,/rgb\(0, 0, 0\)/);
   }
   const guest=tabs.getByRole('button',{name:'Guest',exact:true});
   assert.equal(await guest.evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(212, 175, 55)');
  }
 }
 console.log('PASS: Create account and Sign in keep translucent gold; Guest gold/black; selected underline remains in both themes.');
 await page.getByRole('button',{name:'Close account'}).click();
 failLeaderboard=true;await page.reload();
 await expect(page.getByText('Could not load the leaderboard. Please retry.',{exact:true})).toBeVisible();
 await expect(page.getByText(/Unexpected end|Failed to execute/)).toHaveCount(0);
 await expect(page.locator('.community-terms tbody tr')).toHaveCount(102);
 failLeaderboard=false;await page.getByRole('button',{name:'Retry leaderboard',exact:true}).click();
 await expect(page.getByText('Be the first to finish a game.',{exact:true})).toBeVisible();
 const response=await ctx.request.get(base+'/api/community/sets/65a556e7-c3a7-4695-ac3d-2dfc71b438b7/leaderboard?limit=5&offset=0');
 assert.equal(response.status(),200);assert.equal(response.headers()['x-robots-tag'],'noindex');assert.equal((await response.json()).total,0);
 console.log('PASS: empty/malformed response shows friendly retry, preserves 102 terms, retry recovers; JSON endpoint carries noindex.');
}finally{await browser.close();}
