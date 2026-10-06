import { z } from 'zod';
import { dateValue } from './date-value';

const requiredDate=dateValue.refine(v=>v!=='','Data obrigatória');
const id=z.string().min(1).max(100);
const text=(max=500)=>z.string().max(max).default('');

export const vaccineSchema=z.object({id,name:z.string().trim().min(1).max(150),date:requiredDate,next:dateValue.default(''),vet:text(200),batch:text(100),notes:text(2000)});
export const parasiteKinds=['Vermífugo','Antipulgas e carrapatos','Coleira','Outro'] as const;
export const parasiteSchema=z.object({id,kind:z.enum(parasiteKinds).default('Vermífugo'),product:z.string().trim().min(1).max(150),date:requiredDate,next:dateValue.default(''),dose:text(100),notes:text(2000)});
export const weightSchema=z.object({id,date:requiredDate,kg:z.number().finite().positive().max(120),notes:text(500)});
export const visitSchema=z.object({id,date:requiredDate,reason:z.string().trim().min(1).max(200),vet:text(200),diagnosis:text(5000),cost:z.number().finite().nonnegative().nullable().default(null),next:dateValue.default(''),notes:text(5000)});
export const medicationSchema=z.object({id,name:z.string().trim().min(1).max(150),dose:text(100),everyDays:z.number().int().min(1).max(365).nullable().default(null),times:text(100),start:dateValue.default(''),end:dateValue.default(''),lastGiven:dateValue.default(''),stock:z.number().int().min(0).max(10000).nullable().default(null),active:z.boolean().default(true),notes:text(2000)});
export const groomingKinds=['Banho','Tosa','Unhas','Dentes','Ouvidos','Outro'] as const;
export const groomingSchema=z.object({id,kind:z.enum(groomingKinds).default('Banho'),date:requiredDate,next:dateValue.default(''),place:text(200),cost:z.number().finite().nonnegative().nullable().default(null),notes:text(1000)});
export const dogDateSchema=z.object({id,name:z.string().trim().min(1).max(200),date:requiredDate,yearly:z.boolean().default(false),notes:text(1000)});

export const dogSchema=z.object({
 name:z.string().max(80).default('Caju'),
 photo:z.string().max(400000).default(''),
 breed:text(100),sex:text(40),neutered:text(40),birth:dateValue.default(''),adopted:dateValue.default(''),colour:text(100),
 microchip:text(60),passport:text(100),
 vet:z.object({name:text(200),phone:text(60),address:text(300),url:text(500),emergency:text(300)}).default({}),
 insurance:z.object({provider:text(150),policy:text(100),renewal:dateValue.default(''),monthly:z.number().finite().nonnegative().nullable().default(null),excess:text(100)}).default({}),
 food:z.object({brand:text(150),gramsPerDay:z.number().finite().nonnegative().max(5000).nullable().default(null),meals:text(100),treats:text(300)}).default({}),
 allergies:text(1000),personality:text(2000),notes:text(5000),
 targetWeight:z.object({min:z.number().finite().positive().nullable().default(null),max:z.number().finite().positive().nullable().default(null)}).default({}),
 vaccines:z.array(vaccineSchema).max(300).default([]),
 parasites:z.array(parasiteSchema).max(500).default([]),
 weights:z.array(weightSchema).max(1000).default([]),
 visits:z.array(visitSchema).max(500).default([]),
 medications:z.array(medicationSchema).max(200).default([]),
 grooming:z.array(groomingSchema).max(500).default([]),
 dates:z.array(dogDateSchema).max(200).default([])
});
export type Dog=z.infer<typeof dogSchema>;
export const dogLists=['vaccines','parasites','weights','visits','medications','grooming','dates'] as const;
export type DogList=typeof dogLists[number];
export const dogListSchemas={vaccines:vaccineSchema,parasites:parasiteSchema,weights:weightSchema,visits:visitSchema,medications:medicationSchema,grooming:groomingSchema,dates:dogDateSchema} as const;

export const initialDog:Dog=dogSchema.parse({name:'Caju',photo:'/images/caju.jpg'});
export function readDog(value:unknown):Dog{if(value===undefined||value===null)return initialDog;const parsed=dogSchema.safeParse(value);return parsed.success?parsed.data:initialDog;}

const day=86400000;
const shift=(date:string,days:number)=>new Date(Date.parse(date+'T12:00:00Z')+days*day).toISOString().slice(0,10);
export const daysUntil=(today:string,date:string)=>Math.round((Date.parse(date+'T12:00:00Z')-Date.parse(today+'T12:00:00Z'))/day);

/** "3 anos e 2 meses" from the birth date. */
export function ageLabel(birth:string,today:string){
 if(!birth)return '';const b=new Date(birth+'T12:00:00Z'),t=new Date(today+'T12:00:00Z');
 let months=(t.getUTCFullYear()-b.getUTCFullYear())*12+t.getUTCMonth()-b.getUTCMonth();if(t.getUTCDate()<b.getUTCDate())months--;if(months<0)return '';
 const y=Math.floor(months/12),m=months%12;
 if(!y)return `${m} ${m===1?'mês':'meses'}`;return m?`${y} ${y===1?'ano':'anos'} e ${m} ${m===1?'mês':'meses'}`:`${y} ${y===1?'ano':'anos'}`;
}
/** Next birthday or yearly date on/after today. */
export function nextYearly(date:string,today:string){if(!date)return '';let year=Number(today.slice(0,4));let next=`${year}${date.slice(4)}`;if(next<today)next=`${year+1}${date.slice(4)}`;return next;}
/** Next dose of a recurring medication: last dose + interval (or start date when never given). */
export function nextDose(m:z.infer<typeof medicationSchema>,today:string){
 if(!m.active||m.everyDays===null)return '';const base=m.lastGiven||m.start;if(!base)return today;
 const next=m.lastGiven?shift(m.lastGiven,m.everyDays):base;if(m.end&&next>m.end)return '';return next;
}
/** Only the latest record of each item counts (e.g. the newest Vermífugo entry sets the next date). */
function latestBy<T extends {date:string}>(list:T[],key:(x:T)=>string){const map=new Map<string,T>();for(const item of [...list].sort((a,b)=>a.date.localeCompare(b.date)))map.set(key(item).toLowerCase(),item);return [...map.values()];}

