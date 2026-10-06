import { AppShell } from '@/components/app-shell';
import { ExerciseDashboard } from '@/components/exercise-dashboard';
import { demoExerciseRecords,demoToday,demoDog } from '@/lib/demo-sections';
export const dynamic='force-dynamic';
export default function Page(){return <AppShell title="Exercícios" active="saude" demo><div className="content"><ExerciseDashboard dogName={demoDog().name} dogActivities={demoDog().activities} date={demoToday()} records={demoExerciseRecords()}/></div></AppShell>;}
