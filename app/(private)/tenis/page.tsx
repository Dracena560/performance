import { TennisDashboard } from '@/components/tennis-dashboard';
import { AppFrame } from '@/components/app-frame';
import { supabase } from '@/lib/supabase/server';
export default async function Page(){const db=await supabase();const {data:{user}}=await db.auth.getUser();const result=user?await db.from('health_records').select('id,recorded_on,recorded_at,payload,source').eq('user_id',user.id).eq('category','tennis').order('recorded_on'): {data:[]};return <AppFrame title="Tênis"><div className="content"><TennisDashboard records={result.data??[]}/></div></AppFrame>;}
