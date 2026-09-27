import { AppFrame } from '@/components/app-frame';
import { TravelDashboard } from '@/components/personal-dashboard';
import { personalData } from '@/lib/personal-data';
export const dynamic='force-dynamic';
export default async function Page(){const profile=await personalData();return <AppFrame title="Viagens"><div className="content"><TravelDashboard initial={profile.personal_trips}/></div></AppFrame>}
