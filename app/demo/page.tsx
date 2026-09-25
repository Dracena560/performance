import HealthApp from '@/components/health-app';
import { demoData } from '@/lib/demo';
export const dynamic='force-dynamic';
export default function Page(){return <HealthApp initial={demoData()} demo view="hoje"/>;}
