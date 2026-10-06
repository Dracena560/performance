'use client';
import {useState} from 'react';
import {BarChart3,HeartPulse,Timer,Flame,Trophy,Activity} from 'lucide-react';
import {EChart,lineOption,tooltipHtml,type ChartTheme} from './echart';
import {recovery,tennisDetails,tennisStatKeys,totalsByActivity,weeklyByActivity,zoneMinutes,type StatSession} from '@/lib/exercise-stats';

const palette=['--sys-teal','--sys-orange','--sys-purple','--sys-green','--sys-blue','--sys-pink','--sys-indigo','--sys-yellow'];
const zoneColors=['#3a8dde','#3fd6c6','#b5e61d','#ff9500','#ff2d75'];
const num=(v:number,d=1)=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:d}).format(v);
const weekLabel=(d:string)=>new Date(d+'T12:00:00Z').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});
const bars=(t:ChartTheme,categories:string[],series:{name:string;values:number[];color:string}[],format:(v:number)=>string,stack=true)=>({
 grid:{left:8,right:12,top:16,bottom:4,containLabel:true},
 tooltip:t.tooltip({formatter:(p:unknown)=>tooltipHtml(t,p,format,c=>`Semana de ${weekLabel(c)}`)}),
 xAxis:{type:'category',data:categories,...t.axis(),splitLine:{show:false},axisLabel:{...(t.axis().axisLabel as object),formatter:weekLabel,hideOverlap:true}},
 yAxis:{type:'value',...t.axis(),axisLabel:{...(t.axis().axisLabel as object),formatter:format}},
 series:series.map((s,i)=>({type:'bar',name:s.name,stack:stack?'all':undefined,data:s.values,barMaxWidth:26,itemStyle:{color:t.color(s.color),borderRadius:stack&&i<series.length-1?0:[5,5,0,0]}}))});

