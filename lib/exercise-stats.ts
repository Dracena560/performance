/** Aggregations for the Exercícios charts: minutes per week by activity, totals by activity, HR zones and recovery. */
export type StatSession={date:string;type:string;duration:number|null;active:number|null;heart:number|null;payload:Record<string,unknown>};
const monday=(date:string)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));return d.toISOString().slice(0,10);};
const shift=(date:string,days:number)=>new Date(Date.parse(date+'T12:00:00Z')+days*86400000).toISOString().slice(0,10);
const round=(n:number)=>Math.round(n*10)/10;

/** Groups the many spellings Apple Fitness and ChatGPT use for the same activity. */
export function activityName(raw:string){
 const t=raw.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
 if(/tenn?is/.test(t))return 'Tênis';
 if(/walk|caminhad/.test(t))return 'Caminhada';
 if(/run|corrida/.test(t))return 'Corrida';
 if(/cycl|bike|ciclis|pedal/.test(t))return 'Ciclismo';
 if(/swim|nata/.test(t))return 'Natação';
 if(/strength|musculac|forca|weight/.test(t))return 'Treino de força';
 if(/yoga|pilates|stretch|alonga/.test(t))return 'Mobilidade';
 if(/hiit|funcional|cross/.test(t))return 'HIIT';
 return raw.trim()?raw.trim()[0].toUpperCase()+raw.trim().slice(1):'Outro';
}

/** Minutes and active calories per week (Monday start) and activity, oldest week first. */
export function weeklyByActivity(sessions:StatSession[],today:string,weeks=12){
 const start=shift(monday(today),-7*(weeks-1));const labels=Array.from({length:weeks},(_,i)=>shift(start,7*i));
 const types=[...new Set(sessions.filter(s=>s.date>=start).map(s=>activityName(s.type)))].sort();
 const minutes:Record<string,number[]>=Object.fromEntries(types.map(t=>[t,labels.map(()=>0)]));const calories=labels.map(()=>0);
 for(const s of sessions){if(s.date<start||s.date>today)continue;const i=labels.indexOf(monday(s.date));if(i<0)continue;minutes[activityName(s.type)][i]+=Math.round(s.duration??0);calories[i]+=Math.round(s.active??0);}
 return {weeks:labels,types,minutes,calories};
}

/** Sessions, hours and calories per activity, most practised first. */
export function totalsByActivity(sessions:StatSession[]){
 const map=new Map<string,{type:string;count:number;minutes:number;calories:number;heart:number[]}>();
 for(const s of sessions){const type=activityName(s.type);const row=map.get(type)??{type,count:0,minutes:0,calories:0,heart:[]};row.count++;row.minutes+=s.duration??0;row.calories+=s.active??0;if(s.heart)row.heart.push(s.heart);map.set(type,row);}
 return [...map.values()].map(r=>({type:r.type,count:r.count,hours:round(r.minutes/60),calories:Math.round(r.calories),heart:r.heart.length?Math.round(r.heart.reduce((a,b)=>a+b,0)/r.heart.length):null})).sort((a,b)=>b.hours-a.hours||b.count-a.count);
}

type Zone={zone:number|string;duration_seconds?:number};
/** Minutes in each heart-rate zone across the sessions since `since`. */
export function zoneMinutes(sessions:StatSession[],since:string){
 const out=[0,0,0,0,0];let with_=0;
 for(const s of sessions){if(s.date<since)continue;const zones=Array.isArray(s.payload.heart_rate_zones)?s.payload.heart_rate_zones as Zone[]:[];if(zones.length)with_++;for(const z of zones){const n=Number(z.zone);if(n>=1&&n<=5)out[n-1]+=(Number(z.duration_seconds)||0)/60;}}
 return {minutes:out.map(m=>Math.round(m)),sessions:with_};
}

type Point={elapsed_minutes?:number;bpm?:number};
/** Heart-rate drop after the workout (end of workout → 1 and 2 minutes later): a bigger drop means better recovery. */
export function recovery(sessions:StatSession[]){
 return sessions.flatMap(s=>{const points=(Array.isArray(s.payload.post_workout_heart_rate)?s.payload.post_workout_heart_rate as Point[]:[]).filter(p=>typeof p.bpm==='number'&&typeof p.elapsed_minutes==='number').sort((a,b)=>a.elapsed_minutes!-b.elapsed_minutes!);
  if(points.length<2)return [];const first=points[0].bpm!;const at=(m:number)=>points.filter(p=>p.elapsed_minutes!<=m).at(-1)?.bpm??null;
  const one=at(1),two=at(2);return [{date:s.date,type:activityName(s.type),start:first,drop1:one===null?null:first-one,drop2:two===null?null:first-two}];});
}

/** Extra tennis numbers sent by ChatGPT (shots, serves, errors…) for the latest sessions. */
export const tennisStatKeys:[string,string][]=[['shots_total','Golpes'],['forehands','Forehands'],['backhands','Backhands'],['serves','Saques'],['first_serve_percent','1º saque (%)'],['aces','Aces'],['double_faults','Duplas faltas'],['winners','Winners'],['unforced_errors','Erros não forçados'],['break_points_won','Break points convertidos'],['rallies','Ralis'],['longest_rally','Maior rali'],['max_swing_speed_kmh','Velocidade máx. do golpe (km/h)'],['distance_km','Distância (km)'],['heart_rate_max','FC máxima'],['heart_rate_min','FC mínima']];
export function tennisDetails(sessions:StatSession[],limit=8){
 return sessions.filter(s=>activityName(s.type)==='Tênis').slice(-limit).map(s=>{const p={...s.payload,...(s.payload.tennis_stats as Record<string,unknown>??{})};
  return {date:s.date,values:Object.fromEntries(tennisStatKeys.map(([k])=>[k,typeof p[k]==='number'?p[k] as number:null])),weather:p.weather as Record<string,number>|undefined};});
}
