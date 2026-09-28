import { AppFrame } from '@/components/app-frame';
import { FinanceSections } from '@/components/finance-sections';
import { personalData } from '@/lib/personal-data';
export const dynamic='force-dynamic';
export default async function Page(){const profile=await personalData();return <AppFrame title="Financeiro"><div className="content"><FinanceSections finance={profile.personal_finance} investments={profile.personal_investments??[]}/></div></AppFrame>}
