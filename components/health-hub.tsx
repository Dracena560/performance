import Link from 'next/link';
import { Utensils,Activity,Moon,FlaskConical,Target,ArrowUpRight } from 'lucide-react';
import { GeneralHealthDashboard } from './general-health-dashboard';
type Props=Parameters<typeof GeneralHealthDashboard>[0]&{demo?:boolean};
/* [route, title, description, symbol, domain tint token] — tints follow DESIGN.md "Tintas por domínio". */
const sections=[['alimentacao','Alimentação','Refeições, hidratação, vitaminas e minerais.',Utensils,'--tint-nutrition'],['exercicios','Exercícios','Movimento diário, sessões e recuperação.',Activity,'--tint-fitness'],['sono','Sono','Suas noites, notas e tendências.',Moon,'--tint-sleep'],['exames','Exames e consultas','Resultados de sangue, faixas de referência e próximos exames.',FlaskConical,'--sys-red'],['metas','Metas','Objetivos de acordo com o tipo do dia.',Target,'--sys-purple']] as const;
/** Saúde: shortcuts to each area, then the integrated day/week/month/year view. */
export function HealthHub({demo=false,...data}:Props){
 return <>
  <div className="page-heading"><div><span className="eyebrow">SEU BEM-ESTAR</span><h1>Saúde</h1><p>Tudo para acompanhar seu corpo e sua rotina.</p></div></div>
  <div className="health-hub">{sections.map(([href,title,description,Icon,tint])=><Link href={(demo?'/demo/':'/')+href} key={href} className="panel"><span className="hub-icon" aria-hidden style={{['--icon-tint' as string]:`var(${tint})`}}><Icon size={24}/></span><h2>{title}</h2><p>{description}</p><ArrowUpRight className="hub-arrow" size={20}/></Link>)}</div>
  <GeneralHealthDashboard {...data}/>
 </>;
}
