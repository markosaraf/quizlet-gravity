import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nextWelcomeRun,isWelcomeRun} from '../src/lib/community/welcome-schedule';
import {renderWelcomeEmail,welcomeEmailMime} from '../src/lib/community/welcome-email';
import {readWelcomeUnsubscribeToken,welcomeUnsubscribeToken,welcomeEmailHash} from '../src/lib/community/welcome-unsubscribe';
process.env.BETTER_AUTH_SECRET='unit-test-only-secret';
test('Tuesday at 13:09 Zurich across both DST transitions and after the deadline',()=>{
 for(const [now,expected] of [
  ['2026-11-22T10:00:00Z','2026-11-24T12:09:00.000Z'],
  ['2026-11-24T12:08:59Z','2026-11-24T12:09:00.000Z'],
  ['2026-11-24T12:09:00Z','2026-12-01T12:09:00.000Z'],
  ['2026-03-24T12:10:00Z','2026-03-31T11:09:00.000Z'],
  ['2026-10-20T11:10:00Z','2026-10-27T12:09:00.000Z'],
  ['2026-12-31T18:00:00Z','2027-01-05T12:09:00.000Z'],
 ])assert.equal(nextWelcomeRun(new Date(now)).toISOString(),expected);
});
test('queued jobs must match Tuesday 13:09 Zurich, rejecting former Saturday jobs',()=>{
 for(const scheduledFor of ['2026-11-24T12:09:00Z','2026-03-31T11:09:00Z','2026-10-27T12:09:00Z'])assert.equal(isWelcomeRun(scheduledFor),true);
 for(const scheduledFor of ['2026-11-28T12:09:00Z','2026-07-04T11:09:00Z','2026-11-24T11:09:00Z','2026-03-31T12:09:00Z','invalid'])assert.equal(isWelcomeRun(scheduledFor),false);
});
test('approved welcome includes image wordmark, preview text, three linked buttons and MIME images',()=>{
 const mail=renderWelcomeEmail('someone@example.com');
 assert(mail.text.startsWith('You’re part of the beginning.'));
 assert(mail.html.includes('email-wordmark-indigo.png'));
 assert(mail.html.indexOf('You’re part of the beginning.')<mail.html.indexOf('email-wordmark-indigo.png'));
 assert(!mail.html.includes('>Quizlet Gravity</td>'));
 assert(!mail.html.includes('googleusercontent.com'));
 assert(!mail.html.includes('Quizlet Gravity is already available for iPhone'));
 assert(mail.html.indexOf('Using an iPhone')<mail.html.indexOf('Try the Android app'));
 assert(mail.html.indexOf('I’d appreciate a rating on the App Store.')>mail.html.indexOf('Download on the App Store'));
 assert(mail.html.indexOf('I’d appreciate a rating on the App Store.')<mail.html.indexOf('Try the Android app'));
 assert(mail.html.includes('background-color:rgba(247,247,250,0.8)'));
 for(const icon of ['play.png','apple.png','google-play-badge.png'])assert(mail.html.includes('cid:welcome-'+icon));
 assert(mail.html.includes('Prefer not to receive invitations like this? Just reply and let me know.'));
 const mime=welcomeEmailMime('someone@example.com','12345678-1234-1234-1234-123456789012');
 assert.equal((mime.match(/Content-ID:/g)||[]).length,3);
 assert(mime.includes('List-Unsubscribe-Post: List-Unsubscribe=One-Click'));
 assert.throws(()=>welcomeEmailMime('a@example.com\r\nBcc: hidden@example.com','12345678-1234-1234-1234-123456789012'));
});
test('unsubscribe is signed, normalized and rejects tampering',()=>{
 const token=welcomeUnsubscribeToken(' PERSON@Example.com ');
 assert.equal(readWelcomeUnsubscribeToken(token),welcomeEmailHash('person@example.com'));
 assert.equal(readWelcomeUnsubscribeToken('x'+token),null);
 assert.equal(readWelcomeUnsubscribeToken(token+'.extra'),null);
});
