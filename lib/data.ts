import { reminders } from './life';
import { readExams } from './exams';
import { initialFinance } from './personal';
import { initialCreditCard } from './credit-card';
import { redirect } from 'next/navigation';
import { configured,supabase,healthService,healthUserId } from './supabase/server';
import { localDate, type HealthEvent,type Food,type TargetTemplate,type MealTemplate,type Day } from './domain';
export async function loadData(date?:string){
 if(!configured())redirect('/login'); const db=await supabase();const {data:{user}}=await db.auth.getUser();if(!user)redirect('/login');
 const healthUser=healthUserId()??user.id; const healthDb=healthUserId()?healthService():db;
 const selected=date&&/^\d{4}-\d{2}-\d{2}$/.test(date)?date:localDate();
 const results=await Promise.all([
 healthDb.from('events').select('*').eq('user_id',healthUser).eq('local_date',selected).order('timestamp'),
 healthDb.from('events').select('*').eq('user_id',healthUser).gte('local_date',`${selected.slice(0,4)}-01-01`).lte('local_date',selected).order('local_date'),
 healthDb.from('foods').select('*').eq('user_id',healthUser).order('name'),healthDb.from('target_templates').select('*').eq('user_id',healthUser),
 healthDb.from('days').select('*').eq('user_id',healthUser).eq('local_date',selected).maybeSingle(),healthDb.from('meal_templates').select('*').eq('user_id',healthUser).order('name'),
 healthDb.from('checkin_drafts').select('payload').eq('user_id',healthUser).maybeSingle(),
 healthDb.from('health_records').select('id,category,recorded_on,recorded_at,payload,source').eq('user_id',healthUser).gte('recorded_on',new Date(`${selected}T12:00:00Z`).getTime()-86400000 ? new Date(new Date(`${selected}T12:00:00Z`).getTime()-86400000).toISOString().slice(0,10) : selected).lte('recorded_on',selected).order('recorded_at'),
 healthDb.from('health_records').select('id,category,recorded_on,recorded_at,payload,source').eq('user_id',healthUser).gte('recorded_on',`${selected.slice(0,4)}-01-01`).lte('recorded_on',selected).in('category',['meal_history','hydration_history','checkin_history','supplement','bowel']).order('recorded_on'),
 healthDb.from('health_profiles').select('profile').eq('user_id',healthUser).maybeSingle()
 ]);
 if(results.some(r=>r.error))throw new Error('Não foi possível carregar os dados. Verifique as migrations e sua conexão.');
 const profile=results[9].data?.profile??{};const sodiumDefault={kind:'maximum' as const,min:null,max:2000};
 const withSodium=(base:any,key:string,fallback:any)=>{const out={...base};const target=Object.hasOwn(profile,key)?profile[key]:fallback;if(target)out.sodium=target;else delete out.sodium;return out;};
 const templates=(results[3].data as TargetTemplate[]).map(t=>({...t,targets:withSodium(t.targets,'personal_sodium_type_'+t.day_type,sodiumDefault)}));
 const currentDay=(results[4].data??{local_date:selected,day_type:'dia sem tênis · caminhada com Caju',targets:templates.find(t=>t.day_type==='dia sem tênis · caminhada com Caju')?.targets??{}}) as Day;
 const typeKey='personal_sodium_type_'+currentDay.day_type;currentDay.targets=withSodium(currentDay.targets,'personal_sodium_date_'+selected,Object.hasOwn(profile,typeKey)?profile[typeKey]:sodiumDefault);
 return {exams:readExams(profile.personal_exams),reminders:reminders({...profile,personal_finance:profile.personal_finance??initialFinance,personal_credit_card:profile.personal_credit_card??initialCreditCard},selected),events:results[0].data as HealthEvent[],periodEvents:results[1].data as HealthEvent[],foods:results[2].data as Food[],templates,day:currentDay,mealTemplates:results[5].data as MealTemplate[],draft:results[6].data?.payload??null,healthRecords:results[7].data??[],periodHealthRecords:results[8].data??[]};
}
