import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium,expect} from '@playwright/test';
const base=process.env.SMOKE_BASE||'http://localhost:4395';
const browser=await chromium.launch();
try{
 const page=await browser.newPage();page.setDefaultNavigationTimeout(240000);page.setDefaultTimeout(30000);let person='alice';const prefs={alice:null,bob:null};
 let settings={cyberNonQuizletEnabled:false,cyberLogoEnabled:true,cyberAllEnabled:false};let writes=0;
 await page.route('**/api/**',route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/api/auth/get-session')return route.fulfill({json:{session:{id:'session-'+person,userId:person,expiresAt:new Date(Date.now()+86400000).toISOString()},user:{id:person,name:person,username:person,displayUsername:person,isAnonymous:false,emailVerified:true,email:person+'@example.invalid'}}});
  if(path==='/api/admin/status')return route.fulfill({json:{admin:true}});
  if(path==='/api/community/config')return route.fulfill({json:settings});
  if(path==='/api/community/font-preference'){
   if(route.request().method()==='POST'){prefs[person]=route.request().postDataJSON().mode;writes++;}
   return route.fulfill({json:{mode:prefs[person]}});
  }
  if(path==='/api/admin/settings'){
   if(route.request().method()==='POST')settings={...settings,...route.request().postDataJSON()};
   return route.fulfill({json:settings});
  }
  return route.fulfill({json:{users:[],sets:[],reports:[],notifications:[],unreadCount:0,ready:{},template:{}}});
 });
 if(process.env.SMOKE_ACCESS_FILE)await page.goto(readFileSync(process.env.SMOKE_ACCESS_FILE,'utf8').trim());
 await page.goto(base);await page.locator('.community-username-button').click();
 const logo=page.getByRole('button',{name:'Cybertruck font',exact:true});await expect(logo).toBeVisible();
 assert.equal(await logo.locator('img').getAttribute('src'),'/assets/robotaxi/gold.svg');
 await page.evaluate(()=>{const p=document.createElement('p');p.id='plain-font-probe';p.textContent='Ordinary text';document.body.appendChild(p);});
 const mode=async value=>expect(page.locator('html')).toHaveAttribute('data-cyber-font',value);
 await logo.click();await mode('interface');
 assert.match(await page.locator('.community-panel h2').evaluate(e=>getComputedStyle(e).fontFamily),/^hurmegeosans/);
 assert.match(await page.locator('#plain-font-probe').evaluate(e=>getComputedStyle(e).fontFamily),/Blender TSL/);
 await logo.click();await mode('off');
 const box=await logo.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(2100);await page.mouse.up();await mode('all');
 assert.equal(writes,3,'Long press sends exactly one change, without a trailing click');
 assert.match(await page.locator('.community-panel h2').evaluate(e=>getComputedStyle(e).fontFamily),/Blender TSL/);
 await page.evaluate(()=>document.fonts.ready);assert.ok(await page.evaluate(()=>document.fonts.check('700 20px "Blender TSL"')));
 await page.screenshot({path:'/tmp/quizlet-cyber-account.png'});
 await page.reload();await mode('all');person='bob';await page.reload();await mode('off');
 await page.locator('.community-username-button').click();await expect(logo).toBeVisible();
 const b=await logo.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.waitForTimeout(300);await page.mouse.move(1,1);await page.mouse.up();await page.waitForTimeout(2100);await mode('off');assert.equal(writes,3);
 settings={...settings,cyberLogoEnabled:false,cyberNonQuizletEnabled:true};await page.reload();await mode('interface');await page.locator('.community-username-button').click();await expect(logo).toHaveCount(0);
 settings={...settings,cyberAllEnabled:true};await page.reload();await mode('all');
 await page.goto(base+'/admin/users');
 await page.getByRole('switch',{name:'Cybertruck for non-Quizlet text',exact:true}).click();
 // It was already on in this deliberately inconsistent mock; toggling it off leaves all-text mode.
 await page.getByRole('switch',{name:'Cybertruck for non-Quizlet text',exact:true}).click();
 assert.equal(settings.cyberAllEnabled,false);await mode('interface');
 await page.getByRole('switch',{name:'Show Robotaxi font switch to users'}).click();assert.equal(settings.cyberLogoEnabled,true);
 await page.getByRole('switch',{name:'Cybertruck for all text',exact:true}).click();assert.equal(settings.cyberNonQuizletEnabled,false);await mode('all');
 await page.screenshot({path:'/tmp/quizlet-cyber-admin.png',fullPage:true});
 console.log('PASS: original Quizlet preserved, ordinary text changes, all mode, one change per 2s hold, cancelled hold, saved preference reload, account isolation, hidden logo, three admin controls.');
}finally{await browser.close();}
