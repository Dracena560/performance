'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookHeart, CalendarClock, Download, History, MapPin, Pencil, Plus, Search, Sparkles, Star, Trash2, Users } from 'lucide-react';
import { deleteJournal, saveJournal } from '@/app/actions';
import { dueRevisits, filterJournal, journalKinds, journalMarkdown, journalStats, kindLabel, onThisDay, parseJournalEntry, promptOfDay, type JournalEntry, type JournalFilter, type JournalKind } from '@/lib/journal';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';
import { useSettings } from './settings-context';

const longDate=(date:string,options:Intl.DateTimeFormatOptions={day:'2-digit',month:'long',year:'numeric'})=>new Date(date+'T12:00:00Z').toLocaleDateString('pt-BR',{timeZone:'UTC',...options});
const monthKey=(date:string)=>date.slice(0,7);
const yearsAgo=(date:string,today:string)=>{const n=Number(today.slice(0,4))-Number(date.slice(0,4));return n===1?'há 1 ano':`há ${n} anos`;};
const splitList=(value:string)=>value.split(',').map(item=>item.trim()).filter(Boolean);
type Draft={id:string|null;occurred_on:string;occurred_time:string;kind:JournalKind;title:string;body:string;mood:number|null;topics:string[];tags:string;people:string;place:string;milestone:boolean;revisit_on:string};
const emptyDraft=(today:string,prompt=''):Draft=>({id:null,occurred_on:today,occurred_time:'',kind:'momento',title:prompt,body:'',mood:null,topics:[],tags:'',people:'',place:'',milestone:false,revisit_on:''});
const toDraft=(entry:JournalEntry):Draft=>({id:entry.id,occurred_on:entry.occurred_on,occurred_time:entry.occurred_time,kind:entry.kind,title:entry.title,body:entry.body,mood:entry.mood,topics:entry.topics??[],tags:entry.tags.join(', '),people:entry.people.join(', '),place:entry.place,milestone:entry.milestone,revisit_on:entry.revisit_on??''});

