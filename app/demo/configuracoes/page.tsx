import { AppShell } from '@/components/app-shell';
import { SettingsView } from '@/components/settings-view';
import { defaultSettings } from '@/lib/settings';
export const dynamic='force-dynamic';
export default function Page(){return <AppShell title="Configurações" active="hoje" demo><div className="content"><SettingsView demo initial={defaultSettings}/></div></AppShell>;}
