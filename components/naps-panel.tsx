'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BedSingle, Plus } from 'lucide-react';
import { napLabel } from '@/lib/diary-fields';
import { napStats, type Nap } from '@/lib/naps';
import { DiaryRegister } from './diary-register';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';

const time=(iso:string)=>new Intl.DateTimeFormat('pt-BR',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit'}).format(new Date(iso));
const day=(date:string)=>new Date(date+'T12:00:00Z').toLocaleDateString('pt-BR',{timeZone:'UTC',weekday:'short',day:'2-digit',month:'short'}).replace(/\./g,'');

/** Naps on the Sono page: kept apart from nights, with the last 7 days and the latest naps. */
export function NapsPanel({naps,demo=false}:{naps:Nap[];demo?:boolean}){
 const router=useRouter();const [adding,setAdding]=useState(false),[showAll,setShowAll]=useState(false);
 const week=napStats(naps);const list=showAll?naps:naps.slice(0,6);
 return <section className="panel naps-section" aria-labelledby="naps-title">
  <div className="panel-heading"><div><h2 id="naps-title"><BedSingle/>Cochilos</h2><p className="field-help">Separados do sono da noite: não entram na nota nem nas médias das noites.</p></div>{!demo&&<button className="text-link" onClick={()=>setAdding(true)}>Registrar cochilo <Plus size={14}/></button>}</div>
  <dl className="naps-stats">
   <div><dt>Últimos 7 dias</dt><dd>{week.count}<small>{week.count===1?' cochilo':' cochilos'}</small></dd></div>
   <div><dt>Tempo total</dt><dd>{week.total?napLabel(week.total):'—'}</dd></div>
   <div><dt>Duração média</dt><dd>{week.average===null?'—':napLabel(week.average)}</dd></div>
   <div><dt>Como acorda</dt><dd className="naps-feeling">{week.feeling??'—'}</dd></div>
  </dl>
  {naps.length?<ul className="naps-list">{list.map(nap=><li key={nap.id}><span><b>{day(nap.date)}</b><small>{time(nap.at)}</small></span><strong>{napLabel(nap.minutes)}</strong><span className="naps-detail">{nap.feeling&&<em>{nap.feeling}</em>}{nap.notes&&<small>{nap.notes}</small>}</span></li>)}</ul>:<p className="field-help">Nenhum cochilo registrado ainda. Use Registrar → Cochilo ou peça pelo ChatGPT/Claude.</p>}
  {naps.length>6&&<button className="button secondary small" onClick={()=>setShowAll(value=>!value)}>{showAll?'Mostrar menos':`Ver todos os ${naps.length}`}</button>}
  {adding&&<Dialog open onOpenChange={open=>{if(!open)setAdding(false);}}><DialogContent className="dialog-content"><DialogTitle>Registrar cochilo</DialogTitle><DialogDescription>Data e horário seguem Europe/London.</DialogDescription><DiaryRegister initialKind="nap" showTabs={false} onSaved={()=>{setAdding(false);router.refresh();}}/></DialogContent></Dialog>}
 </section>;
}
