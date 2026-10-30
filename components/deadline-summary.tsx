'use client';
import { type Reminder } from '@/lib/life';
import { type PendingMatch } from '@/lib/tennis-pending';
import { useSettings } from './settings-context';

/** Themes of Próximos vencimentos: each reminder group goes to one coloured column. */
const themes=[
 {key:'tenis',label:'Tênis',tint:'--tint-tennis',groups:[] as string[]},
 {key:'contas',label:'Contas e gastos',tint:'--sys-blue',groups:['Contas','Gastos fixos','Cartão de crédito']},
 {key:'bens',label:'Bens e financiamentos',tint:'--tint-finance',groups:['Bens']},
 {key:'pet',label:'Caju',tint:'--sys-orange',groups:['Pet']},
 {key:'carro',label:'Carro',tint:'--sys-indigo',groups:['Carro']},
 {key:'saude',label:'Saúde',tint:'--sys-pink',groups:['Exames']},
 {key:'documentos',label:'Documentos e datas',tint:'--gray',groups:['Documentos e datas']},
];
const br=(date:string)=>new Date(date+'T12:00:00Z').toLocaleDateString('pt-BR',{timeZone:'UTC',day:'2-digit',month:'2-digit'});

/** `tennis` adds scheduled games that already happened and still wait for their result. */
export function DeadlineSummary({items,tennis=[],onCompleteTennis}:{items:Reminder[];tennis?:PendingMatch[];onCompleteTennis?:(match:PendingMatch)=>void}){
 const reminderWindowDays=useSettings().reminders.windowDays;
 const total=items.length+tennis.length;
 const columns=themes.map(theme=>({...theme,items:items.filter(item=>theme.groups.includes(item.group)||(theme.key==='documentos'&&!themes.some(t=>t.groups.includes(item.group))))})).filter(theme=>theme.key==='tenis'?tennis.length>0:theme.items.length>0);
 return <section className="panel deadline-summary">
  <div className="panel-heading"><div><h2>Próximos vencimentos</h2><p className="field-help">Hoje e os próximos {reminderWindowDays} dias · {total} {total===1?'vencimento':'vencimentos'}</p></div><a href="/minhas-informacoes" className="text-link">Gerenciar documentos e datas</a></div>
  {total?<div className="deadline-groups">{columns.map(theme=><section key={theme.key} className="deadline-group" style={{['--group' as string]:`var(${theme.tint})`}} aria-label={theme.label}>
   <h3><i aria-hidden/>{theme.label}<small>{theme.key==='tenis'?tennis.length:theme.items.length}</small></h3>
   <ul>
    {theme.key==='tenis'&&tennis.map(match=><li key={match.id} className="urgent"><span className="deadline-when danger">Pendente</span><div><strong>{match.label}</strong><small>{br(match.date)}{match.time?` · ${match.time}`:''} · {match.type} · sem resultado</small>{onCompleteTennis&&<button className="text-link" onClick={()=>onCompleteTennis(match)}>Adicionar resultado</button>}</div></li>)}
    {theme.items.map(item=><li key={item.id} className={item.days<=1?'urgent':''}><span className={`deadline-when${item.days<=1?' danger':''}`}>{item.level}</span><div><strong>{item.name}</strong><small>{br(item.date)}{item.amount?` · ${item.amount}`:''}{theme.groups.length>1||theme.key==='documentos'?` · ${item.source}`:''}</small></div></li>)}
   </ul>
  </section>)}</div>:<p className="field-help">Nada vence hoje nem nos próximos {reminderWindowDays} dias.</p>}
  <p className="field-help">Inclui gastos fixos e contas com data, carro, bens e financiamentos, documentos, exames, os cuidados do Caju e jogos de tênis sem resultado. <a className="text-link" href="/configuracoes#vencimentos">Ajustar prazo e categorias</a></p>
 </section>;
}
