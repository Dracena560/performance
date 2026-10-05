import { AppFrame } from '@/components/app-frame';
import { LeagueView } from '@/components/tennis-league-view';
import { LeagueManager } from '@/components/tennis-league-manager';
import { loadLeague } from '@/lib/league-data';
import { localDate } from '@/lib/domain';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{season?:string}>}){
 const [league,{season}]=await Promise.all([loadLeague(),searchParams]);const today=localDate();
 return <AppFrame title="Liga"><div className="content league-page"><LeagueView league={league} today={today} initialSeason={season} manageHref="#lg-manager-title"/><LeagueManager initial={league} today={today}/></div></AppFrame>;
}
