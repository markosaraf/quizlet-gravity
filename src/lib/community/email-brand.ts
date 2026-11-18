/** Decorative branding stays out of inbox snippets; the message is the preview. */
export const emailBrand = `<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="padding-right:12px;"><img src="https://www.quizletgravity.com/brand-q-original-gold-thick-transparent.png" width="40" height="40" alt="" style="display:block;border:0;"></td><td><img src="https://www.quizletgravity.com/email-wordmark-indigo.png" width="158" height="28" alt="" style="display:block;border:0;max-width:100%;height:auto;"></td></tr></table>`;

export function emailPreheader(text:string){
 const safe=text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
 return `<div style="display:none;font-size:1px;line-height:1px;color:transparent;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${safe}${'&#8204;&nbsp;'.repeat(90)}</div>`;
}
