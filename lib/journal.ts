import { z } from 'zod';

/** Kinds of life-journal entries: [id, label, short help]. */
export const journalKinds=[
 ['momento','Momento','Algo que aconteceu e vale lembrar'],
 ['conquista','Conquista','Uma vitória, grande ou pequena'],
 ['aprendizado','Aprendizado','O que você descobriu ou entendeu'],
 ['reflexao','Reflexão','Como você está, o que anda pensando'],
 ['gratidao','Gratidão','Pessoas e coisas pelas quais é grato'],
 ['decisao','Decisão','O que decidiu e por quê, para revisitar depois'],
 ['ideia','Ideia','Planos, projetos e vontades'],
 ['memoria','Memória','Uma lembrança antiga, com a data em que aconteceu'],
] as const;
export type JournalKind=(typeof journalKinds)[number][0];
const kindIds=journalKinds.map(([id])=>id) as [JournalKind,...JournalKind[]];
export const kindLabel=(kind:string)=>journalKinds.find(([id])=>id===kind)?.[1]??'Momento';

const day=z.string().regex(/^\d{4}-\d{2}-\d{2}$/,'Use AAAA-MM-DD');
const list=z.array(z.string().trim().min(1).max(60)).max(30).default([]);
export const journalEntrySchema=z.object({
 occurred_on:day,
 occurred_time:z.string().regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/).default(''),
 kind:z.enum(kindIds).default('momento'),
 title:z.string().trim().max(200).default(''),
 body:z.string().trim().max(20000).default(''),
 mood:z.number().int().min(0).max(10).nullable().default(null),
 tags:list,
 people:list,
 place:z.string().trim().max(200).default(''),
 milestone:z.boolean().default(false),
 revisit_on:day.nullable().default(null),
}).refine(entry=>entry.title||entry.body,'Escreva um título ou um texto.');
export type JournalInput=z.input<typeof journalEntrySchema>;
export type JournalEntry=z.infer<typeof journalEntrySchema>&{id:string;source?:string;created_at?:string;updated_at?:string};

