'use client';
import {useEffect,useMemo,useState} from 'react';
import {useRouter} from 'next/navigation';
import {AlertTriangle,CalendarClock,ChevronDown,FlaskConical,Pill,Plus,Stethoscope,TestTubes,Pencil} from 'lucide-react';
import {Dialog,DialogContent,DialogDescription,DialogTitle} from './ui/dialog';
import {Button} from './ui/button';
import {EChart,lineOption} from './echart';
import {RecordDialog,type Field} from './record-form';
import {savePersonalSection} from '@/app/actions';
import {examGroups,examKinds,examsSchema,markers,rangePosition,relatedSupplements,status,type Exam,type ExamResult} from '@/lib/exams';
import {daysUntil} from '@/lib/dog';

const num=(v:number)=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2}).format(v);
const dateText=(d:string,opts:Intl.DateTimeFormatOptions={day:'2-digit',month:'short',year:'numeric'})=>new Intl.DateTimeFormat('pt-BR',{...opts,timeZone:'UTC'}).format(new Date(d+'T12:00:00Z'));
const rangeText=(r:Pick<ExamResult,'low'|'high'|'unit'|'reference'>)=>r.low!==null&&r.high!==null?`${num(r.low)}–${num(r.high)} ${r.unit}`:r.low!==null?`acima de ${num(r.low)} ${r.unit}`:r.high!==null?`abaixo de ${num(r.high)} ${r.unit}`:r.reference||'Sem faixa de referência';
const statusLabel={baixo:'Abaixo',normal:'Normal',alto:'Acima','sem faixa':'Sem faixa'} as const;
const examFields:Field[]=[{key:'title',label:'Título'},{key:'kind',label:'Tipo',type:'select',options:examKinds},{key:'date',label:'Data',type:'date'},{key:'lab',label:'Laboratório ou clínica'},{key:'doctor',label:'Médico(a)'},{key:'next',label:'Próximo exame ou retorno',type:'date'},{key:'nextNote',label:'O que fazer na próxima data',wide:true},{key:'url',label:'Link do laudo (opcional)',wide:true},{key:'notes',label:'Observações e orientações',type:'textarea'}];

/** Where the value sits in its reference range: a track with the normal band and a dot. */
function RangeBar({r}:{r:ExamResult}){
 const pos=rangePosition(r);if(pos===null)return null;const s=status(r);
 // The normal band is drawn between 20% and 80% of the track; values outside stretch into the margins.
 const left=20+pos*60;const band=r.low===null?{left:'0%',width:'80%'}:r.high===null?{left:'20%',width:'80%'}:{left:'20%',width:'60%'};
 return <span className={`range-bar s-${s.replace(' ','-')}`} aria-hidden><i style={band}/><em style={{left:`${Math.max(2,Math.min(98,left))}%`}}/></span>;
}

