import { z } from 'zod';
export const timezone='Europe/London';
export const dayTypes=['descanso','normal','tênis leve','tênis moderado','tênis intenso','customizado'] as const;
export const metricInfo={water:['Água','ml'],calories:['Calorias','kcal'],protein:['Proteína','g'],carbs:['Carboidratos','g'],fat:['Gordura','g'],saturated_fat:['Gordura saturada','g'],fibre:['Fibra','g'],steps:['Passos','passos'],exercise:['Exercício','min'],sleep:['Sono','min']} as const;
export type Metric=keyof typeof metricInfo;
export const targetSchema=z.object({kind:z.enum(['minimum','maximum','range','exact']),min:z.number().nonnegative().nullable(),max:z.number().positive().nullable()}).superRefine((v,c)=>{
 if(v.kind==='range'&&(v.min===null||v.max===null||v.min>v.max))c.addIssue({code:'custom',message:'Intervalo inválido'});
 if((v.kind==='minimum'||v.kind==='exact')&&(v.min===null||v.min<=0))c.addIssue({code:'custom',message:'Informe um alvo maior que zero'});
 if(v.kind==='maximum'&&v.max===null)c.addIssue({code:'custom',message:'Informe um limite'});
});
export type Target=z.infer<typeof targetSchema>;
export type Targets=Partial<Record<Metric,Target>>;
export const groups={
 'Mental':{energy:'Energia física',clarity:'Clareza mental',motivation:'Motivação',activation:'Ativação mental',focus:'Foco',sleepiness:'Sonolência',sluggishness:'Leseira',mental_fatigue:'Fadiga mental',procrastination:'Procrastinação',initiative:'Vontade de iniciar tarefas',engagement:'Engajamento'},
 'Emoções':{stress:'Estresse',anxiety:'Ansiedade',irritability:'Irritabilidade',agitation:'Agitação'},
 'Corpo':{heaviness:'Sensação de peso',physical_fatigue:'Fadiga física',muscle_pain:'Dor muscular',tension:'Tensão corporal',headache:'Dor de cabeça',eye_pain:'Pressão atrás do olho'},
 'Digestão':{hunger:'Fome',satiety:'Saciedade',gas:'Gases',bloating:'Estufamento',gi_discomfort:'Desconforto gastrointestinal',nausea:'Náusea',urgency:'Urgência intestinal'},
 'Contexto':{interest:'Interesse na atividade',mental_load:'Carga mental',difficulty:'Dificuldade',pleasure:'Prazer/satisfação'}
};
export const scoreKeys=Object.values(groups).flatMap(x=>Object.keys(x));
export const scoresSchema=z.record(z.string(),z.number().min(0).max(10).nullable()).refine(x=>Object.keys(x).every(k=>scoreKeys.includes(k)),'Campo de check-in inválido');
export const nutrients=['calories','protein','carbs','fat','saturated_fat','fibre','sugar','sodium'] as const;
const nutrientShape=Object.fromEntries(nutrients.map(k=>[k,z.number().nonnegative().nullable()])) as Record<typeof nutrients[number],z.ZodNullable<z.ZodNumber>>;
export const nutritionSchema=z.object(nutrientShape);
export type Nutrition=z.infer<typeof nutritionSchema>;
export const foodSchema=z.object({name:z.string().trim().min(1).max(200),brand:z.string().max(100).default(''),nutrition:nutritionSchema,favorite:z.boolean().default(false)});
export type Food=z.infer<typeof foodSchema>&{id:string};
export const itemSchema=z.object({food_id:z.string().uuid().nullable(),name:z.string().min(1),grams:z.number().positive().max(10000),nutrition:nutritionSchema});
export const eventSchema=z.object({
 timestamp:z.string().datetime({offset:true}),timezone:z.literal(timezone),type:z.enum(['water','checkin','meal']),source:z.enum(['manual','estimativa IA','foto','importação','Apple Health','Apple Watch','planilha','ChatGPT']),measurement_type:z.enum(['exact','measured','estimated','subjective','unknown']),estimated:z.boolean(),notes:z.string().max(5000).default(''),
 data:z.discriminatedUnion('kind',[
 z.object({kind:z.literal('water'),volume:z.number().positive().max(10000),beverage:z.enum(['água','outro líquido'])}),
 z.object({kind:z.literal('checkin'),preset:z.string().max(50),scores:scoresSchema,activity:z.string().max(100).optional(),moods:z.array(z.string().max(50)).max(20).optional(),environment:z.array(z.string().max(50)).max(20).optional()}),
 z.object({kind:z.literal('meal'),name:z.string().max(200),meal_type:z.string().max(50),items:z.array(itemSchema).max(100),hunger:z.number().min(0).max(10).nullable(),satiety:z.number().min(0).max(10).nullable()})
 ])
}).refine(e=>e.type===e.data.kind,'Tipo incompatível').refine(e=>e.estimated===(e.measurement_type==='estimated'),'Qualidade incompatível');
export type EventInput=z.infer<typeof eventSchema>;
export type HealthEvent=EventInput&{id:string;local_date:string;created_at?:string;updated_at?:string};
export type MealTemplate={id:string;name:string;items:z.infer<typeof itemSchema>[]};
export type TargetTemplate={id:string;name:string;day_type:string;targets:Targets};
export type Day={local_date:string;day_type:string;targets:Targets};
export function localDate(date=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
export function localTime(timestamp:string){return new Intl.DateTimeFormat('pt-BR',{timeZone:timezone,hour:'2-digit',minute:'2-digit'}).format(new Date(timestamp));}
export function localInput(timestamp:string){return `${localDate(new Date(timestamp))}T${localTime(timestamp)}`;}
// Test both offsets: reject DST gaps and repeated ambiguous local times instead of silently changing an event.
export function londonToISO(value:string){
 const matches=[0,60].map(offset=>new Date(Date.parse(value+'Z')-offset*60000)).filter(d=>!isNaN(d.getTime())&&localInput(d.toISOString())===value);
 if(matches.length!==1)throw new Error(matches.length?'Horário ambíguo na mudança de horário de verão. Escolha outro minuto fora da hora repetida.':'Horário local inválido.');
 return matches[0].toISOString();
}
export function totals(events:HealthEvent[]){
 const out:Record<string,number>={};
 for(const e of events){
 if(e.data.kind==='water'&&e.data.beverage==='água')out.water=(out.water??0)+e.data.volume;
 if(e.data.kind==='meal')for(const item of e.data.items)for(const k of nutrients){const value=item.nutrition[k];if(value!==null)out[k]=(out[k]??0)+value*item.grams/100;}
 }
 return out;
}
export function targetProgress(value:number,target:Target){
 const anchor=target.kind==='maximum'?target.max!:target.min!;
 const percent=anchor>0?value/anchor*100:0;
 if(target.kind==='maximum')return {percent,status:value>anchor?'over':'within',text:value>anchor?`${format(value-anchor)} acima do limite`:`${format(anchor-value)} até o limite`};
 if(target.kind==='range')return {percent,status:value<anchor?'pending':value>target.max!?'over':'within',text:value<anchor?`Faltam ${format(anchor-value)}`:value>target.max!?`${format(value-target.max!)} acima da faixa`:'Dentro da faixa'};
 return {percent,status:value>=anchor?'within':'pending',text:value>=anchor?'Meta atingida':`Faltam ${format(anchor-value)}`};
}
export function format(n:number){return new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(n);}
export function targetLabel(t:Target){return t.kind==='range'?`${format(t.min!)}–${format(t.max!)}`:t.kind==='maximum'?`≤ ${format(t.max!)}`:t.kind==='minimum'?`≥ ${format(t.min!)}`:format(t.min!);}
export function eventTitle(e:HealthEvent){return e.data.kind==='water'?`${format(e.data.volume)} ml · ${e.data.beverage}`:e.data.kind==='checkin'?e.data.preset:e.data.name||e.data.meal_type||'Refeição';}
