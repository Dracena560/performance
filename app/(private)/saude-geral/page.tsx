import { AppFrame } from '@/components/app-frame';
import { GeneralHealthDashboard } from '@/components/general-health-dashboard';
import { healthService, healthUserId, supabase } from '@/lib/supabase/server';
import { localDate } from '@/lib/domain';
export const dynamic='force-dynamic';
export default async function Page(){const session=await supabase();const {data:{user}}=await session.auth.getUser();const userId=healthUserId()??user?.id;const db=healthUserId()?healthService():session;const date=localDate(),year=`${date.slice(0,4)}-01-01`;const [events,records]=userId?await Promise.all([db.from('events').select('local_date,type,data').eq('user_id',userId).gte('local_date',year).lte('local_date',date),db.from('health_records').select('category,recorded_on,recorded_at,payload').eq('user_id',userId).gte('recorded_on',year).lte('recorded_on',date).order('recorded_on')]):[{data:[]},{data:[]}];return <AppFrame title="Saúde geral"><div className="content"><GeneralHealthDashboard events={events.data??[]} records={records.data??[]} date={date}/></div></AppFrame>}
