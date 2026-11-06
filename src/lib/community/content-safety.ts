// High-confidence abusive phrases. Reports and administrator review handle context
// and evasions; ordinary study vocabulary alone is not grounds for removal.
const abusive = /\b(?:kill yourself|go kill yourself|heil hitler|rape (?:you|her|him)|fuck you|fick dich)\b/iu;
export function containsAbuse(text:string){
 return abusive.test(text.normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g,'').replace(/\s+/g,' '));
}
export function assertShareable(title:string,cards:{term:string;definition:string}[]){
 if(containsAbuse(title)||cards.some(c=>containsAbuse(c.term)||containsAbuse(c.definition)))throw Error('This set contains abusive content and cannot be shared. Review the community rules.');
}
