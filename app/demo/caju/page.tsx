import { AppShell } from '@/components/app-shell';
import { DogView } from '@/components/dog-view';
import { demoDog,demoToday,demoHealthRecords } from '@/lib/demo-sections';
import { walksFromWorkouts } from '@/lib/dog-food';
export const dynamic='force-dynamic';
export default function Page(){return <AppShell title="Caju" active="caju" demo><div className="content"><DogView demo initial={demoDog()} today={demoToday()} walks={walksFromWorkouts(demoHealthRecords() as any)}/></div></AppShell>;}