/** Life journal: write, search, look back ("neste dia", milestones, decisions to revisit) and export. */
export function JournalView({initial,today,demo=false}:{initial:JournalEntry[];today:string;demo?:boolean}){
 const router=useRouter();
 const topicOptions=useSettings().journal.topics;
 const [entries,setEntries]=useState(initial);
 const [filter,setFilter]=useState<JournalFilter>({});
 const [draft,setDraft]=useState<Draft|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [expanded,setExpanded]=useState<Set<string>>(new Set());
 const stats=useMemo(()=>journalStats(entries,today),[entries,today]);
 const shown=useMemo(()=>filterJournal(entries,filter),[entries,filter]);
 const memories=onThisDay(entries,today),revisits=dueRevisits(entries,today);
 const milestones=entries.filter(entry=>entry.milestone).slice().reverse();
 const prompt=promptOfDay(today);
 const filtering=Object.values(filter).some(Boolean);
 const months=shown.reduce((groups,entry)=>{const key=monthKey(entry.occurred_on);(groups.get(key)??groups.set(key,[]).get(key)!).push(entry);return groups;},new Map<string,JournalEntry[]>());

 const persist=async(next:Draft)=>{
  setBusy(true);setError('');
  try{
   const input={occurred_on:next.occurred_on,occurred_time:next.occurred_time,kind:next.kind,title:next.title,body:next.body,mood:next.mood,topics:next.topics,tags:splitList(next.tags),people:splitList(next.people),place:next.place,milestone:next.milestone,revisit_on:next.revisit_on||null};
   const saved:JournalEntry=demo?{id:next.id??crypto.randomUUID(),...parseJournalEntry(input)}:await saveJournal(input,next.id);
   setEntries(current=>[saved,...current.filter(entry=>entry.id!==saved.id)]);
   setDraft(null);setNotice(demo?'Salvo só nesta demonstração.':next.id?'Entrada atualizada.':'Entrada salva no diário.');
   if(!demo)router.refresh();
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 };
 const remove=async(entry:JournalEntry)=>{
  if(!confirm(`Apagar "${entry.title||longDate(entry.occurred_on)}" do diário?`))return;
  try{if(!demo)await deleteJournal(entry.id);setEntries(current=>current.filter(item=>item.id!==entry.id));setNotice('Entrada apagada.');}catch(e){setError((e as Error).message);}
 };
 const finishRevisit=(entry:JournalEntry)=>persist({...toDraft(entry),revisit_on:''});
 const exportMarkdown=()=>{const blob=new Blob([journalMarkdown(entries)],{type:'text/markdown'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`diario-${today}.md`;link.click();URL.revokeObjectURL(url);};
 const toggle=(id:string)=>setExpanded(current=>{const next=new Set(current);if(next.has(id))next.delete(id);else next.add(id);return next;});

 const card=(entry:JournalEntry,compact=false)=>{
  const open=expanded.has(entry.id),long=entry.body.length>280;
  return <article key={entry.id} className={`journal-entry kind-${entry.kind}${entry.milestone?' milestone':''}`}>
   <header>
    <time dateTime={entry.occurred_on}><b>{entry.occurred_on.slice(8,10)}</b><small>{longDate(entry.occurred_on,{weekday:'short'}).replace('.','')}</small></time>
    <div>
     <span className="journal-kind">{kindLabel(entry.kind)}{entry.occurred_time&&<> · {entry.occurred_time}</>}{compact&&<> · {longDate(entry.occurred_on)}</>}</span>
     {entry.title&&<h3>{entry.milestone&&<Star size={15} fill="currentColor" aria-label="Marco"/>}{entry.title}</h3>}
    </div>
    {entry.mood!==null&&<span className="journal-mood" title="Humor">{entry.mood}<small>/10</small></span>}
   </header>
   {entry.body&&<p className={`journal-body${long&&!open?' clamped':''}`}>{entry.body}</p>}
   {long&&<button className="text-link" onClick={()=>toggle(entry.id)}>{open?'Mostrar menos':'Ler tudo'}</button>}
   <footer>
    <span className="journal-meta">
     {(entry.topics??[]).map(topic=><button key={'topic'+topic} className="journal-topic" onClick={()=>setFilter({topic})}>{topic}</button>)}
     {entry.place&&<span><MapPin size={13}/>{entry.place}</span>}
     {entry.people.map(person=><button key={person} onClick={()=>setFilter({person})}><Users size={13}/>{person}</button>)}
     {entry.tags.map(tag=><button key={tag} onClick={()=>setFilter({tag})}>#{tag}</button>)}
     {entry.revisit_on&&<span className="journal-revisit"><CalendarClock size={13}/>Revisitar em {longDate(entry.revisit_on)}</span>}
    </span>
    <span className="journal-actions">
     <button className="button icon ghost" aria-label="Editar entrada" onClick={()=>{setError('');setDraft(toDraft(entry));}}><Pencil size={16}/></button>
     <button className="button icon ghost" aria-label="Apagar entrada" onClick={()=>remove(entry)}><Trash2 size={16}/></button>
    </span>
   </footer>
  </article>;
 };

 return <div className="journal-page">
  <header className="journal-masthead">
   <div><span className="eyebrow">DIÁRIO</span><h1>Sua história, um dia de cada vez</h1><p>Momentos, conquistas, aprendizados e decisões. Escreva aqui ou pelo ChatGPT/Claude: tudo fica pesquisável e pode virar base para retrospectivas, metas e o que mais você quiser.</p></div>
   <div className="journal-masthead-actions">
    <button className="button secondary" onClick={exportMarkdown} disabled={!entries.length}><Download size={16}/>Exportar</button>
    <button className="button primary" onClick={()=>{setError('');setDraft(emptyDraft(today));}}><Plus size={18}/>Escrever</button>
   </div>
  </header>
  {notice&&<p className="success journal-notice" role="status">{notice}</p>}

  <div className="journal-top">
   <section className="panel journal-prompt">
    <span className="eyebrow"><Sparkles size={14}/> PERGUNTA DO DIA</span>
    <h2>{prompt}</h2>
    <button className="button tinted" onClick={()=>{setError('');setDraft({...emptyDraft(today,prompt),kind:'reflexao'});}}>Responder</button>
   </section>
   <dl className="panel journal-stats">
    <div><dt>Entradas</dt><dd>{stats.total}</dd></div>
    <div><dt>Em {today.slice(0,4)}</dt><dd>{stats.thisYear}</dd></div>
    <div><dt>Dias seguidos</dt><dd>{stats.streak}</dd></div>
    <div><dt>Marcos</dt><dd>{stats.milestones}</dd></div>
    <div><dt>Humor · 30 dias</dt><dd>{stats.mood30===null?'—':stats.mood30.toLocaleString('pt-BR')}</dd></div>
   </dl>
  </div>

  {(memories.length>0||revisits.length>0)&&<div className="journal-lookback">
   {memories.length>0&&<section className="panel"><div className="panel-heading"><h2><History size={18}/> Neste dia</h2><span className="subtle">{longDate(today,{day:'2-digit',month:'long'})}</span></div>{memories.map(entry=><div key={entry.id} className="journal-lookback-item"><small>{yearsAgo(entry.occurred_on,today)}</small>{card(entry,true)}</div>)}</section>}
   {revisits.length>0&&<section className="panel"><div className="panel-heading"><h2><CalendarClock size={18}/> Para revisitar</h2><span className="subtle">{revisits.length}</span></div><p className="field-help">Como essas decisões se saíram? Edite para contar o resultado ou marque como revisitada.</p>{revisits.map(entry=><div key={entry.id} className="journal-lookback-item">{card(entry,true)}<button className="button secondary small" disabled={busy} onClick={()=>finishRevisit(entry)}>Marcar como revisitada</button></div>)}</section>}
  </div>}

  {milestones.length>0&&<section className="journal-lifeline" aria-labelledby="journal-lifeline-title">
   <h2 id="journal-lifeline-title">Linha da vida</h2>
   <ol>{milestones.map(entry=><li key={entry.id}><button onClick={()=>setFilter({milestones:true,year:entry.occurred_on.slice(0,4)})}><small>{longDate(entry.occurred_on,{month:'short',year:'numeric'}).replace('.','')}</small><strong>{entry.title||kindLabel(entry.kind)}</strong></button></li>)}</ol>
  </section>}

  <section className="journal-browse">
   <div className="journal-filters">
    <label className="journal-search"><Search size={16}/><input type="search" placeholder="Buscar no diário" value={filter.query??''} onChange={e=>setFilter({...filter,query:e.target.value})}/></label>
    <select aria-label="Tipo" value={filter.kind??''} onChange={e=>setFilter({...filter,kind:e.target.value||undefined})}><option value="">Todos os tipos</option>{journalKinds.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select>
    <select aria-label="Ano" value={filter.year??''} onChange={e=>setFilter({...filter,year:e.target.value||undefined})}><option value="">Todos os anos</option>{stats.years.map(year=><option key={year}>{year}</option>)}</select>
    <button className={`button ${filter.milestones?'tinted':'secondary'}`} aria-pressed={!!filter.milestones} onClick={()=>setFilter({...filter,milestones:!filter.milestones||undefined})}><Star size={15}/>Marcos</button>
    {filtering&&<button className="text-link" onClick={()=>setFilter({})}>Limpar filtros</button>}
   </div>
   {topicOptions.length>0&&<div className="journal-topic-filter" role="group" aria-label="Tópicos">{[...new Set([...topicOptions,...stats.topics.map(t=>t.name)])].map(topic=>{const total=stats.topics.find(t=>t.name===topic)?.total??0;return <button key={topic} className={`journal-topic${filter.topic===topic?' selected':''}`} aria-pressed={filter.topic===topic} onClick={()=>setFilter(filter.topic===topic?{...filter,topic:undefined}:{...filter,topic})}>{topic}{total>0&&<small>{total}</small>}</button>;})}</div>}
   {(filter.tag||filter.person)&&<p className="journal-active-filter">Mostrando {filter.tag?<b>#{filter.tag}</b>:<b>{filter.person}</b>} · {shown.length} {shown.length===1?'entrada':'entradas'}</p>}
   {(stats.people.length>0||stats.tags.length>0)&&!filtering&&<div className="journal-chips">
    {stats.people.slice(0,8).map(item=><button key={'p'+item.name} onClick={()=>setFilter({person:item.name})}><Users size={13}/>{item.name}<small>{item.total}</small></button>)}
    {stats.tags.slice(0,10).map(item=><button key={'t'+item.name} onClick={()=>setFilter({tag:item.name})}>#{item.name}<small>{item.total}</small></button>)}
   </div>}
   {shown.length?[...months].map(([month,items])=><section key={month} className="journal-month">
    <h2>{longDate(month+'-01',{month:'long',year:'numeric'})}<small>{items.length}</small></h2>
    <div className="journal-list">{items.map(entry=>card(entry))}</div>
   </section>):<div className="panel journal-empty"><BookHeart size={30}/><h2>{entries.length?'Nada encontrado':'Seu diário começa aqui'}</h2><p>{entries.length?'Tente outra busca ou limpe os filtros.':'Escreva a primeira entrada ou responda à pergunta do dia. Pelo ChatGPT/Claude, peça "anota no meu diário que…".'}</p></div>}
  </section>

  {draft&&<Dialog open onOpenChange={open=>{if(!open&&!busy)setDraft(null);}}><DialogContent className="dialog-content journal-dialog">
   <DialogTitle>{draft.id?'Editar entrada':'Nova entrada'}</DialogTitle>
   <DialogDescription>{journalKinds.find(([id])=>id===draft.kind)?.[2]}</DialogDescription>
   <form className="form-stack" onSubmit={e=>{e.preventDefault();persist(draft);}}>
    <div className="journal-kind-picker" role="radiogroup" aria-label="Tipo de entrada">{journalKinds.map(([id,label])=><button type="button" role="radio" aria-checked={draft.kind===id} key={id} className={draft.kind===id?'selected':''} onClick={()=>setDraft({...draft,kind:id})}>{label}</button>)}</div>
    <div className="score-grid">
     <label>Quando aconteceu<input type="date" required value={draft.occurred_on} onChange={e=>setDraft({...draft,occurred_on:e.target.value})}/></label>
     <label>Horário (opcional)<input type="time" value={draft.occurred_time} onChange={e=>setDraft({...draft,occurred_time:e.target.value})}/></label>
    </div>
    <label>Título<input value={draft.title} maxLength={200} onChange={e=>setDraft({...draft,title:e.target.value})} placeholder="Em poucas palavras"/></label>
    <label>Texto<textarea rows={7} value={draft.body} maxLength={20000} onChange={e=>setDraft({...draft,body:e.target.value})} placeholder="Conte com calma: o que aconteceu, como se sentiu, o que quer lembrar."/></label>
    <fieldset className="journal-topics-field"><legend>Tópicos</legend><div>{[...new Set([...topicOptions,...draft.topics])].map(topic=><button type="button" key={topic} aria-pressed={draft.topics.includes(topic)} className={`journal-topic${draft.topics.includes(topic)?' selected':''}`} onClick={()=>setDraft({...draft,topics:draft.topics.includes(topic)?draft.topics.filter(t=>t!==topic):[...draft.topics,topic]})}>{topic}</button>)}</div><small className="field-help">Edite a lista em Configurações › Diário.</small></fieldset>
    <div className="score-grid">
     <label>Pessoas<input value={draft.people} onChange={e=>setDraft({...draft,people:e.target.value})} placeholder="Sara, Caju"/></label>
     <label>Tags<input value={draft.tags} onChange={e=>setDraft({...draft,tags:e.target.value})} placeholder="tênis, trabalho, viagem"/></label>
     <label>Lugar<input value={draft.place} maxLength={200} onChange={e=>setDraft({...draft,place:e.target.value})} placeholder="Londres"/></label>
     <label>Revisitar em{draft.kind==='decisao'?'':' (opcional)'}<input type="date" value={draft.revisit_on} onChange={e=>setDraft({...draft,revisit_on:e.target.value})}/></label>
    </div>
    <fieldset className="journal-mood-field"><legend>Humor {draft.mood===null?'(opcional)':`· ${draft.mood}/10`}</legend><div>{Array.from({length:11},(_,n)=><button type="button" key={n} aria-pressed={draft.mood===n} className={draft.mood===n?'selected':''} onClick={()=>setDraft({...draft,mood:draft.mood===n?null:n})}>{n}</button>)}</div></fieldset>
    <label className="checkbox-label"><input type="checkbox" checked={draft.milestone} onChange={e=>setDraft({...draft,milestone:e.target.checked})}/><span>Marco da vida (aparece na Linha da vida)</span></label>
    {error&&<p className="error" role="alert">{error}</p>}
    <button className="button primary" disabled={busy||(!draft.title.trim()&&!draft.body.trim())}>{busy?'Salvando…':'Salvar no diário'}</button>
   </form>
  </DialogContent></Dialog>}
 </div>;
}
