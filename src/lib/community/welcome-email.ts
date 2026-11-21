import {emailBrand,emailPreheader} from './email-brand';
import template from './welcome-email-template.json';
import {welcomeUnsubscribeToken} from './welcome-unsubscribe';
export function renderWelcomeEmail(email:string){
 const token=welcomeUnsubscribeToken(email),url='https://www.quizletgravity.com/welcome/unsubscribe?token='+encodeURIComponent(token);
 const footer=`<p style="font-size:12px;line-height:1.6;color:#586380"><a href="${url}" style="color:#4255ff">Unsubscribe from welcome emails</a></p>`;
 // Append inside the existing card, keeping the approved invitation intact.
 const html=(emailPreheader('You’re part of the beginning.')+template.html.replace('__EMAIL_BRAND__',emailBrand)).replace(/(<\/td>\s*<\/tr>\s*<\/tbody>\s*<\/table>|<\/td>\s*<\/tr>\s*<\/table>)(\s*<\/td>\s*<\/tr>[\s\S]*)$/,footer+'$1$2');
 if(!html.includes(url))throw Error('Welcome footer could not be placed');
 return {subject:template.subject,html,text:template.text+'\n\nUnsubscribe from welcome emails: '+url,token};
}
export function welcomeEmailMime(email:string,id:string){
 if(!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email)||! /^[a-f0-9-]{36}$/i.test(id))throw Error('Invalid email envelope');
 const mail=renderWelcomeEmail(email),related='welcome_related_'+id,alternative='welcome_alt_'+id;
 const b64=(s:string)=>Buffer.from(s).toString('base64').match(/.{1,76}/g)!.join('\r\n');
 const lines=['From: Quizlet Gravity <quizletgravity@gmail.com>',`To: ${email}`,`Subject: ${mail.subject}`,`Message-ID: <welcome-${id}@quizletgravity.com>`,'Auto-Submitted: auto-generated',
  `List-Unsubscribe: <https://www.quizletgravity.com/api/welcome/unsubscribe?token=${encodeURIComponent(mail.token)}>`,
  'List-Unsubscribe-Post: List-Unsubscribe=One-Click','MIME-Version: 1.0',`Content-Type: multipart/related; boundary="${related}"`,'',
  '--'+related,`Content-Type: multipart/alternative; boundary="${alternative}"`,'',
  '--'+alternative,'Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',b64(mail.text),
  '--'+alternative,'Content-Type: text/html; charset=UTF-8','Content-Transfer-Encoding: base64','',b64(mail.html),'--'+alternative+'--'];
 for(const asset of template.assets)lines.push('--'+related,'Content-Type: image/png',`Content-ID: <${asset.cid}>`,`Content-Disposition: inline; filename="${asset.filename}"`,'Content-Transfer-Encoding: base64','',asset.data.match(/.{1,76}/g)!.join('\r\n'));
 lines.push('--'+related+'--','');return lines.join('\r\n');
}
