import {db} from './db';

export async function communitySettings(){
 const {rows}=await db.query("SELECT key,enabled FROM community_settings WHERE key=ANY($1::text[])",[['cyber_non_quizlet','cyber_logo','cyber_all','tutorial','special_letters','special_characters','game_page_total','quizlet_search','challenge_share','startup_header_blue','midpoint_header_blue']]);
 const values=new Map<string,boolean>(rows.map(row=>[row.key,row.enabled]));
 return {
  cyberNonQuizletEnabled:values.get('cyber_non_quizlet')===true,
  cyberLogoEnabled:values.get('cyber_logo')===true,
  cyberAllEnabled:values.get('cyber_all')===true,
  midpointHeaderBlueEnabled:values.get('midpoint_header_blue')===true,
  startupHeaderBlueEnabled:values.get('startup_header_blue')!==false,
  challengeShareEnabled:values.get('challenge_share')!==false,
  quizletSearchEnabled:values.get('quizlet_search')!==false,
  gamePageTotalEnabled:values.get('game_page_total')!==false,
  tutorialEnabled:values.get('tutorial')!==false,
  specialLettersEnabled:values.get('special_letters')!==false,
  specialCharactersEnabled:values.get('special_characters')!==false,
 };
}
