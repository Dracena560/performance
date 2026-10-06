import { monthlyPortfolio,inPounds,investmentType,type InvestmentSnapshot } from './investments';
import { latestCardEntry,parseMoney,type CreditCard } from './credit-card';
import { moneyTotal,type Finance } from './personal';

export type Line={label:string;value:number;note:string};
const cents=(n:number)=>Math.round(n*100)/100;
const br=(date:string)=>date.split('-').reverse().join('/');

/** What is still owed on the car: the settlement figure when informed, otherwise the remaining instalments plus the final payment. */
export function carDebt(car:unknown):{value:number;note:string}|null{
 const f=(car as any)?.extra?.financing??{};
 const settlement=parseMoney(f.settlement);
 if(settlement!==null&&settlement>=0)return {value:cents(settlement),note:f.settlementDate?`Saldo devedor informado em ${br(f.settlementDate)}`:'Saldo devedor informado'};
 const remaining=parseMoney(f.remaining),instalment=parseMoney(f.instalment),final=parseMoney(f.finalRepayment)??parseMoney(f.balloon)??0;
 if(remaining===null||instalment===null||remaining<0)return null;
 return {value:cents(Math.floor(remaining)*instalment+final),note:`${Math.floor(remaining)} parcelas restantes${final?' + parcela final':''} (inclui juros futuros)`};
}

/** Latest value of each investment in pounds, split into cash and the rest. */
export function latestInvestments(history:InvestmentSnapshot[]){
 const items=monthlyPortfolio(inPounds(history)).at(-1)?.items??[];
 const cash=items.filter(i=>investmentType(i)==='Caixa').reduce((t,i)=>t+i.value,0);
 const total=items.reduce((t,i)=>t+i.value,0);
 return {total:cents(total),cash:cents(cash),invested:cents(total-cash)};
}

/**
 * Net worth: investments (and the current account, when informed) minus the credit card bill
 * and what is left on the car finance. Items without data are listed in `missing`.
 */
export function netWorth({investments,card,car,liveTotal=null}:{investments:InvestmentSnapshot[];card:CreditCard;car:unknown;liveTotal?:number|null}){
 const inv=latestInvestments(investments);const assets:Line[]=[],liabilities:Line[]=[],missing:string[]=[];
 if(liveTotal!==null&&liveTotal>0)assets.push({label:'Investimentos',value:Math.round(liveTotal*100)/100,note:'Cotação ao vivo da carteira, em libras'});else if(investments.length)assets.push({label:'Investimentos',value:inv.total,note:'Última posição de cada investimento, em libras'});else missing.push('investimentos');
 if(card.checkingBalance!==null)assets.push({label:'Conta corrente',value:card.checkingBalance,note:card.checkingDate?`Saldo de ${br(card.checkingDate)}`:'Saldo informado'});
 const bill=latestCardEntry(card);if(bill)liabilities.push({label:'Fatura do cartão',value:bill.balance,note:`Valor de ${br(bill.date)}`});else missing.push('fatura do cartão');
 const debt=carDebt(car);if(debt)liabilities.push({label:'Financiamento do carro',value:debt.value,note:debt.note});else if((car as any)?.extra?.financing?.instalment)missing.push('saldo do financiamento');
 const sum=(lines:Line[])=>cents(lines.reduce((t,l)=>t+l.value,0));
 const totalAssets=sum(assets),totalLiabilities=sum(liabilities);
 return {assets,liabilities,totalAssets,totalLiabilities,total:cents(totalAssets-totalLiabilities),missing};
}

/**
 * Emergency fund: money available right away (cash investments and the current account, after the card bill)
 * divided by the fixed monthly expenses of the budget. The usual goal is 6 months.
 */
export function emergencyFund({investments,card,finance,target=6,includeChecking=true,subtractCard=true}:{investments:InvestmentSnapshot[];card:CreditCard;finance:Finance;target?:number;includeChecking?:boolean;subtractCard?:boolean}){
 const inv=latestInvestments(investments);const bill=subtractCard?latestCardEntry(card)?.balance??0:0;
 const checking=includeChecking?card.checkingBalance??0:0;
 const available=cents(Math.max(0,inv.cash+checking-bill));
 const fixedRows=finance.rows.filter(r=>r.type==='Fixo');
 const monthly=moneyTotal(fixedRows.length?fixedRows:finance.rows);
 const months=monthly>0?Math.round(available/monthly*10)/10:null;
 const goal=cents(monthly*target);
 return {available,cash:inv.cash,checking,bill,monthly,months,target,goal,gap:cents(Math.max(0,goal-available)),basis:fixedRows.length?'gastos fixos':'todas as despesas',level:months===null?'Sem dados':months>=target?'Completa':months>=target/2?'Em construção':'Baixa'};
}
