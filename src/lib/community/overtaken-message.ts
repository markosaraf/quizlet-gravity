import {sharedSetPath} from './set-links';
import {emailBrand,emailPreheader} from './email-brand';

export type OvertakenGame={id:string;public_id:string;title:string;source_url?:string|null};
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const origin='https://www.quizletgravity.com';

export function overtakenMessage(opponent:string,game:OvertakenGame,open?:{id:string;token?:string}){
 return {title:'You’ve been overtaken!',body:`${opponent} has overtaken you in “${game.title}”. Earn your place back!`,url:origin+sharedSetPath(game)+(open?'?notification='+encodeURIComponent(open.id)+(open.token?'&notificationToken='+encodeURIComponent(open.token):''):'')};
}

export function renderOvertakenEmail(opponent:string,game:OvertakenGame,{unsubscribeUrl,open}:{unsubscribeUrl:string;open?:{id:string;token?:string}}){
 if(!unsubscribeUrl||new URL(unsubscribeUrl).origin!==origin)throw Error('Leaderboard emails require a working opt-out link');
 const message=overtakenMessage(opponent,game,open),url=escape(message.url);
 const image=origin+'/api/game-preview/'+encodeURIComponent(game.id)+'?style=site-card-v2';
 const background=origin+'/assets/gravity/intro-bg@2x.jpg';
 const subject=opponent+' has overtaken you — Quizlet Gravity';
 const footer='You received this because another player overtook your best score.';
 const text=`${message.body}\n\nPlay ${game.title}: ${message.url}\n\n${footer}\nTurn off leaderboard emails: ${unsubscribeUrl}`;
 const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#2e384f;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;">
${emailPreheader(message.body)}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" background="${background}" style="background-color:#2e384f;background-image:url('${background}');background-position:center bottom;background-size:cover;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#f7f7fa;background-color:rgba(247,247,250,0.8);border:1px solid #dadce5;border-radius:12px;"><tr><td style="padding:32px 28px;">
${emailBrand}
<h1 style="font-size:29px;line-height:1.2;margin:28px 0 14px;">You’ve been overtaken!</h1>
<p style="font-size:17px;line-height:1.6;margin:0 0 22px;"><strong>${escape(opponent)}</strong> has overtaken you on the leaderboard. Ready to earn your place back?</p>
<a href="${url}" style="display:block;text-decoration:none;"><img src="${image}" alt="${escape(game.title)} — open this game" width="504" style="width:100%;max-width:504px;height:auto;display:block;border:0;border-radius:10px;"></a>
<h2 style="font-size:20px;line-height:1.4;margin:18px 0 8px;"><a href="${url}" style="color:#1a1a1a;text-decoration:none;">${escape(game.title)}</a></h2>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0 28px;"><tr><td bgcolor="#d4af37" style="border-radius:7px;"><a href="${url}" style="display:inline-block;padding:15px 23px;color:#151515;text-decoration:none;font-size:17px;font-weight:bold;border:1px solid #d4af37;border-radius:7px;">Earn your place back →</a></td></tr></table>
<p style="font-size:12px;line-height:1.6;margin:0;color:#687089;">${escape(footer)}</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:14px 0 0;"><tr><td style="border:1px solid #c5c9d9;border-radius:6px;"><a href="${escape(unsubscribeUrl)}" style="display:inline-block;padding:12px 16px;color:#4255ff;text-decoration:none;font-size:14px;font-weight:bold;border-radius:6px;">Turn off leaderboard emails</a></td></tr></table>
</td></tr></table></td></tr></table></body></html>`;
 return {subject,text,html,...message};
}
