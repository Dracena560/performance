import { AppFrame } from '@/components/app-frame';
import { FinanceSections } from '@/components/finance-sections';
import { personalData } from '@/lib/personal-data';
import { localDate } from '@/lib/domain';
import { readHoldings,isoWeek } from '@/lib/holdings';
import { ensureWeeklySnapshot,livePortfolio } from '@/lib/portfolio-data';
import { healthService,healthUserId,supabase } from '@/lib/supabase/server';
export const dynamic='force-dynamic';
export default async function Page(){
 let profile=await personalData();let holdings=readHoldings(profile.personal_holdings);
 // The weekly snapshot is also taken on the first visit of the week, in case the cron did not run.
 if(holdings.some(h=>h.active)&&!(profile.personal_investments??[]).some((s:{id:string})=>s.id===`auto-${isoWeek(new Date())}`)){
  try{const session=await supabase();const {data:{user}}=await session.auth.getUser();const r=await ensureWeeklySnapshot(healthUserId()?healthService():session,healthUserId()??user!.id);if(r.created){profile=await personalData();holdings=readHoldings(profile.personal_holdings);}}catch{/* prices unavailable now; try again later */}
 }
 const live=holdings.length?await livePortfolio(holdings).catch(()=>null):null;
 return <AppFrame title="Financeiro"><div className="content"><FinanceSections finance={profile.personal_finance} investments={profile.personal_investments??[]} creditCard={profile.personal_credit_card} car={profile.personal_car} today={localDate()} holdings={holdings} liveRows={live?.rows??[]} liveAt={live?.updatedAt??null}/></div></AppFrame>;
}
