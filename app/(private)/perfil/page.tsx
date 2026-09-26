import { HealthProfile } from '@/components/health-profile';
import { AppFrame } from '@/components/app-frame';
import { supabase } from '@/lib/supabase/server';
export default async function Page(){const db=await supabase();const {data:{user}}=await db.auth.getUser();const result=user?await db.from('health_profiles').select('profile').eq('user_id',user.id).maybeSingle():{data:null};return <AppFrame title="Perfil"><div className="content"><div className="page-heading"><div><span className="eyebrow">DADOS PRIVADOS</span><h1>Perfil de saúde</h1><p>Sua base pessoal para metas e insights.</p></div></div><HealthProfile initial={result.data?.profile}/></div></AppFrame>}
