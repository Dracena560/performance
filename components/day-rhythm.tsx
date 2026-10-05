'use client';
import {Activity,Droplets,HeartPulse,Pill,Smile,Target,Trash2,Pencil,Utensils,Clock3} from 'lucide-react';
import {EChart,escapeHtml,type ChartTheme} from './echart';
import {Button} from './ui/button';
import {dimensions,entryLabels,overall,type DayEntry,type EntryKind,type weekEvolution} from '@/lib/day-log';

const zone='Europe/London';
const clock=(iso:string)=>new Intl.DateTimeFormat('pt-BR',{timeZone:zone,hour:'2-digit',minute:'2-digit'}).format(new Date(iso));
const lanes:EntryKind[]=['checkin','activity','meal','water','vitamins','medication','bowel'];
export const kindColor:Record<EntryKind,string>={checkin:'--sys-indigo',activity:'--sys-teal',meal:'--sys-green',water:'--sys-cyan',vitamins:'--sys-yellow',medication:'--sys-pink',bowel:'--sys-brown'};
export const kindIcon:Record<EntryKind,typeof Activity>={checkin:Smile,activity:Activity,meal:Utensils,water:Droplets,vitamins:Target,medication:Pill,bowel:HeartPulse};
const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(v);

/** Wellbeing lines on top, one lane per kind of record below, on the same clock. */
function rhythmOption(t:ChartTheme,entries:DayEntry[],date:string){
 const ms=(iso:string)=>Date.parse(iso);const hour=(h:number)=>Date.parse(`${date}T${String(h).padStart(2,'0')}:00:00Z`);
 const times=entries.map(e=>ms(e.at));const min=Math.min(hour(7),...times.map(x=>x-3600000)),max=Math.max(hour(22),...times.map(x=>x+3600000));
 const axisLabel={...(t.axis().axisLabel as object),hideOverlap:true,formatter:(v:number)=>clock(new Date(v).toISOString())};
 const scored=entries.filter(e=>Object.keys(e.scores).length);
 const lineSeries=dimensions.map(d=>{const c=t.color(d.color);return {type:'line',name:d.label,xAxisIndex:0,yAxisIndex:0,smooth:.35,connectNulls:true,symbol:'circle',symbolSize:8,lineStyle:{color:c,width:2.5},itemStyle:{color:c,borderColor:t.surface,borderWidth:2},data:scored.filter(e=>e.scores[d.key]!==undefined).map(e=>[ms(e.at),e.scores[d.key]])};});
 const laneSeries=lanes.map(kind=>{const c=t.color(kindColor[kind]);return {type:'scatter',name:entryLabels[kind],xAxisIndex:1,yAxisIndex:1,symbol:kind==='water'?'circle':'roundRect',symbolSize:(v:[number,string,number])=>kind==='water'?Math.max(10,Math.min(26,v[2]/30)):14,itemStyle:{color:c,borderColor:t.surface,borderWidth:2,opacity:.95},data:entries.filter(e=>e.kind===kind).map(e=>[ms(e.at),entryLabels[kind],e.volume??0,e.id])};});
 const byId=new Map(entries.map(e=>[e.id,e]));
 return {
  grid:[{left:8,right:16,top:14,height:'46%',containLabel:true},{left:8,right:16,top:'62%',bottom:6,containLabel:true}],
  tooltip:{...t.tooltip({trigger:'item'}),formatter:(p:{seriesType:string;seriesName:string;value:unknown[];color:string})=>{
   if(p.seriesType==='scatter'){const e=byId.get(String(p.value[3]));if(!e)return '';return `<div style="font-weight:600;color:${t.label}">${clock(e.at)} · ${escapeHtml(entryLabels[e.kind])}${e.kind==='water'?` · ${escapeHtml(e.title)}`:''}</div>${e.details.length?`<div style="color:${t.label2};max-width:240px;white-space:normal">${escapeHtml(e.details.join(' · '))}</div>`:''}`;}
   return `<div style="font-weight:600;color:${t.label}">${clock(new Date(p.value[0] as number).toISOString())}</div><div style="color:${t.label2}">${escapeHtml(p.seriesName)}: <b style="color:${t.label}">${fmt(p.value[1] as number)}/10</b></div>`;}},
  xAxis:[{type:'time',gridIndex:0,min,max,...t.axis(),axisLabel:{show:false},splitLine:{show:false}},{type:'time',gridIndex:1,min,max,splitNumber:5,...t.axis(),axisLabel,splitLine:{show:true,lineStyle:{color:t.separator,type:[2,4]}}}],
  yAxis:[{type:'value',gridIndex:0,min:0,max:10,interval:5,...t.axis()},{type:'category',gridIndex:1,data:lanes.map(k=>entryLabels[k]),inverse:true,...t.axis(),splitLine:{show:true,lineStyle:{color:t.separator}},axisLabel:{...(t.axis().axisLabel as object),fontSize:11}}],
  series:[...lineSeries,...laneSeries]
 };
}

