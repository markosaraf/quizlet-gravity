import assert from 'node:assert/strict';
import {chromium, webkit, expect} from '@playwright/test';
for(const engine of [chromium, webkit]) {
 const browser=await engine.launch();
 try {
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  const user={id:'preview-test',username:'markosaraf',displayUsername:'Marko Sarafijanovic',name:'Marko Sarafijanovic',isAnonymous:false,emailVerified:true};
  await page.route('**/api/auth/get-session*',r=>r.fulfill({json:{user,session:{id:'test',userId:user.id,expiresAt:new Date(Date.now()+86400000).toISOString()}}}));
  await page.route('**/api/admin/**',r=>r.fulfill({json:{admin:false}}));
  await page.route('**/api/community/**',r=>r.fulfill({json:{sets:[],hasMore:false,tutorialEnabled:false}}));
  const searches=[],imports=[];
  await page.route('**/api/search-quizlet',r=>{
   searches.push(r.request().postDataJSON());
   return r.fulfill({json:{sets:[{setId:'12345',url:'https://quizlet.com/12345/',title:'French food',description:'2 terms'}]}});
  });
  await page.route('**/api/import-quizlet',r=>{
   const input=r.request().postDataJSON();imports.push(input);
   return r.fulfill({json:{title:'French food',url:'https://quizlet.com/12345/',creatorName:'teacher',cards:[{term:'le pain',definition:'bread'},{term:'la pomme',definition:'apple'}],...(input.preview?{}:{sharedId:'test-set',sharePath:'/sets/test-set'})}});
  });
  await page.goto('http://localhost:3104/import-game');
  await expect(page.getByRole('heading',{name:'Or paste a Quizlet link'})).toBeVisible();
  await page.getByRole('searchbox').fill('French food');await page.getByRole('button',{name:'Search Quizlet',exact:true}).click();
  await page.getByRole('button',{name:'View terms'}).click();
  await expect(page.getByRole('cell',{name:'le pain',exact:true})).toBeVisible();
  await expect(page.getByRole('cell',{name:'bread',exact:true})).toBeVisible();
  assert.equal(imports.length,1);assert.equal(imports[0].preview,true);
  await page.getByRole('button',{name:'Back to search results'}).click();
  await page.getByRole('button',{name:'Creator',exact:true}).click();
  await page.getByRole('searchbox').fill('teacher');await page.getByRole('button',{name:'Search Quizlet',exact:true}).click();
  await expect(page.getByRole('button',{name:'View terms'})).toBeVisible();assert.deepEqual(searches.at(-1),{mode:'creator',query:'teacher'});
  await page.getByRole('button',{name:'View terms'}).click();await page.getByRole('button',{name:'Import & play this set'}).click();
  await expect(page).toHaveURL(/\/sets\/test-set$/);assert.equal(imports.filter(x=>!x.preview).length,1);
  await page.goto('http://localhost:3104/import-game');
  await page.getByLabel('Quizlet set link',{exact:true}).fill('https://quizlet.com/12345/');
  await page.getByRole('button',{name:'Add & play'}).click();await expect(page).toHaveURL(/\/sets\/test-set$/);
  await page.goto('http://localhost:3104/import-game');
  await page.route('**/api/search-quizlet',r=>r.fulfill({status:429,json:{error:'Please wait a minute before searching again.'}}));
  await page.getByRole('searchbox').fill('French');await page.getByRole('button',{name:'Search Quizlet',exact:true}).click();
  await expect(page.locator('.quizlet-search [role=alert]')).toHaveText('Please wait a minute before searching again.');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  console.log('PASS '+engine.name()+': title/creator search, preview before import, paste link, rate-limit feedback, phone layout');
 } finally {await browser.close();}
}
