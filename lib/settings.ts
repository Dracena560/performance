import { z } from 'zod';

/**
 * General settings: everything that used to be fixed in the code and that the owner may want to change —
 * Registrar topics and options (with their 0–10 score), supplement routines, medicines, water buttons,
 * day targets, due-date rules, finance rules, training load, name and menu.
 */
export const dimensionKeys=['mente','humor','corpo','digestao'] as const;
export const topicKinds=['checkin','activity','bowel'] as const;
/** Built-in Registrar fields; custom topics are stored in payload.custom[topicId]. */
export const builtinFields=['mental','emotions','body','digestion','activities','interest','quantity','consistency'] as const;

const label=z.string().trim().min(1).max(120);
export const optionSchema=z.object({label,score:z.number().min(0).max(10).nullable().default(null)});
export const topicSchema=z.object({
 id:z.string().trim().min(1).max(60).regex(/^[a-z0-9_-]+$/,'Use letras minúsculas, números, - ou _'),
 kind:z.enum(topicKinds),
 title:label,
 help:z.string().max(200).default(''),
 dimension:z.enum(dimensionKeys).nullable().default(null),
 multiple:z.boolean().default(true),
 notes:z.boolean().default(false),
 enabled:z.boolean().default(true),
 options:z.array(optionSchema).max(60).default([])
});
export const routineSchema=z.object({name:label,period:z.enum(['dia','noite','outro']).default('outro'),items:z.array(label).max(40).default([])});
export const medicineSchema=z.object({name:label,composition:z.string().max(300).default('')});
export const waterButtonSchema=z.object({label:z.string().trim().min(1).max(40),ml:z.number().int().min(10).max(5000)});
export const reminderSources=['Carro','Contas','Gastos fixos','Cartão de crédito','Documentos e datas','Exames','Pet'] as const;
export const navigationToggles=['financeiro','tenis','caju'] as const;

export const settingsSchema=z.object({
 profile:z.object({name:z.string().trim().max(60).default('Felipe'),tagline:z.string().max(60).default('')}).default({}),
 menu:z.object({hidden:z.array(z.enum(navigationToggles)).default([])}).default({}),
 diary:z.object({topics:z.array(topicSchema).max(40).default([])}).default({}),
 routines:z.array(routineSchema).max(20).default([]),
 medicines:z.array(medicineSchema).max(60).default([]),
 water:z.object({buttons:z.array(waterButtonSchema).max(6).default([])}).default({}),
 day:z.object({sleepHours:z.number().min(4).max(12).default(8),goodNightHours:z.number().min(4).max(12).default(7),movementMinutes:z.number().int().min(5).max(300).default(30),historyDays:z.number().int().min(7).max(60).default(14)}).default({}),
 reminders:z.object({windowDays:z.number().int().min(1).max(60).default(5),sources:z.array(z.enum(reminderSources)).default([...reminderSources])}).default({}),
 finance:z.object({emergencyMonths:z.number().min(1).max(24).default(6),includeChecking:z.boolean().default(true),subtractCard:z.boolean().default(true),incomeLabels:z.tuple([z.string().max(40),z.string().max(40)]).default(['Felipe','Sara'])}).default({}),
 training:z.object({defaultEffort:z.number().min(0).max(10).default(5),highRatio:z.number().min(1).max(3).default(1.3),spikeRatio:z.number().min(1).max(4).default(1.5)}).default({}),
 dog:z.object({careWindowDays:z.number().int().min(7).max(180).default(45),lowStock:z.number().int().min(0).max(100).default(5)}).default({})
}).superRefine((s,c)=>{
 const ids=s.diary.topics.map(t=>t.id);if(new Set(ids).size!==ids.length)c.addIssue({code:'custom',message:'Cada tópico precisa de um identificador único.'});
 for(const t of s.diary.topics){const names=t.options.map(o=>o.label.toLowerCase());if(new Set(names).size!==names.length)c.addIssue({code:'custom',message:`Opção repetida em ${t.title}.`});}
 if(s.training.spikeRatio<s.training.highRatio)c.addIssue({code:'custom',message:'O pico precisa ser maior que o limite de "acima do normal".'});
});
export type Settings=z.infer<typeof settingsSchema>;
export type Topic=z.infer<typeof topicSchema>;
export type Routine=z.infer<typeof routineSchema>;

