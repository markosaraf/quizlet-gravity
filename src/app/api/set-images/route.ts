import {NextRequest, NextResponse} from 'next/server';
import sharp from 'sharp';
import {randomUUID} from 'node:crypto';
import {auth} from '@/lib/community/auth';
import {db} from '@/lib/community/db';
export const runtime='nodejs';
export const maxDuration=30;
const fail=(error:string,status:number)=>NextResponse.json({error},{status});
export async function POST(request:NextRequest){
 const origin=request.headers.get('origin');
 if(request.headers.get('sec-fetch-site')==='cross-site'||(origin&&origin!==request.nextUrl.origin))return fail('Open Quizlet Gravity to add images.',403);
 const session=await auth.api.getSession({headers:request.headers});
 if(!session)return fail('Choose a guest username or sign in before adding images.',401);
 if(!session.user.isAnonymous&&!session.user.emailVerified)return fail('Confirm your email before adding images.',403);
 if(!/^image\/(jpeg|png|webp|heic|heif)$/.test(request.headers.get('content-type')||''))return fail('Choose a JPG, PNG, WebP or HEIC image.',415);
 const reader=request.body?.getReader();if(!reader)return fail('Choose an image.',400);
 const chunks:Uint8Array[]=[];let length=0;
 try{
  while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>4*1024*1024){await reader.cancel();return fail('Choose an image smaller than 4 MB.',413);}chunks.push(value);}
 }finally{reader.releaseLock();}
 try{
  const image=await sharp(Buffer.concat(chunks),{limitInputPixels:24_000_000,animated:false}).rotate().resize({width:1200,height:1200,fit:'inside',withoutEnlargement:true}).webp({quality:82}).toBuffer();
  if(image.length>512*1024)return fail('Choose a smaller image.',413);
  // Serialize each uploader's quota check across serverless instances.
  const client=await db.connect();
  try{
   await client.query('BEGIN');
   await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['images:'+session.user.id]);
   const {rows}=await client.query(`SELECT count(*) FILTER(WHERE created_at>now()-interval '1 minute') recent,coalesce(sum(octet_length(data)),0) bytes FROM set_images WHERE owner_id=$1`,[session.user.id]);
   if(Number(rows[0].recent)>=15||Number(rows[0].bytes)+image.length>20*1024*1024){await client.query('ROLLBACK');return fail('Image upload limit reached. Please try again later or use fewer images.',429);}
   const id=randomUUID();
   await client.query('INSERT INTO set_images(id,owner_id,data) VALUES($1,$2,$3)',[id,session.user.id,image]);
   await client.query('COMMIT');
   return NextResponse.json({url:`/api/set-images/${id}`},{headers:{'Cache-Control':'no-store'}});
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }catch{return fail('Could not read that image. Try a JPG or PNG.',400);}
}
