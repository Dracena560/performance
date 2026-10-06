/**
 * Turns what an iPhone Shortcut sends at the end of an Apple Watch workout into the workout payload
 * used everywhere else (same shape as registrar_exercicio). Shortcuts send numbers as text with units
 * ("1,075 kcal", "4.1 km", "1:23:45") and field names in English or Portuguese, so everything is tolerant.
 */
type Body=Record<string,unknown>;
const norm=(k:string)=>k.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
function pick(body:Body,names:string[]){const want=names.map(norm);for(const [k,v] of Object.entries(body))if(want.includes(norm(k))&&v!==null&&v!==undefined&&v!=='')return v;return undefined;}

/** "1,075 kcal" → 1075 · "7,9" → 7.9 · "1.234,5" → 1234.5 · 123 → 123. */
export function number(value:unknown):number|null{
 if(typeof value==='number')return Number.isFinite(value)?value:null;
 if(typeof value!=='string')return null;
 const m=value.replace(/\s/g,'').match(/-?[\d.,]+/);if(!m)return null;let s=m[0];
 const comma=s.lastIndexOf(','),dot=s.lastIndexOf('.');
 if(comma>=0&&dot>=0)s=comma>dot?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');
 else if(comma>=0)s=/,\d{3}$/.test(s)&&!/^0,/.test(s)?s.replace(/,/g,''):s.replace(',','.');
 else if(dot>=0&&/^\d{1,3}(\.\d{3})+$/.test(s)&&!/^0\./.test(s))s=s.replace(/\./g,'');
 const n=Number(s);return Number.isFinite(n)?n:null;
}
/** Seconds from "1:23:45", "83:10", "1h 23min", "83 min", "5000 s" or a bare number (minutes when small, seconds when large). */
export function seconds(value:unknown,unit:'auto'|'s'|'min'='auto'):number|null{
 if(typeof value==='string'){
  const t=value.trim().toLowerCase();
  const clock=t.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);if(clock)return clock[3]!==undefined?+clock[1]*3600+ +clock[2]*60+ +clock[3]:+clock[1]*60+ +clock[2];
  const h=t.match(/(\d+[.,]?\d*)\s*h/),mi=t.match(/(\d+[.,]?\d*)\s*(min|m(?!s))/),sec=t.match(/(\d+[.,]?\d*)\s*(s|seg|sec)/);
  if(h||mi||sec)return Math.round((h?number(h[1])!*3600:0)+(mi?number(mi[1])!*60:0)+(sec?number(sec[1])!:0));
 }
 const n=number(value);if(n===null)return null;
 if(unit==='s')return Math.round(n);if(unit==='min')return Math.round(n*60);
 return Math.round(n>600?n:n*60);
}
/** Kilometres from "4.1 km", "4100 m", "2.5 mi". */
export function kilometres(value:unknown){const n=number(value);if(n===null)return null;const t=typeof value==='string'?value.toLowerCase():'';
 if(/\bmi\b|milha|mile/.test(t))return Math.round(n*1.609344*100)/100;if(/\d\s*m\b|metro/.test(t)&&!/km/.test(t))return Math.round(n/10)/100;return Math.round(n*100)/100;}

const months:Record<string,number>={jan:1,fev:2,feb:2,mar:3,abr:4,apr:4,mai:5,may:5,jun:6,jul:7,ago:8,aug:8,set:9,sep:9,out:10,oct:10,nov:11,dez:12,dec:12};
/** Dates: ISO 8601 (best), "06/10/2026 21:45", "6 Oct 2026 at 21:45", "6 de out. de 2026 21:45". Without an offset, London time. */
export function dateTime(value:unknown):string|null{
 if(typeof value!=='string'&&typeof value!=='number')return null;const t=String(value).trim();
 if(/^\d{4}-\d{2}-\d{2}T/.test(t)&&/(Z|[+-]\d{2}:?\d{2})$/.test(t)){const d=new Date(t);return Number.isNaN(d.getTime())?null:d.toISOString();}
 let y=0,mo=0,da=0,hh=0,mm=0,ss=0;
 const iso=t.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{1,2}):(\d{2})(?::(\d{2}))?/);
 const br=t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[ ,]*(\d{1,2})[:h](\d{2})(?::(\d{2}))?/);
 const words=t.toLowerCase().match(/(\d{1,2})(?:\s+de)?\s+([a-zç]{3})[a-zç.]*(?:\s+de)?\s+(\d{4})[^\d]*(\d{1,2})[:h](\d{2})(?::(\d{2}))?\s*(am|pm)?/);
 if(iso)[y,mo,da,hh,mm,ss]=[+iso[1],+iso[2],+iso[3],+iso[4],+iso[5],+(iso[6]??0)];
 else if(br)[da,mo,y,hh,mm,ss]=[+br[1],+br[2],+br[3],+br[4],+br[5],+(br[6]??0)];
 else if(words&&months[words[2]]){[da,mo,y,hh,mm,ss]=[+words[1],months[words[2]],+words[3],+words[4],+words[5],+(words[6]??0)];if(words[7]==='pm'&&hh<12)hh+=12;if(words[7]==='am'&&hh===12)hh=0;}
 else{const d=new Date(t);return Number.isNaN(d.getTime())?null:d.toISOString();}
 // London wall-clock → UTC (BST is UTC+1 between the last Sundays of March and October).
 const guess=Date.UTC(y,mo-1,da,hh,mm,ss);
 const offset=(ms:number)=>{const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',hourCycle:'h23'}).format(new Date(ms));return (Number(p)-new Date(ms).getUTCHours()+24)%24;};
 return new Date(guess-offset(guess)*3600000).toISOString();
}
const londonDate=(iso:string)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(iso));

