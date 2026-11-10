import {normalizeQuizletUrl} from './quizlet-parser';

/** Manual admin input only. No discovery requests or Quizlet login are needed. */
export function parseQuizletBulkLinks(text:string){
 if(!text.trim())throw new Error('Paste at least one Quizlet set link.');
 if(text.length>100000)throw new Error('Please split this list into smaller batches.');
 const tokens=text.trim().split(/\s+/);
 const sets=new Map<string,{setId:string;url:string}>();
 for(const [index,token] of tokens.entries()){
  try{
   const set=normalizeQuizletUrl(token.replace(/[.,;]+$/,''));
   sets.set(set.setId,set);
  }catch{throw new Error(`Link ${index+1} is not a valid Quizlet set link. Paste set links only, separated by spaces or new lines.`);}
 }
 return {sets:[...sets.values()],duplicates:tokens.length-sets.size};
}
