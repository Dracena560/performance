import { notFound } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { InvestmentsDashboard } from '@/components/investments-dashboard';
import { demoInvestments } from '@/lib/demo-sections';
export const dynamic='force-dynamic';
export default function Page(){if(process.env.NODE_ENV==='production')notFound();return <AppShell title="Investimentos" active="financeiro" demo><div className="content"><InvestmentsDashboard initial={demoInvestments()}/></div></AppShell>}
