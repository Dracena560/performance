import { AppFrame } from '@/components/app-frame';
import { HealthHub } from '@/components/health-hub';
import { healthService, healthUserId, supabase } from '@/lib/supabase/server';
import { localDate, type HealthEvent, type Targets } from '@/lib/domain';
import { healthSummary } from '@/lib/health-summary';
import { readSettings, takingSupplements } from '@/lib/settings';
import { readExams } from '@/lib/exams';
import { readDog } from '@/lib/dog';
import { loadData } from '@/lib/data';
export const dynamic='force-dynamic';
export default async function Page(){
 const session=await supabase();const {data:{user}}=await session.auth.getUser();const userId=healthUserId()??user!.id;const db=healthUserId()?healthService():session;
 const today=localDate(),since=new Date(Date.parse(today+'T12:00:00Z')-45*86400000).toISOString().slice(0,10);
 const fields='id,category,recorded_on,recorded_at,payload,source';
 const [food,events,recent,sleep,exercise,body,profile,day]=await Promise.all([
  loadData(),
  db.from('events').select('*').eq('user_id',userId).gte('local_date',since).lte('local_date',today),
  db.from('health_records').select(fields).eq('user_id',userId).gte('recorded_on',since).lte('recorded_on',today).in('category',['checkin_history','supplement','bowel','daily_metrics']),
  db.from('health_records').select(fields).eq('user_id',userId).in('category',['sleep','daily_metrics']).order('recorded_on',{ascending:false}).order('recorded_at',{ascending:false}).limit(1000),
  db.from('health_records').select(fields).eq('user_id',userId).in('category',['activity','workout','tennis','daily_metrics']).order('recorded_on',{ascending:false}).order('recorded_at',{ascending:false}).limit(1000),
  db.from('health_records').select(fields).eq('user_id',userId).eq('category','body_metrics').order('recorded_on',{ascending:false}).limit(5),
  db.from('health_profiles').select('profile').eq('user_id',userId).maybeSingle(),
  db.from('days').select('day_type,targets').eq('user_id',userId).eq('local_date',today).maybeSingle()
 ]);
 if([events,recent,sleep,exercise,body,profile].some(r=>r.error))throw new Error('Não foi possível carregar a saúde. Tente atualizar.');
 const p=profile.data?.profile??{};const settings=readSettings(p.personal_settings);const dog=readDog(p.personal_dog);
 const ids=new Set<string>();const records=[...(recent.data??[]),...(sleep.data??[]),...(exercise.data??[]),...(body.data??[])].filter(r=>!ids.has(r.id)&&ids.add(r.id));
 const summary=healthSummary({events:(events.data??[]) as HealthEvent[],records,profile:p,today,settings});
 return <AppFrame title="Saúde"><div className="content"><HealthHub food={food} summary={summary} sleepRecords={sleep.data??[]} exerciseRecords={exercise.data??[]} exams={readExams(p.personal_exams)} taking={takingSupplements(settings)} dogActivities={dog.activities} dogName={dog.name} targets={(day.data?.targets??null) as Targets|null} dayType={day.data?.day_type??null} today={today}/></div></AppFrame>;
}
