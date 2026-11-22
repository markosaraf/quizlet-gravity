import {chromium,webkit,expect} from '@playwright/test';
import assert from 'node:assert/strict';
const base='http://localhost:3062';
for(const [name,engine] of [['Chromium',chromium],['WebKit',webkit]]){
 const browser=await engine.launch();
 try{for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];let enabled=false;
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/auth/get-session*',r=>r.fulfill({json:{session:{id:'fixture',userId:'admin',expiresAt:'2030-01-01T00:00:00Z'},user:{id:'admin',name:'Administrator',username:'Administrator',displayUsername:'Administrator',emailVerified:true,isAnonymous:false}}}));
  await page.route('**/api/admin/**',async r=>{
   const url=new URL(r.request().url()),path=url.pathname;
   if(path.endsWith('/status'))return r.fulfill({json:{admin:true}});
   if(path.endsWith('/welcome-emails')){if(r.request().method()==='POST')enabled=r.request().postDataJSON().enabled;return r.fulfill({json:{enabled,ready:true,eligible:2,sent:12,uncertain:0,failed:0,eligible_since:'2026-11-21T10:00:00Z',nextRun:'2026-11-24T12:09:00Z',last_scheduled_for:null}});}
   if(path.endsWith('/users')){const audience=url.searchParams.get('audience');return r.fulfill({json:{total:2,accounts:1,guests:1,hasMore:false,users:[{id:'account',username:'Account player',email:'player@example.invalid',guest:false,admin:false,created_at:'2026-11-21T10:00:00Z'},{id:'guest',username:'Guest player',email:null,guest:true,admin:false,created_at:'2026-11-20T10:00:00Z'}].filter(u=>audience==='all'||u.guest===(audience==='guests'))}});}
   if(path.endsWith('/sets'))return r.fulfill({json:{sets:[{id:'game',public_id:'1001',title:'Example game',term_count:8,creator:'Account player',created_at:'2026-11-19T10:00:00Z'}],hasMore:false}});
   if(path.endsWith('/reports'))return r.fulfill({json:{reports:[],hasMore:false}});
   if(path.endsWith('/notifications'))return r.fulfill({json:{overtakenEmailEnabled:false,overtakenPushEnabled:false,ready:{email:true,apple:true,android:true},deliveries:{}}});
   return r.fulfill({json:{tutorialEnabled:true,gamePageTotalEnabled:true,quizletSearchEnabled:true,specialLettersEnabled:true,specialCharactersEnabled:true}});
  });
  await page.goto(base+'/admin/users');const toggle=page.getByRole('switch',{name:'Send weekly welcome emails'});await expect(toggle).toHaveAttribute('aria-checked','false');await toggle.click();await expect(toggle).toHaveAttribute('aria-checked','true');await page.reload();await expect(toggle).toHaveAttribute('aria-checked','true');await toggle.click();await expect(toggle).toHaveAttribute('aria-checked','false');
  await page.getByLabel('User type').selectOption('accounts');await expect(page.getByText('Account player',{exact:true})).toBeVisible();await expect(page.getByText('Guest player',{exact:true})).toHaveCount(0);
  await page.getByLabel('User type').selectOption('guests');await expect(page.getByText('Guest player',{exact:true})).toBeVisible();await expect(page.getByText('Account player',{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Games',exact:true}).click();await expect(page.getByRole('link',{name:'Example game'})).toBeVisible();await expect(page.locator('time[datetime="2026-11-19T10:00:00Z"]')).toBeVisible();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Page overflows');assert.deepEqual(errors,[]);await page.screenshot({path:`/tmp/quizlet-user-invitations/admin-${name}-${width}.png`,fullPage:true});await page.close();console.log(`PASS ${name} ${width}: saved toggle, audience filters and game creation date`);
 }}finally{await browser.close();}
}
for(const path of ['/api/admin/welcome-emails','/api/admin/users?audience=guests','/api/welcome/schedule']){const r=await fetch(base+path);assert([401,403].includes(r.status));}
console.log('PASS: anonymous requests cannot access admin data or start email automation');
