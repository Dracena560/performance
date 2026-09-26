import { AppFrame } from '@/components/app-frame';
import { ExerciseDashboard } from '@/components/exercise-dashboard';
import { healthService, healthUserId, supabase } from '@/lib/supabase/server';
export const dynamic='force-dynamic';
export default async function Page(){const session=await supabase();const {data:{user}}=await session.auth.getUser();const healthUser=healthUserId()??user?.id;const db=healthUserId()?healthService():session;const result=healthUser?await db.from('health_records').select('id,category,recorded_on,recorded_at,payload,source').eq('user_id',healthUser).in('category',['activity','workout','daily_metrics']).order('recorded_on',{ascending:false}).limit(365):{data:[]};return <AppFrame title="Exercícios"><div className="content"><ExerciseDashboard records={result.data??[]}/></div></AppFrame>;}
