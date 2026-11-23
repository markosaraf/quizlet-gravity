import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
const base=process.env.TEST_URL||'http://localhost:3038';
const b=await chromium.launch();
try{for(const width of [390,1280]){
 const p=await b.newPage({viewport:{width,height:844},userAgent:'Mozilla/5.0 QuizletGravityApp'});
 const game='/250942042/einmaleins-flash-cards';let clicks=0;
 const rows=[{id:'10000000-0000-4000-8000-000000000001',actor_name:'godmode',title:'Einmaleins',created_at:'2026-11-23T11:42:12Z',read_at:null,url:game},{id:'10000000-0000-4000-8000-000000000002',actor_name:'Other player',title:'Einmaleins',created_at:'2026-11-23T10:00:00Z',read_at:null,url:game},{id:'10000000-0000-4000-8000-000000000003',actor_name:'Earlier player',title:'Einmaleins',created_at:'2026-11-22T10:00:00Z',read_at:'2026-11-22T11:00:00Z',url:game}];
 await p.route('**/api/auth/get-session*',r=>r.fulfill({json:{session:{id:'fixture-session',userId:'inbox-fixture',expiresAt:'2030-01-01T00:00:00Z'},user:{id:'inbox-fixture',name:'Inbox user',username:'inbox user',displayUsername:'Inbox user',emailVerified:true,isAnonymous:false}}}));
 await p.route('**/api/admin/status',r=>r.fulfill({json:{admin:false}}));
 await p.route('**/api/community/config',r=>r.fulfill({json:{google:false,apple:false,recovery:false}}));
 await p.route('**/api/notifications/**',r=>{
  const url=new URL(r.request().url());
  if(url.pathname.endsWith('/preferences'))return r.fulfill({json:{emailEnabled:true,pushEnabled:true,canEmail:true}});
  assert.equal(url.pathname,'/api/notifications/inbox');
  if(r.request().method()==='POST'){const row=rows.find(x=>x.id===r.request().postDataJSON().id);assert.ok(row);row.read_at||=new Date().toISOString();clicks++;return r.fulfill({json:{readAt:row.read_at,unreadCount:rows.filter(x=>!x.read_at).length}});}
  return r.fulfill({json:{unreadCount:rows.filter(x=>!x.read_at).length,notifications:rows,hasMore:false}});
 });
 await p.goto(base+'/notifications',{waitUntil:'networkidle'});
 await expect(p.locator('.community-username-button .notification-count')).toHaveText('2');
 await expect(p.locator('.notification-inbox li[data-unread="true"]')).toHaveCount(2);
 await expect(p.locator('.notification-inbox li[data-unread="false"]')).toHaveCount(1);
 assert.equal(clicks,0,'Viewing notifications must not mark them opened');
 const enable=await p.getByRole('link',{name:'Enable notifications on this device'}).boundingBox();const list=await p.locator('.notification-inbox').boundingBox();assert.ok(list.y>enable.y);
 await p.getByRole('button',{name:/Inbox user/}).click();
 await expect(p.getByRole('dialog').getByRole('link',{name:/Notifications/}).locator('.notification-count')).toHaveText('2');
 await p.getByRole('dialog').getByRole('link',{name:/Notifications/}).click();assert.equal(clicks,0);
 await p.locator('.notification-inbox li').first().getByRole('link').click();
 await expect(p).toHaveURL(/einmaleins-flash-cards/);await expect.poll(()=>clicks).toBe(1);
 await expect(p.locator('.community-username-button .notification-count')).toHaveText('1');
 await p.goto(base+'/notifications',{waitUntil:'networkidle'});
 await expect(p.locator('.notification-inbox li[data-unread="false"]')).toHaveCount(2);
 await expect(p.locator('.notification-inbox li').first().getByRole('img',{name:'Opened',exact:true})).toBeVisible();
 await expect(p.locator('.notification-inbox time')).toHaveCount(0);
 await expect(p.locator('.notification-inbox li small')).toHaveCount(0);
 const unread=p.locator('.notification-inbox li[data-unread="true"]').first(),opened=p.locator('.notification-inbox li[data-unread="false"]').first();
 await expect(unread.locator('svg')).toHaveCSS('color','rgb(220, 38, 38)');
 await expect(opened.locator('svg')).toHaveCSS('color','rgb(21, 128, 61)');
 for(const row of [unread,opened]){
  await expect(row).toHaveCSS('border-left-width','1px');
  const text=await row.locator('.notification-row-message').boundingBox(),icon=await row.locator('svg').boundingBox();
  assert.ok(icon.x>=text.x+text.width,'Status icon is to the right of the message');
  assert.ok(Math.abs(icon.y+icon.height/2-text.y-text.height/2)<2,'Status icon is vertically centered');
 }
 assert.ok(!(await p.locator('.notification-inbox').innerText()).match(/Unread|Opened|2026|\d+:\d+/));
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await p.screenshot({path:`/tmp/qg-inbox-${width}.png`,fullPage:true});
 console.log('PASS inbox/both badges, explicit unread/opened styling, click-to-game marking, retained history at',width);await p.close();
}}finally{await b.close()}
