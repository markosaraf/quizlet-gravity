/** Shared, email-client-friendly account message. No scripts or tracking pixels. */
export type AccountEmail = { subject: string; heading: string; message: string; action: string; url: string; detail: string; username?: string };
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
export function renderAccountEmail(mail: AccountEmail) {
  const url = new URL(mail.url);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid account link');
  const link = escapeHtml(url.href);
  const text = `${mail.message}${mail.username ? `\n\nYour username: ${mail.username}` : ''}\n\n${mail.action}:\n${mail.url}\n\n${mail.detail}`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(mail.subject)}</title></head>
<body style="margin:0;padding:0;background-color:#070c22;color:#1a1a1a;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#070c22;"><tr><td align="center" background="https://www.quizletgravity.com/assets/gravity/intro-bg@2x.jpg" style="background-color:#070c22;background-image:url('https://www.quizletgravity.com/assets/gravity/intro-bg@2x.jpg');background-position:center center;background-size:cover;padding:64px 24px 96px;">
<!--[if gte mso 9]><v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;"><v:fill type="frame" src="https://www.quizletgravity.com/assets/gravity/intro-bg@2x.jpg" color="#070c22"/><v:textbox style="mso-fit-shape-to-text:true" inset="20px,48px,20px,72px"><![endif]-->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;background-color:#f7f7fa;border:1px solid #dadce5;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.2);"><tr><td style="padding:32px 28px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="padding-right:12px;"><img src="https://www.quizletgravity.com/email-q-gold.png" width="40" height="40" alt="Q" style="display:block;border:0;"></td><td style="font-size:22px;font-weight:700;color:#4257b2;">Quizlet Gravity</td></tr></table>
<h1 style="font-size:26px;line-height:1.25;margin:28px 0 16px;color:#1a1a1a;">${escapeHtml(mail.heading)}</h1>
<p style="font-size:16px;line-height:1.6;margin:0 0 16px;">${escapeHtml(mail.message)}</p>
${mail.username ? `<p style="font-size:16px;line-height:1.6;margin:0 0 20px;">Your username: <strong>${escapeHtml(mail.username)}</strong></p>` : ''}
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;"><tr><td bgcolor="#d4af37" style="border-radius:6px;mso-padding-alt:14px 22px;"><a href="${link}" style="display:inline-block;background-color:#d4af37;border:1px solid #d4af37;border-radius:6px;padding:14px 22px;color:#151515;font-size:16px;font-weight:700;text-decoration:none;">${escapeHtml(mail.action)}</a></td></tr></table>
<p style="font-size:14px;line-height:1.6;margin:0 0 20px;color:#586380;">${escapeHtml(mail.detail)}</p>
<p style="font-size:12px;line-height:1.5;margin:0;color:#586380;">If the button doesn’t open, copy this link into your browser:</p><p style="font-size:12px;line-height:1.5;margin:8px 0 0;overflow-wrap:anywhere;word-break:break-all;"><a href="${link}" style="color:#4257b2;">${link}</a></p>
</td></tr></table>
<!--[if gte mso 9]></v:textbox></v:rect><![endif]-->
</td></tr></table></body></html>`;
  return { text, html };
}
export function accountEmailMime(email: string, mail: AccountEmail, boundary: string) {
  if (/[\r\n]/.test(email + mail.subject) || !/^[a-zA-Z0-9_-]+$/.test(boundary)) throw new Error('Invalid email header');
  const {text, html} = renderAccountEmail(mail);
  const base64 = (value:string) => Buffer.from(value).toString('base64').match(/.{1,76}/g)!.join('\r\n');
  return ['From: Quizlet Gravity <quizletgravity@gmail.com>', `To: ${email}`, `Subject: ${mail.subject}`, 'MIME-Version: 1.0', `Content-Type: multipart/alternative; boundary="${boundary}"`, '', `--${boundary}`, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', base64(text), `--${boundary}`, 'Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', base64(html), `--${boundary}--`, ''].join('\r\n');
}
