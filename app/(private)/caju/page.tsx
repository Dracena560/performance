import { AppFrame } from '@/components/app-frame';
import { DogView } from '@/components/dog-view';
import { personalData } from '@/lib/personal-data';
import { readDog } from '@/lib/dog';
import { walksFromWorkouts } from '@/lib/dog-food';
import { localDate } from '@/lib/domain';
import { supabase,healthService,healthUserId } from '@/lib/supabase/server';
export const dynamic='force-dynamic';
export default async function Page(){
 const profile=await personalData();const today=localDate();const since=new Date(Date.parse(today+'T12:00:00Z')-120*86400000).toISOString().slice(0,10);
 const session=await supabase();const {data:{user}}=await session.auth.getUser();const db=healthUserId()?healthService():session;
 const records=await db.from('health_records').select('id,category,recorded_on,payload').eq('user_id',healthUserId()??user!.id).in('category',['workout','activity']).gte('recorded_on',since);
 return <AppFrame title="Caju"><div className="content"><DogView initial={readDog(profile.personal_dog)} today={today} walks={walksFromWorkouts(records.data??[])}/></div></AppFrame>;
}
