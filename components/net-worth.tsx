'use client';
import {Landmark,ShieldCheck} from 'lucide-react';
import {netWorth,emergencyFund} from '@/lib/net-worth';
import {readCreditCard} from '@/lib/credit-card';
import type {InvestmentSnapshot} from '@/lib/investments';
import type {Finance} from '@/lib/personal';
const money=(v:number)=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(v);
const months=(v:number)=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(v);

/** Net worth and emergency fund side by side: the two numbers that sum up the finances. */
export function NetWorth({investments,creditCard,car,finance}:{investments:InvestmentSnapshot[];creditCard:unknown;car:unknown;finance:Finance}){
 const card=readCreditCard(creditCard);
 const n=netWorth({investments,card,car});const e=emergencyFund({investments,card,finance});
 const scale=Math.max(n.totalAssets,n.totalLiabilities,1);
 const pct=e.months===null?0:Math.min(100,e.months/e.target*100);
 return <div className="net-worth-grid">
  <section className="panel net-worth" aria-labelledby="net-worth-title">
   <div className="panel-heading"><div><span className="eyebrow">O NÚMERO QUE RESUME TUDO</span><h2 id="net-worth-title"><Landmark size={19} aria-hidden/> Patrimônio líquido</h2></div></div>
   <strong className={`net-worth-total${n.total<0?' negative':''}`}>{money(n.total)}</strong>
   <p className="field-help">O que você tem menos o que você deve.</p>
   <div className="net-worth-bars">
    <div><span>Você tem</span><i><em className="good" style={{width:`${n.totalAssets/scale*100}%`}}/></i><b>{money(n.totalAssets)}</b></div>
    <div><span>Você deve</span><i><em className="bad" style={{width:`${n.totalLiabilities/scale*100}%`}}/></i><b>{money(n.totalLiabilities)}</b></div>
   </div>
   <ul className="net-worth-lines">
    {n.assets.map(l=><li key={l.label}><span>{l.label}<small>{l.note}</small></span><b className="good">+ {money(l.value)}</b></li>)}
    {n.liabilities.map(l=><li key={l.label}><span>{l.label}<small>{l.note}</small></span><b className="bad">− {money(l.value)}</b></li>)}
   </ul>
   {n.missing.length>0&&<p className="field-help">{`Sem dados de ${n.missing.join(', ')}. Informe pelo MCP ou nas seções abaixo.`}</p>}
  </section>
  <section className="panel emergency-fund" aria-labelledby="emergency-title">
   <div className="panel-heading"><div><span className="eyebrow">SEGURANÇA</span><h2 id="emergency-title"><ShieldCheck size={19} aria-hidden/> Reserva de emergência</h2></div><span className={`emergency-level level-${e.level==='Completa'?'ok':e.level==='Em construção'?'mid':'low'}`}>{e.level}</span></div>
   <strong className="net-worth-total">{e.months===null?'—':`${months(e.months)} ${e.months===1?'mês':'meses'}`}</strong>
   <p className="field-help">{`de ${e.basis} cobertos, se a renda parar hoje. Meta: ${e.target} meses.`}</p>
   <div className="emergency-meter" role="img" aria-label={`Reserva cobre ${e.months??0} de ${e.target} meses`}><em style={{width:`${pct}%`}}/><span style={{left:'50%'}}>3</span><span style={{left:'100%'}}>{e.target}</span></div>
   <ul className="net-worth-lines">
    <li><span>Caixa nos investimentos<small>Itens do tipo Caixa</small></span><b>{money(e.cash)}</b></li>
    <li><span>Conta corrente<small>Saldo informado no plano do cartão</small></span><b>{money(e.checking)}</b></li>
    <li><span>Fatura do cartão<small>Precisa sair desse dinheiro</small></span><b className="bad">− {money(e.bill)}</b></li>
    <li className="total"><span>Disponível para emergências</span><b>{money(e.available)}</b></li>
    <li><span>Gasto fixo por mês<small>Da tabela de gastos</small></span><b>{money(e.monthly)}</b></li>
    {e.gap>0&&<li className="total"><span>{`Falta para ${e.target} meses`}</span><b>{money(e.gap)}</b></li>}
   </ul>
  </section>
 </div>;
}
