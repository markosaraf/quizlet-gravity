import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { auth } from '@/lib/community/auth';
import { isAdmin } from '@/lib/community/admin';
import { processGameIndexing } from '@/lib/community/game-indexing';
export const runtime='nodejs';
export const maxDuration=60;
function cronAuthorized(request: NextRequest) {
 const expected=process.env.CRON_SECRET;
 const supplied=request.headers.get('authorization');
 if(!expected||!supplied)return false;
 const a=Buffer.from(supplied),b=Buffer.from(`Bearer ${expected}`);
 return a.length===b.length&&timingSafeEqual(a,b);
}
export async function GET(request: NextRequest) {
 if(!cronAuthorized(request))return NextResponse.json({error:'Unauthorized'},{status:401});
 const result=await processGameIndexing();
 return NextResponse.json(result,{status:'failed' in result?502:200,headers:{'Cache-Control':'no-store'}});
}
export async function POST(request: NextRequest) {
 if(request.headers.get('origin')!==request.nextUrl.origin||request.headers.get('sec-fetch-site')==='cross-site')return NextResponse.json({error:'Origin not allowed'},{status:403});
 const session=await auth.api.getSession({headers:request.headers});
 if(!session||session.user.isAnonymous||!await isAdmin(session.user.id))return NextResponse.json({error:'Administrator access required.'},{status:403});
 const result=await processGameIndexing();
 return NextResponse.json(result,{status:'failed' in result?502:200,headers:{'Cache-Control':'no-store'}});
}
