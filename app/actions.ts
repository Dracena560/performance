'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { configured, supabase } from '@/lib/supabase/server';
import { eventSchema, foodSchema, itemSchema, targetSchema, dayTypes, localDate, type EventInput } from '@/lib/domain';
import { readHealthWorkbook } from '@/lib/history-import';
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
export async function importHealthWorkbook(formData: FormData){
 const file=formData.get('workbook');if(!(file instanceof File)||!file.name.toLowerCase().endsWith('.xlsx'))throw new Error('Selecione a planilha .xlsx do histórico de saúde.');
 const records=readHealthWorkbook(await file.arrayBuffer());if(!records.length)throw new Error('Não encontrei registros com uma coluna Data na planilha.');
 const {db,user}=await context();let imported=0;
 for(let index=0;index<records.length;index+=250){const batch=records.slice(index,index+250).map(record=>({...record,user_id:user.id}));const result=await db.from('health_records').upsert(batch,{onConflict:'user_id,category,recorded_on,recorded_at,payload',ignoreDuplicates:true});check(result.error);imported+=batch.length;}
 revalidatePath('/','layout');return {imported,total:records.length};
}
const recordCategory=z.enum(['sleep','activity','bowel','supplement','tennis','schedule','body_metrics']);
export async function saveHealthRecord(category:unknown,date:unknown,payload:unknown,notes=''){
 const parsed=z.object({category:recordCategory,date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),payload:z.record(z.string(),z.unknown()),notes:z.string().max(5000)}).parse({category,date,payload,notes});
 const {db,user}=await context();const result=await db.from('health_records').insert({user_id:user.id,category:parsed.category,recorded_on:parsed.date,recorded_at:new Date().toISOString(),payload:parsed.payload,source:'manual'}).select().single();check(result.error);revalidatePath('/','layout');return result.data;
}
export async function saveHealthProfile(profile:unknown){const value=z.record(z.string(),z.unknown()).parse(profile);const {db,user}=await context();const result=await db.from('health_profiles').upsert({user_id:user.id,profile:value,updated_at:new Date().toISOString()},{onConflict:'user_id'}).select().single();check(result.error);revalidatePath('/','layout');return result.data;}
export async function updateTennisScore(recordId:unknown,setsInput:unknown){
 const sets=z.array(z.object({felipe:z.number().int().min(0).max(99),adversario:z.number().int().min(0).max(99)})).min(1).max(5).parse(setsInput);
 const id=z.string().uuid().parse(recordId);const {db,user}=await context();
 const current=await db.from('health_records').select('payload').eq('id',id).eq('user_id',user.id).eq('category','tennis').single();check(current.error);
 const won=sets.filter(set=>set.felipe>set.adversario).length,lost=sets.filter(set=>set.adversario>set.felipe).length;
 if(!current.data)throw new Error('Partida não encontrada.');
 const payload={...(current.data.payload as Record<string,unknown>),sets,score:sets.map(set=>`${set.felipe}-${set.adversario}`).join(', '),...(won===lost?{}:{outcome:won>lost?'vitória':'derrota'})};
 const result=await db.from('health_records').update({payload,source:'manual'}).eq('id',id).eq('user_id',user.id).select().single();check(result.error);revalidatePath('/tenis');return result.data;
}
