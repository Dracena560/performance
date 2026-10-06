import { AppShell } from '@/components/app-shell';
import { ExamsView } from '@/components/exams-view';
import { demoExams,demoToday } from '@/lib/demo-sections';
import { supplementRoutines } from '@/lib/day-log';
export const dynamic='force-dynamic';
export default function Page(){return <AppShell title="Exames" active="saude" demo><div className="content"><ExamsView demo initial={demoExams()} today={demoToday()} taking={Object.values(supplementRoutines).flat()}/></div></AppShell>;}
