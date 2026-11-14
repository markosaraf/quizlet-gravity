import assert from 'node:assert/strict';
import {chromium,expect} from '@playwright/test';
const base=process.env.BASE_URL||'http://localhost:3104';
const browser=await chromium.launch();
try {
 for(const width of [320,390,1280]) {
  const page=await browser.newPage({viewport:{width,height:844},hasTouch:width<600,isMobile:width<600});
  const user={id:'navigation-test',username:'testplayer',displayUsername:'Test Player',name:'Test Player',isAnonymous:false,emailVerified:true};
  let signedIn=false, mineRequests=0;
  await page.route('**/api/auth/get-session*',r=>r.fulfill({json:signedIn?{user,session:{id:'test-only',userId:user.id,expiresAt:new Date(Date.now()+86400000).toISOString()}}:null}));
  await page.route('**/api/admin/**',r=>r.fulfill({json:{admin:false}}));
  await page.route('**/api/community/**',r=>r.fulfill({json:{sets:[],hasMore:false,tutorialEnabled:false}}));
  await page.route('**/api/community/sets?*',r=>{
   const u=new URL(r.request().url());if(['created','played'].includes(u.searchParams.get('mine')))mineRequests++;
   return r.fulfill({json:{sets:u.searchParams.get('q')?[]:[{id:'test',public_id:'123456',title:u.searchParams.get('mine')==='played'?'Played French game':'My French game',term_count:10,added_by:'Test Player'}],hasMore:false}});
  });
  await page.goto(base+'/my-games');
  await expect(page.getByRole('heading',{name:'My games',exact:true})).toBeVisible();
  await expect(page.getByText('Log in to find games you have created or played.')).toBeVisible();
  assert.equal(mineRequests,0);
  const nav=page.locator('.community-nav');
  for(const name of ['FAQ','Create game','Games','My games'])await expect(nav.getByRole('link',{name,exact:true})).toBeVisible();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'navigation fits phone');
  signedIn=true;await page.reload();await expect(page.getByRole('heading',{name:'My French game'})).toBeVisible();assert.ok(mineRequests>0);
  await expect(page.getByRole('button',{name:'Games you created',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Games you played',exact:true}).click();await expect(page.getByRole('heading',{name:'Played French game'})).toBeVisible();
  await page.getByRole('button',{name:'Games you created',exact:true}).click();await expect(page.getByRole('heading',{name:'My French game'})).toBeVisible();
  await page.getByRole('searchbox').fill('no-match');await expect(page.getByText('No matching games. Try another search.')).toBeVisible();
  await page.screenshot({path:`/tmp/gravity-my-games-${width}.png`});
  await page.goto(base+'/example');if(base.includes('localhost'))await page.addStyleTag({content:'nextjs-portal{display:none}'});
  const controls=page.locator(width<600?'.GravitySiteHeader':'.GravityModeLayout-sidebar');
  const pause=controls.locator('.GravityGame-pause');await expect(pause).toBeEnabled({timeout:30000});
  for(const theme of ['light','dark']){
   await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
   await expect(pause).toHaveCSS('background-color','rgb(212, 175, 55)');
   const exit=controls.getByRole('link',{name:'Exit',exact:true});await expect(exit).toBeVisible();await expect(exit).not.toHaveCSS('background-color','rgb(212, 175, 55)');
  }
  await pause.click();await expect(pause).toHaveAccessibleName(/Resume/i);await pause.click();
  await controls.getByRole('link',{name:'Exit',exact:true}).click();await expect(page).toHaveURL(base+'/');
  console.log(`PASS ${width}: My games auth/search, navigation fit, gold pause in both themes, pause/resume and Exit`);
  await page.close();
 }
}finally{await browser.close();}
