import { AppShell } from '@/components/app-shell';
import { HealthHub } from '@/components/health-hub';
import { demoAllEvents,demoHealthRecords,demoSleepRecords,demoExerciseRecords,demoExams,demoDog,demoProfile,demoMeasurements,demoToday,demoHealthApp } from '@/lib/demo-sections';
import { healthSummary } from '@/lib/health-summary';
import { defaultSettings,takingSupplements } from '@/lib/settings';
export const dynamic='force-dynamic';
export default function Page(){
 const today=demoToday(),app=demoHealthApp(),m=demoMeasurements();
 const records=[...demoHealthRecords(),...app.periodHealthRecords,{id:'demo-body',category:'body_metrics',recorded_at:null,...m}] as any[];
 const summary=healthSummary({events:demoAllEvents(),records,profile:demoProfile(),today});
 return <AppShell title="Saúde" active="saude" demo><div className="content"><HealthHub demo food={app} summary={summary} sleepRecords={demoSleepRecords() as any} exerciseRecords={demoExerciseRecords() as any} exams={demoExams()} taking={takingSupplements(defaultSettings)} dogActivities={demoDog().activities} dogName={demoDog().name} targets={app.day.targets} dayType={app.day.day_type} today={today}/></div></AppShell>;
}
