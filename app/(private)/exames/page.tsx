import { AppFrame } from '@/components/app-frame';
import { ExamsView } from '@/components/exams-view';
import { personalData } from '@/lib/personal-data';
import { readExams } from '@/lib/exams';
import { readSettings,takingSupplements } from '@/lib/settings';
import { localDate } from '@/lib/domain';
export const dynamic='force-dynamic';
export default async function Page(){const profile=await personalData();return <AppFrame title="Exames"><div className="content"><ExamsView initial={readExams(profile.personal_exams)} today={localDate()} taking={takingSupplements(readSettings(profile.personal_settings))}/></div></AppFrame>;}
