'use client';
import {FinanceInsights} from './finance-insights';
import {useEffect,useState} from 'react';
import {Wallet,TrendingUp,ChevronDown} from 'lucide-react';
import {financeSchema,initialFinance,moneyTotal} from '@/lib/personal';
import {investmentsSchema} from '@/lib/investments';
import {FinanceDashboard} from './personal-dashboard';
import {InvestmentOverview} from './investment-overview';
import {InvestmentsDashboard} from './investments-dashboard';
import {CreditCardPlan} from './credit-card-plan';
import {NetWorth} from './net-worth';
const money=(value:number)=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(value);
export function FinanceSections({finance,investments,creditCard,car,today}:{finance:unknown;investments:unknown;creditCard:unknown;car:unknown;today:string}){
 const parsed=financeSchema.safeParse(finance);const [data,setData]=useState(parsed.success?parsed.data:initialFinance);
 useEffect(()=>{const parsed=financeSchema.safeParse(finance);if(parsed.success)setData(parsed.data);},[finance]);
 const history=investmentsSchema.parse(investments);
 const total=moneyTotal(data.rows);
 const stats:[string,number][]=[['Despesas mensais',total],['Enviar para Wise',moneyTotal(data.rows.filter(r=>r.payment==='Wise Jar'))],['Débito Santander',moneyTotal(data.rows.filter(r=>r.payment==='Direct Debit Santander'))],['Saldo para guardar',data.incomeFelipe+data.incomeSara-total]];
 return <div className="finance-page">
  <header className="page-heading"><div><span className="eyebrow">SEU PATRIMÔNIO</span><h1>Financeiro</h1><p>Resumos à vista. Abra cada seção para consultar os detalhes.</p></div></header>
  <NetWorth investments={history} creditCard={creditCard} car={car} finance={data}/>
  <CreditCardPlan initial={creditCard} finance={data} car={car} today={today}/>
  <FinanceInsights data={data} history={history}/>
  <details className="information-card finance-expand">
   <summary>
    <span className="finance-expand-heading"><span className="information-icon" aria-hidden><Wallet/></span><strong>Tabela de gastos</strong><ChevronDown className="expand-arrow" aria-hidden/></span>
    <span className="finance-expand-stats">{stats.map(([name,value])=><span key={name}><small>{name}</small><b>{money(value)}</b></span>)}</span>
   </summary>
   <div className="information-body"><FinanceDashboard initial={finance} embedded hideSummary onChange={setData}/></div>
  </details>
  <details className="information-card finance-expand finance-expand-invest" id="investimentos">
   <summary>
    <span className="finance-expand-heading"><span className="information-icon" aria-hidden><TrendingUp/></span><strong>Investimentos</strong><ChevronDown className="expand-arrow" aria-hidden/></span>
    <InvestmentOverview history={history} compact/>
   </summary>
   <div className="information-body finance-page"><InvestmentOverview history={history} hideTotals/><InvestmentsDashboard initial={history} embedded/></div>
  </details>
 </div>;
}
