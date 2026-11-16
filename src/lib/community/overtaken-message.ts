import {sharedSetPath} from './set-links';

export type OvertakenGame={id:string;public_id:string;title:string;source_url?:string|null};
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const origin='https://www.quizletgravity.com';

export function overtakenMessage(opponent:string,game:OvertakenGame){
 return {title:'You’ve been overtaken!',body:`${opponent} has overtaken you in “${game.title}”. Earn your place back!`,url:origin+sharedSetPath(game)};
}

export function renderOvertakenEmail(opponent:string,game:OvertakenGame,{preview=false,unsubscribeUrl}:{preview?:boolean;unsubscribeUrl?:string}={}){
 const message=overtakenMessage(opponent,game),url=escape(message.url);
 const image=origin+'/api/game-preview/'+encodeURIComponent(game.id)+'?style=site-card-v2';
 const background=origin+'/assets/gravity/intro-bg@2x.jpg';
 const subject=(preview?'[Design preview] ':'')+opponent+' has overtaken you — Quizlet Gravity';
 const footer=preview?'Design preview only — this is an example notification.':`You received this because another player overtook your best score.${unsubscribeUrl?' You can turn off leaderboard emails at any time.':''}`;
 const text=`${message.body}\n\nPlay ${game.title}: ${message.url}\n\n${footer}${unsubscribeUrl?'\nUnsubscribe: '+unsubscribeUrl:''}`;
 const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#2e384f;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" background="${background}" style="background-color:#2e384f;background-image:url('${background}');background-position:center bottom;background-size:cover;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;"><tr><td style="padding:16px 24px;background:#4255b4;border-radius:8px 8px 0 0;">
<table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="padding-right:12px;"><img src="${origin}/brand-q-original-gold-thick-transparent.png" width="44" height="44" alt="" style="display:block;border:0;"></td><td style="font-size:24px;font-weight:bold;color:#ffffff;">Quizlet Gravity</td></tr></table>
</td></tr><tr><td style="padding:4px 28px 24px;background-color:#eeeeee;background-color:rgba(255,255,255,.90);border-radius:0 0 8px 8px;">
<h1 style="font-size:29px;line-height:1.2;margin:28px 0 14px;">You’ve been overtaken!</h1>
<p style="font-size:17px;line-height:1.6;margin:0 0 22px;"><strong>${escape(opponent)}</strong> has overtaken you on the leaderboard. Ready to earn your place back?</p>
<a href="${url}" style="display:block;text-decoration:none;"><img src="${image}" alt="${escape(game.title)} — open this game" width="504" style="width:100%;max-width:504px;height:auto;display:block;border:0;border-radius:10px;"></a>
<h2 style="font-size:20px;line-height:1.4;margin:18px 0 8px;"><a href="${url}" style="color:#1a1a1a;text-decoration:none;">${escape(game.title)}</a></h2>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0 28px;"><tr><td bgcolor="#d4af37" style="border-radius:7px;"><a href="${url}" style="display:inline-block;padding:15px 23px;color:#151515;text-decoration:none;font-size:17px;font-weight:bold;border:1px solid #d4af37;border-radius:7px;">Earn your place back →</a></td></tr></table>
<p style="font-size:12px;line-height:1.6;margin:0;color:#687089;">${escape(footer)}${unsubscribeUrl?` <a href="${escape(unsubscribeUrl)}" style="color:#4255b4;">Turn off these emails</a>`:''}</p>
</td></tr></table></td></tr></table></body></html>`;
 return {subject,text,html,...message};
}
