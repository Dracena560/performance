'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { configured, supabase } from '@/lib/supabase/server';
import { eventSchema, foodSchema, itemSchema, targetSchema, dayTypes, localDate, type EventInput } from '@/lib/domain';
async function context(){
 if(!configured())throw new Error('Conecte o Supabase para salvar seus registros.');
 const db=await supabase();const {data:{user}}=await db.auth.getUser();if(!user)throw new Error('Sua sessão expirou. Entre novamente.');return {db,user};
}
function check(error: {message:string}|null){if(error)throw new Error('Não foi possível salvar ou carregar os dados. Verifique a conexão e a configuração do banco.');}
export async function login(_previous:{error:string},form:FormData){
 if(!configured())return {error:'O Supabase ainda não foi configurado.'};
 const db=await supabase(); const {error}=await db.auth.signInWithPassword({email:String(form.get('email')),password:String(form.get('password'))});
 if(error)return {error:'Não foi possível entrar. Confira seu e-mail e senha.'};
 const next = String(form.get('next') ?? '');
 let destination = '/hoje';
 try { const target = new URL(next); if (target.origin === 'https://performance-felipe-bd10.vercel.app' && target.pathname === '/api/mcp/oauth/authorize') destination = target.toString(); } catch { /* Use the dashboard default. */ }
 redirect(destination);
}
export async function logout(){const {db}=await context();await db.auth.signOut();redirect('/login');}
export async function saveEvent(input:EventInput,id?:string){
 const value=eventSchema.parse(input); const {db,user}=await context();
 const record={...value,user_id:user.id,local_date:localDate(new Date(value.timestamp))};
 const result=id?await db.from('events').update(record).eq('id',z.string().uuid().parse(id)).eq('user_id',user.id).select().single():await db.from('events').insert(record).select().single();
 check(result.error);revalidatePath('/','layout');return result.data;
}
export async function deleteEvent(id:string){const {db,user}=await context();const {error}=await db.from('events').delete().eq('id',z.string().uuid().parse(id)).eq('user_id',user.id);check(error);revalidatePath('/','layout');}
export async function saveFood(input:unknown){const value=foodSchema.parse(input);const {db,user}=await context();const result=await db.from('foods').insert({...value,user_id:user.id}).select().single();check(result.error);return result.data;}
export async function saveMealTemplate(input:unknown){const value=z.object({name:z.string().trim().min(1).max(200),items:z.array(itemSchema).min(1)}).parse(input);const {db,user}=await context();const result=await db.from('meal_templates').insert({...value,user_id:user.id}).select().single();check(result.error);return result.data;}
const targetsSchema=z.record(z.enum(['water','calories','protein','carbs','fat','saturated_fat','fibre','steps','exercise','sleep']),targetSchema);
export async function saveTargets(date:string,day_type:string,targets:unknown,asTemplate:boolean){
 const parsed=z.object({date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),day_type:z.enum(dayTypes),targets:targetsSchema}).parse({date,day_type,targets});
 const {db,user}=await context();const {error}=await db.from('days').upsert({user_id:user.id,local_date:parsed.date,day_type:parsed.day_type,targets:parsed.targets},{onConflict:'user_id,local_date'});check(error);
 if(asTemplate){const result=await db.from('target_templates').upsert({user_id:user.id,name:parsed.day_type,day_type:parsed.day_type,targets:parsed.targets},{onConflict:'user_id,day_type'});check(result.error);}
 revalidatePath('/','layout');
}
export async function saveDraft(payload:unknown){const parsed=z.object({timestamp:z.string(),preset:z.string(),scores:z.record(z.string(),z.number().min(0).max(10).nullable()),activity:z.string(),moods:z.array(z.string()),environment:z.array(z.string()),notes:z.string().max(5000)}).parse(payload);const {db,user}=await context();const {error}=await db.from('checkin_drafts').upsert({user_id:user.id,payload:parsed,updated_at:new Date().toISOString()});check(error);}
export async function clearDraft(){const {db,user}=await context();const {error}=await db.from('checkin_drafts').delete().eq('user_id',user.id);check(error);}
