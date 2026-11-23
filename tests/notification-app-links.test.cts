import {test} from 'node:test';
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server';
import {proxy} from '../src/proxy';
import {notificationUnsubscribeUrl,readNotificationUnsubscribeToken} from '../src/lib/community/notification-unsubscribe';

test('email link uses the existing native root route and preserves its signed recipient',()=>{
 const original=process.env.BETTER_AUTH_SECRET;process.env.BETTER_AUTH_SECRET='isolated-link-test-secret';
 try{
  const url=new URL(notificationUnsubscribeUrl('recipient','recipient@example.test'));
  assert.equal(url.pathname,'/');assert.equal(url.searchParams.get('open'),'leaderboard-email');
  const token=url.searchParams.get('token')!;
  assert.equal(readNotificationUnsubscribeToken(token)?.user,'recipient');
  const response=proxy(new NextRequest(url));
  assert.equal(response.headers.get('location'),null,'No browser redirect away from the supported app URL');
  const target=new URL(response.headers.get('x-middleware-rewrite')!);
  assert.equal(target.pathname,'/notifications/email');assert.equal(target.searchParams.get('token'),token);
  assert.equal(response.headers.get('Cache-Control'),'private, no-store');
  assert.equal(response.headers.get('Referrer-Policy'),'no-referrer');
  url.hostname='quizletgravity.com';
  const canonical=new URL(proxy(new NextRequest(url)).headers.get('location')!);
  assert.equal(canonical.hostname,'www.quizletgravity.com');assert.equal(canonical.search,url.search);
 }finally{if(original===undefined)delete process.env.BETTER_AUTH_SECRET;else process.env.BETTER_AUTH_SECRET=original;}
});
test('ordinary home, game and legacy opt-out routes are unchanged; no arbitrary redirect',()=>{
 for(const path of ['/','/?open=https://attacker.invalid','/notifications/email?token=old','/250942042/einmaleins-flash-cards']){
  const response=proxy(new NextRequest('https://www.quizletgravity.com'+path));
  assert.equal(response.headers.get('x-middleware-rewrite'),null);
  assert.equal(response.headers.get('location'),null);
 }
});
