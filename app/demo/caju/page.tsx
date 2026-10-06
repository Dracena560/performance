import { AppShell } from '@/components/app-shell';
import { DogView } from '@/components/dog-view';
import { demoDog,demoToday } from '@/lib/demo-sections';
export const dynamic='force-dynamic';
export default function Page(){return <AppShell title="Caju" active="caju" demo><div className="content"><DogView demo initial={demoDog()} today={demoToday()}/></div></AppShell>;}
