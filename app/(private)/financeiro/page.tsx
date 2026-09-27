import { AppFrame } from '@/components/app-frame';
import { FinanceDashboard } from '@/components/personal-dashboard';
import { personalData } from '@/lib/personal-data';
export const dynamic='force-dynamic';
export default async function Page(){const profile=await personalData();return <AppFrame title="Financeiro"><div className="content"><FinanceDashboard initial={profile.personal_finance}/></div></AppFrame>}
