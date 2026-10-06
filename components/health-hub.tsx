import Link from 'next/link';
import { Activity,ArrowUpRight,BedDouble,ChevronDown,Droplets,Dumbbell,FlaskConical,Flame,HeartPulse,Moon,Scale,Smile,Target,Utensils } from 'lucide-react';
import { SleepDashboard } from './sleep-dashboard';
import { ExerciseDashboard } from './exercise-dashboard';
import { ExamsView } from './exams-view';
import HealthApp from './health-app';
import type { HealthSummary } from '@/lib/health-summary';
import type { Exam } from '@/lib/exams';
import type { DogActivity } from '@/lib/dog-food';
import { metricInfo, targetLabel, type Targets } from '@/lib/domain';

type RecordRow={id:string;category:string;recorded_on:string;recorded_at:string|null;payload:Record<string,unknown>;source:string};
type Props={food:Parameters<typeof HealthApp>[0]['initial'];summary:HealthSummary;sleepRecords:RecordRow[];exerciseRecords:RecordRow[];exams:Exam[];taking:string[];dogActivities:DogActivity[];dogName:string;targets:Targets|null;dayType:string|null;today:string;demo?:boolean};
const fmt=(v:number|null,d=1)=>v===null?'—':new Intl.NumberFormat('pt-BR',{maximumFractionDigits:d}).format(v);
const dateText=(d:string)=>new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',timeZone:'UTC'}).format(new Date(d+'T12:00:00Z'));

function Tile({icon,label,value,unit,detail,extra,tone=''}:{icon:React.ReactNode;label:string;value:string;unit?:string;detail:string;extra?:string;tone?:string}){
 return <article className={`health-tile ${tone}`}><span className="health-tile-label">{icon}{label}</span><strong>{value}{unit&&<small>{unit}</small>}</strong><p>{detail}</p>{extra&&<p>{extra}</p>}</article>;
}
function Expand({id,icon,tint,title,subtitle,href,children,open=false}:{id:string;icon:React.ReactNode;tint:string;title:string;subtitle:string;href:string;children:React.ReactNode;open?:boolean}){
 return <details className="information-card health-expand" id={id} open={open} style={{['--card-tint' as string]:`var(${tint})`}}>
  <summary><span className="information-icon">{icon}</span><span><strong>{title}</strong><small>{subtitle}</small></span><ChevronDown className="expand-arrow" size={20} strokeWidth={1.9} aria-hidden="true"/></summary>
  <div className="information-body"><Link className="text-link health-expand-open" href={href}>{`Abrir ${title}`}<ArrowUpRight size={15}/></Link>{children}</div>
 </details>;
}

