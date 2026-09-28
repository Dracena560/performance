import {createHash,randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {SupabaseClient} from '@supabase/supabase-js';
import {exerciseCategory,exercisePayloadSchema} from './exercise-records';
import {siteRead,siteWrite} from './site-crud';
export async function saveExercise(db:SupabaseClient,userId:string,args:Record<string,unknown>,tennis=false){
 const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(args.date);
 const parsed=exercisePayloadSchema.parse(args.data),{record_id,...payload}=parsed;
 if(typeof args.notes==='string'&&args.notes)payload.notes=args.notes;
 const category=exerciseCategory(payload,tennis);
 let explicit=args.record_id??record_id;
 if(!explicit&&payload.started_at){
  const existing=await db.from('health_records').select('id,category,payload').eq('user_id',userId).eq('recorded_on',date);
  if(existing.error)throw new Error('Não foi possível conferir treinos existentes.');
  const matches=(existing.data??[]).filter(row=>['tennis','workout','activity'].includes(row.category)&&Date.parse(row.payload?.started_at)===Date.parse(payload.started_at!));
  if(matches.length>1)throw new Error('Há mais de um registro neste horário. Consulte e informe record_id.');
  if(matches.length===1)explicit=matches[0].id;
 }
 const key=category==='daily_metrics'?`daily:${date}:${payload.source??'Apple Fitness'}`:payload.started_at?`workout:${new Date(payload.started_at).toISOString()}`:null;
 const hash=key?createHash('sha256').update(userId+':'+key).digest('hex'):null;
 const id=explicit?z.string().uuid().parse(explicit):hash?`${hash.slice(0,8)}-${hash.slice(8,12)}-4${hash.slice(13,16)}-8${hash.slice(17,20)}-${hash.slice(20,32)}`:randomUUID();
 const read=await siteRead(db,userId,{resource:'registros',id});const item=read.items?.[0];
 if(explicit&&!item)throw new Error('Registro indicado não encontrado. Consulte os registros antes de atualizar.');
 if(item){if(!['activity','workout','tennis','daily_metrics'].includes(item.data.category)||item.data.recorded_on!==date||(item.data.category==='daily_metrics')!==(category==='daily_metrics'))throw new Error('O registro indicado não corresponde ao tipo/data enviado.');
 const safeCategory=item.data.category==='tennis'?'tennis':category;
 return siteWrite(db,userId,'edit',{resource:'registros',id,expected_version:item.version,operations:[{op:'replace',path:'/category',value:safeCategory},...(category==='daily_metrics'?[{op:'replace',path:'/recorded_at',value:payload.snapshot_at??new Date().toISOString()}]:[]),...Object.entries(payload).map(([key,value])=>({op:'add',path:'/payload/'+key.replaceAll('~','~0').replaceAll('/','~1'),value}))]});}
 return siteWrite(db,userId,'add',{resource:'registros',id,data:{category,recorded_on:date,recorded_at:new Date().toISOString(),source:'ChatGPT',payload}});
}
