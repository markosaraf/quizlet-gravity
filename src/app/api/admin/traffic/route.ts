import {NextRequest,NextResponse} from 'next/server';
import {auth} from '@/lib/community/auth';
import {isAdmin} from '@/lib/community/admin';
import {vercelAnalytics} from '@/lib/community/vercel-analytics';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest){
 const headers={'Cache-Control':'private, no-store'};
 const session=await auth.api.getSession({headers:request.headers});
 if(!session||session.user.isAnonymous||!await isAdmin(session.user.id))return NextResponse.json({error:'Administrator access required.'},{status:403,headers});
 const days=request.nextUrl.searchParams.get('days')||'7';
 if(!['1','7','30'].includes(days))return NextResponse.json({error:'Choose 1, 7 or 30 days.'},{status:400,headers});
 try{return NextResponse.json(await vercelAnalytics(Number(days) as 1|7|30),{headers});}
 catch(error){const message=error instanceof Error&&error.message.startsWith('Vercel Analytics')?error.message:'Vercel Analytics is temporarily unavailable.';return NextResponse.json({error:message},{status:503,headers});}
}
