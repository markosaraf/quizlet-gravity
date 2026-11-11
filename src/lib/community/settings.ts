import {db} from './db';

export async function communitySettings(){
 const {rows}=await db.query("SELECT key,enabled FROM community_settings WHERE key=ANY($1::text[])",[['tutorial','special_letters','special_characters','game_page_total']]);
 const values=new Map<string,boolean>(rows.map(row=>[row.key,row.enabled]));
 return {
  gamePageTotalEnabled:values.get('game_page_total')!==false,
  tutorialEnabled:values.get('tutorial')!==false,
  specialLettersEnabled:values.get('special_letters')!==false,
  specialCharactersEnabled:values.get('special_characters')!==false,
 };
}
