import { redirect } from 'next/navigation';
import { healthService,healthUserId,supabase } from './supabase/server';
export async function personalData(){const session=await supabase();const {data:{user}}=await session.auth.getUser();if(!user)redirect('/login');const db=healthUserId()?healthService():session;const result=await db.from('health_profiles').select('profile').eq('user_id',healthUserId()??user.id).maybeSingle();if(result.error)throw new Error('Não foi possível carregar seus dados.');return result.data?.profile??{};}