export function ExamsView({initial,today,taking,demo=false}:{initial:Exam[];today:string;taking:string[];demo?:boolean}){
 const router=useRouter();
 const [exams,setExams]=useState(initial);useEffect(()=>setExams(initial),[initial]);
 const [open,setOpen]=useState<string|null>(null),[editing,setEditing]=useState<Exam|null>(null),[expanded,setExpanded]=useState<string|null>(null),[group,setGroup]=useState<string>('Todos');
 const list=useMemo(()=>markers(exams),[exams]);
 const sorted=[...exams].sort((a,b)=>b.date.localeCompare(a.date));
 const lastExam=sorted.find(e=>e.results.length);
 const out=list.filter(m=>m.status==='baixo'||m.status==='alto');
 const next=sorted.filter(e=>e.next&&e.next>=today).sort((a,b)=>a.next.localeCompare(b.next))[0];
 const groups=examGroups.filter(g=>list.some(m=>m.group===g));
 const shown=list.filter(m=>group==='Todos'||m.group===group);
 const marker=list.find(m=>m.key===open);
 const persist=async(nextList:Exam[])=>{const parsed=examsSchema.parse(nextList);if(!demo)await savePersonalSection('exams',parsed);setExams(parsed);router.refresh();};
 const tile=(icon:React.ReactNode,label:string,value:string,detail:string,tone='')=><article className={`metric exam-tile ${tone}`}><div className="metric-top"><span>{icon}{label}</span></div><div className="metric-value">{value}</div><p className="metric-meta">{detail}</p></article>;

 return <div className="exams-page">
  <header className="page-heading"><div className="health-hero-lead"><span className="health-hero-icon" aria-hidden style={{['--icon-tint' as string]:'var(--sys-red)'}}><FlaskConical/></span><div><span className="eyebrow">SAÚDE · LABORATÓRIO</span><h1>Exames e consultas</h1><p>Seus resultados com faixa de referência, a evolução de cada marcador e quando repetir.</p></div></div>
   <Button variant="tinted" onClick={()=>setEditing({id:'',date:today,kind:'Consulta',title:'',lab:'',doctor:'',next:'',nextNote:'',notes:'',url:'',results:[]})}><Plus size={18}/>Nova consulta ou exame</Button></header>

  <div className="tennis-stats exam-tiles">
   {tile(<TestTubes size={16}/>,'Último exame',lastExam?dateText(lastExam.date,{day:'2-digit',month:'short'}):'—',lastExam?lastExam.title:'Nenhum exame ainda')}
   {tile(<AlertTriangle size={16}/>,'Fora da faixa',String(out.length),out.length?out.map(m=>m.name).slice(0,3).join(', '):'Tudo dentro da referência',out.length?'warn':'ok')}
   {tile(<CalendarClock size={16}/>,'Próxima data',next?dateText(next.next,{day:'2-digit',month:'short'}):'—',next?`${next.nextNote||next.title} · em ${daysUntil(today,next.next)} dias`:'Defina quando repetir os exames')}
   {tile(<FlaskConical size={16}/>,'Marcadores',String(list.length),`${exams.filter(e=>e.results.length).length} exames com resultados`)}
  </div>

  {!exams.length&&<section className="panel exam-empty"><FlaskConical size={34} aria-hidden/><h2>Envie seu primeiro exame</h2><p>Mande o PDF ou a foto do laudo para o ChatGPT e peça para registrar o exame. Ele lança todos os marcadores com unidade e faixa de referência aqui.</p></section>}

  {out.length>0&&<section className="panel exam-attention" aria-labelledby="attention-title">
   <div className="panel-heading"><div><h2 id="attention-title"><AlertTriangle size={19}/> Precisa de atenção</h2><p className="field-help">Valores do exame mais recente de cada marcador que estão fora da faixa do laboratório.</p></div></div>
   <ul>{out.map(m=>{const sup=relatedSupplements(m.name,taking);return <li key={m.key}><button onClick={()=>setOpen(m.key)}>
    <span className={`exam-status s-${m.status}`}>{statusLabel[m.status]}</span>
    <div><strong>{m.name}</strong><small>{`${m.latest.value!==null?`${num(m.latest.value)} ${m.unit}`:m.latest.text} · referência ${rangeText(m.latest)} · ${dateText(m.latest.date)}`}</small>
     {sup.length>0&&<small className="exam-supplement"><Pill size={13}/>{sup.map(s=>s.taking?`Você já toma ${s.name} na rotina.`:`${s.name} não está na sua rotina de suplementos.`).join(' ')}</small>}</div>
    <RangeBar r={m.latest}/></button></li>;})}</ul>
   <p className="field-help">Isto organiza seus resultados; quem interpreta e decide tratamento é o seu médico.</p>
  </section>}

  {list.length>0&&<section className="panel exam-markers" aria-labelledby="markers-title">
   <div className="panel-heading"><div><h2 id="markers-title"><TestTubes size={19}/> Todos os marcadores</h2><p className="field-help">Último valor de cada um. Toque para ver a evolução.</p></div>
    <select aria-label="Filtrar grupo" value={group} onChange={e=>setGroup(e.target.value)}><option>Todos</option>{groups.map(g=><option key={g}>{g}</option>)}</select></div>
   {(group==='Todos'?groups:[group]).map(g=>{const rows=shown.filter(m=>m.group===g);if(!rows.length)return null;return <div key={g} className="exam-group"><h3>{g}</h3><div className="exam-grid">{rows.map(m=><button key={m.key} className="exam-card" onClick={()=>setOpen(m.key)}>
    <span className="exam-card-top"><strong>{m.name}</strong><span className={`exam-status s-${m.status.replace(' ','-')}`}>{statusLabel[m.status]}</span></span>
    <span className="exam-card-value">{m.latest.value!==null?num(m.latest.value):m.latest.text||'—'}<small>{m.unit}</small>{m.change!==null&&m.change!==0&&<em className={m.change>0?'up':'down'}>{m.change>0?'▲':'▼'} {num(Math.abs(m.change))}</em>}</span>
    <RangeBar r={m.latest}/>
    <small>{`${rangeText(m.latest)} · ${dateText(m.latest.date,{day:'2-digit',month:'short',year:'2-digit'})}`}</small>
   </button>)}</div></div>;})}
  </section>}

  <section className="panel exam-history" aria-labelledby="history-title">
   <div className="panel-heading"><div><h2 id="history-title"><Stethoscope size={19}/> Histórico de exames e consultas</h2><p className="field-help">{`${exams.length} ${exams.length===1?'registro':'registros'}. A data de retorno entra em Próximos vencimentos.`}</p></div></div>
   {sorted.map(e=><article key={e.id} className={expanded===e.id?'open':''}>
    <button className="exam-row" onClick={()=>setExpanded(expanded===e.id?null:e.id)} aria-expanded={expanded===e.id}>
     <time>{dateText(e.date,{day:'2-digit',month:'short'})}<small>{e.date.slice(0,4)}</small></time>
     <div><strong>{e.title}</strong><small>{[e.kind,e.lab,e.doctor,e.results.length?`${e.results.length} marcadores`:''].filter(Boolean).join(' · ')}</small>{e.next&&<small className="exam-next"><CalendarClock size={13}/>{`${e.nextNote||'Próxima data'}: ${dateText(e.next)}`}</small>}</div>
     <ChevronDown className="expand-arrow" size={18} aria-hidden/></button>
    {expanded===e.id&&<div className="exam-detail">
     {e.notes&&<p>{e.notes}</p>}
     {e.results.length>0&&<div className="personal-table-scroll"><table className="summary-table"><thead><tr><th>Marcador</th><th>Resultado</th><th>Referência</th><th>Status</th></tr></thead><tbody>{e.results.map(r=>{const s=status(r);return <tr key={r.id}><td>{r.name}</td><td>{r.value!==null?`${num(r.value)} ${r.unit}`:r.text}</td><td>{rangeText(r)}</td><td><span className={`exam-status s-${s.replace(' ','-')}`}>{statusLabel[s]}</span></td></tr>;})}</tbody></table></div>}
     {e.url&&<a className="text-link" href={e.url} target="_blank" rel="noreferrer">Abrir laudo</a>}
     <div className="record-actions"><Button variant="secondary" onClick={()=>setEditing(e)}><Pencil size={16}/>Editar</Button></div>
    </div>}
   </article>)}
  </section>

  {marker&&<Dialog open onOpenChange={v=>{if(!v)setOpen(null);}}><DialogContent className="dialog-content exam-dialog"><DialogTitle>{marker.name}</DialogTitle><DialogDescription>{`${marker.group} · referência ${rangeText(marker.latest)}`}</DialogDescription>
   <div className="exam-dialog-now"><strong>{marker.latest.value!==null?num(marker.latest.value):marker.latest.text}<small> {marker.unit}</small></strong><span className={`exam-status s-${marker.status.replace(' ','-')}`}>{statusLabel[marker.status]}</span><small>{dateText(marker.latest.date)}</small></div>
   {marker.history.filter(h=>h.value!==null).length>1?<EChart height={220} label={`Evolução de ${marker.name}`} option={t=>{const o:any=lineOption(t,{categories:marker.history.map(h=>h.date),scale:true,format:v=>`${num(v)} ${marker.unit}`,labelFormat:c=>dateText(c,{month:'short',year:'2-digit'}),titleFormat:c=>dateText(c),series:[{name:marker.name,values:marker.history.map(h=>h.value),color:'--sys-red',dots:true}]});const lines=[marker.latest.low,marker.latest.high].filter((v):v is number=>v!==null);if(lines.length)o.series[0].markLine={symbol:'none',silent:true,label:{position:'insideEndTop',color:t.label2,formatter:(p:any)=>num(p.value)},lineStyle:{color:t.color('--sys-green'),type:[4,4]},data:lines.map(v=>({yAxis:v}))};return o;}}/>:<p className="field-help">Com o próximo exame aparece o gráfico de evolução.</p>}
   {relatedSupplements(marker.name,taking).map(s=><p key={s.name} className="exam-supplement"><Pill size={14}/>{s.taking?`${s.name} faz parte da sua rotina de suplementos (veja em Hoje).`:`${s.name} não está na sua rotina de suplementos.`}</p>)}
   <ol className="exam-dialog-history">{[...marker.history].reverse().map(h=><li key={h.examId+h.id}><span>{dateText(h.date)}</span><b>{h.value!==null?`${num(h.value)} ${h.unit}`:h.text}</b>{h.notes&&<small>{h.notes}</small>}</li>)}</ol>
  </DialogContent></Dialog>}

  {editing&&<RecordDialog title={editing.id?editing.title:'Nova consulta ou exame'} description="Os valores dos exames chegam pelo ChatGPT; aqui você ajusta os dados gerais e a próxima data." fields={examFields} initial={editing} onClose={()=>setEditing(null)}
   onSave={async row=>{const id=row.id||`${row.date}-${String(row.title||'registro').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,50)}`;await persist(exams.some(e=>e.id===row.id)?exams.map(e=>e.id===row.id?{...row,id} as Exam:e):[...exams,{...row,id} as Exam]);}}
   onDelete={editing.id?async()=>{await persist(exams.filter(e=>e.id!==editing.id));}:undefined}/>}
 </div>;
}
