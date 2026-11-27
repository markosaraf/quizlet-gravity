import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cyberMode,defaultCyberSettings as defaults,isCyberMode} from '../src/lib/community/cyber-font';
test('global defaults and personal override follow logo visibility',()=>{
 assert.equal(cyberMode(defaults,null),'off');
 assert.equal(cyberMode({...defaults,cyberNonQuizletEnabled:true},null),'interface');
 assert.equal(cyberMode({...defaults,cyberAllEnabled:true},null),'all');
 assert.equal(cyberMode({...defaults,cyberAllEnabled:true,cyberLogoEnabled:true},'off'),'off');
 assert.equal(cyberMode({...defaults,cyberAllEnabled:true},'off'),'all');
 assert.equal(cyberMode({...defaults,cyberLogoEnabled:true},'all'),'all');
 for(const value of [null,undefined,'bogus',{},true])assert.equal(isCyberMode(value),false);
});
