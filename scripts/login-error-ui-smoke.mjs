// Authentication is intercepted; this never submits real account credentials.
import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
const base=process.env.TEST_URL||'http://localhost:3038';
const browser=await chromium.launch();
try{for(const theme of ['light','dark']){
 const p=await browser.newPage({viewport:{width:390,height:844}});
 await p.route('**/api/community/config',r=>r.fulfill({json:{google:false,apple:false,recovery:true}}));
 await p.route('**/api/admin/status',r=>r.fulfill({json:{admin:false}}));
 await p.route('**/api/notifications/inbox*',r=>r.fulfill({json:{unreadCount:0}}));
 await p.route('**/api/auth/**',r=>{const path=new URL(r.request().url()).pathname;if(path.endsWith('/get-session'))return r.fulfill({json:null});assert.ok(path.endsWith('/sign-in/username'));return r.fulfill({status:401,json:{code:'INVALID_USERNAME_OR_PASSWORD',message:'Invalid username or password'}});});
 await p.goto(base+'/import-game',{waitUntil:'networkidle'});
 await p.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
 await p.getByRole('button',{name:'Log in',exact:true}).click();
 const dialog=p.getByRole('dialog'),name=dialog.getByLabel('Username',{exact:true}),password=dialog.getByLabel('Password',{exact:true});
 const original=await name.evaluate(e=>getComputedStyle(e).borderTopColor);
 await name.fill('Login fixture');await password.fill('wrong-password');
 await dialog.getByRole('button',{name:'Sign in',exact:true}).last().click();
 const error=dialog.getByRole('alert');await expect(error).toHaveText('Invalid username or password');
 const red=theme==='dark'?'rgb(248, 113, 113)':'rgb(220, 38, 38)';
 await expect(error).toHaveCSS('color',red);
 for(const field of [name,password]){await expect(field).toHaveAttribute('aria-invalid','true');await expect(field).toHaveCSS('outline-color',red);await expect(field).toHaveCSS('outline-width','2px');await expect(field).toHaveCSS('border-top-color',original);await expect(field).toHaveCSS('border-top-width','1px');}
 await p.screenshot({path:`/tmp/qg-login-error-${theme}.png`,fullPage:true});
 await password.fill('corrected-password');await expect(error).toHaveCount(0);await expect(name).toHaveAttribute('aria-invalid','false');await expect(password).toHaveAttribute('aria-invalid','false');
 console.log('PASS login error text and outer outlines, unchanged inner borders, reset on correction:',theme);await p.close();
}}finally{await browser.close()}
