'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { configured, healthService, healthUserId, supabase } from '@/lib/supabase/server';
import { eventSchema, foodSchema, itemSchema, targetSchema, dayTypes, localDate, type EventInput } from '@/lib/domain';
import { diarySchema } from '@/lib/diary-fields';
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
const targetsSchema=z.record(z.enum(['water','calories','protein','carbs','fat','saturated_fat','fibre','sodium','steps','exercise','sleep']),targetSchema);
export async function saveTargets(date:string,day_type:string,targets:unknown,asTemplate:boolean){
 const parsed=z.object({date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),day_type:z.enum(dayTypes),targets:targetsSchema}).parse({date,day_type,targets});
 const session=await context();const user={id:healthUserId()??session.user.id};const db=healthUserId()?healthService():session.db;
 const {sodium,...coreTargets}=parsed.targets;
 const {error}=await db.from('days').upsert({user_id:user.id,local_date:parsed.date,day_type:parsed.day_type,targets:coreTargets},{onConflict:'user_id,local_date'});check(error);
 if(asTemplate){const result=await db.from('target_templates').upsert({user_id:user.id,name:parsed.day_type,day_type:parsed.day_type,targets:coreTargets},{onConflict:'user_id,day_type'});check(result.error);}
 const extra:Record<string,unknown>={['personal_sodium_date_'+parsed.date]:sodium??null};if(asTemplate)extra['personal_sodium_type_'+parsed.day_type]=sodium??null;await mergeProfileSection(extra);
 revalidatePath('/','layout');
}
export async function saveDraft(payload:unknown){const parsed=z.object({timestamp:z.string(),preset:z.string(),scores:z.record(z.string(),z.number().min(0).max(10).nullable()),activity:z.string(),moods:z.array(z.string()),environment:z.array(z.string()),notes:z.string().max(5000)}).parse(payload);const {db,user}=await context();const {error}=await db.from('checkin_drafts').upsert({user_id:user.id,payload:parsed,updated_at:new Date().toISOString()});check(error);}
export async function clearDraft(){const {db,user}=await context();const {error}=await db.from('checkin_drafts').delete().eq('user_id',user.id);check(error);}
const recordCategory=z.enum(['sleep','activity','bowel','supplement','tennis','schedule','body_metrics']);
export async function saveHealthRecord(category:unknown,date:unknown,payload:unknown,notes=''){
 const parsed=z.object({category:recordCategory,date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),payload:z.record(z.string(),z.unknown()),notes:z.string().max(5000)}).parse({category,date,payload,notes});
 const {db,user}=await context();const result=await db.from('health_records').insert({user_id:user.id,category:parsed.category,recorded_on:parsed.date,recorded_at:new Date().toISOString(),payload:{...parsed.payload,notes:parsed.notes},source:'manual'}).select().single();check(result.error);revalidatePath('/','layout');return result.data;
}
export async function saveDiaryRecord(input:unknown){
 const value=diarySchema.parse(input);const session=await context();const userId=healthUserId()??session.user.id;const db=healthUserId()?healthService():session.db;
 if(value.kind==='water'){
  const event=eventSchema.parse({timestamp:value.occurred_at,timezone:'Europe/London',type:'water',source:'manual',measurement_type:'measured',estimated:false,notes:value.notes,data:{kind:'water',volume:value.volume_ml!,beverage:'água'}});
  const result=await db.from('events').insert({...event,user_id:userId}).select().single();check(result.error);revalidatePath('/','layout');return {storage:'event',record:result.data};
 }
 const category=value.kind==='bowel'?'bowel':value.kind==='checkin'||value.kind==='activity'?'checkin_history':'supplement';
 const payload={...value,record_type:value.kind};
 const result=await db.from('health_records').insert({user_id:userId,category,recorded_on:localDate(new Date(value.occurred_at)),recorded_at:value.occurred_at,payload,source:'manual'}).select().single();check(result.error);revalidatePath('/','layout');return {storage:'record',record:result.data};
}
export async function saveHealthProfile(profile:unknown){const value=z.record(z.string(),z.unknown()).parse(profile);await mergeProfileSection(Object.fromEntries(Object.entries(value).filter(([key])=>!key.startsWith('personal_'))));return true;}
export async function updateTennisScore(recordId:unknown,setsInput:unknown){
 const sets=z.array(z.object({felipe:z.number().int().min(0).max(99),adversario:z.number().int().min(0).max(99)})).min(1).max(5).parse(setsInput);
 const id=z.string().uuid().parse(recordId);const session=await context();const userId=healthUserId()??session.user.id,db=healthUserId()?healthService():session.db;
 const current=await db.from('health_records').select('payload').eq('id',id).eq('user_id',userId).in('category',['tennis','workout','activity']).single();check(current.error);
 const won=sets.filter(set=>set.felipe>set.adversario).length,lost=sets.filter(set=>set.adversario>set.felipe).length;
 if(!current.data)throw new Error('Partida não encontrada.');
 const payload={...(current.data.payload as Record<string,unknown>),sets,score:sets.map(set=>`${set.felipe}-${set.adversario}`).join(', '),...(won===lost?{}:{outcome:won>lost?'vitória':'derrota'})};
 const result=await db.from('health_records').update({payload,source:'manual'}).eq('id',id).eq('user_id',userId).select().single();check(result.error);revalidatePath('/','layout');return result.data;
}

