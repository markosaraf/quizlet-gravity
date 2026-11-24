import {test} from 'node:test';
import assert from 'node:assert/strict';
import {challengeShare,shareLinks,nativeShareHref} from '../src/lib/gravity/challenge-share';
test('public game sharing preserves Unicode titles without exporting session parameters',()=>{
 const share=challengeShare('Français & Deutsch',146000,'/ru/368774680/my-favourite-things-a2-flash-cards');
 assert.equal(share.url,'https://www.quizletgravity.com/ru/368774680/my-favourite-things-a2-flash-cards');
 assert.match(share.text,/146,000/);
 const native=new URL(nativeShareHref(share),'https://www.quizletgravity.com');
 assert.equal(native.searchParams.get('text'),share.text);
 assert.equal(native.searchParams.get('url'),share.url);
 for(const path of ['/native-return#secret','/notifications?token=secret','//evil.example/123/a-flash-cards','/create-set','/123/a-flash-cards?token=secret'])assert.equal(challengeShare('Private',12,path).url,'https://www.quizletgravity.com/');
});
test('all seven website services encode user content as data',()=>{
 const share=challengeShare('A & B? #1',146000,'/123/test-flash-cards');
 const links=shareLinks(share,false);
 assert.deepEqual(links.map(l=>l.name),['WhatsApp','Viber','X','Telegram','Messages','Email','LinkedIn']);
 assert.equal(new URL(links[3].href).searchParams.get('text'),share.text);
 assert.equal(new URL(links[6].href).searchParams.get('url'),share.url);
 assert.match(shareLinks(share,true)[4].href,/^sms:&body=/);
 assert.match(links[4].href,/^sms:\?body=/);
 assert.match(links[5].href,/^mailto:\?subject=/);
});
