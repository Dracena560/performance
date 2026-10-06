import { AppFrame } from '@/components/app-frame';
import { SettingsView } from '@/components/settings-view';
import { personalData } from '@/lib/personal-data';
import { readSettings } from '@/lib/settings';
export const dynamic='force-dynamic';
export default async function Page(){const profile=await personalData();return <AppFrame title="Configurações"><div className="content"><SettingsView initial={readSettings(profile.personal_settings)}/></div></AppFrame>;}
