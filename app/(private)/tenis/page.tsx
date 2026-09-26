import { TennisDashboard } from '@/components/tennis-dashboard';
import { supabase } from '@/lib/supabase/server';
export default async function Page(){const db=await supabase();const {data:{user}}=await db.auth.getUser();const result=user?await db.from('health_records').select('id,recorded_on,recorded_at,payload,source').eq('user_id',user.id).eq('category','tennis').order('recorded_on'): {data:[]};return <main className="workspace"><div className="content"><TennisDashboard records={result.data??[]}/></div></main>;}
