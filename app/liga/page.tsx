import type { Metadata } from 'next';
import { LeagueView } from '@/components/tennis-league-view';
import { PublicFrame } from '@/components/public-frame';
import { loadLeague } from '@/lib/league-data';
import { localDate } from '@/lib/domain';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Liga de tênis · Box League',description:'Classificação, resultados e jogos da temporada.'};
export default async function Page({searchParams}:{searchParams:Promise<{season?:string}>}){
 const [league,{season}]=await Promise.all([loadLeague(),searchParams]);
 return <PublicFrame><LeagueView league={league} today={localDate()} initialSeason={season} publicMode/></PublicFrame>;
}
