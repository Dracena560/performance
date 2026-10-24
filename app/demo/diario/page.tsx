import { AppShell } from '@/components/app-shell';
import { JournalView } from '@/components/journal-view';
import { demoJournal,demoToday } from '@/lib/demo-sections';
export const dynamic='force-dynamic';
export default function Page(){return <AppShell title="Diário" active="diario" demo><div className="content"><JournalView demo initial={demoJournal()} today={demoToday()}/></div></AppShell>;}
