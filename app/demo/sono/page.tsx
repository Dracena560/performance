import { notFound } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { SleepDashboard } from '@/components/sleep-dashboard';
import { demoSleepRecords } from '@/lib/demo-sections';
export const dynamic='force-dynamic';
export default function Page(){if(process.env.NODE_ENV==='production')notFound();return <AppShell title="Sono" active="saude" demo><div className="content"><SleepDashboard records={demoSleepRecords()}/></div></AppShell>;}
