import type {Pool} from 'pg';
import type {Card} from './sets';

// A stable per-game fingerprint marks owner edits, so reimports cannot replace them.
export const quizletImportUpdate = `cards=CASE WHEN shared_sets.fingerprint LIKE 'edited:%' THEN shared_sets.cards ELSE EXCLUDED.cards END,
 term_count=CASE WHEN shared_sets.fingerprint LIKE 'edited:%' THEN shared_sets.term_count ELSE EXCLUDED.term_count END,
 import_version=2`;

export async function updateOwnedSet(database:Pick<Pool,'query'>,id:string,owner:string,input:{title:string;cards:Card[];revision:string}){
 const {rows}=await database.query(`UPDATE shared_sets SET title=$3,cards=$4,term_count=$5,fingerprint='edited:'||id::text
 WHERE id=$1 AND created_by=$2 AND updated_at=$6::timestamptz
 RETURNING id,public_id,title,source_url`,[id,owner,input.title,JSON.stringify(input.cards),input.cards.length,input.revision]);
 if(rows[0])return {set:rows[0],status:200};
 const exists=await database.query('SELECT 1 FROM shared_sets WHERE id=$1 AND created_by=$2',[id,owner]);
 return exists.rows.length
  ?{error:'This game changed since you opened it. Reload the page before editing again.',status:409}
  :{error:'Game not found or you do not own it.',status:404};
}

export async function deleteOwnedSet(database:Pick<Pool,'query'>,id:string,owner:string){
 // Existing foreign keys remove the game's runs, leaderboard and notifications together.
 const {rows}=await database.query('DELETE FROM shared_sets WHERE id=$1 AND created_by=$2 RETURNING id',[id,owner]);
 return rows.length>0;
}