function weekOption(t:ChartTheme,week:ReturnType<typeof weekEvolution>){
 const days=week.map(d=>new Date(d.date+'T12:00:00Z').toLocaleDateString('pt-BR',{weekday:'short',timeZone:'UTC'}).replace('.',''));
 return {
  grid:{left:8,right:8,top:16,bottom:4,containLabel:true},
  tooltip:t.tooltip({formatter:(ps:{dataIndex:number}[])=>{const d=week[ps[0].dataIndex];return `<div style="font-weight:600;color:${t.label}">${new Date(d.date+'T12:00:00Z').toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'short',timeZone:'UTC'})}</div><div style="color:${t.label2}">${d.count} registros${d.water?` · ${fmt(d.water)} ml de água`:''}</div>${d.wellbeing!==null?`<div style="color:${t.label2}">Bem-estar: <b style="color:${t.label}">${fmt(d.wellbeing)}/10</b></div>`:''}`;}}),
  xAxis:{type:'category',data:days,...t.axis(),splitLine:{show:false}},
  yAxis:[{type:'value',minInterval:1,...t.axis()},{type:'value',min:0,max:10,interval:5,...t.axis(),splitLine:{show:false}}],
  series:[...lanes.map(kind=>({type:'bar',name:entryLabels[kind],stack:'count',barMaxWidth:26,itemStyle:{color:t.color(kindColor[kind])},data:week.map(d=>d.byKind[kind]||null)})),
   {type:'line',name:'Bem-estar',yAxisIndex:1,smooth:.35,connectNulls:true,symbol:'circle',symbolSize:7,lineStyle:{color:t.label,width:2},itemStyle:{color:t.label,borderColor:t.surface,borderWidth:2},data:week.map(d=>d.wellbeing)}]
 };
}

