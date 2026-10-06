import { AppFrame } from '@/components/app-frame';
import { ExamsView } from '@/components/exams-view';
import { personalData } from '@/lib/personal-data';
import { readExams } from '@/lib/exams';
import { supplementRoutines } from '@/lib/day-log';
import { localDate } from '@/lib/domain';
export const dynamic='force-dynamic';
export default async function Page(){const profile=await personalData();return <AppFrame title="Exames"><div className="content"><ExamsView initial={readExams(profile.personal_exams)} today={localDate()} taking={Object.values(supplementRoutines).flat()}/></div></AppFrame>;}
