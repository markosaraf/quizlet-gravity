import {chromium,expect} from '@playwright/test';
const browser=await chromium.launch();
try {
 for(const width of [390,1280]) {
  const page=await browser.newPage({viewport:{width,height:844}});
  let user={id:'name-completion-test',name:'Provider name',username:null,displayUsername:null,isAnonymous:false,email:'test@example.invalid',emailVerified:true,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  await page.route('**/api/admin/**',r=>r.fulfill({json:{isAdmin:false}}));
  await page.route('**/api/community/**',r=>r.fulfill({json:{sets:[],hasMore:false,isAdmin:false,tutorialEnabled:false}}));
  await page.route('**/api/auth/get-session*',r=>r.fulfill({json:{user,session:{id:'test-session',token:'test-only',userId:user.id,expiresAt:new Date(Date.now()+86400000).toISOString()}}}));
  let saves=0;
  await page.route('**/api/auth/update-user',async r=>{saves++;const body=r.request().postDataJSON();if(saves===1){await r.fulfill({status:400,json:{message:'Username is already taken'}});return;}user={...user,...body};await r.fulfill({json:{status:true}});});
  await page.goto('http://localhost:3059/sets');
  const dialog=page.getByRole('dialog',{name:'Choose a name',exact:true});
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');await expect(dialog).toBeVisible();
  const input=dialog.getByLabel('Name',{exact:true});
  await input.fill('   ');await expect(dialog.getByRole('button',{name:'Save name',exact:true})).toBeDisabled();
  await input.fill('\u3164\u3164\u3164');await expect(dialog.getByRole('button',{name:'Save name',exact:true})).toBeDisabled();
  await input.fill('Emilia Dürig');await dialog.getByRole('button',{name:'Save name',exact:true}).click();
  await expect(dialog.getByRole('alert')).toContainText('already taken');await expect(dialog).toBeVisible();
  await page.screenshot({path:`/tmp/name-completion-${width}.png`});
  await input.fill('Marko Sarafijanovic');await dialog.getByRole('button',{name:'Save name',exact:true}).click();
  await expect(dialog).toHaveCount(0);await expect(page.locator('[data-tour="username"]')).toContainText('Marko Sarafijanovic');
  await page.reload();await expect(page.locator('[data-tour="username"]')).toContainText('Marko Sarafijanovic');await expect(dialog).toHaveCount(0);
  user={...user,username:null,displayUsername:null,isAnonymous:true};await page.reload();await expect(page.locator('[data-tour="username"]')).toBeVisible();await expect(dialog).toHaveCount(0);
  await page.close();console.log(`PASS ${width}: required name, invisible rejection, retry, save, reload, anonymous exemption`);
 }
}finally{await browser.close();}
