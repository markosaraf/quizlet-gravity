import {NextResponse} from 'next/server';
import {db} from '@/lib/community/db';
export const runtime='nodejs';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(id))return new NextResponse(null,{status:404});
 const {rows}=await db.query('SELECT data FROM set_images WHERE id=$1',[id]);
 if(!rows[0])return new NextResponse(null,{status:404});
 return new NextResponse(new Uint8Array(rows[0].data),{headers:{'Content-Type':'image/webp','Cache-Control':'public,max-age=31536000,immutable','X-Content-Type-Options':'nosniff'}});
}