const tidy=(values:string[])=>{const seen=new Map<string,string>();for(const raw of values){const value=raw.trim().replace(/^#/,'');if(value&&!seen.has(value.toLocaleLowerCase('pt-BR')))seen.set(value.toLocaleLowerCase('pt-BR'),value);}return [...seen.values()];};
/** Validates an entry; tags are lower-case without "#", people keep their spelling, duplicates go away. */
export function parseJournalEntry(raw:unknown){
 const entry=journalEntrySchema.parse(raw);
 return {...entry,tags:tidy(entry.tags).map(tag=>tag.toLocaleLowerCase('pt-BR')),people:tidy(entry.people)};
}

const normalize=(value:string)=>value.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
export type JournalFilter={query?:string;kind?:string;tag?:string;person?:string;year?:string;milestones?:boolean;from?:string;to?:string};
/** Same filter on the page and in the MCP: words match title, text, place, tags and people, accents ignored. */
export function filterJournal(entries:JournalEntry[],filter:JournalFilter){
 const words=normalize(filter.query??'').split(/\s+/).filter(Boolean);
 return entries.filter(entry=>{
  if(filter.kind&&entry.kind!==filter.kind)return false;
  if(filter.tag&&!entry.tags.some(tag=>normalize(tag)===normalize(filter.tag!)))return false;
  if(filter.person&&!entry.people.some(person=>normalize(person)===normalize(filter.person!)))return false;
  if(filter.year&&!entry.occurred_on.startsWith(filter.year))return false;
  if(filter.milestones&&!entry.milestone)return false;
  if(filter.from&&entry.occurred_on<filter.from)return false;
  if(filter.to&&entry.occurred_on>filter.to)return false;
  if(!words.length)return true;
  const haystack=normalize([entry.title,entry.body,entry.place,...entry.tags,...entry.people].join(' '));
  return words.every(word=>haystack.includes(word));
 }).sort(byDateDesc);
}
export const byDateDesc=(a:JournalEntry,b:JournalEntry)=>(b.occurred_on+b.occurred_time).localeCompare(a.occurred_on+a.occurred_time);

/** Entries written on this same day and month in previous years. */
export function onThisDay(entries:JournalEntry[],today:string){
 return entries.filter(entry=>entry.occurred_on.slice(5)===today.slice(5)&&entry.occurred_on<today.slice(0,4)).sort(byDateDesc);
}
/** Decisions and entries whose revisit date has arrived. */
export function dueRevisits(entries:JournalEntry[],today:string){
 return entries.filter(entry=>entry.revisit_on&&entry.revisit_on<=today).sort((a,b)=>a.revisit_on!.localeCompare(b.revisit_on!));
}

const count=(values:string[])=>[...values.reduce((map,value)=>map.set(value,(map.get(value)??0)+1),new Map<string,number>())].map(([name,total])=>({name,total})).sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name,'pt-BR'));
const shift=(date:string,days:number)=>new Date(Date.parse(date+'T12:00:00Z')+days*86400000).toISOString().slice(0,10);
/** Numbers for the page header and for the MCP summary. */
export function journalStats(entries:JournalEntry[],today:string){
 const days=new Set(entries.map(entry=>entry.occurred_on));
 let streak=0;for(let date=days.has(today)?today:shift(today,-1);days.has(date);date=shift(date,-1))streak++;
 const moods=entries.filter(entry=>entry.occurred_on>shift(today,-30)&&entry.mood!==null).map(entry=>entry.mood!);
 return {
  total:entries.length,
  thisYear:entries.filter(entry=>entry.occurred_on.startsWith(today.slice(0,4))).length,
  milestones:entries.filter(entry=>entry.milestone).length,
  streak,
  mood30:moods.length?Math.round(moods.reduce((a,b)=>a+b,0)/moods.length*10)/10:null,
  tags:count(entries.flatMap(entry=>entry.tags)),
  people:count(entries.flatMap(entry=>entry.people)),
  kinds:journalKinds.map(([id,label])=>({id,label,total:entries.filter(entry=>entry.kind===id).length})),
  years:[...new Set(entries.map(entry=>entry.occurred_on.slice(0,4)))].sort().reverse(),
 };
}

const prompts=[
 'O que te fez sorrir hoje?','Qual conversa ficou na sua cabeça esta semana?','O que você aprendeu recentemente que gostaria de lembrar daqui a 10 anos?',
 'Que decisão você está adiando? Por quê?','Quem fez diferença no seu dia?','Qual foi o melhor ponto que você jogou esta semana?',
 'O que o Caju fez de engraçado hoje?','Do que você sente falta do Brasil?','O que te deixou orgulhoso este mês?',
 'Se pudesse repetir um dia deste ano, qual seria?','Que hábito está funcionando bem?','O que você faria diferente na última semana?',
 'Qual lugar novo você conheceu?','O que te tirou energia hoje?','Qual meta pequena você pode cumprir amanhã?',
 'Qual lembrança de infância apareceu esses dias?','Pelo que você é grato agora?','O que você quer contar para o seu eu de daqui a um ano?',
];
/** One question per day, the same all day long. */
export function promptOfDay(today:string){const n=Math.floor(Date.parse(today+'T12:00:00Z')/86400000);return prompts[((n%prompts.length)+prompts.length)%prompts.length];}

const dateLabel=(date:string)=>new Date(date+'T12:00:00Z').toLocaleDateString('pt-BR',{timeZone:'UTC',day:'2-digit',month:'long',year:'numeric'});
/** Markdown export, oldest first, to reuse the journal elsewhere (book, retrospective, another AI). */
export function journalMarkdown(entries:JournalEntry[]){
 const lines=['# Diário',''];let year='';
 for(const entry of [...entries].sort(byDateDesc).reverse()){
  if(entry.occurred_on.slice(0,4)!==year){year=entry.occurred_on.slice(0,4);lines.push(`## ${year}`,'');}
  const meta=[kindLabel(entry.kind),entry.place,entry.people.length?`com ${entry.people.join(', ')}`:'',entry.mood!==null?`humor ${entry.mood}/10`:'',entry.tags.map(tag=>'#'+tag).join(' ')].filter(Boolean).join(' · ');
  lines.push(`### ${entry.milestone?'★ ':''}${dateLabel(entry.occurred_on)}${entry.occurred_time?` ${entry.occurred_time}`:''}${entry.title?` — ${entry.title}`:''}`,`_${meta}_`,'');
  if(entry.body)lines.push(entry.body,'');
 }
 return lines.join('\n');
}
