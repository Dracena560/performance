'use client';
import {Wallet,TrendingUp,ArrowDownLeft,PiggyBank} from 'lucide-react';
import {EChart,lineOption} from './echart';
import {grouped,moneyTotal,type Finance} from '@/lib/personal';
import {monthlyPortfolio,inPounds,type InvestmentSnapshot} from '@/lib/investments';
const money=(v:number)=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(v);
// Categorical palette built from the system colours so it flips with Dark Mode.
const colors=['var(--sys-mint)','var(--sys-purple)','var(--sys-orange)','var(--sys-teal)','var(--sys-green)','var(--sys-blue)','var(--sys-pink)','var(--sys-indigo)','var(--sys-yellow)','var(--sys-brown)'];
const monthNames=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const shortMonth=(month:string)=>{const [year,index]=String(month).split('-');return `${monthNames[Number(index)-1]??index} ${year.slice(2)}`;};
export function FinanceInsights({data,history}:{data:Finance;history:InvestmentSnapshot[]}){
 const expenses=moneyTotal(data.rows),income=data.incomeFelipe+data.incomeSara,balance=income-expenses;
 const monthly=monthlyPortfolio(inPounds(history));const latest=monthly.at(-1);const items=latest?.items??[];const total=items.reduce((sum,i)=>sum+i.value,0);
 const missing=(monthlyPortfolio(history).at(-1)?.items??[]).some(i=>i.currency!=='GBP'&&!i.fx);
 const categories=grouped(data.rows,'category').sort((a,b)=>b.value-a.value);
 const chart=monthly.map(point=>({month:point.month,value:point.items.reduce((sum,i)=>sum+i.value,0)}));
 const payments=grouped(data.rows,'payment');
 const due=data.rows.filter(r=>r.day!==null).sort((a,b)=>a.day!-b.day!);
 const kpis=[{label:'Receita mensal prevista',value:income,icon:ArrowDownLeft,tone:'green'},{label:'Despesas planejadas',value:expenses,icon:Wallet,tone:'peach'},{label:'Saldo mensal previsto',value:balance,icon:PiggyBank,tone:'violet'},{label:missing?'Investimentos · subtotal':'Total investido',value:total,icon:TrendingUp,tone:'lime'}];
 return <div className="finance-insights">
 <div className="finance-kpis">{kpis.map(({label,value,icon:Icon,tone})=><article className={`metric finance-kpi ${tone}${value<0?' negative':''}`} key={label}><div className="metric-top"><span><Icon size={16} strokeWidth={1.9} aria-hidden/>{label}</span></div><div className="metric-value">{money(value)}</div><p className="metric-meta">{label.includes('invest')||tone==='lime'?`${items.length} posições com valores em GBP`:'Com base na tabela de gastos'}</p></article>)}</div>
 <div className="finance-visual-grid">
  <section className="panel finance-evolution"><span className="eyebrow">PATRIMÔNIO</span><h2>Evolução dos investimentos</h2>{chart.length>1?<div className="finance-chart"><EChart height="100%" label="Evolução mensal do valor da carteira de investimentos" option={t=>lineOption(t,{categories:chart.map(p=>p.month),scale:true,format:money,axisFormat:v=>`£${(v/1000).toFixed(1)}k`,labelFormat:shortMonth,series:[{name:'Valor da carteira',values:chart.map(p=>p.value),color:'--tint-invest',area:true,smooth:true}]})}/></div>:<div className="finance-baseline"><TrendingUp size={34} aria-hidden/><strong>{history.length?money(total):'Seu histórico começa aqui'}</strong><p>{history.length?'Primeiro mês registrado. Envie a próxima atualização para comparar a evolução.':'Adicione seus investimentos para acompanhar a evolução mensal.'}</p></div>}<p className="field-help">{missing?'Há cotações pendentes: o gráfico mostra apenas valores disponíveis. ':' '}Variação da carteira inclui aportes, retiradas e câmbio; não equivale ao rendimento.</p></section>
  <section className="panel finance-allocation"><span className="eyebrow">DISTRIBUIÇÃO</span><h2>Para onde vai o orçamento</h2><div className="finance-stack-bar" aria-hidden="true">{categories.map((c,i)=><span key={c.name} style={{width:`${expenses?c.value/expenses*100:0}%`,background:colors[i%colors.length]}}/>)}</div><div className="finance-category-list">{categories.map((c,i)=><div key={c.name}><span><i style={{background:colors[i%colors.length]}}/>{c.name}</span><strong>{money(c.value)}<small>{expenses?(c.value/expenses*100).toFixed(1):0}%</small></strong></div>)}</div></section>
  <section className="panel finance-payment-plan"><span className="eyebrow">ORGANIZE AS CONTAS</span><h2>Por forma de pagamento</h2><div className="finance-payment-list">{payments.map((p,i)=><div key={p.name}><span>{p.name}</span><strong>{money(p.value)}</strong><div><i style={{width:`${expenses?p.value/expenses*100:0}%`,background:colors[i%colors.length]}}/></div></div>)}</div><h3>Calendário de cobranças</h3><div className="finance-due-list">{due.map(row=><div key={row.id}><span className="finance-day">{String(row.day).padStart(2,'0')}</span><span>{row.item}<small>{row.payment}</small></span><b>{money(row.value)}</b></div>)}</div><small>Dia de cobrança informado no orçamento mensal.</small></section>
 </div>
 </div>;
}
