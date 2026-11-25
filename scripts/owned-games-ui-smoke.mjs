// All API calls use fixtures: this test never modifies real games or accounts.
import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
const base=process.env.TEST_URL||'http://localhost:3042';
const browser=await chromium.launch();
try{
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:900}});
  const game={id:'12345678-1234-4234-8234-123456789012',public_id:'1000000000000999',title:'French food',term_count:3,added_by:'Test owner',created_by:'owner',revision:'2026-11-25 12:00:00.123456+00',cards:[{term:'le pain',definition:'bread'},{term:'le lait',definition:'milk',termImage:'/icon-192.png'},{term:'la pomme',definition:'apple'}]};
  let deleted=false,deleteCount=0,update=null,failDelete=false,pendingUpload=null;
  await page.route('**/api/**',route=>{
   const path=new URL(route.request().url()).pathname;
   if(path.endsWith('/get-session'))return route.fulfill({json:{user:{id:'owner',name:'Test owner',username:'testowner',displayUsername:'Test owner',emailVerified:true},session:{id:'test',userId:'owner',expiresAt:'2030-01-01T00:00:00Z'}}});
   if(path==='/api/set-images'){pendingUpload=route;return;}
   if(path==='/api/community/config')return route.fulfill({json:{}});
   if(path==='/api/admin/status')return route.fulfill({json:{admin:false}});
   if(path.includes('notifications'))return route.fulfill({json:{unreadCount:0,items:[]}});
   if(path==='/api/community/sets')return route.fulfill({json:{sets:deleted?[]:[game],hasMore:false}});
   if(path.endsWith('/edit'))return route.fulfill({json:game});
   if(path.endsWith('/update')){update=route.request().postDataJSON();return route.fulfill({json:{...game,title:update.title}});}
   if(path.endsWith('/delete')){deleteCount++;if(failDelete)return route.fulfill({status:500,json:{error:'Please try again.'}});deleted=true;return route.fulfill({json:{deleted:true}});}
   return route.fulfill({json:{}});
  });
  await page.goto(base+'/my-games');
  await expect(page.getByRole('button',{name:'Games you created',exact:true})).toHaveAttribute('aria-pressed','true');
  const edit=page.getByRole('link',{name:'Edit French food',exact:true});await expect(edit).toBeVisible();
  await expect(page.getByRole('button',{name:'Delete French food',exact:true})).toBeVisible();
  await page.screenshot({path:`/tmp/qg-my-games-${width}.png`,fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow');
  await page.getByRole('button',{name:'Games you played',exact:true}).click();
  await expect(edit).toHaveCount(0);await expect(page.getByRole('button',{name:'Delete French food',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Games you created',exact:true}).click();await edit.click();
  await expect(page.getByRole('heading',{name:'Edit your game'})).toBeVisible();
  await expect(page.getByLabel('Game title')).toHaveValue('French food');await expect(page.getByRole('textbox',{name:'Term 1',exact:true})).toHaveValue('le pain');
  await expect(page.getByRole('textbox',{name:'Answer 1',exact:true})).toHaveValue('bread');
  await page.getByLabel('Term 2: add image',{exact:true}).setInputFiles({name:'image.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+afo0AAAAASUVORK5CYII=','base64')});
  await expect.poll(()=>pendingUpload).not.toBeNull();
  await page.getByRole('button',{name:'Remove pair 1',exact:true}).click();
  await pendingUpload.fulfill({json:{url:'/api/set-images/11111111-1111-4111-8111-111111111111'}});
  await expect(page.getByRole('img',{name:'Term 1 image',exact:true})).toHaveAttribute('src','/api/set-images/11111111-1111-4111-8111-111111111111');
  await expect(page.getByRole('textbox',{name:'Term 1',exact:true})).toHaveValue('le lait');
  await expect(page.getByRole('img',{name:'Term 2 image',exact:true})).toHaveCount(0);
  await page.reload();await expect(page.getByRole('textbox',{name:'Term 1',exact:true})).toHaveValue('le pain');
  await page.getByRole('button',{name:'Remove pair 3',exact:true}).click();
  await page.getByLabel('Game title').fill('French foods');await page.getByRole('textbox',{name:'Answer 1',exact:true}).fill('loaf');
  await page.screenshot({path:`/tmp/qg-edit-game-${width}.png`,fullPage:true});
  await page.getByRole('button',{name:'Save changes',exact:true}).click();
  await expect.poll(()=>update).not.toBeNull();assert.equal(update.title,'French foods');assert.equal(update.cards.length,2);assert.equal(update.cards[0].definition,'loaf');assert.equal(update.cards[1].termImage,'/icon-192.png');assert.equal(update.revision,game.revision);assert.equal(update.sourceSetId,undefined);
  await page.goto(base+'/my-games');
  await page.getByRole('button',{name:'Delete French food',exact:true}).click();
  const dialog=page.getByRole('dialog');await expect(dialog).toContainText('permanently deleted');await expect(dialog.getByRole('button',{name:'Cancel',exact:true})).toBeFocused();
  await page.screenshot({path:`/tmp/qg-delete-game-${width}.png`,fullPage:true});
  await dialog.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(deleteCount,0);
  await page.getByRole('button',{name:'Delete French food',exact:true}).click();failDelete=true;
  await dialog.getByRole('button',{name:'Delete game',exact:true}).click();await expect(dialog.getByRole('alert')).toHaveText('Please try again.');
  failDelete=false;await dialog.getByRole('button',{name:'Delete game',exact:true}).click();await expect(dialog).toHaveCount(0);await expect(page.getByText('You have not created any games yet.')).toBeVisible();assert.equal(deleteCount,2);
  console.log(`PASS ${width}px: created default, owner controls, editor prefill/save/images/remove, cancel, delete failure/retry, list refresh`);
  await page.close();
 }
}finally{await browser.close();}
