import { AppFrame } from '@/components/app-frame';
import { JournalView } from '@/components/journal-view';
import { loadJournal } from '@/lib/journal-data';
import { localDate } from '@/lib/domain';
import { supabase,healthService,healthUserId } from '@/lib/supabase/server';
export const dynamic='force-dynamic';
export default async function Page(){
 const session=await supabase();const {data:{user}}=await session.auth.getUser();const db=healthUserId()?healthService():session;
 const entries=await loadJournal(db,healthUserId()??user!.id);
 return <AppFrame title="Diário"><div className="content"><JournalView initial={entries} today={localDate()}/></div></AppFrame>;
}
