import { notFound } from 'next/navigation';
import HealthApp from '@/components/health-app';
import { demoHealthApp } from '@/lib/demo-sections';
export const dynamic='force-dynamic';
export default function Page(){if(process.env.NODE_ENV==='production')notFound();return <HealthApp initial={demoHealthApp()} demo view="agua"/>;}
