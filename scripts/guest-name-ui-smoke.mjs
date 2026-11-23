// All authentication is intercepted: no real users, emails or profile changes.
import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
const base=process.env.TEST_URL||'http://localhost:3038';
const taken='This username is already taken. Choose another.';
function fixture(name,username,guest=true){const now=new Date().toISOString();return{user:{id:'guest-ui-fixture',name,username,displayUsername:username?name:null,isAnonymous:guest,email:'guest-ui@example.invalid',emailVerified:!guest,createdAt:now,updatedAt:now},session:{id:'fixture-session',token:'fixture-token',userId:'guest-ui-fixture',expiresAt:new Date(Date.now()+86400000).toISOString(),createdAt:now,updatedAt:now}};}
const browser=await chromium.launch();
try{
 for(const scenario of ['fresh','existing-guest','recovery','signup','account']){
  const page=await browser.newPage({viewport:{width:390,height:844}});
  let session=scenario==='existing-guest'?fixture('Other guest','other guest'):scenario==='recovery'?fixture('Anonymous',null):scenario==='account'?fixture('My account','my account',false):null;
  let creates=0,updates=0;
  await page.route('**/api/community/config',r=>r.fulfill({json:{google:false,apple:false,recovery:false,quizletSearchEnabled:true}}));
  await page.route('**/api/notifications/inbox*',r=>r.fulfill({json:{unreadCount:0}}));
  await page.route('**/api/admin/status',r=>r.fulfill({json:{admin:false}}));
  await page.route('**/api/auth/**',async r=>{
   const path=new URL(r.request().url()).pathname,data=r.request().method()==='POST'?r.request().postDataJSON():{};
   if(path.endsWith('/get-session'))return r.fulfill({json:session});
   if(path.endsWith('/is-username-available'))return r.fulfill({json:{available:!['godmode','existing account'].includes(data.username.toLowerCase())}});
   if(path.endsWith('/sign-in/anonymous')||path.endsWith('/update-user')){
    if(path.endsWith('/sign-in/anonymous'))creates++;else updates++;
    if(['racing','godmode','existing account'].includes(data.username.toLowerCase()))return r.fulfill({status:400,json:{code:'USERNAME_IS_ALREADY_TAKEN',message:taken}});
    if(data.username==='Not saved')return r.fulfill({json:{status:true,user:session.user}});
    assert.equal(data.username,'New guest');session=fixture('New guest','new guest',scenario!=='account');return r.fulfill({json:path.endsWith('/update-user')?{status:true,user:session.user}:{token:'fixture-token',user:session.user}});
   }
   throw Error('Unexpected auth request '+path);
  });
  await page.goto(base+'/import-game',{waitUntil:'networkidle'});
  if(scenario!=='recovery'){
   await page.getByRole('button',{name:session?.user.name||'Log in',exact:true}).click();
   if(scenario!=='account')await page.getByRole('button',{name:scenario==='signup'?'Create account':'Guest',exact:true}).click();
  }
  const field=page.getByLabel(scenario==='recovery'?'Name':scenario==='account'?'Leaderboard username':'Username',{exact:true});
  const submit=page.getByRole('dialog').getByRole('button',{name:scenario==='recovery'?'Save name':scenario==='account'?'Save username':scenario==='signup'?'Create account':'Play as guest',exact:true}).last();
  if(scenario==='signup'){await page.getByLabel('Email',{exact:true}).fill('fixture@example.invalid');await page.getByLabel('Password',{exact:true}).fill('fixture-password');}
  // Android adjustResize leaves a smaller viewport above the keyboard.
  if(scenario==='existing-guest')await page.setViewportSize({width:390,height:380});
  for(const name of ['godmode','Existing account']){
   await field.fill(name);
   if(scenario==='recovery')await submit.click();
   const error=page.getByRole('alert').filter({hasText:taken});await expect(error).toBeVisible();
   if(scenario!=='recovery')await submit.click();
   await expect(error).toBeVisible();await expect(submit).toBeEnabled();
   await expect(field).toHaveAttribute('aria-invalid','true');
   await expect(field).toHaveCSS('outline-color','rgb(220, 38, 38)');
   await expect(field).toHaveCSS('border-top-width','1px');
   await expect(field).toHaveCSS('border-top-color','rgba(0, 0, 0, 0.16)');
   await expect(error).toHaveCSS('color','rgb(220, 38, 38)');
   if(scenario==='existing-guest'){const box=await error.boundingBox();assert.ok(box.y>=0&&box.y+box.height<=380,'Taken-name error fits above keyboard');await expect(page.getByRole('button',{name:'Other guest',exact:true,includeHidden:true})).toHaveCount(1);}
  }
  if(scenario==='signup'){assert.equal(creates,0);await page.close();console.log('PASS signup rejects guest and account names before sending signup');continue;}
  if(scenario!=='recovery')assert.equal(updates+creates,0,'Taken names are stopped before a mutation');
  if(scenario==='existing-guest'){
   await field.fill('Not saved');await submit.click();await expect(page.getByRole('alert')).toHaveText('Your username was not changed. Please try again.');await expect(page.getByRole('dialog')).toBeVisible();
  }
  await field.fill('racing');await submit.click();await expect(page.getByRole('alert').filter({hasText:taken})).toBeVisible();
  await field.fill('New guest');await submit.click();await expect(page.getByRole('button',{name:'New guest',exact:true})).toBeVisible();await expect(page.getByRole('dialog')).toHaveCount(0);
  if(scenario==='fresh')assert.equal(updates,0);else assert.equal(creates,0);
  console.log('PASS',scenario,'taken-name message, identity retained on failure, retry succeeds');await page.close();
 }
}finally{await browser.close()}
