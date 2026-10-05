import { AppShell } from '@/components/app-shell';
import { SleepDashboard } from '@/components/sleep-dashboard';
import { demoSleepRecords } from '@/lib/demo-sections';
export const dynamic='force-dynamic';
export default function Page(){return <AppShell title="Sono" active="saude" demo><div className="content"><SleepDashboard records={demoSleepRecords()}/></div></AppShell>;}