export async function clearExerciseHistory(){const session=await context();const userId=healthUserId()??session.user.id;const db=healthUserId()?healthService():session.db;const result=await db.from('health_records').delete().eq('user_id',userId).in('category',['activity','workout']);check(result.error);revalidatePath('/','layout');return true;}
export async function applyRecommendedTargets(){const session=await context();const userId=healthUserId()??session.user.id;const db=healthUserId()?healthService():session.db;const exact=(min:number)=>({kind:'exact',min,max:null}),range=(min:number,max:number)=>({kind:'range',min,max}),maximum=(max:number)=>({kind:'maximum',min:null,max});const plan:Record<string,unknown>={
 'dia sem tênis · caminhada com Caju':{water:range(2600,3100),calories:range(2200,2450),protein:range(110,125),carbs:range(200,250),fat:range(60,75),saturated_fat:maximum(20),fibre:range(28,35),steps:exact(9000),exercise:exact(60),sleep:range(450,540)},
 'dia de tênis · jogo da liga':{water:range(3200,3800),calories:range(2700,3100),protein:range(120,140),carbs:range(330,400),fat:range(60,75),saturated_fat:maximum(22),fibre:range(28,38),steps:exact(12000),exercise:exact(140),sleep:range(480,540)},
 'dia de tênis · jogo amistoso':{water:range(3000,3500),calories:range(2500,2850),protein:range(115,135),carbs:range(290,350),fat:range(60,75),saturated_fat:maximum(22),fibre:range(28,36),steps:exact(11000),exercise:exact(120),sleep:range(470,540)},
 'dia de tênis · treino leve':{water:range(2800,3300),calories:range(2400,2700),protein:range(115,130),carbs:range(250,310),fat:range(60,75),saturated_fat:maximum(20),fibre:range(28,35),steps:exact(10000),exercise:exact(90),sleep:range(470,540)},
 'dia de tênis · treino intenso':{water:range(3100,3700),calories:range(2600,3000),protein:range(120,140),carbs:range(310,380),fat:range(60,75),saturated_fat:maximum(22),fibre:range(28,38),steps:exact(12000),exercise:exact(130),sleep:range(480,540)},
 'recuperação':{water:range(2700,3200),calories:range(2200,2500),protein:range(125,145),carbs:range(210,270),fat:range(65,80),saturated_fat:maximum(20),fibre:range(30,38),steps:exact(8000),exercise:exact(45),sleep:range(480,570)},
 'customizado':{water:range(2700,3200),calories:range(2300,2600),protein:range(115,135),carbs:range(230,290),fat:range(60,75),saturated_fat:maximum(20),fibre:range(28,35),steps:exact(9000),exercise:exact(60),sleep:range(470,540)}
};const rows=Object.entries(plan).map(([day_type,targets])=>({user_id:userId,name:day_type,day_type,targets}));const result=await db.from('target_templates').upsert(rows,{onConflict:'user_id,day_type'}).select();check(result.error);revalidatePath('/','layout');return result.data;}
export async function deleteHealthRecord(recordId:unknown){const id=z.string().uuid().parse(recordId);const session=await context();const userId=healthUserId()??session.user.id;const db=healthUserId()?healthService():session.db;const result=await db.from('health_records').delete().eq('id',id).eq('user_id',userId);check(result.error);revalidatePath('/','layout');return true;}

// Merge profile sections with optimistic concurrency so independent screens cannot overwrite each other.
async function mergeProfileSection(patch:Record<string,unknown>){
 const session=await context();const userId=healthUserId()??session.user.id;const db=healthUserId()?healthService():session.db;
 for(let attempt=0;attempt<4;attempt++){
  const current=await db.from('health_profiles').select('profile,updated_at').eq('user_id',userId).maybeSingle();check(current.error);
  const profile={...(current.data?.profile??{}),...patch};
  if(!current.data){const added=await db.from('health_profiles').upsert({user_id:userId,profile},{onConflict:'user_id',ignoreDuplicates:true}).select('user_id');check(added.error);if(added.data?.length){revalidatePath('/','layout');return;}}
  else {const updated=await db.from('health_profiles').update({profile,updated_at:new Date().toISOString()}).eq('user_id',userId).eq('updated_at',current.data.updated_at).select('user_id');check(updated.error);if(updated.data?.length){revalidatePath('/','layout');return;}}
 }
 throw new Error('Os dados foram alterados em outra tela. Atualize e tente novamente.');
}
export async function savePersonalSection(section:unknown,input:unknown){
 const key=z.enum(['finance','trips','car','bills','dates','preferences','tennis','credit_card','tennis_league','exams','dog','settings','holdings']).parse(section);
 const {financeSchema,tripSchema,carSchema}=await import('@/lib/personal');
 const {billsSchema,datesSchema,preferencesSchema}=await import('@/lib/life');
 const {tennisProfileSchema}=await import('@/lib/tennis-club');
 const {creditCardSchema}=await import('@/lib/credit-card');
 const {tennisLeagueSchema}=await import('@/lib/tennis-league');
 const {examsSchema}=await import('@/lib/exams');
 const {dogSchema}=await import('@/lib/dog');
 const {settingsSchema}=await import('@/lib/settings');
 const {holdingsSchema}=await import('@/lib/holdings');
 const value=key==='holdings'?holdingsSchema.parse(input):key==='settings'?settingsSchema.parse(input):key==='exams'?examsSchema.parse(input):key==='dog'?dogSchema.parse(input):key==='tennis_league'?tennisLeagueSchema.parse(input):key==='credit_card'?creditCardSchema.parse(input):key==='tennis'?tennisProfileSchema.parse(input):key==='bills'?billsSchema.parse(input):key==='dates'?datesSchema.parse(input):key==='preferences'?preferencesSchema.parse(input):key==='finance'?financeSchema.parse(input):key==='trips'?z.array(tripSchema).max(1000).parse(input):carSchema.parse(input);
 await mergeProfileSection({['personal_'+key]:value});return true;
}

