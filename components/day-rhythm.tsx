'use client';
import {useState} from 'react';
import {Activity,BedDouble,Brain,ChevronRight,Droplets,Flame,HeartPulse,Pencil,Pill,Smile,Target,Trash2,Utensils,Beef} from 'lucide-react';
import {EChart,escapeHtml,type ChartTheme} from './echart';
import {Button} from './ui/button';
import {useSettings} from './settings-context';
import {Dialog,DialogContent,DialogDescription,DialogTitle} from './ui/dialog';
import {dimensions,entryLabels,overall,type DayEntry,type EntryKind,type Scores,type wellbeingAndSleep} from '@/lib/day-log';

const zone='Europe/London';
const clock=(iso:string)=>new Intl.DateTimeFormat('pt-BR',{timeZone:zone,hour:'2-digit',minute:'2-digit'}).format(new Date(iso));
export const kindColor:Record<EntryKind,string>={checkin:'--sys-indigo',activity:'--sys-teal',meal:'--sys-green',water:'--sys-cyan',vitamins:'--sys-yellow',medication:'--sys-pink',bowel:'--sys-brown'};
export const kindIcon:Record<EntryKind,typeof Activity>={checkin:Smile,activity:Activity,meal:Utensils,water:Droplets,vitamins:Target,medication:Pill,bowel:HeartPulse};
const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(v);

export type Measure={value:number|null;target?:number|null;unit:string;note?:string;limit?:boolean};
export type DayFigures={water:Measure;calories:Measure;protein:Measure;sleep:Measure;movement:Measure};

function radarOption(t:ChartTheme,today:Scores,week:Scores){
 const c1=t.color('--sys-indigo'),c2=t.label2;
 return {tooltip:{...t.tooltip({trigger:'item'})},radar:{radius:'66%',center:['50%','54%'],indicator:dimensions.map(d=>({name:d.label,max:10})),axisName:{color:t.label2,fontSize:12},splitNumber:5,splitLine:{lineStyle:{color:t.separator}},splitArea:{show:false},axisLine:{lineStyle:{color:t.separator}}},
  series:[{type:'radar',symbol:'circle',symbolSize:6,data:[
   {name:'Média de 7 dias',value:dimensions.map(d=>week[d.key]??0),lineStyle:{color:c2,type:[4,4],width:1.5},itemStyle:{color:c2},areaStyle:{opacity:0}},
   {name:'Hoje',value:dimensions.map(d=>today[d.key]??0),lineStyle:{color:c1,width:2.5},itemStyle:{color:c1},areaStyle:{color:c1,opacity:.18}}]}]};
}
function sleepOption(t:ChartTheme,rows:ReturnType<typeof wellbeingAndSleep>){
 const axis=t.axis();const label=(d:string)=>new Date(d+'T12:00:00Z').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',timeZone:'UTC'});
 return {grid:{left:8,right:8,top:24,bottom:4,containLabel:true},
  tooltip:t.tooltip({formatter:(ps:{dataIndex:number}[])=>{const r=rows[ps[0].dataIndex];return `<div style="font-weight:600;color:${t.label}">${escapeHtml(new Date(r.date+'T12:00:00Z').toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'short',timeZone:'UTC'}))}</div><div style="color:${t.label2}">Sono: <b style="color:${t.label}">${r.sleep===null?'—':fmt(r.sleep)+' h'}</b></div><div style="color:${t.label2}">Bem-estar: <b style="color:${t.label}">${r.wellbeing===null?'—':fmt(r.wellbeing)+'/10'}</b></div>`;}}),
  xAxis:{type:'category',data:rows.map(r=>label(r.date)),...axis,splitLine:{show:false},axisLabel:{...(axis.axisLabel as object),hideOverlap:true}},
  yAxis:[{type:'value',name:'h',min:0,max:10,interval:5,...axis,nameTextStyle:{color:t.label2}},{type:'value',min:0,max:10,interval:5,...axis,splitLine:{show:false}}],
  series:[{type:'bar',name:'Sono',barMaxWidth:18,itemStyle:{color:t.color('--tint-sleep'),opacity:.55,borderRadius:[5,5,0,0]},data:rows.map(r=>r.sleep)},
   {type:'line',name:'Bem-estar',yAxisIndex:1,smooth:.3,connectNulls:true,symbol:'circle',symbolSize:7,lineStyle:{color:t.color('--sys-orange'),width:2.5},itemStyle:{color:t.color('--sys-orange'),borderColor:t.surface,borderWidth:2},data:rows.map(r=>r.wellbeing)}]};
}

