import { AppFrame } from '@/components/app-frame';
import { DogView } from '@/components/dog-view';
import { personalData } from '@/lib/personal-data';
import { readDog } from '@/lib/dog';
import { localDate } from '@/lib/domain';
export const dynamic='force-dynamic';
export default async function Page(){const profile=await personalData();return <AppFrame title="Caju"><div className="content"><DogView initial={readDog(profile.personal_dog)} today={localDate()}/></div></AppFrame>;}
