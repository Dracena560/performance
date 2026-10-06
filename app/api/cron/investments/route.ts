import { NextResponse } from 'next/server';
import { healthService, healthUserId } from '@/lib/supabase/server';
import { ensureWeeklySnapshot } from '@/lib/portfolio-data';
export const runtime='nodejs';
export const dynamic='force-dynamic';
/** Weekly investment snapshot (Vercel Cron, Mondays). Protected by CRON_SECRET. */
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET;
 if(!secret||request.headers.get('authorization')!==`Bearer ${secret}`)return NextResponse.json({error:'unauthorized'},{status:401});
 const userId=healthUserId();if(!userId)return NextResponse.json({error:'HEALTH_GPT_USER_ID ausente'},{status:500});
 try{return NextResponse.json(await ensureWeeklySnapshot(healthService(),userId));}catch(e){return NextResponse.json({error:(e as Error).message},{status:500});}
}