/** The extra charts of Exercícios: where the time goes, how hard and how fast you recover. */
export function ExerciseCharts({sessions,today}:{sessions:StatSession[];today:string}){
 const [range,setRange]=useState<12|26>(12);
 if(!sessions.length)return null;
 const weekly=weeklyByActivity(sessions,today,range);const totals=totalsByActivity(sessions);
 const since=new Date(Date.parse(today+'T12:00:00Z')-30*86400000).toISOString().slice(0,10);
 const zones=zoneMinutes(sessions,since);const rec=recovery(sessions).slice(-20);const tennis=tennisDetails(sessions);
 const tennisKeys=tennisStatKeys.filter(([k])=>tennis.some(t=>t.values[k]!==null));
 const color=(type:string)=>palette[weekly.types.indexOf(type)%palette.length]??palette[0];
 return <section className="panel exercise-charts" aria-labelledby="exercise-charts-title">
  <div className="panel-heading"><div><h2 id="exercise-charts-title"><BarChart3/>Seus treinos em gráficos</h2><p className="field-help">Para onde vai o seu tempo, quanto você gasta e como o coração se recupera.</p></div>
   <div className="segmented" role="group" aria-label="Período">{([12,26] as const).map(r=><button key={r} type="button" className={range===r?'selected':''} aria-pressed={range===r} onClick={()=>setRange(r)}>{r===12?'12 semanas':'6 meses'}</button>)}</div></div>
  <div className="exercise-chart-grid">
   <article className="wide"><h3><Timer size={16}/>Minutos por semana e modalidade</h3>
    <div className="exercise-chart"><EChart height="100%" label="Minutos de treino por semana, separados por modalidade" option={t=>bars(t,weekly.weeks,weekly.types.map(type=>({name:type,values:weekly.minutes[type],color:color(type)})),v=>`${num(v,0)} min`)}/></div>
    <div className="health-chart-legend">{weekly.types.map(type=><span key={type} style={{['--dot' as string]:`var(${color(type)})`}}><i/>{type}</span>)}</div></article>
   <article><h3><Activity size={16}/>Horas por modalidade</h3>
    <div className="exercise-chart"><EChart height="100%" label="Horas e número de sessões por modalidade" option={t=>({grid:{left:8,right:40,top:8,bottom:4,containLabel:true},tooltip:t.tooltip({trigger:'item',formatter:(p:any)=>{const r=totals[p.dataIndex];return `<b>${r.type}</b><br>${num(r.hours)} h · ${r.count} ${r.count===1?'sessão':'sessões'}<br>${num(r.calories,0)} kcal${r.heart?` · FC média ${r.heart} bpm`:''}`;}}),
     xAxis:{type:'value',...t.axis(),axisLabel:{...(t.axis().axisLabel as object),formatter:(v:number)=>`${v} h`}},yAxis:{type:'category',inverse:true,data:totals.map(r=>r.type),...t.axis(),splitLine:{show:false}},
     series:[{type:'bar',data:totals.map((r,i)=>({value:r.hours,itemStyle:{color:t.color(palette[i%palette.length]),borderRadius:[0,6,6,0]}})),barMaxWidth:22,label:{show:true,position:'right',color:t.label2,formatter:(p:any)=>`${totals[p.dataIndex].count}×`}}]})}/></div></article>
   <article><h3><Flame size={16}/>Calorias ativas por semana</h3>
    <div className="exercise-chart"><EChart height="100%" label="Calorias ativas de treino por semana" option={t=>bars(t,weekly.weeks,[{name:'Calorias ativas',values:weekly.calories,color:'--sys-pink'}],v=>`${num(v,0)} kcal`,false)}/></div></article>
   <article><h3><HeartPulse size={16}/>Tempo nas zonas de FC · 30 dias</h3>
    {zones.sessions?<><div className="exercise-chart"><EChart height="100%" label="Minutos em cada zona de frequência cardíaca nos últimos 30 dias" option={t=>({grid:{left:8,right:12,top:16,bottom:4,containLabel:true},tooltip:t.tooltip({trigger:'item',formatter:(p:any)=>`Zona ${p.dataIndex+1}: ${num(p.value,0)} min`}),xAxis:{type:'category',data:['Zona 1','Zona 2','Zona 3','Zona 4','Zona 5'],...t.axis(),splitLine:{show:false}},yAxis:{type:'value',...t.axis(),axisLabel:{...(t.axis().axisLabel as object),formatter:(v:number)=>`${v} min`}},series:[{type:'bar',data:zones.minutes.map((v,i)=>({value:v,itemStyle:{color:zoneColors[i],borderRadius:[6,6,0,0]}})),barMaxWidth:38}]})}/></div><p className="field-help">{`${zones.sessions} ${zones.sessions===1?'treino':'treinos'} com zonas enviadas.`}</p></>:<p className="field-help">Envie as zonas de frequência cardíaca do Apple Fitness pelo ChatGPT para ver este gráfico.</p>}</article>
   <article><h3><HeartPulse size={16}/>Recuperação da FC após o treino</h3>
    {rec.length?<><div className="exercise-chart"><EChart height="100%" label="Queda da frequência cardíaca 1 e 2 minutos após cada treino" option={t=>lineOption(t,{categories:rec.map(r=>r.date),min:0,format:v=>`${num(v,0)} bpm`,labelFormat:weekLabel,titleFormat:c=>{const r=rec.find(x=>x.date===c);return `${weekLabel(c)}${r?` · ${r.type}`:''}`;},series:[{name:'Queda em 1 min',values:rec.map(r=>r.drop1),color:'--sys-teal',dots:true},{name:'Queda em 2 min',values:rec.map(r=>r.drop2),color:'--sys-indigo',dots:true}]})}/></div><p className="field-help">Quanto maior a queda, melhor a recuperação. Acima de 20 bpm no 1º minuto costuma indicar bom condicionamento.</p></>:<p className="field-help">Envie a FC pós-treino do Apple Fitness pelo ChatGPT para acompanhar a recuperação.</p>}</article>
  </div>
  {tennis.length>0&&<div className="tennis-detail-table"><h3><Trophy size={16}/>Tênis em detalhe · últimas sessões</h3>
   {tennisKeys.length?<div className="personal-table-scroll"><table className="summary-table"><thead><tr><th>Data</th>{tennisKeys.map(([k,l])=><th key={k}>{l}</th>)}<th>Clima</th></tr></thead><tbody>{[...tennis].reverse().map(t=><tr key={t.date}><td>{weekLabel(t.date)}</td>{tennisKeys.map(([k])=><td key={k}>{t.values[k]===null?'—':num(t.values[k]!)}</td>)}<td>{t.weather?[t.weather.temperature_c!=null?`${t.weather.temperature_c}°C`:'',t.weather.humidity_percent!=null?`${t.weather.humidity_percent}%`:''].filter(Boolean).join(' · ')||'—':'—'}</td></tr>)}</tbody></table></div>
   :<p className="field-help">Peça ao ChatGPT para enviar também golpes, saques, aces, duplas faltas, winners, erros, ralis, FC máxima e clima do tênis. Eles aparecem aqui sessão a sessão.</p>}
  </div>}
 </section>;
}
