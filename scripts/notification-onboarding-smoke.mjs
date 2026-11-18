import {chromium,expect} from '@playwright/test';
const base=process.env.TEST_URL||'http://localhost:3061';
const browser=await chromium.launch({headless:true});
const nativeUA='Mozilla/5.0 QuizletGravityApp NotificationOnboarding/1';
async function fixture(userAgent,user=null){
 const page=await browser.newPage({userAgent});let current=user;let prompts=0;
 await page.route('**/api/admin/**',r=>r.fulfill({json:{isAdmin:false}}));
 await page.route('**/api/community/**',r=>r.fulfill({json:{sets:[],hasMore:false,isAdmin:false,tutorialEnabled:false,google:true,apple:true}}));
 await page.route('**/api/auth/get-session*',r=>r.fulfill({json:current?{user:current,session:{id:'notification-test-session',userId:current.id,expiresAt:new Date(Date.now()+86400000).toISOString()}}:null}));
 await page.route('**/native/notifications?afterSignup=1',r=>{prompts++;return r.fulfill({contentType:'text/html',body:'Permission requested'});});
 await page.route('**/api/auth/sign-in/anonymous',r=>{current={id:'guest-test',name:'Anonymous',isAnonymous:true};return r.fulfill({json:{user:current,token:'test-only'}});});
 await page.route('**/api/auth/update-user',r=>{current={...current,...r.request().postDataJSON()};return r.fulfill({json:{status:true,user:current}});});
 await page.route('**/api/auth/sign-up/email',r=>r.fulfill({json:{user:{id:'email-test',...r.request().postDataJSON()},token:null}}));
 await page.goto(base+'/sets');
 return {page,prompts:()=>prompts};
}
try{
 for(const account of ['guest','email','google','apple']){
  const f=await fixture(nativeUA,{id:account,username:'Test Player',displayUsername:'Test Player',name:'Test Player',isAnonymous:account==='guest'});
  await expect.poll(f.prompts).toBe(1);await f.page.close();console.log(`PASS ${account}: completed account triggers native permission request`);
 }
 for(const ua of ['Mozilla/5.0','Mozilla/5.0 QuizletGravityApp']){
  const f=await fixture(ua,{id:'old',username:'Test Player',name:'Test Player'});
  await expect(f.page.locator('[data-tour="username"]')).toContainText('Test Player');
  await f.page.waitForTimeout(500);expect(f.prompts()).toBe(0);await f.page.close();
 }
 console.log('PASS browsers and older native builds stay on the page');
 for(const mode of ['guest','email']){
  const f=await fixture(nativeUA);await expect(f.page.locator('[data-tour="username"]')).toContainText('Log in');expect(f.prompts()).toBe(0);
  await f.page.locator('[data-tour="username"]').click();
  const dialog=f.page.getByRole('dialog',{name:'Player account'});
  if(mode==='email')await dialog.getByRole('button',{name:'Create account',exact:true}).first().click();
  await dialog.getByLabel('Username',{exact:true}).fill('Notification Test');
  if(mode==='email'){
   await dialog.getByLabel('Email',{exact:true}).fill('test@example.invalid');
   await dialog.getByLabel('Password',{exact:true}).fill('test-only-password');
  }
  await dialog.locator('button[type="submit"], form button.community-primary').click();
  await expect.poll(f.prompts).toBe(1);await f.page.close();
  console.log(`PASS ${mode}: signup form success triggers prompt; no prompt before signup`);
 }
}finally{await browser.close();}
