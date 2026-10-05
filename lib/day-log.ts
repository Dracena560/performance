import { diaryDescription, diaryLabels } from './diary-fields';

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
 for(const r of records){const type=r.payload.record_type;if(r.recorded_on!==date||typeof type!=='string'||!(type in entryLabels))continue;const kind=type as EntryKind;
  out.push({id:r.id,kind,at:r.recorded_at??`${date}T12:00:00Z`,title:entryLabels[kind],details:kind==='water'?[]:chips(r.payload),notes:String(r.payload.notes??''),scores:kind==='checkin'?choiceScores(r.payload):{},volume:typeof r.payload.volume_ml==='number'?r.payload.volume_ml:undefined,source:'record'});
 }
 return out.sort((a,b)=>a.at.localeCompare(b.at));
}

/** One row per day for the last `days` days: how much was logged and the average wellbeing. */
export function weekEvolution(events:EventLike[],records:RecordLike[],end:string,days=7){
 return Array.from({length:days},(_,i)=>{const date=new Date(Date.parse(end+'T12:00:00Z')-(days-1-i)*86400000).toISOString().slice(0,10);const entries=dayEntries(events,records,date);const scored=entries.map(e=>overall(e.scores)).filter((v):v is number=>typeof v==='number');
  return {date,count:entries.length,wellbeing:mean(scored)??null,water:entries.reduce((t,e)=>t+(e.kind==='water'?e.volume??0:0),0),byKind:Object.fromEntries((Object.keys(entryLabels) as EntryKind[]).map(k=>[k,entries.filter(e=>e.kind===k).length])) as Record<EntryKind,number>};});
}
