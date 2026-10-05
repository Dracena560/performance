import { AppShell } from '@/components/app-shell';
import { TennisDashboard } from '@/components/tennis-dashboard';
import { demoTennisProfile,demoTennisRecords,demoTennisLeague } from '@/lib/demo-sections';
export const dynamic='force-dynamic';
export default function Page(){return <AppShell title="Tênis" active="tenis" demo><div className="content"><TennisDashboard records={demoTennisRecords()} profile={demoTennisProfile()} league={demoTennisLeague()}/></div></AppShell>;}
