import { notFound } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { GeneralHealthDashboard } from '@/components/general-health-dashboard';
import { demoAllEvents,demoHealthRecords,demoToday } from '@/lib/demo-sections';
export const dynamic='force-dynamic';
export default function Page(){if(process.env.NODE_ENV==='production')notFound();return <AppShell title="Saúde geral" active="saude" demo><div className="content"><GeneralHealthDashboard events={demoAllEvents()} records={demoHealthRecords()} date={demoToday()}/></div></AppShell>}
