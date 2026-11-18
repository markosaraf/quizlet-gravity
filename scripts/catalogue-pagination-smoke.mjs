import {chromium,expect} from '@playwright/test';
const browser=await chromium.launch();
try{for(const width of [390,1280]){
 const page=await browser.newPage({viewport:{width,height:844}});
 const games=Array.from({length:59},(_,i)=>({id:`game-${i}`,public_id:1000+i,title:`Game ${i+1}`,term_count:10,added_by:'Test'}));
 const offsets=[];
 await page.route('**/api/auth/get-session*',r=>r.fulfill({json:null}));
 await page.route('**/api/admin/**',r=>r.fulfill({json:{isAdmin:false}}));
 await page.route('**/api/community/**',r=>r.fulfill({json:{tutorialEnabled:false}}));
 await page.route('**/api/community/sets?*',async r=>{
  const u=new URL(r.request().url());const offset=Number(u.searchParams.get('offset'));offsets.push(offset);
  const all=u.searchParams.get('q')?games.slice(58):games;
  await r.fulfill({json:{sets:all.slice(offset,offset+24),total:all.length,hasMore:offset+24<all.length,nextOffset:offset+24}});
 });
 await page.goto('http://localhost:3059/');
 await expect(page.locator('.d-gallery-controls')).toContainText('1 / 10');
 // Native swipe/trackpad to the end of the loaded batch should fetch more too.
 await page.locator('.d-gallery').evaluate(el=>el.scrollLeft=el.clientWidth*3);
 await expect(page.locator('.d-game')).toHaveCount(48);
 for(let n=4;n<=10;n++){
  if(n>4)await page.locator('.d-more-games').click();
  await expect(page.locator('.d-gallery-controls')).toContainText(`${n} / 10`);
  await page.waitForTimeout(700);
 }
 await expect(page.locator('.d-game')).toHaveCount(59);
 await expect(page.getByRole('button',{name:'More games',exact:true})).toBeDisabled();
 if(!offsets.includes(24)||!offsets.includes(48))throw Error(`Missing pagination ${offsets}`);
 await page.getByPlaceholder('Search games by title or creator').fill('last');
 await expect(page.locator('.d-game')).toHaveCount(1);
 await expect(page.locator('.d-game h2')).toHaveText('Game 59');
 console.log(`PASS ${width}: all 59 games / 10 slides, swipe prefetch, buttons, last page, search reset`);
 await page.close();
}}finally{await browser.close();}
