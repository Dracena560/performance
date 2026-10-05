import { notFound } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { ExerciseDashboard } from '@/components/exercise-dashboard';
import { demoExerciseRecords,demoToday } from '@/lib/demo-sections';
export const dynamic='force-dynamic';
export default function Page(){if(process.env.NODE_ENV==='production')notFound();return <AppShell title="Exercícios" active="saude" demo><div className="content"><ExerciseDashboard date={demoToday()} records={demoExerciseRecords()}/></div></AppShell>;}