/** Saves one of Caju's meals or activities (the Registrar form and the Caju page). */
export async function saveDogEntry(kind:unknown,input:unknown){
 const list=z.enum(['meals','activities']).parse(kind);const {readDog,dogSchema}=await import('@/lib/dog');const {prepareDogMeal,prepareDogActivity,upsertById}=await import('@/lib/dog-food');const {updateProfile}=await import('@/lib/profile-store');
 const session=await context();const db=healthUserId()?healthService():session.db;let saved:any;
 await updateProfile(db,healthUserId()??session.user.id,profile=>{const dog=readDog(profile.personal_dog);const value=input as Record<string,any>;
  if(list==='meals'){saved=prepareDogMeal(value,dog.foodBags);return {...profile,personal_dog:dogSchema.parse({...dog,meals:upsertById(dog.meals,saved)})};}
  saved=prepareDogActivity(value);return {...profile,personal_dog:dogSchema.parse({...dog,activities:upsertById(dog.activities,saved)})};});
 revalidatePath('/','layout');return saved;
}

/** Live prices of the portfolio (refresh button) and, optionally, this week's snapshot. */
export async function refreshPortfolio(snapshot=false){
 const session=await context();const db=healthUserId()?healthService():session.db;const userId=healthUserId()??session.user.id;
 const {livePortfolio,ensureWeeklySnapshot}=await import('@/lib/portfolio-data');const {readHoldings}=await import('@/lib/holdings');
 const result=await db.from('health_profiles').select('profile').eq('user_id',userId).maybeSingle();
 const live=await livePortfolio(readHoldings(result.data?.profile?.personal_holdings));
 const snap=snapshot?await ensureWeeklySnapshot(db,userId):null;if(snap?.created)revalidatePath('/','layout');
 return {...live,snapshot:snap};
}

/** Everything stored in the owner's profile, for a JSON backup. */
export async function exportProfile(){const session=await context();const db=healthUserId()?healthService():session.db;const result=await db.from('health_profiles').select('profile').eq('user_id',healthUserId()??session.user.id).maybeSingle();if(result.error)throw new Error('Não foi possível exportar.');return {exported_at:new Date().toISOString(),profile:result.data?.profile??{}};}

export async function saveInvestment(input:unknown){const {investmentSnapshotSchema,appendSnapshot,investmentsSchema}=await import('@/lib/investments');const {updateProfile}=await import('@/lib/profile-store');const {priceInPounds}=await import('@/lib/investment-fx');const snapshot=await priceInPounds(investmentSnapshotSchema.parse(input));const session=await context();const db=healthUserId()?healthService():session.db;const saved=await updateProfile(db,healthUserId()??session.user.id,profile=>({...profile,personal_investments:appendSnapshot(investmentsSchema.parse(profile.personal_investments??[]),snapshot)}));revalidatePath('/','layout');return {saved:true,id:snapshot.id,snapshot:saved.personal_investments.find((s:any)=>s.id===snapshot.id)};}

export async function updateTennisDetails(recordId:unknown,input:unknown){
 const id=z.string().uuid().parse(recordId);
 const value=z.object({match_type:z.string().max(100),opponent_or_partner:z.string().max(200),duration_minutes:z.number().finite().nonnegative().nullable(),analysis:z.string().max(10000)}).parse(input);
 const session=await context();const userId=healthUserId()??session.user.id,db=healthUserId()?healthService():session.db;
 const current=await db.from('health_records').select('payload').eq('id',id).eq('user_id',userId).in('category',['tennis','workout','activity']).single();check(current.error);if(!current.data)throw new Error('Partida não encontrada.');
 const result=await db.from('health_records').update({payload:{...current.data.payload,...value}}).eq('id',id).eq('user_id',userId).in('category',['tennis','workout','activity']);check(result.error);revalidatePath('/','layout');return true;
}
