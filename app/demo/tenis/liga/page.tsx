import { AppShell } from '@/components/app-shell';
import { LeagueView } from '@/components/tennis-league-view';
import { LeagueManager } from '@/components/tennis-league-manager';
import { demoTennisLeague } from '@/lib/demo-sections';
import { localDate } from '@/lib/domain';
export const dynamic='force-dynamic';
export default function Page(){const league=demoTennisLeague();const today=localDate();return <AppShell title="Liga" active="tenis" demo><div className="content league-page"><LeagueView league={league} today={today} manageHref="#lg-manager-title"/><LeagueManager initial={league} today={today}/></div></AppShell>;}
