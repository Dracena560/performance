import HealthApp from '@/components/health-app';
import { demoHealthApp } from '@/lib/demo-sections';
export const dynamic='force-dynamic';
export default function Page(){return <HealthApp initial={demoHealthApp()} demo view="hoje"/>;}
