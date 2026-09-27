import { AppFrame } from '@/components/app-frame';
import { InvestmentsDashboard } from '@/components/investments-dashboard';
import { personalData } from '@/lib/personal-data';
export const dynamic='force-dynamic';
export default async function Page(){const profile=await personalData();return <AppFrame title="Investimentos"><div className="content"><InvestmentsDashboard initial={profile.personal_investments??[]}/></div></AppFrame>}
