import { AppShell } from '@/components/app-shell';
import { HealthHub } from '@/components/health-hub';
import { demoAllEvents,demoHealthRecords,demoToday } from '@/lib/demo-sections';
export const dynamic='force-dynamic';
export default function Page(){return <AppShell title="Saúde" active="saude" demo><div className="content"><HealthHub demo events={demoAllEvents()} records={demoHealthRecords()} date={demoToday()}/></div></AppShell>}
