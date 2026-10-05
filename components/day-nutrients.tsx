'use client';
import {useState} from 'react';
import {ChevronRight,Pill,Leaf} from 'lucide-react';
import {Dialog,DialogContent,DialogDescription,DialogTitle} from './ui/dialog';
import {foodContributions,supplementIntake} from '@/lib/day-log';

type EventLike=Parameters<typeof foodContributions>[0][number];
type RecordLike=Parameters<typeof supplementIntake>[0][number];
const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(v);
const clock=(iso:string)=>new Intl.DateTimeFormat('pt-BR',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit'}).format(new Date(iso));

/** Vitamins and minerals that came from food today; a tap shows the foods that mattered. */
export function FoodNutrients({events,date,totals,nutrients}:{events:EventLike[];date:string;totals:Record<string,number|undefined>;nutrients:{key:string;label:string;unit:string}[]}){
 const [open,setOpen]=useState<string|null>(null);
 const consumed=nutrients.filter(n=>(totals[n.key]??0)>0);
 const detail=open?foodContributions(events,date,open):null;const info=nutrients.find(n=>n.key===open);
 return <section className="panel nutrient-list" aria-labelledby="food-nutrients-title">
  <div className="panel-heading"><div><h2 id="food-nutrients-title"><Leaf size={18}/> Vitaminas e minerais dos alimentos</h2><p className="field-help">Somente o que você consumiu hoje. Toque para ver de onde veio.</p></div></div>
  {consumed.length?<ul>{consumed.map(n=><li key={n.key}><button onClick={()=>setOpen(n.key)}><span>{n.label}</span><b>{fmt(totals[n.key]!)} <small>{n.unit}</small></b><ChevronRight size={16} aria-hidden/></button></li>)}</ul>:<p className="field-help">Nenhuma vitamina ou mineral informado nas refeições de hoje.</p>}
  {open&&detail&&info&&<Dialog open onOpenChange={v=>{if(!v)setOpen(null);}}><DialogContent className="dialog-content nutrient-dialog"><DialogTitle>{info.label}</DialogTitle><DialogDescription>{fmt(detail.total)} {info.unit} hoje · alimentos com pelo menos 10% do total</DialogDescription>
   <ol className="nutrient-foods-list">{detail.items.map((f,i)=><li key={f.food+i}><div><strong>{f.food}</strong><small>{f.meal} · {clock(f.at)}</small></div><b>{fmt(f.amount)} {info.unit}</b><i aria-hidden><em style={{width:`${f.share*100}%`}}/></i><span>{Math.round(f.share*100)}% do dia</span></li>)}</ol>
   {detail.items.length===0&&<p className="field-help">Nenhum alimento sozinho chegou a 10% do total.</p>}
  </DialogContent></Dialog>}
 </section>;
}

/** Supplements taken today, from the Registrar routines or sent by the MCP. */
export function SupplementNutrients({records,date}:{records:RecordLike[];date:string}){
 const [open,setOpen]=useState<string|null>(null);
 const list=supplementIntake(records,date);const item=list.find(s=>s.name===open);
 return <section className="panel nutrient-list supplements" aria-labelledby="supplement-title">
  <div className="panel-heading"><div><h2 id="supplement-title"><Pill size={18}/> Vitaminas dos suplementos</h2><p className="field-help">O que você registrou como tomado hoje.</p></div></div>
  {list.length?<ul>{list.map(s=><li key={s.name}><button onClick={()=>setOpen(s.name)}><span>{s.name}</span><b>{s.times.map(clock).join(' · ')}</b><ChevronRight size={16} aria-hidden/></button></li>)}</ul>:<p className="field-help">Nenhum suplemento registrado hoje.</p>}
  {item&&<Dialog open onOpenChange={v=>{if(!v)setOpen(null);}}><DialogContent className="dialog-content nutrient-dialog"><DialogTitle>{item.name}</DialogTitle><DialogDescription>Suplemento · {item.times.length} {item.times.length===1?'registro':'registros'} hoje</DialogDescription>
   <ol className="nutrient-foods-list">{item.times.map((t,i)=><li key={t+i}><div><strong>Tomado às {clock(t)}</strong>{item.notes[i]&&<small>{item.notes[i]}</small>}</div></li>)}</ol>
   <p className="field-help">A dose não é informada no registro; ela aparece aqui quando você registrar com quantidade pelo MCP.</p>
  </DialogContent></Dialog>}
 </section>;
}
