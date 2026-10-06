import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchQuote,liveRows,ratesToGBP,readHoldings,weeklySnapshot,type Holding,type Quote } from './holdings';
import { investmentsSchema } from './investments';
import { updateProfile } from './profile-store';

/** Prices every active holding now (cached ~5 min by fetch) and returns rows in pounds. */
export async function livePortfolio(holdings:Holding[]){
 const active=holdings.filter(h=>h.active);
 const quotes=Object.fromEntries(await Promise.all(active.map(async h=>[h.id,await fetchQuote(h)] as [string,Quote|null])));
 const rates=await ratesToGBP([...active.map(h=>h.currency),...Object.values(quotes).flatMap(q=>q?[q.currency]:[])]);
 return {rows:liveRows(active,quotes,rates),rates,updatedAt:new Date().toISOString()};
}
/** Appends this week's snapshot when it is missing (page visit or the weekly cron). */
export async function ensureWeeklySnapshot(db:SupabaseClient,userId:string,now=new Date()){
 const result=await db.from('health_profiles').select('profile').eq('user_id',userId).maybeSingle();if(result.error)throw new Error('Falha ao ler a carteira.');
 const holdings=readHoldings(result.data?.profile?.personal_holdings);if(!holdings.some(h=>h.active))return {created:false,reason:'Sem ativos'};
 const live=await livePortfolio(holdings);let outcome={created:false,id:''};
 await updateProfile(db,userId,profile=>{const history=investmentsSchema.parse(profile.personal_investments??[]);const r=weeklySnapshot(history,readHoldings(profile.personal_holdings),live.rows,live.rates,now);outcome={created:r.created,id:r.id};return r.created?{...profile,personal_investments:r.history}:profile;});
 return outcome;
}
