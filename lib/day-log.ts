import { diaryDescription, diaryLabels } from './diary-fields';
import { sleepData } from './sleep-data';

export type Dimension='mente'|'humor'|'corpo'|'digestao';
export const dimensions:{key:Dimension;label:string;color:string}[]=[
 {key:'mente',label:'Mente',color:'--sys-indigo'},{key:'humor',label:'Humor',color:'--sys-orange'},{key:'corpo',label:'Corpo',color:'--sys-teal'},{key:'digestao',label:'Digestão',color:'--sys-green'}
];
export type Scores=Partial<Record<Dimension,number>>;

/** How good each Registrar option feels, 0–10, so choices can be charted next to numeric check-ins. */
const optionValue:Record<Exclude<Dimension,never>,Record<string,number>>={
 mente:{'Apático':2,'Sonolento':3,'Lesado':2,'Neutro':5,'Levemente cansado':4,'Muito cansado':2,'Leve':7,'Ativo':8,'Boa clareza':9,'Turbo':10},
 humor:{'Mau-humorado':2,'Desanimado':2,'Irritado':2,'Frustrado':3,'Ansioso':3,'Entediado':4,'Neutro':5,'Tranquilo':7,'Bem-humorado':8,'Satisfeito':8,'Motivado':9,'Animado':9},
 corpo:{'Pesado':3,'Lento':4,'Dolorido':3,'Cansado':3,'Tenso':3,'Dor de cabeça':2,'Leve':8,'Ativo':8,'Descansado':9},
 digestao:{'Com fome':6,'Sem fome':6,'Gases leve':5,'Gases moderado':4,'Muito gases':2,'Desconforto gastro':2,'Náusea':1,'Estufado':3,'Leve':9,'Sem desconforto':9}
};
const field:Record<Dimension,string>={mente:'mental',humor:'emotions',corpo:'body',digestao:'digestion'};
const mean=(values:number[])=>values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length*10)/10:undefined;

/** Scores of a Registrar check-in from the options chosen in each group. */
export function choiceScores(payload:Record<string,unknown>):Scores{
 const out:Scores={};for(const d of Object.keys(field) as Dimension[]){const chosen=Array.isArray(payload[field[d]])?(payload[field[d]] as string[]):[];const value=mean(chosen.map(c=>optionValue[d][c]).filter((v):v is number=>typeof v==='number'));if(value!==undefined)out[d]=value;}return out;
}
/** Scores of a numeric check-in (0–10 per item); negative items such as stress or nausea are inverted. */
export function numericScores(scores:Record<string,number|null|undefined>):Scores{
 const pick=(up:string[],down:string[])=>mean([...up.map(k=>scores[k]),...down.map(k=>scores[k]===null||scores[k]===undefined?undefined:10-(scores[k] as number))].filter((v):v is number=>typeof v==='number'));
 const out:Scores={mente:pick(['clarity','focus','activation','initiative','engagement'],['sleepiness','sluggishness','mental_fatigue','procrastination']),humor:pick(['motivation','pleasure'],['stress','anxiety','irritability','agitation']),corpo:pick(['energy'],['heaviness','physical_fatigue','muscle_pain','tension','headache','eye_pain']),digestao:pick([],['gas','bloating','gi_discomfort','nausea','urgency'])};
 return Object.fromEntries(Object.entries(out).filter(([,v])=>v!==undefined)) as Scores;
}
export const overall=(s:Scores)=>mean(Object.values(s).filter((v):v is number=>typeof v==='number'));

export type EntryKind='checkin'|'activity'|'bowel'|'water'|'vitamins'|'medication'|'meal';
export const entryLabels:Record<EntryKind,string>={...diaryLabels,meal:'Refeição'};
export type DayEntry={id:string;kind:EntryKind;at:string;title:string;details:string[];notes:string;scores:Scores;volume?:number;source:'event'|'record'};
type EventLike={id:string;type:string;timestamp:string;local_date:string;notes?:string|null;data:any};
type RecordLike={id:string;category:string;recorded_on:string;recorded_at:string|null;payload:Record<string,unknown>};

const chips=(payload:Record<string,unknown>)=>diaryDescription(payload).split(' · ').filter(Boolean);
/** Everything logged on a day — events and Registrar records — in time order. */
export function dayEntries(events:EventLike[],records:RecordLike[],date:string):DayEntry[]{
 const out:DayEntry[]=[];
 for(const e of events){if(e.local_date!==date)continue;const d=e.data??{};
  if(e.type==='checkin'){const filled=Object.entries(d.scores??{}).filter(([,v])=>v!==null&&v!==undefined).length;out.push({id:e.id,kind:'checkin',at:e.timestamp,title:d.preset||'Check-in',details:[`${filled} itens avaliados`,...(d.activity?[d.activity]:[]),...((d.moods as string[]|undefined)??[])],notes:e.notes??'',scores:numericScores(d.scores??{}),source:'event'});}
  else if(e.type==='water')out.push({id:e.id,kind:'water',at:e.timestamp,title:`${Math.round(d.volume)} ml`,details:[d.beverage??'água'],notes:e.notes??'',scores:{},volume:d.volume,source:'event'});
  else if(e.type==='meal')out.push({id:e.id,kind:'meal',at:e.timestamp,title:d.name||d.meal_type||'Refeição',details:(d.items??[]).slice(0,6).map((i:any)=>i.name).filter(Boolean),notes:e.notes??'',scores:{},source:'event'});
 }
 for(const r of records){if(r.recorded_on!==date)continue;const type=typeof r.payload.record_type==='string'?r.payload.record_type:r.category==='supplement'?'vitamins':r.category==='bowel'?'bowel':null;if(!type||!(type in entryLabels))continue;const kind=type as EntryKind;
  out.push({id:r.id,kind,at:r.recorded_at??`${date}T12:00:00Z`,title:entryLabels[kind],details:kind==='water'?[]:kind==='vitamins'&&!r.payload.record_type?supplementNames(r.payload):chips(r.payload),notes:String(r.payload.notes??''),scores:kind==='checkin'?choiceScores(r.payload):{},volume:typeof r.payload.volume_ml==='number'?r.payload.volume_ml:undefined,source:'record'});
 }
 return out.sort((a,b)=>a.at.localeCompare(b.at));
}

