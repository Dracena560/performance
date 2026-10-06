import { sleepData, sleepNights } from './sleep-data';
import { sleepQuality } from './sleep-quality';
import { dailyActivity } from './daily-activity';
import { totals, type HealthEvent } from './domain';
import { weekEvolution } from './day-log';
import { weeklyLoad } from './training-load';
import { markers, readExams } from './exams';
import { defaultSettings, type Settings } from './settings';

type RecordRow={id:string;category:string;recorded_on:string;recorded_at:string|null;payload:Record<string,unknown>};
const day=(today:string,back:number)=>new Date(Date.parse(today+'T12:00:00Z')-back*86400000).toISOString().slice(0,10);
const avg=(v:(number|null|undefined)[])=>{const n=v.filter((x):x is number=>typeof x==='number'&&Number.isFinite(x));return n.length?n.reduce((a,b)=>a+b,0)/n.length:null;};
const r1=(v:number|null)=>v===null?null:Math.round(v*10)/10;
const norm=(s:string)=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const num=(v:unknown)=>typeof v==='number'?v:typeof v==='string'&&v.trim()&&!Number.isNaN(Number(v.replace(',','.')))?Number(v.replace(',','.')):null;
function field(payload:Record<string,unknown>,test:RegExp){for(const [k,v] of Object.entries(payload)){if(test.test(norm(k))){const n=num(v);if(n!==null)return n;}}return null;}

/**
 * The few numbers that say how health is going, for the top of Saúde: sleep, wellbeing, training load,
 * energy balance, water, body composition and tests — each over the last 7 days where it applies.
 */
export function healthSummary({events,records,profile,today,settings=defaultSettings}:{events:HealthEvent[];records:RecordRow[];profile:Record<string,any>;today:string;settings?:Settings}){
 const days=Array.from({length:7},(_,i)=>day(today,6-i));
 // Sleep
 const nights=sleepNights(records).filter(r=>r.recorded_on>=days[0]&&r.recorded_on<=today);
 const hours=nights.map(n=>{const t=sleepData(n.payload).total;return typeof t==='number'?t/60:null;});
 const last=sleepNights(records).filter(r=>r.recorded_on<=today).sort((a,b)=>a.recorded_on.localeCompare(b.recorded_on)).at(-1);
 const sleep={avgHours:r1(avg(hours)),avgScore:r1(avg(nights.map(n=>sleepQuality(n.payload).score))),lastHours:last&&typeof sleepData(last.payload).total==='number'?r1(sleepData(last.payload).total!/60):null,nights:nights.length,target:settings.day.sleepHours};
 // Wellbeing
 const week=weekEvolution(events as any,records,today,7,settings);
 const wellbeing={avg:r1(avg(week.map(w=>w.wellbeing))),today:week.at(-1)?.wellbeing??null,days:week.filter(w=>w.wellbeing!==null).length};
 // Training
 const sessions=records.filter(r=>['workout','activity','tennis'].includes(r.category)&&r.category!=='daily_metrics').map(r=>({date:r.recorded_on,duration:field(r.payload,/^duration.?minutes$|^duracao/)??((field(r.payload,/^duration.?seconds$/)??0)/60||null),effort:field(r.payload,/^watch.?effort$/)??field(r.payload,/^effort$/)}));
 const load=weeklyLoad(sessions,today,6,settings.training.defaultEffort).at(-1)!;
 const training={minutes:load.minutes,sessions:load.sessions,ratio:load.ratio,level:load.ratio===null?'Sem base':load.ratio>settings.training.spikeRatio?'Pico':load.ratio>settings.training.highRatio?'Acima':load.ratio>=0.8?'Ideal':'Abaixo'};
 // Energy and water
 const meals=days.map(d=>{const list=events.filter(e=>e.local_date===d);return {eaten:list.some(e=>e.type==='meal')?totals(list).calories??null:null,water:list.some(e=>e.type==='water')?totals(list).water??0:null,burned:dailyActivity(records as any,d).total};});
 const energy={eaten:r1(avg(meals.map(m=>m.eaten))),burned:r1(avg(meals.map(m=>m.burned)))};
 const water={avg:r1(avg(meals.map(m=>m.water)))};
 // Body
 const body=records.filter(r=>r.category==='body_metrics').sort((a,b)=>a.recorded_on.localeCompare(b.recorded_on));
 const latestBody=body.at(-1);const previousBody=body.at(-2);
 const weight=latestBody?field(latestBody.payload,/^peso|^weight/):null,previousWeight=previousBody?field(previousBody.payload,/^peso|^weight/):null;
 const cards:[string,string][]=Array.isArray(profile.personal_health_display?.cards)?profile.personal_health_display.cards:[];
 const vo2=cards.find(([k])=>/vo/i.test(k))?.[1]??null;
 const bodyInfo={weight,fat:latestBody?field(latestBody.payload,/gordura.*%|gordura_corporal|body.?fat/):null,date:latestBody?.recorded_on??null,change:weight!==null&&previousWeight!==null?r1(weight-previousWeight):null,vo2};
 // Tests
 const exams=readExams(profile.personal_exams);const list=markers(exams);
 const next=exams.filter(e=>e.next&&e.next>=today).sort((a,b)=>a.next.localeCompare(b.next))[0];
 const tests={out:list.filter(m=>m.status==='baixo'||m.status==='alto').map(m=>m.name),next:next?.next??null,nextLabel:next?(next.nextNote||next.title):null,markers:list.length};
 return {sleep,wellbeing,training,energy,water,body:bodyInfo,tests};
}
export type HealthSummary=ReturnType<typeof healthSummary>;
