import { z } from 'zod';

/** Options and medicines are configurable; the defaults live in lib/settings.ts. */
export { defaultMedicines as medicines } from './settings';

const list=z.array(z.string().trim().min(1).max(200)).max(30).default([]);
export const diarySchema=z.object({
 kind:z.enum(['checkin','activity','bowel','water','vitamins','medication']), occurred_at:z.string().datetime({offset:true}), notes:z.string().max(5000).default(''),
 mental:list,emotions:list,body:list,digestion:list,activities:list,interest:z.string().trim().min(1).max(200).optional(),custom:z.record(z.string().max(60),z.array(z.string().trim().min(1).max(200)).max(30)).default({}),emotion_notes:z.string().max(5000).default(''),body_notes:z.string().max(5000).default(''),
 quantity:list,consistency:list,routines:list,medicines:z.array(z.object({name:z.string().min(1),composition:z.string(),dose:z.string().max(200).optional()})).max(20).default([]),volume_ml:z.number().positive().max(10000).optional(),
}).superRefine((value,context)=>{
 const fields=value.kind==='checkin'?['mental','emotions','body','digestion']:value.kind==='activity'?['activities']:value.kind==='bowel'?['quantity','consistency']:value.kind==='vitamins'?['routines']:value.kind==='medication'?['medicines']:[];
 if(fields.length&&!fields.some(key=>(value[key as keyof typeof value] as unknown[])?.length)&&!Object.values(value.custom).some(v=>v.length))context.addIssue({code:'custom',message:'Selecione pelo menos uma opção.'});
 if(value.kind==='water'&&!value.volume_ml)context.addIssue({code:'custom',message:'Informe o volume de água.'});
});
export type DiaryInput=z.infer<typeof diarySchema>;
export const diaryLabels={checkin:'Check-in',activity:'Atividade',bowel:'Fezes',water:'Água',vitamins:'Vitaminas',medication:'Remédio'} as const;
export function diaryDescription(data:Record<string,unknown>){
 return ['mental','emotions','body','digestion','activities','interest','quantity','consistency','routines','emotion_notes','body_notes'].flatMap(key=>Array.isArray(data[key])?data[key] as string[]:typeof data[key]==='string'&&data[key]?[data[key] as string]:[]).concat(data.custom&&typeof data.custom==='object'?Object.values(data.custom as Record<string,unknown>).flatMap(v=>Array.isArray(v)?v.map(String):typeof v==='string'&&v?[v]:[]):[]).concat(Array.isArray(data.medicines)?data.medicines.map((item:any)=>`${item.name}${item.dose?` (${item.dose})`:''}`):[]).join(' · ');
}
