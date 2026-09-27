import type { SupabaseClient } from '@supabase/supabase-js';
export async function updateProfile(db:SupabaseClient,userId:string,transform:(profile:Record<string,any>)=>Record<string,any>){
 for(let attempt=0;attempt<5;attempt++){const current=await db.from('health_profiles').select('profile,updated_at').eq('user_id',userId).maybeSingle();if(current.error)throw new Error('Não foi possível ler seus dados.');const profile=transform(current.data?.profile??{});
 const result=current.data?await db.from('health_profiles').update({profile,updated_at:new Date().toISOString()}).eq('user_id',userId).eq('updated_at',current.data.updated_at).select('user_id'):await db.from('health_profiles').upsert({user_id:userId,profile},{onConflict:'user_id',ignoreDuplicates:true}).select('user_id');
 if(result.error)throw new Error('Não foi possível salvar seus dados.');if(result.data?.length)return profile;}
 throw new Error('Outra atualização ocorreu. Tente novamente.');
}
