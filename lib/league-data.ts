import { healthService,healthUserId } from './supabase/server';
import { readLeague,type TennisLeague } from './tennis-league';
/** League stored in the owner's profile. Read with the service key so the public page works without a session; only the league is returned. */
export async function loadLeague():Promise<TennisLeague>{
 const userId=healthUserId();if(!userId||!process.env.SUPABASE_SERVICE_ROLE_KEY||!process.env.NEXT_PUBLIC_SUPABASE_URL)return readLeague(undefined);
 const result=await healthService().from('health_profiles').select('profile').eq('user_id',userId).maybeSingle();
 if(result.error)throw new Error('Não foi possível carregar a liga.');
 return readLeague(result.data?.profile?.personal_tennis_league);
}
