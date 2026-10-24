import { reminders } from './life';
import { readExams } from './exams';
import { readDog } from './dog';
import { initialFinance } from './personal';
import { initialCreditCard } from './credit-card';
import { redirect } from 'next/navigation';
import { isTennis } from './exercise-records';
import { tennisProfileSchema } from './tennis-club';
import { readLeague } from './tennis-league';
import { pendingMatches } from './tennis-pending';
import { configured,supabase,healthService,healthUserId } from './supabase/server';
import { localDate, profileTargetKeys, profileTargets, type ProfileTargetKey, type HealthEvent,type Food,type TargetTemplate,type MealTemplate,type Day } from './domain';
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
 healthDb.from('health_profiles').select('profile').eq('user_id',healthUser).maybeSingle(),
 healthDb.from('health_records').select('id,category,recorded_on,payload').eq('user_id',healthUser).gte('recorded_on',new Date(Date.parse(`${selected}T12:00:00Z`)-21*86400000).toISOString().slice(0,10)).lte('recorded_on',selected).in('category',['tennis','workout','activity'])
 ]);
 if(results.some(r=>r.error))throw new Error('Não foi possível carregar os dados. Verifique as migrations e sua conexão.');
 const profile=results[9].data?.profile??{};
 // Sodium and sugar limits live in the profile: day override → day-type template → default.
 const withProfileTargets=(base:any,keyFor:(metric:ProfileTargetKey)=>string,fallbackFor:(metric:ProfileTargetKey)=>any)=>{const out={...base};for(const metric of profileTargetKeys){const key=keyFor(metric);const target=Object.hasOwn(profile,key)?profile[key]:fallbackFor(metric);if(target)out[metric]=target;else delete out[metric];}return out;};
 const templates=(results[3].data as TargetTemplate[]).map(t=>({...t,targets:withProfileTargets(t.targets,metric=>`personal_${metric}_type_${t.day_type}`,metric=>profileTargets[metric])}));
 const currentDay=(results[4].data??{local_date:selected,day_type:'dia sem tênis · caminhada com Caju',targets:templates.find(t=>t.day_type==='dia sem tênis · caminhada com Caju')?.targets??{}}) as Day;
 currentDay.targets=withProfileTargets(currentDay.targets,metric=>`personal_${metric}_date_${selected}`,metric=>{const typeKey=`personal_${metric}_type_${currentDay.day_type}`;return Object.hasOwn(profile,typeKey)?profile[typeKey]:profileTargets[metric];});
 const tennis=tennisProfileSchema.safeParse(profile.personal_tennis??{}),league=readLeague(profile.personal_tennis_league),tennisMe=tennis.success?tennis.data.name||'Você':'Você';
 const londonTime=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date());
 // Only today's view nags about games waiting for their result.
 const tennisPending=tennis.success&&selected===localDate()?pendingMatches(tennis.data.upcoming,((results[10].data??[]) as {id:string;category:string;recorded_on:string;payload:Record<string,unknown>}[]).filter(isTennis),league.players,tennisMe,selected,londonTime):[];
 return {tennisPending,tennisMe,tennisPlayers:league.players.filter(player=>!player.me).map(player=>player.name),dog:readDog(profile.personal_dog),exams:readExams(profile.personal_exams),reminders:reminders({...profile,personal_finance:profile.personal_finance??initialFinance,personal_credit_card:profile.personal_credit_card??initialCreditCard},selected),events:results[0].data as HealthEvent[],periodEvents:results[1].data as HealthEvent[],foods:results[2].data as Food[],templates,day:currentDay,mealTemplates:results[5].data as MealTemplate[],draft:results[6].data?.payload??null,healthRecords:results[7].data??[],periodHealthRecords:results[8].data??[]};
}
