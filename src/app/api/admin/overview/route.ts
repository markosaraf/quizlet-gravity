import {NextRequest,NextResponse} from 'next/server';
import {auth} from '@/lib/community/auth';
import {isAdmin} from '@/lib/community/admin';
import {adminOverview} from '@/lib/community/admin-overview';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest){
 const headers={'Cache-Control':'private, no-store'};
 const session=await auth.api.getSession({headers:request.headers});
 if(!session||session.user.isAnonymous||!await isAdmin(session.user.id))return NextResponse.json({error:'Administrator access required.'},{status:403,headers});
 const value=request.nextUrl.searchParams.get('days')||'1';
 if(!['1','7','30'].includes(value))return NextResponse.json({error:'Choose 1, 7 or 30 days.'},{status:400,headers});
 try{return NextResponse.json(await adminOverview(Number(value) as 1|7|30),{headers});}
 catch{return NextResponse.json({error:'Unable to load the overview. Please retry.'},{status:500,headers});}
}
