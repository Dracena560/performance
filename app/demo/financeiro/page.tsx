import { notFound } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { FinanceSections } from '@/components/finance-sections';
import { demoFinance,demoInvestments } from '@/lib/demo-sections';
export const dynamic='force-dynamic';
export default function Page(){if(process.env.NODE_ENV==='production')notFound();return <AppShell title="Financeiro" active="financeiro" demo><div className="content"><FinanceSections finance={demoFinance()} investments={demoInvestments()}/></div></AppShell>}
