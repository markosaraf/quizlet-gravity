import {containsAbuse} from './content-safety.ts';
// Keep display spelling while using a consistent, case-insensitive login name.
export function displayPlayerName(value:string) {
 return value.normalize('NFC').replace(/^ +| +$/g,'').replace(/ +/g,' ');
}
export function normalizePlayerName(value:string) {
 return displayPlayerName(value).toLowerCase().normalize('NFC');
}
const allowedName = new RegExp("^[\\p{L}\\p{M}\\p{N} ._'’\\-]+$",'u');
export function validPlayerName(value:string) {
 return hasVisiblePlayerName(value)&&allowedName.test(value)&&!containsAbuse(value);
}

// Default-ignorable Unicode characters include apparently blank letters such as
// Hangul fillers. Combining marks alone do not make a visible player name.
export function hasVisiblePlayerName(value:unknown):value is string {
 return typeof value==='string' && /[\p{L}\p{N}]/u.test(value.replace(/[\p{Default_Ignorable_Code_Point}\p{M}\s]/gu,''));
}
export function requiresPlayerName(user:{isAnonymous?:boolean|null;username?:string|null;displayUsername?:string|null}|null|undefined) {
 return !!user && !user.isAnonymous && (!hasVisiblePlayerName(user.username) || (user.displayUsername!=null && !hasVisiblePlayerName(user.displayUsername)));
}
export function validNameForSaving(value:unknown):value is string {
 if(typeof value!=='string') return false;
 const name=displayPlayerName(value);
 return name.length>=3 && name.length<=24 && validPlayerName(name);
}
export function invalidNameWrite(path:string,body:Record<string,unknown>|undefined) {
 if(path==='/sign-up/email') return !validNameForSaving(body?.username) || (body?.displayUsername!==undefined && !validNameForSaving(body.displayUsername));
 if(path==='/update-user') return ['username','displayUsername'].some(key=>body && Object.hasOwn(body,key) && !validNameForSaving(body[key]));
 return false;
}
