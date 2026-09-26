import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
export const configured = () => !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
export async function supabase() {
  const jar = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: { getAll: () => jar.getAll(), setAll(values) { try { values.forEach(({name,value,options}) => jar.set(name,value,options)); } catch { /* Render: proxy persists refreshed cookies. */ } }
  }});
}
import { createClient } from '@supabase/supabase-js';
export function healthUserId(){return process.env.HEALTH_GPT_USER_ID;}
export function healthService(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error('A leitura central de saúde ainda não foi configurada.');return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});}
