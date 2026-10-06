import { AppFrame } from '@/components/app-frame';
import { ExerciseDashboard } from '@/components/exercise-dashboard';
import { healthService, healthUserId, supabase } from '@/lib/supabase/server';
import { localDate } from '@/lib/domain';
import { readDog } from '@/lib/dog';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{date?:string}>}){const params=await searchParams;const date=params.date&&/^\d{4}-\d{2}-\d{2}$/.test(params.date)?params.date:localDate();const session=await supabase();const {data:{user}}=await session.auth.getUser();const healthUser=healthUserId()??user?.id;const db=healthUserId()?healthService():session;const result=healthUser?await db.from('health_records').select('id,category,recorded_on,recorded_at,payload,source').eq('user_id',healthUser).in('category',['activity','workout','tennis','daily_metrics']).order('recorded_on',{ascending:false}).order('recorded_at',{ascending:false}).limit(1000):{data:[]};const profile=healthUser?await db.from('health_profiles').select('profile').eq('user_id',healthUser).maybeSingle():{data:null};const dog=readDog(profile.data?.profile?.personal_dog);return <AppFrame title="Exercícios"><div className="content"><ExerciseDashboard dogName={dog.name} dogActivities={dog.activities} date={date} records={result.data??[]}/></div></AppFrame>;}
