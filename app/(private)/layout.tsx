import { redirect } from 'next/navigation';
import { configured,supabase,healthService,healthUserId } from '@/lib/supabase/server';
import { SettingsProvider } from '@/components/settings-context';
import { readSettings } from '@/lib/settings';
export const dynamic='force-dynamic';
export default async function Layout({children}:{children:React.ReactNode}){
 if(!configured())redirect('/login');const db=await supabase();const {data:{user}}=await db.auth.getUser();if(!user)redirect('/login');
 const store=healthUserId()?healthService():db;const result=await store.from('health_profiles').select('profile').eq('user_id',healthUserId()??user.id).maybeSingle();
 return <SettingsProvider settings={readSettings(result.data?.profile?.personal_settings)}>{children}</SettingsProvider>;
}
