const normalize=(key:string)=>key.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const leaves=(payload:Record<string,unknown>):[string,unknown][]=>Object.entries(payload).flatMap(([key,value]):[string,unknown][]=>value&&typeof value==='object'&&!Array.isArray(value)?leaves(value as Record<string,unknown>):[[normalize(key),value]]);
function duration(value:unknown,hours:boolean):number|null {
 if(value==null||value==='')return null;
 if(typeof value==='string'){
  const text=value.trim().replace(',','.');
  const clock=text.match(/^(\d+)\s*(?:h|hr|hrs|hours|horas)\s*(?:(\d+)\s*(?:m|min|minutes|minutos)?)?$/i);
  if(clock)return Number(clock[1])*60+Number(clock[2]??0);
  const minute=text.match(/^(\d+(?:\.\d+)?)\s*(?:m|min|minutes|minutos)$/i);
  if(minute)return Number(minute[1]);
  if(!/^\d+(?:\.\d+)?$/.test(text))return null;
  value=Number(text);
 }
 return typeof value==='number'&&Number.isFinite(value)&&value>=0?value*(hours?60:1):null;
}
export function sleepData(payload:Record<string,unknown>){
 const entries=leaves(payload);
 const read=(aliases:[string,boolean][])=>{for(const [alias,hours] of aliases){const entry=entries.find(([key])=>key===normalize(alias));if(entry){const result=duration(entry[1],hours);if(result!==null)return result;}}return null;};
 const stage=(names:string[])=>read(names.flatMap(name=>[[name+' minutes',false],[name+' min',false],[name+' h',true],[name+' hours',true],[name,false]] as [string,boolean][]));
 return {total:read([['time asleep minutes',false],['sleep duration minutes',false],['hours',true],['duration hours',true],['sleep hours',true],['sono h',true],['sono total',true],['total sleep',true],['time asleep',true]]),rem:stage(['rem']),core:stage(['core']),deep:stage(['deep','profundo']),awake:stage(['awake','acordado'])};
}
export function sleepNights<T extends {id:string;category:string;recorded_on:string;recorded_at:string|null;payload:Record<string,unknown>}>(records:T[]):T[]{
 const nights=new Map<string,T>();
 for(const record of [...records].sort((a,b)=>(b.recorded_at??'').localeCompare(a.recorded_at??'')||b.id.localeCompare(a.id))){
  if(!['sleep','daily_metrics'].includes(record.category)||!Object.values(sleepData(record.payload)).some(value=>value!==null))continue;
  const existing=nights.get(record.recorded_on);
  if(!existing||(record.category==='sleep'&&existing.category!=='sleep'))nights.set(record.recorded_on,record);
 }
 return [...nights.values()].sort((a,b)=>a.recorded_on.localeCompare(b.recorded_on));
}
