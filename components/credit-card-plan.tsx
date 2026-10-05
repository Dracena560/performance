'use client';
import {useEffect,useState} from 'react';
import {CreditCard as CardIcon,Landmark,HandCoins,CalendarCheck,Plus,Save,Trash2,ChevronDown} from 'lucide-react';
import {EChart,lineOption} from './echart';
import {savePersonalSection} from '@/app/actions';
import {creditCardSchema,readCreditCard,recordCardBalance,forecast,cashWindowDays,type CreditCard} from '@/lib/credit-card';
import type {Finance} from '@/lib/personal';
const money=(v:number)=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(v);
const shortDate=(d:string)=>new Date(d+'T12:00:00Z').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',timeZone:'UTC'});
const fullDate=(d:string)=>new Date(d+'T12:00:00Z').toLocaleDateString('pt-BR',{timeZone:'UTC'});
const numberOrNull=(v:string)=>v.trim()===''?null:Number(v.replace(',','.'));

export function CreditCardPlan({initial,finance,car,today}:{initial:unknown;finance:Finance;car:unknown;today:string}){
 const [card,setCard]=useState<CreditCard>(()=>readCreditCard(initial));
 const [entry,setEntry]=useState({balance:'',date:today,notes:''}),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{setCard(readCreditCard(initial));},[JSON.stringify(initial)]);
 const save=async(next:CreditCard,done:string)=>{const parsed=creditCardSchema.safeParse(next);if(!parsed.success){setMessage('Confira os campos: '+parsed.error.issues[0]?.message);return;}setBusy(true);setMessage('');try{await savePersonalSection('credit_card',parsed.data);setCard(parsed.data);setMessage(done);}catch(error){setMessage('Não foi salvo: '+(error as Error).message);}finally{setBusy(false);}};
 const edit=(patch:Partial<CreditCard>)=>{setCard({...card,...patch});setMessage('Alterações ainda não salvas.');};
 const result=forecast(finance,card,car,today);const {plan,points}=result;
 const history=[...card.history].sort((a,b)=>b.date.localeCompare(a.date));
 // One x-axis for reported balances (past) and the projection (each future due date).
 const chart=[...new Set([...card.history.map(e=>e.date),...points.map(p=>p.date)])].sort().map(date=>{const reported=[...card.history].reverse().find(e=>e.date===date);const point=points.find(p=>p.date===date);return {date,Informado:reported?.balance??null,Previsto:point?point.card:date===plan.card.updated?plan.card.balance:null};});
 const due=plan.card.daysToDue===0?'vence hoje':plan.card.daysToDue===1?'vence amanhã':`vence em ${plan.card.daysToDue} dias`;
 const kpis=[
  {label:'Fatura atual do cartão',value:money(plan.card.balance),icon:CardIcon,tone:'peach',meta:`${plan.card.limit!==null?`Limite ${money(plan.card.limit)} · ${Math.round((plan.card.usage??0)*100)}% usado · `:''}${due} (${fullDate(plan.card.dueDate)})`},
  {label:`Ter na conta · ${cashWindowDays} dias`,value:money(plan.needed),icon:Landmark,tone:'violet',meta:`${money(plan.debitTotal)} em débitos até ${shortDate(plan.debits.end)} + margem de ${money(plan.margin)}`},
  {label:'Pode pagar no cartão agora',value:plan.payNow===null?'—':money(plan.payNow),icon:HandCoins,tone:'green',meta:plan.payNow===null?'Informe o saldo da conta corrente abaixo':`Saldo ${money(plan.checkingBalance!)}${plan.checkingDate?` em ${shortDate(plan.checkingDate)}`:''}; fatura fica em ${money(plan.card.afterPayment!)}`},
  {label:'Cartão quitado em',value:result.paidOff?new Date(result.paidOff+'T12:00:00Z').toLocaleDateString('pt-BR',{month:'short',year:'numeric',timeZone:'UTC'}).replace('.','').replace(' de ','/'):'+12 meses',icon:CalendarCheck,tone:'lime',meta:result.paidOff?`Vencimento de ${fullDate(result.paidOff)}, pela previsão abaixo`:'A sobra mensal não quita o cartão em 12 meses'}
 ];
 return <section className="credit-card-plan" aria-labelledby="credit-card-title">
  <div className="finance-section-heading"><span className="eyebrow">COMPROMISSO</span><h2 id="credit-card-title">Cartão de crédito e caixa</h2></div>
  <div className="finance-kpis">{kpis.map(({label,value,icon:Icon,tone,meta})=><article className={`metric finance-kpi ${tone}`} key={label}><div className="metric-top"><span><Icon size={16} strokeWidth={1.9} aria-hidden/>{label}</span></div><div className="metric-value">{value}</div><p className="metric-meta">{meta}</p></article>)}</div>
  {plan.available!==null&&plan.available<0&&<p className="credit-card-alert" role="alert">O saldo da conta não cobre os débitos dos próximos {cashWindowDays} dias com a margem de {money(plan.margin)}: faltam {money(-plan.available)}. Não pague o cartão com esse dinheiro.</p>}
  <div className="finance-visual-grid">
   <section className="panel finance-forecast"><span className="eyebrow">PRÓXIMOS 12 MESES</span><h2>Previsão do cartão</h2>
    <div className="finance-chart"><EChart height="100%" label="Fatura do cartão informada e prevista para os próximos 12 meses" option={t=>{const o:any=lineOption(t,{categories:chart.map(c=>c.date),min:0,grid:{top:28},format:money,axisFormat:v=>`£${Math.abs(v)>=1000?(v/1000).toFixed(1)+'k':v}`,labelFormat:d=>new Date(d+'T12:00:00Z').toLocaleDateString('pt-BR',{month:'short',timeZone:'UTC'}).replace('.',''),titleFormat:fullDate,series:[{name:'Fatura informada',values:chart.map(c=>c.Informado),color:'--tint-finance',dots:true},{name:'Fatura prevista',values:chart.map(c=>c.Previsto),color:'--sys-orange',dashed:true,dots:false}]});if(plan.card.limit!==null)o.series[0].markLine={silent:true,symbol:'none',lineStyle:{color:t.color('--danger'),type:[4,4],width:1.5},label:{formatter:'Limite',position:'insideEndTop',color:t.label2,fontSize:12},data:[{yAxis:plan.card.limit}]};return o;}}/></div>
    <div className="finance-chart-legend"><span><i style={{background:'var(--tint-finance)'}}/>Fatura informada</span><span><i style={{background:'var(--sys-orange)'}}/>Fatura prevista</span></div>
    <details className="forecast-table"><summary>Ver mês a mês <ChevronDown size={14} aria-hidden/></summary><div className="personal-table-scroll"><table><thead><tr><th>Vencimento</th><th>Sobra do mês</th><th>Pago no cartão</th><th>Fatura depois</th><th>Reserva</th></tr></thead><tbody>{points.map(p=><tr key={p.date}><td>{fullDate(p.date)}</td><td className={p.surplus<0?'negative':''}>{money(p.surplus)}</td><td>{money(p.payment)}</td><td>{money(p.card)}</td><td>{money(p.reserve)}</td></tr>)}</tbody></table></div></details>
    <p className="field-help">Por mês: receita {money(result.income)} − gastos fixos {money(result.fixed)} − variáveis planejados {money(result.variable)}{result.instalment?` − parcela do carro ${money(result.instalment.value)}${result.instalment.remaining!==null?` (${result.instalment.remaining} restantes)`:''}`:''}. A sobra paga o cartão primeiro e depois vira reserva. {result.interestIncluded?`Juros de ${card.apr}% a.a. incluídos.`:'Sem juros do cartão: informe a taxa anual para incluí-los.'} O primeiro vencimento usa o valor que pode ser pago agora.</p>
   </section>
   <section className="panel finance-payment-plan"><span className="eyebrow">DÉBITO AUTOMÁTICO</span><h2>Sai da conta até {shortDate(plan.debits.end)}</h2>
    <div className="finance-due-list">{plan.debits.items.length?plan.debits.items.map(d=><div key={d.id}><span className="finance-day">{d.date.slice(8,10)}</span><span>{d.name}<small>{d.payment}</small></span><b>{money(d.value)}</b></div>):<p className="field-help">Nenhum débito automático nos próximos {cashWindowDays} dias.</p>}</div>
    <div className="cash-total"><span>Débitos<b>{money(plan.debitTotal)}</b></span><span>Margem<b>{money(plan.margin)}</b></span><span>Ter na conta<b>{money(plan.needed)}</b></span></div>
    {plan.debits.undated.length>0&&<small>Sem dia definido, fora da conta: {plan.debits.undated.map(r=>r.item).join(', ')}.</small>}
   </section>
  </div>
  <details className="information-card finance-expand">
   <summary><span className="finance-expand-heading"><span className="information-icon" aria-hidden><CardIcon/></span><strong>Atualizar cartão e saldo da conta</strong><ChevronDown className="expand-arrow" aria-hidden/></span></summary>
   <div className="information-body credit-card-form">
    <p role="status" className="field-help">{message||'Cada valor informado fica no histórico e aparece no gráfico.'}</p>
    <form className="personal-form-grid" onSubmit={e=>{e.preventDefault();const balance=numberOrNull(entry.balance);if(balance===null||!Number.isFinite(balance)||balance<0){setMessage('Informe o valor atual da fatura.');return;}void save(recordCardBalance(card,{id:crypto.randomUUID(),date:entry.date,balance,notes:entry.notes}),'Valor do cartão registrado.').then(()=>setEntry({balance:'',date:today,notes:''}));}}>
     <label>Valor atual da fatura (£)<input inputMode="decimal" value={entry.balance} onChange={e=>setEntry({...entry,balance:e.target.value})} placeholder="6480.00"/></label>
     <label>Data<input type="date" value={entry.date} onChange={e=>setEntry({...entry,date:e.target.value})}/></label>
     <label>Observação<input value={entry.notes} onChange={e=>setEntry({...entry,notes:e.target.value})}/></label>
     <button className="button primary" disabled={busy}><Plus size={16}/>Registrar valor</button>
    </form>
    <div className="personal-form-grid">
     <label>Saldo da conta corrente (£)<input inputMode="decimal" value={card.checkingBalance??''} onChange={e=>edit({checkingBalance:numberOrNull(e.target.value),checkingDate:today})}/></label>
     <label>Limite do cartão (£)<input inputMode="decimal" value={card.limit??''} onChange={e=>edit({limit:numberOrNull(e.target.value)})}/></label>
     <label>Dia limite de pagamento<input type="number" min={1} max={31} value={card.dueDay} onChange={e=>edit({dueDay:Number(e.target.value)})}/></label>
     <label>Margem na conta (£)<input inputMode="decimal" value={card.margin} onChange={e=>edit({margin:numberOrNull(e.target.value)??0})}/></label>
     <label>Juros do cartão (% a.a., opcional)<input inputMode="decimal" value={card.apr??''} onChange={e=>edit({apr:numberOrNull(e.target.value)})}/></label>
     <button className="button secondary" disabled={busy} onClick={()=>void save(card,'Configuração do cartão salva.')}><Save size={16}/>Salvar configuração</button>
    </div>
    <h3>Histórico da fatura</h3>
    <div className="finance-due-list">{history.map(e=><div key={e.id}><span className="finance-day">{e.date.slice(8,10)}</span><span>{fullDate(e.date)}<small>{e.notes||'—'}</small></span><b>{money(e.balance)}</b><button className="button ghost icon" aria-label={`Remover valor de ${fullDate(e.date)}`} disabled={busy} onClick={()=>void save({...card,history:card.history.filter(h=>h.id!==e.id)},'Valor removido do histórico.')}><Trash2 size={16}/></button></div>)}</div>
   </div>
  </details>
 </section>;
}
