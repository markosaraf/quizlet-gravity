import {db} from './db';
export async function tutorialEnabled():Promise<boolean>{
 const {rows}=await db.query("SELECT enabled FROM community_settings WHERE key='tutorial'");
 return rows[0]?.enabled!==false;
}
