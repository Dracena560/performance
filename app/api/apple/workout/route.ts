import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { shortcutWorkout,fromHealthAutoExport } from '@/lib/apple-shortcut';
import { saveExercise } from '@/lib/save-exercise';
export const runtime='nodejs';
export const dynamic='force-dynamic';

/** Token from "Authorization: Bearer …" or "x-health-action-key"; APPLE_SHORTCUT_TOKEN, else HEALTH_GPT_ACTION_KEY. */
function authorised(request:Request){
 const expected=process.env.APPLE_SHORTCUT_TOKEN||process.env.HEALTH_GPT_ACTION_KEY;if(!expected)return false;
 const header=request.headers.get('authorization')?.replace(/^Bearer\s+/i,'')??request.headers.get('x-health-action-key')??'';
 const a=Buffer.from(header),b=Buffer.from(expected);return a.length===b.length&&timingSafeEqual(a,b);
}
const minutes=(s:unknown)=>typeof s==='number'?`${Math.floor(s/3600)?`${Math.floor(s/3600)}h`:''}${String(Math.round(s%3600/60)).padStart(Math.floor(s/3600)?2:1,'0')}min`:'';

/**
 * Apple Watch workout → site, called by an iPhone Shortcut automation when a workout ends.
 * Accepts one workout or { workouts: [...] }. Re-sending the same workout (same start) updates it.
 */
export async function POST(request:Request){
 if(!authorised(request))return NextResponse.json({ok:false,error:'Não autorizado. Envie Authorization: Bearer <token>.'},{status:401});
 if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY||!process.env.HEALTH_GPT_USER_ID)return NextResponse.json({ok:false,error:'Servidor sem Supabase configurado.'},{status:503});
 let body:any;const text=await request.text();
 try{body=text?JSON.parse(text):{};}catch{body=Object.fromEntries(new URLSearchParams(text));}
 const list:Record<string,unknown>[]=fromHealthAutoExport(body)??(Array.isArray(body)?body:Array.isArray(body?.workouts)?body.workouts:[body]);
 const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const results=[];
 for(const item of list.slice(0,20)){
  try{const w=shortcutWorkout(item??{});const saved:any=await saveExercise(db,process.env.HEALTH_GPT_USER_ID,{...w,notes:typeof item?.notas==='string'?item.notas:typeof item?.notes==='string'?item.notes:undefined});
   const d=w.data;results.push({ok:true,id:saved?.id,date:w.date,message:[`${d.activity_type} salvo`,minutes(d.duration_seconds),d.active_calories?`${d.active_calories} kcal`:'',d.distance_km?`${d.distance_km} km`:'',d.heart_rate_average?`FC ${d.heart_rate_average}`:''].filter(Boolean).join(' · ')});}
  catch(e){results.push({ok:false,error:e instanceof Error?e.message:'Não foi possível salvar.'});}
 }
 revalidatePath('/','layout');
 const ok=results.every(r=>r.ok);
 return NextResponse.json({ok,message:results.map(r=>r.ok?r.message:`Erro: ${r.error}`).join('\n'),results},{status:ok?200:422});
}
/** Quick check from the browser that the endpoint exists. */
export async function GET(){return NextResponse.json({ok:true,endpoint:'POST /api/apple/workout',auth:'Authorization: Bearer <APPLE_SHORTCUT_TOKEN>',example:{tipo:'Futebol',inicio:'2026-10-06T19:00:00+01:00',fim:'2026-10-06T20:15:00+01:00',duracao:'1:15:00',calorias_ativas:'820 kcal',calorias_totais:'960 kcal',distancia:'6,3 km',fc_media:'144',fc_maxima:'176',passos:'8200'}});}
