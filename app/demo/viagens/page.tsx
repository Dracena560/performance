import { AppShell } from '@/components/app-shell';
import { TravelDashboard } from '@/components/personal-dashboard';
import { demoTrips } from '@/lib/demo-sections';
export const dynamic='force-dynamic';
export default function Page(){return <AppShell title="Viagens" active="minhas-informacoes" demo><div className="content"><TravelDashboard initial={demoTrips()}/></div></AppShell>}
