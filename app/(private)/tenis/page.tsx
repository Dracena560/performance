import { TennisDashboard } from '@/components/tennis-dashboard';
import { AppFrame } from '@/components/app-frame';
import { supabase,healthService,healthUserId } from '@/lib/supabase/server';
export default async function Page(){const session=await supabase();const {data:{user}}=await session.auth.getUser();const healthUser=healthUserId()??user?.id;const db=healthUserId()?healthService():session;const result=healthUser?await db.from('health_records').select('id,recorded_on,recorded_at,payload,source').eq('user_id',healthUser!).eq('category','tennis').order('recorded_on'): {data:[]};return <AppFrame title="Tênis"><div className="content"><TennisDashboard records={result.data??[]}/></div></AppFrame>;}
