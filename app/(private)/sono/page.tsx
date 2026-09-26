import { AppFrame } from '@/components/app-frame';
import { SleepDashboard } from '@/components/sleep-dashboard';
import { supabase } from '@/lib/supabase/server';
export default async function Page(){const db=await supabase();const {data:{user}}=await db.auth.getUser();const result=user?await db.from('health_records').select('id,category,recorded_on,recorded_at,payload,source').eq('user_id',user.id).in('category',['sleep','daily_metrics']).order('recorded_on'): {data:[]};return <AppFrame title="Sono"><div className="content"><SleepDashboard records={result.data??[]}/></div></AppFrame>;}
