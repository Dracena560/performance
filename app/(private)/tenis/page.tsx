import { isTennis } from '@/lib/exercise-records';
import { tennisProfileSchema } from '@/lib/tennis-club';
import { TennisDashboard } from '@/components/tennis-dashboard';
import { AppFrame } from '@/components/app-frame';
import { supabase,healthService,healthUserId } from '@/lib/supabase/server';
export default async function Page(){const session=await supabase();const {data:{user}}=await session.auth.getUser();const healthUser=healthUserId()??user?.id;const db=healthUserId()?healthService():session;const result=healthUser?await db.from('health_records').select('id,category,recorded_on,recorded_at,payload,source').eq('user_id',healthUser!).in('category',['tennis','workout','activity']).order('recorded_on'): {data:[]};const profile=healthUser?await db.from('health_profiles').select('profile').eq('user_id',healthUser).maybeSingle():{data:null};const parsed=tennisProfileSchema.safeParse(profile.data?.profile?.personal_tennis??{});return <AppFrame title="Tênis"><div className="content"><TennisDashboard records={(result.data??[]).filter(isTennis)} profile={parsed.success?parsed.data:tennisProfileSchema.parse({})}/></div></AppFrame>;}
