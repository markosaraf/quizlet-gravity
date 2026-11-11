import {test} from 'node:test';
import assert from 'node:assert/strict';
import {displayPlayerName,normalizePlayerName,validPlayerName} from '../src/lib/community/usernames.ts';
test('player names support real names and existing handles',()=>{
 for(const name of ['Emilia Dürig','Marko Šarafijanović','Anne-Marie','O’Connor','player_23','user.name','李明华'])assert(validPlayerName(name),name);
 for(const name of ['name\nother','name\tother','<script>','user/name','hidden\u200bname'])assert(!validPlayerName(name),name);
});
test('canonical names preserve accents and unify case, spacing and composed spelling',()=>{
 assert.equal(normalizePlayerName(' Emilia  Du\u0308rig '),'emilia dürig');
 assert.equal(normalizePlayerName('EMILIA DÜRIG'),'emilia dürig');
 assert.equal(displayPlayerName(' Emilia  Du\u0308rig '),'Emilia Dürig');
});

test('blank and invisible names cannot be saved or used to complete registration',async()=>{
 const {validNameForSaving,requiresPlayerName,invalidNameWrite}=await import('../src/lib/community/usernames.ts');
 for(const name of [undefined,null,'','   ','\t\n','\u200b\u200b\u200b','\u3164\u3164\u3164','\u115f\u1160','\u0301\u0301\u0301','...','___']) {
  assert(!validNameForSaving(name),JSON.stringify(name));
  assert(invalidNameWrite('/sign-up/email',{username:name}));
  assert(invalidNameWrite('/update-user',{username:name}));
  assert(invalidNameWrite('/update-user',{displayUsername:name}));
 }
 assert(invalidNameWrite('/sign-up/email',{}));
 assert(!invalidNameWrite('/update-user',{image:'https://example.com/photo.png'}));
 assert(!invalidNameWrite('/callback/google',{}));
 assert(!invalidNameWrite('/sign-up/email',{username:' Emilia Dürig '}));
 assert(!validNameForSaving('a'));
 assert(!validNameForSaving('a'.repeat(25)));
 assert(requiresPlayerName({username:null}));
 assert(requiresPlayerName({username:'\u3164\u3164\u3164'}));
 assert(requiresPlayerName({username:'Marko',displayUsername:'   '}));
 assert(!requiresPlayerName({username:'Marko',displayUsername:'Marko'}));
 assert(!requiresPlayerName({username:'Marko',displayUsername:null}));
 assert(!requiresPlayerName({isAnonymous:true,username:null}));
 assert(!requiresPlayerName(null));
});