/** Heart-rate samples sent as a list or as text with one value per line. */
function samples(value:unknown){const list=Array.isArray(value)?value:typeof value==='string'?value.split(/[\n;]+/):[];return list.map(v=>number(typeof v==='object'&&v?(v as Body).value??(v as Body).bpm??(v as Body).quantity:v)).filter((n):n is number=>n!==null&&n>25&&n<250);}

export type ShortcutWorkout={date:string;data:Record<string,unknown>};
export function shortcutWorkout(body:Body,receivedAt=new Date()):ShortcutWorkout{
 const type=String(pick(body,['activity_type','tipo','type','workout','treino','atividade','sport','esporte'])??'Exercício').trim();
 let durationSec=seconds(pick(body,['duration_seconds','duracao_segundos']),'s')??seconds(pick(body,['duration_minutes','duracao_minutos']),'min')??seconds(pick(body,['duration','duracao','tempo','workout_time','tempo_de_treino']));
 let end=dateTime(pick(body,['ended_at','end','fim','end_date','data_fim','termino','enddate']));
 let start=dateTime(pick(body,['started_at','start','inicio','start_date','data_inicio','startdate']));
 if(!end)end=start&&durationSec?new Date(Date.parse(start)+durationSec*1000).toISOString():receivedAt.toISOString();
 if(!start&&durationSec)start=new Date(Date.parse(end)-durationSec*1000).toISOString();
 if(start&&!durationSec)durationSec=Math.max(0,Math.round((Date.parse(end)-Date.parse(start))/1000));
 const hr=samples(pick(body,['heart_rate_samples','frequencia_cardiaca','heart_rate','fc','batimentos']));
 const avg=number(pick(body,['heart_rate_average','fc_media','avg_heart_rate','frequencia_media','average_heart_rate']))??(hr.length?Math.round(hr.reduce((a,b)=>a+b,0)/hr.length):null);
 const data:Record<string,unknown>={kind:'workout',activity_type:type,source:'Apple Watch (Atalhos)',
  ...(start?{started_at:start}:{}),ended_at:end,
  ...(durationSec?{duration_seconds:durationSec,duration_minutes:Math.round(durationSec/60*10)/10}:{}),
  ...opt('active_calories',number(pick(body,['active_calories','calorias_ativas','energia_ativa','active_energy','kcal_ativas','calorias']))),
  ...opt('total_calories',number(pick(body,['total_calories','calorias_totais','energia_total']))),
  ...opt('distance_km',kilometres(pick(body,['distance_km','distancia','distance','km']))),
  ...opt('steps',(()=>{const n=number(pick(body,['steps','passos']));return n===null?null:Math.round(n);})()),
  ...opt('heart_rate_average',avg),
  ...opt('heart_rate_max',number(pick(body,['heart_rate_max','fc_maxima','fc_max','max_heart_rate']))??(hr.length?Math.max(...hr):null)),
  ...opt('heart_rate_min',number(pick(body,['heart_rate_min','fc_minima','fc_min','min_heart_rate']))??(hr.length?Math.min(...hr):null)),
  ...opt('watch_effort',(()=>{const n=number(pick(body,['watch_effort','esforco','effort']));return n!==null&&n>=0&&n<=10?n:null;})()),
  ...opt('location',pick(body,['location','local','localizacao']) as string|undefined),
 };
 const weather={temperature_c:number(pick(body,['temperature_c','temperatura'])),humidity_percent:number(pick(body,['humidity_percent','umidade'])),air_quality_index:number(pick(body,['air_quality_index','qualidade_do_ar']))};
 if(Object.values(weather).some(v=>v!==null))data.weather=Object.fromEntries(Object.entries(weather).filter(([,v])=>v!==null));
 // Anything else the Shortcut sent is kept as text for reference.
 const raw=pick(body,['dados','data','amostras','samples','raw']);if(raw!==undefined)data.shortcut_raw=typeof raw==='string'?raw.slice(0,5000):JSON.stringify(raw).slice(0,5000);
 return {date:londonDate(start??end),data};
}
function opt(key:string,value:unknown){return value===null||value===undefined||value===''?{}:{[key]:value};}
