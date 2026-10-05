import { AppShell } from '@/components/app-shell';
import { InvestmentsDashboard } from '@/components/investments-dashboard';
import { demoInvestments } from '@/lib/demo-sections';
export const dynamic='force-dynamic';
export default function Page(){return <AppShell title="Investimentos" active="financeiro" demo><div className="content"><InvestmentsDashboard initial={demoInvestments()}/></div></AppShell>}
