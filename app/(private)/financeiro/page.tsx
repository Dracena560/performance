import { AppFrame } from '@/components/app-frame';
import { FinanceSections } from '@/components/finance-sections';
import { personalData } from '@/lib/personal-data';
import { localDate } from '@/lib/domain';
export const dynamic='force-dynamic';
export default async function Page(){const profile=await personalData();return <AppFrame title="Financeiro"><div className="content"><FinanceSections finance={profile.personal_finance} investments={profile.personal_investments??[]} creditCard={profile.personal_credit_card} car={profile.personal_car} today={localDate()}/></div></AppFrame>}
