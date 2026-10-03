import { z } from 'zod';

export const diaryOptions={
 mental:['Apático','Sonolento','Lesado','Neutro','Levemente cansado','Muito cansado','Leve','Ativo','Boa clareza','Turbo'],
 emotions:['Mau-humorado','Desanimado','Irritado','Frustrado','Ansioso','Entediado','Neutro','Tranquilo','Bem-humorado','Motivado','Animado','Satisfeito'],
 body:['Pesado','Lento','Dolorido','Cansado','Tenso','Dor de cabeça','Leve','Ativo','Descansado'],
 digestion:['Com fome','Sem fome','Gases leve','Gases moderado','Muito gases','Desconforto gastro','Náusea','Estufado','Leve','Sem desconforto'],
 activities:['Trabalho Santander','Trabalho Rapidocs','Caminhando com Caju','Ambiente com luz natural','Ambiente sem luz natural','Ambiente silencioso','Ambiente barulhento','Procrastinando','Rede social','Tocando clarinete','Leitura','Arrumando a casa','Passeio com a Sara','Viagem'],
 interest:['Nenhuma','Baixa','Média','Alta','Muito engajado'],
 quantity:['Quase nada','Muito pouco','Pouco','Moderado','Muito'],
 consistency:['Líquido','Muito mole (sem formação)','Mole (formada)','Média','Firme','Seca e dura'],
 routines:['Vitaminas do dia','Vitaminas da noite'],
} as const;

export const medicines=[
 {name:'Anadin Extra',composition:'Ácido acetilsalicílico 300 mg + paracetamol 200 mg + cafeína 45 mg por comprimido'},
 {name:'Aspirina',composition:'Ácido acetilsalicílico · concentração conforme embalagem'},
 {name:'Dipirona',composition:'Dipirona (metamizol) · concentração conforme embalagem'},
 {name:'Torsilax',composition:'Carisoprodol 125 mg + diclofenaco sódico 50 mg + paracetamol 300 mg + cafeína 30 mg por comprimido'},
 {name:'Miosan',composition:'Cloridrato de ciclobenzaprina · concentração conforme embalagem'},
 {name:'Anadin Flu Max Strength',composition:'Composição a confirmar na embalagem'},
] as const;

const list=z.array(z.string().trim().min(1).max(200)).max(30).default([]);
export const diarySchema=z.object({
 kind:z.enum(['checkin','activity','bowel','water','vitamins','medication']), occurred_at:z.string().datetime({offset:true}), notes:z.string().max(5000).default(''),
 mental:list,emotions:list,body:list,digestion:list,activities:list,interest:z.enum(diaryOptions.interest).optional(),emotion_notes:z.string().max(5000).default(''),body_notes:z.string().max(5000).default(''),
 quantity:list,consistency:list,routines:list,medicines:z.array(z.object({name:z.string().min(1),composition:z.string(),dose:z.string().max(200).optional()})).max(20).default([]),volume_ml:z.number().positive().max(10000).optional(),
}).superRefine((value,context)=>{
 const fields=value.kind==='checkin'?['mental','emotions','body','digestion']:value.kind==='activity'?['activities']:value.kind==='bowel'?['quantity','consistency']:value.kind==='vitamins'?['routines']:value.kind==='medication'?['medicines']:[];
 if(fields.length&&!fields.some(key=>(value[key as keyof typeof value] as unknown[])?.length))context.addIssue({code:'custom',message:'Selecione pelo menos uma opção.'});
 if(value.kind==='water'&&!value.volume_ml)context.addIssue({code:'custom',message:'Informe o volume de água.'});
});
export type DiaryInput=z.infer<typeof diarySchema>;
export const diaryLabels={checkin:'Check-in',activity:'Atividade',bowel:'Fezes',water:'Água',vitamins:'Vitaminas',medication:'Remédio'} as const;
export function diaryDescription(data:Record<string,unknown>){
 return ['mental','emotions','body','digestion','activities','interest','quantity','consistency','routines','emotion_notes','body_notes'].flatMap(key=>Array.isArray(data[key])?data[key] as string[]:typeof data[key]==='string'&&data[key]?[data[key] as string]:[]).concat(Array.isArray(data.medicines)?data.medicines.map((item:any)=>`${item.name}${item.dose?` (${item.dose})`:''}`):[]).join(' · ');
}