/** The day at a glance: what matters (wellbeing, sleep, water, food, movement) against goals, then how today compares with the week and with sleep. */
export function DaySummary({entries,figures,today,week,history,latest}:{entries:DayEntry[];figures:DayFigures;today:Scores;week:Scores;history:ReturnType<typeof wellbeingAndSleep>;latest?:DayEntry}){
 const goodNight=useSettings().day.goodNightHours;
 const wellbeing=overall(today),base=overall(week),delta=wellbeing!==undefined&&base!==undefined?Math.round((wellbeing-base)*10)/10:null;
 const tile=(icon:typeof Activity,label:string,m:Measure,color:string)=>{const pct=m.value!==null&&m.target?Math.min(100,m.value/m.target*100):null;const over=m.limit&&m.value!==null&&m.target?m.value>m.target:false;const Icon=icon;
  return <div className="summary-tile" style={{['--tile' as string]:`var(${color})`}} key={label}><span className="summary-icon" aria-hidden><Icon size={16}/></span><small>{label}</small><b>{m.value===null?'—':`${fmt(m.value)}${m.unit}`}</b>{pct!==null&&<i className={`summary-bar${over?' over':''}`} aria-hidden><em style={{width:`${pct}%`}}/></i>}<span>{m.note??(m.target?`${m.limit?'Limite':'Meta'} ${fmt(m.target)}${m.unit}`:'Sem meta')}</span></div>;};
 const sleepPairs=history.filter(r=>r.sleep!==null&&r.wellbeing!==null);
 const goodNights=sleepPairs.filter(r=>r.sleep!>=goodNight),shortNights=sleepPairs.filter(r=>r.sleep!<goodNight);
 const avg=(xs:number[])=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;
 const good=avg(goodNights.map(r=>r.wellbeing!)),short=avg(shortNights.map(r=>r.wellbeing!));
 const insight=good!==null&&short!==null?`Depois de noites com ${fmt(goodNight)} h ou mais, seu bem-estar médio foi ${fmt(good)}/10; com menos de ${fmt(goodNight)} h, ${fmt(short)}/10.`:'Registre sono e check-ins por alguns dias para comparar bem-estar e noites de sono.';
 return <section className="panel day-summary" aria-labelledby="day-summary-title">
  <div className="panel-heading"><div><h2 id="day-summary-title">Seu dia em resumo</h2><p className="field-help">{entries.length} registros hoje · bem-estar calculado a partir dos check-ins.</p></div></div>
  <div className="summary-top">
  <div className="summary-now">
   <span className="eyebrow">AGORA{latest?` · ${entryLabels[latest.kind].toUpperCase()} ÀS ${clock(latest.at)}`:''}</span>
   {latest?<><div className="current-overall"><b>{fmt(overall(latest.scores)??0)}</b><small>/10 bem-estar</small></div>
    <div className="summary-dims">{dimensions.map(d=>{const v=latest.scores[d.key];return <div key={d.key}><span>{d.label}</span><b>{v===undefined?'—':fmt(v)}</b><i aria-hidden><em style={{width:`${(v??0)*10}%`,background:`var(${d.color})`}}/></i></div>;})}</div>
    {latest.details.length>0&&<ul className="current-chips">{latest.details.slice(0,6).map(d=><li key={d}>{d}</li>)}</ul>}</>:<p className="field-help">Faça um check-in pelo botão Registrar para ver como você está agora.</p>}
  </div>
  <div className="summary-tiles">
   <div className="summary-tile wellbeing" style={{['--tile' as string]:'var(--sys-indigo)'}}><span className="summary-icon" aria-hidden><Brain size={16}/></span><small>Bem-estar</small><b>{wellbeing===undefined?'—':`${fmt(wellbeing)}/10`}</b>{wellbeing!==undefined&&<i className="summary-bar" aria-hidden><em style={{width:`${wellbeing*10}%`}}/></i>}<span className={delta===null||delta===0?'':delta>0?'up':'down'}>{delta===null?'Sem base na semana':delta===0?'= média da semana':`${delta>0?'▲':'▼'} ${fmt(Math.abs(delta))} vs. 7 dias`}</span></div>
   {tile(BedDouble,'Sono',figures.sleep,'--tint-sleep')}
   {tile(Droplets,'Água',figures.water,'--tint-water')}
   {tile(Flame,'Calorias',figures.calories,'--sys-orange')}
   {tile(Beef,'Proteína',figures.protein,'--sys-red')}
   {tile(Activity,'Movimento',figures.movement,'--tint-fitness')}
  </div>
  </div>
  <div className="summary-charts">
   <div><div className="panel-heading"><h3>Hoje vs. sua semana</h3><span className="subtle">MENTE · HUMOR · CORPO · DIGESTÃO</span></div>
    {Object.keys(today).length?<EChart height={250} label="Notas de hoje comparadas com a média dos últimos 7 dias em mente, humor, corpo e digestão" option={t=>radarOption(t,today,week)}/>:<p className="empty compact">Faça um check-in para comparar com a semana.</p>}
    <div className="rhythm-legend" aria-hidden><span><i style={{background:'var(--sys-indigo)'}}/>Hoje</span><span><i style={{background:'var(--label-2)'}}/>Média de 7 dias</span></div></div>
   <div><div className="panel-heading"><h3>Sono × bem-estar</h3><span className="subtle">{`ÚLTIMOS ${history.length} DIAS`}</span></div>
    <EChart height={250} label={`Horas de sono e bem-estar médio nos últimos ${history.length} dias`} option={t=>sleepOption(t,history)}/>
    <p className="field-help summary-insight">{insight}</p></div>
  </div>
 </section>;
}