export type Care={id:string;name:string;kind:string;date:string;days:number;overdue:boolean;detail:string};
/** Every upcoming or overdue care item for the dog, soonest first. */
export function upcomingCare(dog:Dog,today:string):Care[]{
 const out:Omit<Care,'days'|'overdue'>[]=[];
 for(const v of latestBy(dog.vaccines,v=>v.name))if(v.next)out.push({id:`vac-${v.id}`,name:`Vacina ${v.name}`,kind:'Vacina',date:v.next,detail:`Última dose em ${v.date}`});
 for(const p of latestBy(dog.parasites,p=>p.kind))if(p.next)out.push({id:`par-${p.id}`,name:`${p.kind} · ${p.product}`,kind:'Antiparasitário',date:p.next,detail:`Último em ${p.date}`});
 for(const m of dog.medications){const next=nextDose(m,today);if(next)out.push({id:`med-${m.id}`,name:m.name,kind:'Remédio',date:next,detail:[m.dose,m.everyDays?`a cada ${m.everyDays} ${m.everyDays===1?'dia':'dias'}`:'',m.stock!==null?`${m.stock} em estoque`:''].filter(Boolean).join(' · ')});}
 for(const v of dog.visits)if(v.next)out.push({id:`vis-${v.id}`,name:`Retorno · ${v.reason}`,kind:'Veterinário',date:v.next,detail:v.vet});
 for(const g of latestBy(dog.grooming,g=>g.kind))if(g.next)out.push({id:`gro-${g.id}`,name:g.kind,kind:'Higiene',date:g.next,detail:g.place});
 if(dog.insurance.renewal)out.push({id:'dog-insurance',name:'Renovação do seguro pet',kind:'Seguro',date:dog.insurance.renewal,detail:dog.insurance.provider});
 if(dog.birth)out.push({id:'dog-birthday',name:`Aniversário do ${dog.name||'pet'}`,kind:'Aniversário',date:nextYearly(dog.birth,today),detail:''});
 for(const d of dog.dates){const date=d.yearly?nextYearly(d.date,today):d.date;out.push({id:`date-${d.id}`,name:d.name,kind:'Data',date,detail:d.notes});}
 // Recurring care that ended long ago is history, not a reminder.
 return out.map(c=>{const days=daysUntil(today,c.date);return {...c,days,overdue:days<0};}).filter(c=>c.days>=-60).sort((a,b)=>a.date.localeCompare(b.date));
}

/** Latest weight, change since the previous weigh-in and whether it is inside the target range. */
export function weightSummary(dog:Dog){
 const list=[...dog.weights].sort((a,b)=>a.date.localeCompare(b.date));const latest=list.at(-1)??null,previous=list.at(-2)??null;
 const {min,max}=dog.targetWeight;const inRange=latest&&(min!==null||max!==null)?(min===null||latest.kg>=min)&&(max===null||latest.kg<=max):null;
 return {list,latest,previous,change:latest&&previous?Math.round((latest.kg-previous.kg)*10)/10:null,inRange};
}

/** Status of each vaccine (latest dose): em dia, vence em breve (≤30 dias) or atrasada. */
export function vaccineStatus(dog:Dog,today:string){
 return latestBy(dog.vaccines,v=>v.name).map(v=>{const days=v.next?daysUntil(today,v.next):null;return {...v,days,state:days===null?'Sem reforço':days<0?'Atrasada':days<=30?'Vence em breve':'Em dia'};}).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
}

/** Due dates for the Hoje list (same 5-day window as the other reminders). */
export function dogReminders(dog:Dog,today:string){return upcomingCare(dog,today).filter(c=>c.days>=0).map(c=>({id:`dog-${c.id}`,name:c.name,source:dog.name||'Pet',date:c.date,amount:null}));}

/** Adds or replaces one item of a list (by id) — used by the MCP tool and the page. */
const slug=(value:string)=>value.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,50)||'item';
export function upsertDogItem(stored:unknown,list:DogList,item:Record<string,any>){
 const dog=readDog(stored);const schema=dogListSchemas[list] as z.ZodTypeAny;const rows=dog[list] as {id:string}[];
 const label=String(item.name??item.product??item.reason??item.kind??list);
 const idValue=item.id||`${item.date??''}-${slug(label)}`.replace(/^-/,'');
 const parsed=schema.parse({...(rows.find(r=>r.id===idValue)??{}),...item,id:idValue});
 const next=rows.some(r=>r.id===idValue)?rows.map(r=>r.id===idValue?parsed:r):[...rows,parsed];
 return {dog:dogSchema.parse({...dog,[list]:next}),item:parsed,created:!rows.some(r=>r.id===idValue)};
}
