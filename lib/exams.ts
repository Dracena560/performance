import { z } from 'zod';
import { dateValue } from './date-value';

const requiredDate=dateValue.refine(v=>v!=='','Data obrigatória');
const limit=z.number().finite().nullable().default(null);
export const examGroups=['Vitaminas','Minerais e ferro','Lipídios','Glicose','Hemograma','Tireoide e hormônios','Rins','Fígado','Inflamação','Urina','Outros'] as const;
export const examKinds=['Exame de sangue','Exame de urina','Imagem','Consulta','Check-up','Outro'] as const;

/** One marker of an exam, e.g. Vitamina D 32 ng/mL with reference 30–100. */
export const examResultSchema=z.object({
 id:z.string().min(1).max(100),
 name:z.string().trim().min(1).max(150),
 group:z.enum(examGroups).default('Outros'),
 value:z.number().finite().nullable().default(null),
 text:z.string().max(500).default(''),
 unit:z.string().max(40).default(''),
 low:limit,
 high:limit,
 reference:z.string().max(300).default(''),
 notes:z.string().max(2000).default('')
});
export const examSchema=z.object({
 id:z.string().min(1).max(100),
 date:requiredDate,
 kind:z.enum(examKinds).default('Exame de sangue'),
 title:z.string().trim().min(1).max(200),
 lab:z.string().max(200).default(''),
 doctor:z.string().max(200).default(''),
 next:dateValue.default(''),
 nextNote:z.string().max(300).default(''),
 notes:z.string().max(10000).default(''),
 url:z.string().max(2000).default(''),
 results:z.array(examResultSchema).max(300).default([])
}).superRefine((e,c)=>{if(new Set(e.results.map(r=>r.id)).size!==e.results.length)c.addIssue({code:'custom',message:'Não repita o id de um marcador no mesmo exame.'});});
export const examsSchema=z.array(examSchema).max(500);
export type Exam=z.infer<typeof examSchema>;
export type ExamResult=z.infer<typeof examResultSchema>;

export function readExams(value:unknown):Exam[]{const parsed=examsSchema.safeParse(value??[]);return parsed.success?[...parsed.data].sort((a,b)=>b.date.localeCompare(a.date)):[];}

export type Status='baixo'|'normal'|'alto'|'sem faixa';
export function status(r:Pick<ExamResult,'value'|'low'|'high'>):Status{
 if(r.value===null||(r.low===null&&r.high===null))return 'sem faixa';
 if(r.low!==null&&r.value<r.low)return 'baixo';
 if(r.high!==null&&r.value>r.high)return 'alto';
 return 'normal';
}
/** Where the value sits in the reference range, 0–1 inside it (clamped to −0.25…1.25 for the bar). */
export function rangePosition(r:Pick<ExamResult,'value'|'low'|'high'>){
 if(r.value===null)return null;const low=r.low??0,high=r.high??(r.low!==null?r.low*2:null);if(high===null||high===low)return null;
 return Math.max(-.25,Math.min(1.25,(r.value-low)/(high-low)));
}

export const markerKey=(name:string)=>name.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/\(.*?\)/g,'').replace(/[^a-z0-9]+/g,' ').trim();

/** Every marker across exams, newest value first, with its history (oldest first) for charts. */
export function markers(exams:Exam[]){
 const map=new Map<string,{key:string;name:string;group:ExamResult['group'];unit:string;history:(ExamResult&{date:string;examId:string})[]}>();
 for(const exam of [...exams].sort((a,b)=>a.date.localeCompare(b.date)))for(const r of exam.results){const key=markerKey(r.name);const row=map.get(key)??{key,name:r.name,group:r.group,unit:r.unit,history:[]};row.history.push({...r,date:exam.date,examId:exam.id});row.name=r.name;row.group=r.group;if(r.unit)row.unit=r.unit;map.set(key,row);}
 return [...map.values()].map(m=>{const latest=m.history.at(-1)!;const previous=m.history.at(-2)??null;return {...m,latest,previous,status:status(latest),change:previous&&latest.value!==null&&previous.value!==null?Math.round((latest.value-previous.value)*100)/100:null};})
  .sort((a,b)=>examGroups.indexOf(a.group)-examGroups.indexOf(b.group)||a.name.localeCompare(b.name,'pt-BR'));
}

/** Supplements that relate to a marker, so a low Vitamina D shows whether you already take it. */
const supplementLinks:[RegExp,string[]][]=[
 [/vitamina d|25 ?oh|calcidiol|vit d|vitamin d/,['Vitamina D']],
 [/vitamina e|tocoferol/,['Vitamina E']],
 [/vitamina c|acido ascorbico/,['Vitamina C']],
 [/magnesio|magnesium/,['Magnésio']],
 [/selenio|selenium/,['Selênio']],
 [/omega|epa|dha/,['Ômega-3']],
 [/coq10|coenzima/,['CoQ10']],
 [/cortisol/,['Ashwagandha']],
 [/ferritina|ferro|iron/,['Ferro']],
 [/b12|cobalamina/,['Vitamina B12']]
];
export function relatedSupplements(name:string,taking:string[]){
 const key=markerKey(name);const names=supplementLinks.filter(([re])=>re.test(key)).flatMap(([,list])=>list);
 const normal=(s:string)=>markerKey(s);
 return names.map(n=>({name:n,taking:taking.some(t=>normal(t)===normal(n))}));
}

/** Next exams and follow-ups for the due-dates list. */
export function examReminders(exams:Exam[]){return exams.filter(e=>e.next).map(e=>({id:`exam-${e.id}`,name:e.nextNote||`Próximo: ${e.title}`,source:e.kind==='Consulta'?'Consulta':'Exame',date:e.next,amount:null}));}

/** Upserts an exam sent by the MCP: same id (or same date and title) replaces it; results keep their ids. */
const slug=(text:string)=>text.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)||'item';
export function upsertExam(list:unknown,input:Record<string,any>){
 const exams=examsSchema.parse(list??[]);
 const found=exams.find(e=>(input.id&&e.id===input.id)||(!input.id&&e.date===input.date&&markerKey(e.title)===markerKey(String(input.title??''))));
 const id=found?.id??(input.id||`${input.date}-${slug(String(input.title??'exame'))}`);
 const used=new Set<string>();
 const results=(Array.isArray(input.results)?input.results:found?.results??[]).map((r:any)=>{let rid=r.id||slug(String(r.name));while(used.has(rid))rid+='-2';used.add(rid);return {...r,id:rid};});
 const exam=examSchema.parse({...found,...input,id,results});
 return {exam,exams:examsSchema.parse(found?exams.map(e=>e.id===id?exam:e):[...exams,exam]),created:!found};
}
