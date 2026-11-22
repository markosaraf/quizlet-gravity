const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Zurich',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
function parts(date:Date){return Object.fromEntries(formatter.formatToParts(date).map(p=>[p.type,p.value]));}
/** Next Tuesday, 13:09 in Zurich, independently of the server's timezone. */
export function nextWelcomeRun(now=new Date()){
 const local=parts(now),day=new Date(Date.UTC(Number(local.year),Number(local.month)-1,Number(local.day)));
 day.setUTCDate(day.getUTCDate()+(2-day.getUTCDay()+7)%7);
 function atTime(){
  const guess=new Date(day.getTime()+13*3600000+9*60000),zoned=parts(guess);
  const offset=Date.UTC(Number(zoned.year),Number(zoned.month)-1,Number(zoned.day),Number(zoned.hour),Number(zoned.minute))-guess.getTime();
  return new Date(guess.getTime()-offset);
 }
 let result=atTime();if(result.getTime()<=now.getTime()){day.setUTCDate(day.getUTCDate()+7);result=atTime();}
 return result;
}

/** Reject jobs queued under an obsolete schedule, including the former Saturday run. */
export function isWelcomeRun(scheduledFor:string){
 const time=Date.parse(scheduledFor);
 return Number.isFinite(time)&&nextWelcomeRun(new Date(time-1)).getTime()===time;
}