/** Every item logged today, side by side in time order; a tap opens the details. */
export function DayLogStrip({entries,onEdit,onDelete,onAdd}:{entries:DayEntry[];onEdit:(entry:DayEntry)=>void;onDelete:(entry:DayEntry)=>void;onAdd:()=>void}){
 const [open,setOpen]=useState<DayEntry|null>(null);
 const title=(e:DayEntry)=>`${e.kind==='checkin'&&e.source==='event'?e.title:entryLabels[e.kind]}${e.kind==='water'||e.kind==='meal'?` · ${e.title}`:''}`;
 return <section className="panel day-log-strip" aria-labelledby="day-log-title">
  <div className="panel-heading"><div><h2 id="day-log-title">Registros do dia</h2><p className="field-help">{entries.length?`${entries.length} registros · do mais cedo ao mais tarde`:'Nada registrado ainda.'}</p></div><button className="text-link" onClick={onAdd}>Registrar <span aria-hidden>+</span></button></div>
  {entries.length>0&&<ol className="log-track">{entries.map(e=>{const Icon=kindIcon[e.kind];const score=overall(e.scores);return <li key={e.id} style={{['--kind' as string]:`var(${kindColor[e.kind]})`}}>
   <time>{clock(e.at)}</time>
   <button className="log-card" onClick={()=>setOpen(e)}>
    <span className="log-head"><span className="day-log-icon" aria-hidden><Icon size={16}/></span><strong>{title(e)}</strong>{score!==undefined&&<em>{fmt(score)}</em>}</span>
    {e.details.length>0&&<span className="log-chips">{e.details.slice(0,3).map(d=><span key={d}>{d}</span>)}{e.details.length>3&&<span>+{e.details.length-3}</span>}</span>}
    <span className="log-more">Detalhes <ChevronRight size={13} aria-hidden/></span>
   </button>
  </li>;})}</ol>}
  {open&&<Dialog open onOpenChange={v=>{if(!v)setOpen(null);}}><DialogContent className="dialog-content log-dialog"><DialogTitle>{title(open)}</DialogTitle><DialogDescription>{clock(open.at)} · {entryLabels[open.kind]}</DialogDescription>
   {Object.keys(open.scores).length>0&&<div className="log-scores">{dimensions.filter(d=>open.scores[d.key]!==undefined).map(d=><div key={d.key}><small>{d.label}</small><b>{fmt(open.scores[d.key]!)}<em>/10</em></b><i aria-hidden><em style={{width:`${open.scores[d.key]!*10}%`,background:`var(${d.color})`}}/></i></div>)}</div>}
   {open.details.length>0&&<ul className="log-dialog-chips">{open.details.map(d=><li key={d}>{d}</li>)}</ul>}
   {open.notes&&<p className="log-notes">{open.notes}</p>}
   <div className="log-actions">{open.source==='event'&&<Button variant="secondary" onClick={()=>{const e=open;setOpen(null);onEdit(e);}}><Pencil size={16}/>Editar</Button>}<Button variant="ghost" className="danger-link" onClick={()=>{const e=open;setOpen(null);onDelete(e);}}><Trash2 size={16}/>Excluir</Button></div>
  </DialogContent></Dialog>}
 </section>;
}
