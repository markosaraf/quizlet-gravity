export interface ChallengeShare {title:string;text:string;url:string}

/** Share only public paths. Never forward notification tokens or sign-in parameters. */
export function publicGameLink(path:string):string {
 return 'https://www.quizletgravity.com'+(isPublicGamePath(path)?path:'/');
}
function isPublicGamePath(path:string):boolean {
 return /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?[0-9]{1,20}\/[^/?#]+-flash-cards\/?$/i.test(path)
  || /^\/sets\/[0-9a-f-]{36}\/?$/i.test(path) || path==='/example';
}
export function challengeShare(title:string,points:number,path:string):ChallengeShare {
 const publicGame=isPublicGamePath(path);
 return {
  title:'Challenge me on Quizlet Gravity',
  text:publicGame?`I scored ${points.toLocaleString('en-US')} points in “${title.slice(0,200)}” on Quizlet Gravity. Can you beat my score?`:
   `I scored ${points.toLocaleString('en-US')} points on Quizlet Gravity. Try a game and challenge yourself!`,
  url:publicGameLink(path),
 };
}

export function nativeShareHref(share:ChallengeShare){
 return '/native/share?'+new URLSearchParams({...share}).toString();
}

export function shareLinks(share:ChallengeShare,appleDevice:boolean){
 const text=encodeURIComponent(share.text+' '+share.url),url=encodeURIComponent(share.url);
 return [
  {name:'WhatsApp',icon:'whatsapp',href:`https://wa.me/?text=${text}`},
  {name:'Viber',icon:'viber',href:`viber://forward?text=${text}`},
  {name:'X',icon:'x',href:`https://x.com/intent/tweet?text=${encodeURIComponent(share.text)}&url=${url}`},
  {name:'Telegram',icon:'telegram',href:`https://t.me/share/url?url=${url}&text=${encodeURIComponent(share.text)}`},
  {name:'Messages',icon:'messages',href:`sms:${appleDevice?'&':'?'}body=${text}`},
  {name:'Email',icon:'email',href:`mailto:?subject=${encodeURIComponent(share.title)}&body=${text}`},
  {name:'LinkedIn',icon:'linkedin',href:`https://www.linkedin.com/sharing/share-offsite/?url=${url}`},
 ];
}
