import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {hashPassword} from 'better-auth/crypto';
import {chromium,expect as playwrightExpect} from '@playwright/test';
import pg from 'pg';
const expect=playwrightExpect.configure({timeout:120000});
assert.equal(process.env.VERCEL_ENV,'preview');
const base='http://localhost:4390';
const db=new pg.Pool({connectionString:process.env.DATABASE_URL});
const browser=await chromium.launch({headless:true});
const ids=[];const password=randomUUID();
async function user(adminRole){const id=randomUUID();ids.push(id);const name='test'+id.replaceAll('-','').slice(0,16);await db.query('INSERT INTO "user"(id,name,email,"emailVerified",username,"displayUsername","isAnonymous") VALUES($1,$2,$3,true,$2,$2,false)',[id,name,id+'@example.invalid']);await db.query('INSERT INTO account(id,"accountId","providerId","userId",password,"updatedAt") VALUES($1,$2,\'credential\',$2,$3,now())',[randomUUID(),id,await hashPassword(password)]);if(adminRole)await db.query('INSERT INTO community_admins(user_id) VALUES($1)',[id]);return {id,name};}
try{
 const admin=await browser.newContext(),member=await browser.newContext(),anon=await browser.newContext();
 for(const [ctx,role] of [[admin,true],[member,false]]){const u=await user(role);const r=await ctx.request.post(base+'/api/auth/sign-in/username',{data:{username:u.name,password},headers:{Origin:base},timeout:180000});assert.equal(r.status(),200,await r.text());}
 for(const ctx of [anon,member]){assert.equal((await ctx.request.get(base+'/api/admin/overview')).status(),403);assert.equal((await ctx.request.get(base+'/api/admin/traffic')).status(),403);assert.equal((await ctx.request.post(base+'/api/indexnow',{headers:{Origin:base}})).status(),403);}
 assert.equal((await anon.request.get(base+'/api/indexnow',{headers:{'x-vercel-cron':'1'}})).status(),401);
 assert.equal((await admin.request.post(base+'/api/indexnow',{headers:{Origin:'https://evil.invalid'}})).status(),403);
 assert.equal((await admin.request.get(base+'/api/admin/overview?days=2')).status(),400);
 const page=await admin.newPage();page.setDefaultTimeout(120000);page.setDefaultNavigationTimeout(180000);await page.goto(base+'/admin/users');const entry=page.getByRole('link',{name:'Admin overview →'});await expect(entry).toBeVisible();
 assert(await entry.evaluate(e=>e.compareDocumentPosition(document.querySelector('h2'))&Node.DOCUMENT_POSITION_FOLLOWING));
 await entry.click();await expect(page.locator('.overview-metric')).toHaveCount(4);
 for(const days of [7,30,1]){await page.getByRole('button',{name:days===1?'Today':`${days} days`,exact:true}).click();await expect(page.locator('.overview-day')).toHaveCount(days);}
 for(const label of ['Registered accounts','Guest accounts','Games played','Games created']){
  const card=page.locator('.analytics-card').filter({hasText:label});await card.click();await expect(card).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('.analytics-chart-heading h2')).toContainText(label);
 }
 await page.locator('.analytics-hit').first().focus();await expect(page.locator('.analytics-hover strong')).toBeVisible();
 await page.getByRole('button',{name:'7 days',exact:true}).click();await expect(page.locator('.analytics-panel').first().locator('.overview-day')).toHaveCount(7);
 await page.getByRole('button',{name:'Retry due URLs now (optional)'}).click();await expect(page.getByRole('status').filter({hasText:'disabled on previews'})).toBeVisible();
 await expect(page.getByText('Updating overview…')).toBeHidden();
 for(const width of [390,1440]){await page.setViewportSize({width,height:1100});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`/tmp/quizlet-admin-overview-${width}.png`,fullPage:true});}
 const sitemap=await anon.request.get(base+'/sitemap.xml');assert.equal(sitemap.status(),200);assert.match(await sitemap.text(),/sitemaps\/games\/0.xml/);
 const gamesXml=await (await anon.request.get(base+'/sitemaps/games/0.xml')).text();const urls=[...gamesXml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);assert.equal(urls.length,331);
 assert.equal((await anon.request.get(base+'/sitemaps/games/999999.xml')).status(),404);
 const noJs=await browser.newContext({javaScriptEnabled:false});const crawler=await noJs.newPage();crawler.setDefaultNavigationTimeout(180000);
 const path=new URL(urls[0]).pathname;await crawler.goto(base+path);
 await expect(crawler.locator('h1')).not.toHaveText('');
 const title=await crawler.locator('h1').innerText();assert.equal(await crawler.title(),title);
 assert.equal(await crawler.locator('link[rel=canonical]').getAttribute('href'),urls[0]);
 assert.match(await crawler.locator('meta[name=description]').getAttribute('content'),/^Practice .* flashcards in Quizlet Gravity/);
 assert((await crawler.locator('.community-terms>div').count())>=2,'Terms must render without JavaScript');
 await crawler.goto(base+'/games');assert.equal(await crawler.locator('.admin-list a').count(),60);await expect(crawler.getByRole('link',{name:'Next games'})).toBeVisible();
 console.log('PASS real admin/member access, CSRF, spoofed cron rejection, filters, mobile layout, 331 sitemap URLs, per-game metadata and no-JavaScript game content.');
}finally{
 await browser.close();for(const id of ids)await db.query('DELETE FROM "user" WHERE id=$1',[id]);await db.end();
}