/** One row per day for the last `days` days: how much was logged and the average wellbeing. */
export function weekEvolution(events:EventLike[],records:RecordLike[],end:string,days=7){
 return Array.from({length:days},(_,i)=>{const date=new Date(Date.parse(end+'T12:00:00Z')-(days-1-i)*86400000).toISOString().slice(0,10);const entries=dayEntries(events,records,date);const scored=entries.map(e=>overall(e.scores)).filter((v):v is number=>typeof v==='number');
  return {date,count:entries.length,wellbeing:mean(scored)??null,water:entries.reduce((t,e)=>t+(e.kind==='water'?e.volume??0:0),0),byKind:Object.fromEntries((Object.keys(entryLabels) as EntryKind[]).map(k=>[k,entries.filter(e=>e.kind===k).length])) as Record<EntryKind,number>};});
}

/** What each Registrar routine contains (same list the MCP tool describes). */
export const supplementRoutines:Record<string,string[]>={'Vitaminas do dia':['Vitamina D','Vitamina E','Ômega-3','CoQ10','Selênio','Vitamina C','Glucosamina'],'Vitaminas da noite':['Magnésio','Ashwagandha']};
function supplementNames(payload:Record<string,unknown>){
 const items=Array.isArray(payload.items)?(payload.items as unknown[]).map(String):[];
 const routines=Array.isArray(payload.routines)?(payload.routines as unknown[]).map(String):[];
 const period=payload.period==='noite'?'Vitaminas da noite':payload.period==='dia'?'Vitaminas do dia':null;
 const names=[...items,...routines.flatMap(r=>supplementRoutines[r]??[r])];
 return names.length?names:period?supplementRoutines[period]:[];
}
/** Supplements taken on a day, one row per supplement with every time it was logged. */
export function supplementIntake(records:RecordLike[],date:string){
 const map=new Map<string,{name:string;times:string[];notes:string[]}>();
 for(const r of records){if(r.recorded_on!==date||r.category!=='supplement'||(r.payload.record_type&&r.payload.record_type!=='vitamins'))continue;
  for(const name of supplementNames(r.payload)){const key=name.toLowerCase();const row=map.get(key)??{name,times:[],notes:[]};row.times.push(r.recorded_at??`${date}T12:00:00Z`);if(r.payload.notes)row.notes.push(String(r.payload.notes));map.set(key,row);}}
 return [...map.values()].map(r=>({...r,times:r.times.sort()})).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
}

type MealItem={name:string;grams:number;nutrition:Record<string,number|null|undefined>};
/**
 * Foods behind a nutrient on a day. Only relevant contributions are listed:
 * at least 10% of the day's total for that nutrient (smaller amounts are left out).
 */
export function foodContributions(events:EventLike[],date:string,nutrient:string,minShare=0.1){
 const rows:{food:string;meal:string;at:string;amount:number}[]=[];
 for(const e of events){if(e.local_date!==date||e.type!=='meal')continue;for(const item of (e.data?.items??[]) as MealItem[]){const per100=item.nutrition?.[nutrient];if(typeof per100!=='number'||per100<=0)continue;rows.push({food:item.name,meal:e.data.name||e.data.meal_type||'Refeição',at:e.timestamp,amount:per100*item.grams/100});}}
 const total=rows.reduce((t,r)=>t+r.amount,0);
 return {total,items:rows.map(r=>({...r,share:total?r.amount/total:0})).filter(r=>r.share>=minShare).sort((a,b)=>b.amount-a.amount)};
}

/** Average of each dimension over the check-ins of the given entries. */
export function dimensionAverages(entries:DayEntry[]):Scores{
 const out:Scores={};for(const d of dimensions){const v=mean(entries.map(e=>e.scores[d.key]).filter((x):x is number=>typeof x==='number'));if(v!==undefined)out[d.key]=v;}return out;
}
/** Wellbeing next to the previous night's sleep, one row per day. */
export function wellbeingAndSleep(events:EventLike[],records:RecordLike[],end:string,days=14){
 return Array.from({length:days},(_,i)=>{const date=new Date(Date.parse(end+'T12:00:00Z')-(days-1-i)*86400000).toISOString().slice(0,10);
  const scored=dayEntries(events,records,date).map(e=>overall(e.scores)).filter((v):v is number=>typeof v==='number');
  const night=records.filter(r=>r.category==='sleep'&&r.recorded_on===date).map(r=>sleepData(r.payload).total).find((v):v is number=>typeof v==='number');
  return {date,wellbeing:mean(scored)??null,sleep:night===undefined?null:Math.round(night/6)/10};});
}
