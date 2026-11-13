import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderAccountEmail, accountEmailMime } from '../src/lib/community/account-email';
const mail = {subject:'Confirm your Quizlet Gravity email',heading:'Confirm your email',message:'Activate your account.',action:'Confirm email',url:'https://www.quizletgravity.com/api/auth/verify-email?token=example&callbackURL=%2F', detail:'Expires in one hour.',username:'Emilia <img src=x>'};
test('account email keeps a readable plaintext alternative and safely escapes HTML',()=>{
 const {text,html}=renderAccountEmail(mail);
 assert.ok(text.includes(mail.url));assert.ok(text.includes(mail.username));
 assert.ok(html.includes('Emilia &lt;img src=x&gt;'));assert.ok(!html.includes('<img src=x>'));
 assert.ok(html.includes('intro-bg@2x.jpg'));assert.ok(html.includes('brand-q-original-gold-thick-transparent.png'));
 assert.ok(html.includes('bgcolor="#d4af37"'));assert.ok(html.includes('background-color:#f7f7fa'));
 assert.ok(html.includes('token=example&amp;callbackURL='));
});
test('MIME contains UTF-8 HTML and text alternatives with intact links',()=>{
 const mime=accountEmailMime('example@example.test',mail,'test_boundary');
 const parts=mime.split('--test_boundary');
 assert.equal(parts.length,4);
 for(const [index,type]of [[1,'text/plain'],[2,'text/html']] as const){
  assert.ok(parts[index].includes(type));
  const decoded=Buffer.from(parts[index].split('\r\n\r\n')[1].trim(),'base64').toString();
  assert.equal(decoded,index===1?renderAccountEmail(mail).text:renderAccountEmail(mail).html);
 }
 assert.throws(()=>accountEmailMime('x\r\nBcc: bad@example.test',mail,'test_boundary'));
 assert.throws(()=>renderAccountEmail({...mail,url:'javascript:alert(1)'}));
});