/** Saúde: a short health summary on top, then each area as an expandable card (like Minhas informações). */
export function HealthHub({food,summary:s,sleepRecords,exerciseRecords,exams,taking,dogActivities,dogName,targets,dayType,today,demo=false}:Props){
 const base=demo?'/demo/':'/';
 const sleepTone=s.sleep.avgHours===null?'':s.sleep.avgHours>=s.sleep.target-0.5?'good':s.sleep.avgHours>=s.sleep.target-1.5?'warn':'bad';
 const wellTone=s.wellbeing.avg===null?'':s.wellbeing.avg>=7?'good':s.wellbeing.avg>=5?'warn':'bad';
 const loadTone={Ideal:'good',Acima:'warn',Pico:'bad',Abaixo:'warn','Sem base':''}[s.training.level];
 const balance=s.energy.eaten!==null&&s.energy.burned!==null?Math.round(s.energy.eaten-s.energy.burned):null;
 const headline=[s.sleep.avgHours!==null&&`sono médio de ${fmt(s.sleep.avgHours)} h`,s.wellbeing.avg!==null&&`bem-estar ${fmt(s.wellbeing.avg)}/10`,s.training.minutes>0&&`${s.training.minutes} min de treino nesta semana`,s.tests.out.length>0&&`${s.tests.out.length} ${s.tests.out.length===1?'exame fora da faixa':'exames fora da faixa'}`].filter(Boolean).join(' · ');
 return <div className="health-page">
  <div className="page-heading"><div><span className="eyebrow">SEU BEM-ESTAR</span><h1>Saúde</h1><p>{headline?`Últimos 7 dias: ${headline}.`:'Tudo para acompanhar seu corpo e sua rotina.'}</p></div></div>
  <section className="health-summary" aria-label="Resumo da sua saúde">
   <Tile tone={sleepTone} icon={<BedDouble size={16}/>} label="Sono · 7 dias" value={fmt(s.sleep.avgHours)} unit=" h" detail={`Meta ${fmt(s.sleep.target)} h · nota ${fmt(s.sleep.avgScore)}/10 · última noite ${fmt(s.sleep.lastHours)} h`}/>
   <Tile tone={wellTone} icon={<Smile size={16}/>} label="Bem-estar · 7 dias" value={fmt(s.wellbeing.avg)} unit="/10" detail={s.wellbeing.days?`${s.wellbeing.days} ${s.wellbeing.days===1?'dia':'dias'} com check-in · hoje ${fmt(s.wellbeing.today)}`:'Faça check-ins para acompanhar'}/>
   <Tile tone={loadTone} icon={<Dumbbell size={16}/>} label="Treino · esta semana" value={String(s.training.minutes)} unit=" min" detail={`${s.training.sessions} ${s.training.sessions===1?'sessão':'sessões'} · carga ${s.training.ratio===null?'sem base':`${fmt(s.training.ratio,2)}× a média (${s.training.level.toLowerCase()})`}`}/>
   <Tile icon={<Flame size={16}/>} label="Energia · média 7 dias" value={fmt(s.energy.eaten,0)} unit=" kcal" detail={`Gasto ${fmt(s.energy.burned,0)} kcal${balance!==null?` · saldo ${balance>0?'+':''}${fmt(balance,0)} kcal/dia`:''}`}/>
   <Tile icon={<Droplets size={16}/>} label="Água · média 7 dias" value={fmt(s.water.avg,0)} unit=" ml" detail={targets?.water?`Meta de hoje ${targetLabel(targets.water)} ml`:'Defina a meta em Metas'}/>
   <Tile icon={<Scale size={16}/>} label="Corpo" value={fmt(s.body.weight)} unit=" kg" detail={[s.body.fat!==null?`gordura ${fmt(s.body.fat)}%`:'',s.body.change!==null?`${s.body.change>0?'+':''}${fmt(s.body.change)} kg`:'',s.body.vo2?`VO₂ max ${s.body.vo2}`:'',s.body.date?`medido em ${dateText(s.body.date)}`:''].filter(Boolean).join(' · ')||'Envie a bioimpedância pelo ChatGPT'}/>
   <Tile tone={s.tests.out.length?'warn':s.tests.markers?'good':''} icon={<FlaskConical size={16}/>} label="Exames" value={String(s.tests.out.length)} unit=" fora da faixa" detail={s.tests.out.slice(0,3).join(', ')||(s.tests.markers?'Tudo dentro da referência':'Nenhum exame registrado')} extra={s.tests.next?`Próxima data: ${dateText(s.tests.next)} (${s.tests.nextLabel})`:undefined}/>
  </section>

  <div className="information-sections health-sections">
   <Expand id="alimentacao" icon={<Utensils/>} tint="--tint-nutrition" title="Alimentação" subtitle="Refeições, hidratação, vitaminas e minerais" href={`${base}alimentacao`}>
    <HealthApp initial={food} view="alimentacao" demo={demo} embedded/>
   </Expand>
   <Expand id="exercicios" icon={<Activity/>} tint="--tint-fitness" title="Exercícios" subtitle="Carga semanal, sessões, zonas e recuperação" href={`${base}exercicios`}>
    <ExerciseDashboard records={exerciseRecords} date={today} dogActivities={dogActivities} dogName={dogName}/>
   </Expand>
   <Expand id="sono" icon={<Moon/>} tint="--tint-sleep" title="Sono" subtitle="Suas noites, notas e tendências" href={`${base}sono`}>
    <SleepDashboard records={sleepRecords}/>
   </Expand>
   <Expand id="exames" icon={<FlaskConical/>} tint="--sys-red" title="Exames e consultas" subtitle="Resultados, faixas de referência e próximos exames" href={`${base}exames`}>
    <ExamsView initial={exams} today={today} taking={taking} demo={demo}/>
   </Expand>
   <Expand id="metas" icon={<Target/>} tint="--sys-purple" title="Metas" subtitle="Objetivos de acordo com o tipo do dia" href={`${base}metas`}>
    {targets?<><p className="field-help">{`Metas de hoje${dayType?` · ${dayType}`:''}`}</p><div className="health-mini-grid">{(Object.entries(targets) as [keyof typeof metricInfo,Targets[keyof Targets]][]).filter(([,t])=>t).map(([k,t])=><div key={k}><small>{metricInfo[k]?.[0]??k}</small><strong>{`${targetLabel(t!)} ${metricInfo[k]?.[1]??''}`}</strong></div>)}</div></>:<p className="field-help">Nenhuma meta definida para hoje.</p>}
   </Expand>
  </div>
  <p className="field-help health-foot"><HeartPulse size={14}/> Resumo calculado com os seus registros. Não substitui acompanhamento médico.</p>
 </div>;
}