const o=(pairs:[string,number|null][])=>pairs.map(([label,score])=>({label,score}));
export const defaultTopics:Topic[]=[
 {id:'mental',kind:'checkin',title:'Mental',help:'Selecione quantos quiser',dimension:'mente',multiple:true,notes:false,enabled:true,options:o([['Apático',2],['Sonolento',3],['Lesado',2],['Neutro',5],['Levemente cansado',4],['Muito cansado',2],['Leve',7],['Ativo',8],['Boa clareza',9],['Turbo',10]])},
 {id:'emotions',kind:'checkin',title:'Emoções',help:'Selecione quantas quiser',dimension:'humor',multiple:true,notes:true,enabled:true,options:o([['Mau-humorado',2],['Desanimado',2],['Irritado',2],['Frustrado',3],['Ansioso',3],['Entediado',4],['Neutro',5],['Tranquilo',7],['Bem-humorado',8],['Motivado',9],['Animado',9],['Satisfeito',8]])},
 {id:'body',kind:'checkin',title:'Corpo',help:'Selecione quantos quiser',dimension:'corpo',multiple:true,notes:true,enabled:true,options:o([['Pesado',3],['Lento',4],['Dolorido',3],['Cansado',3],['Tenso',3],['Dor de cabeça',2],['Leve',8],['Ativo',8],['Descansado',9]])},
 {id:'digestion',kind:'checkin',title:'Digestão',help:'Selecione quantos quiser',dimension:'digestao',multiple:true,notes:false,enabled:true,options:o([['Com fome',6],['Sem fome',6],['Gases leve',5],['Gases moderado',4],['Muito gases',2],['Desconforto gastro',2],['Náusea',1],['Estufado',3],['Leve',9],['Sem desconforto',9]])},
 {id:'activities',kind:'activity',title:'Atividade e ambiente',help:'Selecione quantos quiser',dimension:null,multiple:true,notes:false,enabled:true,options:o(['Trabalho Santander','Trabalho Rapidocs','Caminhando com Caju','Ambiente com luz natural','Ambiente sem luz natural','Ambiente silencioso','Ambiente barulhento','Procrastinando','Rede social','Tocando clarinete','Leitura','Arrumando a casa','Passeio com a Sara','Viagem'].map(l=>[l,null]))},
 {id:'interest',kind:'activity',title:'Interesse na atividade',help:'',dimension:null,multiple:false,notes:false,enabled:true,options:o(['Nenhuma','Baixa','Média','Alta','Muito engajado'].map(l=>[l,null]))},
 {id:'quantity',kind:'bowel',title:'Quantidade',help:'Selecione as opções que descrevem o registro',dimension:null,multiple:true,notes:false,enabled:true,options:o(['Quase nada','Muito pouco','Pouco','Moderado','Muito'].map(l=>[l,null]))},
 {id:'consistency',kind:'bowel',title:'Consistência',help:'Selecione as opções aplicáveis',dimension:null,multiple:true,notes:false,enabled:true,options:o(['Líquido','Muito mole (sem formação)','Mole (formada)','Média','Firme','Seca e dura'].map(l=>[l,null]))}
];
export const defaultRoutines:Routine[]=[
 {name:'Vitaminas do dia',period:'dia',items:['Vitamina D','Vitamina E','Ômega-3','CoQ10','Selênio','Vitamina C','Glucosamina']},
 {name:'Vitaminas da noite',period:'noite',items:['Magnésio','Ashwagandha']}
];
export const defaultMedicines=[
 {name:'Anadin Extra',composition:'Ácido acetilsalicílico 300 mg + paracetamol 200 mg + cafeína 45 mg por comprimido'},
 {name:'Aspirina',composition:'Ácido acetilsalicílico · concentração conforme embalagem'},
 {name:'Dipirona',composition:'Dipirona (metamizol) · concentração conforme embalagem'},
 {name:'Torsilax',composition:'Carisoprodol 125 mg + diclofenaco sódico 50 mg + paracetamol 300 mg + cafeína 30 mg por comprimido'},
 {name:'Miosan',composition:'Cloridrato de ciclobenzaprina · concentração conforme embalagem'},
 {name:'Anadin Flu Max Strength',composition:'Composição a confirmar na embalagem'}
];
export const defaultWaterButtons=[{label:'Copo',ml:650},{label:'Garrafa',ml:590}];

/** Fills lists that were never customised with the defaults, so a fresh profile behaves like before. */
export function readSettings(value:unknown):Settings{
 const parsed=settingsSchema.safeParse(value??{});const s=parsed.success?parsed.data:settingsSchema.parse({});
 const raw=(value??{}) as any;
 return {...s,
  diary:{topics:Array.isArray(raw?.diary?.topics)&&parsed.success?s.diary.topics:defaultTopics},
  routines:Array.isArray(raw?.routines)&&parsed.success?s.routines:defaultRoutines,
  medicines:Array.isArray(raw?.medicines)&&parsed.success?s.medicines:defaultMedicines,
  water:{buttons:Array.isArray(raw?.water?.buttons)&&parsed.success?s.water.buttons:defaultWaterButtons}};
}
export const defaultSettings=readSettings(undefined);

/** Topics of one Registrar type, in order, only the enabled ones. */
export const topicsOf=(s:Settings,kind:Topic['kind'])=>s.diary.topics.filter(t=>t.kind===kind&&t.enabled);
/** Where a topic's answers live in the record payload. */
export const isBuiltin=(id:string)=>(builtinFields as readonly string[]).includes(id);
export function topicValues(payload:Record<string,unknown>,id:string):string[]{
 const raw=isBuiltin(id)?payload[id]:(payload.custom as Record<string,unknown>|undefined)?.[id];
 return Array.isArray(raw)?raw.map(String):typeof raw==='string'&&raw?[raw]:[];
}
/** label → score for every check-in dimension, used to turn choices into 0–10 scores. */
export function scoreMap(s:Settings){
 const out:Record<string,{dimension:string;values:Record<string,number>}>={};
 for(const t of s.diary.topics)if(t.dimension)out[t.id]={dimension:t.dimension,values:Object.fromEntries(t.options.filter(x=>x.score!==null).map(x=>[x.label,x.score as number]))};
 return out;
}
/** Supplements inside each routine (routine name → items). */
export const routineItems=(s:Settings)=>Object.fromEntries(s.routines.map(r=>[r.name,r.items]));
export const takingSupplements=(s:Settings)=>[...new Set(s.routines.flatMap(r=>r.items))];
