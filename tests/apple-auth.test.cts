import assert from 'node:assert/strict';
import {test} from 'node:test';
import {generateKeyPair,exportPKCS8,jwtVerify} from 'jose';
import {appleClientSecret,revokeAppleAccess} from '../src/lib/community/apple';

test('Apple client secret uses the configured identity and revocation fails closed', async()=>{
 const originalEnv={...process.env},originalFetch=globalThis.fetch;
 try {
  const {privateKey,publicKey}=await generateKeyPair('ES256',{extractable:true});
  Object.assign(process.env,{APPLE_CLIENT_ID:'test.service',APPLE_TEAM_ID:'TESTTEAM',APPLE_KEY_ID:'TESTKEY',APPLE_PRIVATE_KEY:await exportPKCS8(privateKey)});
  const secret=await appleClientSecret();
  const {payload,protectedHeader}=await jwtVerify(secret,publicKey,{issuer:'TESTTEAM',audience:'https://appleid.apple.com',subject:'test.service'});
  assert.equal(protectedHeader.kid,'TESTKEY');assert.equal(payload.exp!-payload.iat!,30*86400);
  let calls=0;
  globalThis.fetch=async(input,options)=>{
   calls++;assert.equal(input,'https://appleid.apple.com/auth/revoke');
   const body=options!.body as URLSearchParams;
   assert.equal(body.get('client_id'),'test.service');assert.equal(body.get('token'),'test-refresh');assert.equal(body.get('token_type_hint'),'refresh_token');
   await jwtVerify(body.get('client_secret')!,publicKey);
   return new Response(null,{status:200});
  };
  const client={query:async()=>({rows:[{refreshToken:'test-refresh',accessToken:'test-access'}]})} as any;
  await revokeAppleAccess(client,'test-user');assert.equal(calls,1);
  globalThis.fetch=async()=>new Response(null,{status:503});
  await assert.rejects(()=>revokeAppleAccess(client,'test-user'),/could not be revoked/);
  await assert.rejects(()=>revokeAppleAccess({query:async()=>({rows:[{}]})} as any,'test-user'),/renewed/);
  globalThis.fetch=async()=>{throw Error('Network must not be used for non-Apple users');};
  await revokeAppleAccess({query:async()=>({rows:[]})} as any,'other-user');
 }finally{globalThis.fetch=originalFetch;process.env=originalEnv;}
});
