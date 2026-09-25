import HealthApp from '@/components/health-app';
import { loadData } from '@/lib/data';
export default async function Page({searchParams}:{searchParams:Promise<{date?:string}>}){const {date}=await searchParams;return <HealthApp initial={await loadData(date)} view="check-in"/>;}