export function DayRhythm({entries,week,date}:{entries:DayEntry[];week:ReturnType<typeof weekEvolution>;date:string}){
 const today=week.at(-1),before=week.slice(0,-1).map(d=>d.wellbeing).filter((v):v is number=>v!==null);
 const wellbeing=today?.wellbeing??null,base=before.length?before.reduce((a,b)=>a+b,0)/before.length:null,raw=wellbeing!==null&&base!==null?wellbeing-base:null,delta=raw!==null&&Math.abs(raw)<0.05?0:raw;
 const lastCheckin=[...entries].reverse().find(e=>e.kind==='checkin');
 const kpis:[string,string,string|null][]=[
  ['Registros hoje',String(entries.length),`${new Set(entries.map(e=>e.kind)).size} tipos`],
  ['Bem-estar do dia',wellbeing===null?'—':`${fmt(wellbeing)}/10`,delta===null?'Sem base na semana':delta===0?'= média dos 6 dias':`${delta>=0?'▲':'▼'} ${fmt(Math.abs(delta))} vs. 6 dias`],
  ['Água',`${fmt(entries.reduce((t,e)=>t+(e.kind==='water'?e.volume??0:0),0))} ml`,`${entries.filter(e=>e.kind==='water').length} vezes`],
  ['Último check-in',lastCheckin?clock(lastCheckin.at):'—',lastCheckin&&overall(lastCheckin.scores)!==undefined?`${fmt(overall(lastCheckin.scores)!)}/10`:null]
 ];
 return <section className="panel day-rhythm" aria-labelledby="day-rhythm-title">
  <div className="panel-heading"><div><h2 id="day-rhythm-title">Seu ritmo ao longo do dia</h2><p className="field-help">Tudo o que você registrou, no relógio do dia. As linhas traduzem cada check-in em notas de 0 a 10.</p></div></div>
  <div className="rhythm-kpis">{kpis.map(([label,value,meta])=><div key={label}><small>{label}</small><b className={label==='Bem-estar do dia'&&delta?(delta>0?'up':'down'):''}>{value}</b>{meta&&<span className={label==='Bem-estar do dia'&&delta?(delta>0?'up':'down'):''}>{meta}</span>}</div>)}</div>
  {entries.length?<>
   <div className="rhythm-legend" aria-hidden>{dimensions.map(d=><span key={d.key}><i style={{background:`var(${d.color})`}}/>{d.label}</span>)}</div>
   <EChart height={360} label={`Ritmo do dia: ${entries.length} registros e notas de bem-estar por horário`} option={t=>rhythmOption(t,entries,date)}/>
  </>:<div className="empty compact"><Clock3/><p>Registre um check-in, água, vitaminas ou uma atividade e o seu dia aparece aqui.</p></div>}
  <div className="rhythm-week">
   <div className="panel-heading"><h3>Últimos 7 dias</h3><span className="subtle">REGISTROS POR TIPO · BEM-ESTAR</span></div>
   <EChart height={190} label="Registros por tipo e bem-estar médio nos últimos sete dias" option={t=>weekOption(t,week)}/>
   <div className="rhythm-legend" aria-hidden>{lanes.map(k=><span key={k}><i style={{background:`var(${kindColor[k]})`}}/>{entryLabels[k]}</span>)}<span><i style={{background:'var(--label)'}}/>Bem-estar</span></div>
  </div>
 </section>;
}

/** Every item logged today, whatever was used to log it. */
export function DayLogList({entries,onEdit,onDelete,onAdd}:{entries:DayEntry[];onEdit:(entry:DayEntry)=>void;onDelete:(entry:DayEntry)=>void;onAdd:()=>void}){
 return <div className="today-checkin-history panel day-log">
  <div className="panel-heading"><h2>Registros do dia</h2><button className="text-link" onClick={onAdd}>Registrar <span aria-hidden>+</span></button></div>
  {entries.length?[...entries].reverse().map(e=>{const Icon=kindIcon[e.kind];const score=overall(e.scores);return <div className="day-log-row" key={e.id}>
   <time>{clock(e.at)}</time>
   <span className="day-log-icon" style={{['--kind' as string]:`var(${kindColor[e.kind]})`}} aria-hidden><Icon size={17}/></span>
   <div><strong>{e.kind==='checkin'&&e.source==='event'?e.title:entryLabels[e.kind]}{e.kind==='water'||e.kind==='meal'?` · ${e.title}`:''}{score!==undefined&&<em>{fmt(score)}/10</em>}</strong>
    {e.details.length>0&&<ul>{e.details.map(d=><li key={d}>{d}</li>)}</ul>}
    {Object.keys(e.scores).length>0&&<p className="day-log-scores">{dimensions.filter(d=>e.scores[d.key]!==undefined).map(d=><span key={d.key}><i style={{background:`var(${d.color})`}}/>{d.label} {fmt(e.scores[d.key]!)}</span>)}</p>}
    {e.notes&&<p>{e.notes}</p>}
   </div>
   <span className="day-log-actions">{e.source==='event'&&<Button variant="ghost" aria-label={`Editar ${entryLabels[e.kind]}`} onClick={()=>onEdit(e)}><Pencil size={16}/></Button>}<Button variant="ghost" aria-label={`Excluir ${entryLabels[e.kind]}`} onClick={()=>onDelete(e)}><Trash2 size={16}/></Button></span>
  </div>;}):<p className="field-help">Seus registros do dia aparecerão aqui.</p>}
 </div>;
}
