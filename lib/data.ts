import { redirect } from 'next/navigation';
import { configured,supabase } from './supabase/server';
import { localDate, type HealthEvent,type Food,type TargetTemplate,type MealTemplate,type Day } from './domain';
export async function loadData(date?:string){
 if(!configured())redirect('/login'); const db=await supabase();const {data:{user}}=await db.auth.getUser();if(!user)redirect('/login');
 const selected=date&&/^\d{4}-\d{2}-\d{2}$/.test(date)?date:localDate();
 const results=await Promise.all([
 db.from('events').select('*').eq('user_id',user.id).eq('local_date',selected).order('timestamp'),
 db.from('events').select('*').eq('user_id',user.id).gte('local_date',`${selected.slice(0,4)}-01-01`).lte('local_date',selected).order('local_date'),
 db.from('foods').select('*').eq('user_id',user.id).order('name'),db.from('target_templates').select('*').eq('user_id',user.id),
 db.from('days').select('*').eq('user_id',user.id).eq('local_date',selected).maybeSingle(),db.from('meal_templates').select('*').eq('user_id',user.id).order('name'),
 db.from('checkin_drafts').select('payload').eq('user_id',user.id).maybeSingle(),
 db.from('health_records').select('id,category,recorded_on,recorded_at,payload,source').eq('user_id',user.id).eq('recorded_on',selected).order('recorded_at'),
 db.from('health_records').select('id,category,recorded_on,recorded_at,payload,source').eq('user_id',user.id).gte('recorded_on',`${selected.slice(0,4)}-01-01`).lte('recorded_on',selected).in('category',['meal_history','hydration_history']).order('recorded_on')
 ]);
 if(results.some(r=>r.error))throw new Error('Não foi possível carregar os dados. Verifique as migrations e sua conexão.');
 const templates=results[3].data as TargetTemplate[];
 return {events:results[0].data as HealthEvent[],periodEvents:results[1].data as HealthEvent[],foods:results[2].data as Food[],templates,day:(results[4].data??{local_date:selected,day_type:'dia sem tênis · caminhada com Caju',targets:templates.find(t=>t.day_type==='dia sem tênis · caminhada com Caju')?.targets??{}}) as Day,mealTemplates:results[5].data as MealTemplate[],draft:results[6].data?.payload??null,healthRecords:results[7].data??[],periodHealthRecords:results[8].data??[]};
}
