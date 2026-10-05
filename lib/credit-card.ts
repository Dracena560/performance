import { z } from 'zod';
import { dateValue,nextMonthlyDate,nextCarPayment } from './life';
import { financeSchema,initialFinance,type Finance } from './personal';

const requiredDate=dateValue.refine(v=>v!=='','Data obrigatória');
export const cardEntrySchema=z.object({id:z.string().min(1).max(100),date:requiredDate,balance:z.number().finite().nonnegative().max(10000000),notes:z.string().max(2000).default('')});
export const creditCardSchema=z.object({
 name:z.string().max(100).default('Cartão de crédito'),
 limit:z.number().finite().nonnegative().max(10000000).nullable().default(null),
 dueDay:z.number().int().min(1).max(31).default(5),
 apr:z.number().finite().min(0).max(100).nullable().default(null),
 margin:z.number().finite().nonnegative().max(1000000).default(150),
 checkingBalance:z.number().finite().min(-10000000).max(100000000).nullable().default(null),
 checkingDate:dateValue.default(''),
 history:z.array(cardEntrySchema).max(1000).default([])
});
export type CreditCard=z.infer<typeof creditCardSchema>;
export type CardEntry=z.infer<typeof cardEntrySchema>;
export const initialCreditCard:CreditCard={name:'Cartão de crédito',limit:6800,dueDay:5,apr:null,margin:150,checkingBalance:null,checkingDate:'',history:[{id:'card-2026-10-05',date:'2026-10-05',balance:6480,notes:'Valor inicial informado.'}]};
export function readCreditCard(value:unknown):CreditCard{if(value===undefined||value===null)return initialCreditCard;const parsed=creditCardSchema.safeParse(value);return parsed.success?parsed.data:initialCreditCard;}

/** Upserts a balance report by id, so a retried MCP call never duplicates the entry. */
export function recordCardBalance(card:CreditCard,entry:CardEntry,checking?:{balance:number;date:string}):CreditCard{
 const history=card.history.some(e=>e.id===entry.id)?card.history.map(e=>e.id===entry.id?entry:e):[...card.history,entry];
 return creditCardSchema.parse({...card,history:[...history].sort((a,b)=>a.date.localeCompare(b.date)),...(checking?{checkingBalance:checking.balance,checkingDate:checking.date}:{})});
}

const cents=(n:number)=>Math.round(n*100)/100;
const addDays=(date:string,days:number)=>new Date(Date.parse(date+'T12:00:00Z')+days*86400000).toISOString().slice(0,10);
function addMonths(date:string,months:number,day:number){const d=new Date(date+'T12:00:00Z');const target=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+months,1,12));const last=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate();target.setUTCDate(Math.min(day,last));return target.toISOString().slice(0,10);}

export function latestCardEntry(card:CreditCard){return card.history.reduce<CardEntry|null>((last,e)=>!last||e.date>=last.date?e:last,null);}
export const isDirectDebit=(payment:string)=>/direct\s*debit|d[ée]bito/i.test(payment);

/** Reads "£ 1.234,56", "£1,234.56" or "250" as a number. */
export function parseMoney(text:unknown):number|null{
 if(typeof text==='number')return Number.isFinite(text)?text:null;if(typeof text!=='string')return null;
 let s=text.replace(/[^\d.,-]/g,'');if(!/\d/.test(s))return null;
 const comma=s.lastIndexOf(','),dot=s.lastIndexOf('.');
 if(comma>=0&&dot>=0)s=comma>dot?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');
 else if(comma>=0)s=/,\d{1,2}$/.test(s)&&s.split(',').length===2?s.replace(',','.'):s.replace(/,/g,'');
 else if(dot>=0&&s.split('.').length>2)s=s.replace(/\./g,'');
 else if(dot>=0&&/\.\d{3}$/.test(s))s=s.replace('.','');
 const n=Number(s);return Number.isFinite(n)?n:null;
}

const carFinanceRow=/parcela|financ|pcp|hire purchase|car finance/i;
/** The car instalment from the car's financing, unless the budget table already has it. */
export function carInstalment(car:unknown,finance:Finance,today:string){
 const financing=(car as any)?.extra?.financing;const value=parseMoney(financing?.instalment);
 if(!value||value<=0||finance.rows.some(row=>carFinanceRow.test(row.item)))return null;
 const remaining=parseMoney(financing?.remaining);const next=nextCarPayment(financing,today);
 return {value,next,day:next?Number(next.slice(8,10)):null,remaining:remaining!==null&&remaining>=0?Math.floor(remaining):null};
}

export type Debit={id:string;name:string;date:string;value:number;payment:string};
export const cashWindowDays=10;
/** Direct debits that leave the current account from today through the next `days` days (today included). */
export function upcomingDebits(finance:Finance,car:unknown,today:string,days=cashWindowDays):{items:Debit[];end:string;undated:Finance['rows']}{
 const end=addDays(today,days-1);const items:Debit[]=[];
 for(const row of finance.rows){if(!isDirectDebit(row.payment)||row.day===null)continue;const date=nextMonthlyDate(row.day,today);if(date<=end)items.push({id:row.id,name:row.item,date,value:row.value,payment:row.payment});}
 const instalment=carInstalment(car,finance,today);if(instalment?.next&&instalment.next<=end&&instalment.remaining!==0)items.push({id:'car-instalment',name:'Parcela do carro',date:instalment.next,value:instalment.value,payment:'Financiamento do carro'});
 return {items:items.sort((a,b)=>a.date.localeCompare(b.date)||a.name.localeCompare(b.name)),end,undated:finance.rows.filter(row=>isDirectDebit(row.payment)&&row.day===null)};
}

export function cashPlan(finance:Finance,card:CreditCard,car:unknown,today:string){
 const debits=upcomingDebits(finance,car,today);const debitTotal=cents(debits.items.reduce((sum,d)=>sum+d.value,0));
 const latest=latestCardEntry(card);const balance=latest?.balance??0;const dueDate=nextMonthlyDate(card.dueDay,today);
 const available=card.checkingBalance===null?null:cents(card.checkingBalance-debitTotal-card.margin);
 const payNow=available===null?null:cents(Math.max(0,Math.min(balance,available)));
 return {today,debits,debitTotal,needed:cents(debitTotal+card.margin),margin:card.margin,checkingBalance:card.checkingBalance,checkingDate:card.checkingDate,available,payNow,
  card:{name:card.name,balance,updated:latest?.date??null,limit:card.limit,availableCredit:card.limit===null?null:cents(card.limit-balance),usage:card.limit?balance/card.limit:null,dueDate,daysToDue:Math.round((Date.parse(dueDate+'T12:00:00Z')-Date.parse(today+'T12:00:00Z'))/86400000),afterPayment:payNow===null?null:cents(balance-payNow)}};
}

export type ForecastPoint={date:string;label:string;income:number;fixed:number;variable:number;car:number;surplus:number;payment:number;card:number;reserve:number};
/**
 * Month-by-month projection for the next 12 card due dates. Each month the planned
 * income minus every budgeted expense (fixed and variable) and the car instalment
 * pays the card first; once the card is clear the leftover accumulates as reserve.
 * The first due date is paid with what the current account can spare today, when known.
 */
export function forecast(finance:Finance,card:CreditCard,car:unknown,today:string,months=12){
 const plan=cashPlan(finance,card,car,today);const income=cents(finance.incomeFelipe+finance.incomeSara);
 const fixed=cents(finance.rows.filter(r=>r.type==='Fixo').reduce((s,r)=>s+r.value,0)),variable=cents(finance.rows.filter(r=>r.type==='Variável').reduce((s,r)=>s+r.value,0));
 const instalment=carInstalment(car,finance,today);const rate=(card.apr??0)/100/12;
 let balance=plan.card.balance,reserve=0;const points:ForecastPoint[]=[];
 for(let i=0;i<months;i++){
  const date=addMonths(plan.card.dueDate,i,card.dueDay);const carValue=instalment&&(instalment.remaining===null||i<instalment.remaining)?instalment.value:0;
  const surplus=cents(income-fixed-variable-carValue);const interest=i===0?0:cents(balance*rate);balance=cents(balance+interest);
  const cash=i===0&&plan.payNow!==null?plan.payNow:surplus;const payment=cents(Math.min(balance,Math.max(0,cash)));
  if(cash<0)balance=cents(balance-cash);else{balance=cents(balance-payment);if(!(i===0&&plan.payNow!==null))reserve=cents(reserve+cash-payment);}
  points.push({date,label:new Date(date+'T12:00:00Z').toLocaleDateString('pt-BR',{month:'short',year:'2-digit',timeZone:'UTC'}).replace('.',''),income,fixed,variable,car:carValue,surplus,payment,card:balance,reserve});
 }
 const paidOff=points.find(p=>p.card<=0)?.date??null;
 return {plan,income,fixed,variable,instalment,points,paidOff,interestIncluded:card.apr!==null&&card.apr>0};
}

/** Payload of the registrar_cartao_credito MCP tool. */
export const cardReportSchema=z.object({balance:z.number().finite().nonnegative().max(10000000).optional(),checking_balance:z.number().finite().min(-10000000).max(100000000).optional(),date:requiredDate.optional(),id:z.string().min(1).max(100).optional(),notes:z.string().max(2000).optional()}).refine(v=>v.balance!==undefined||v.checking_balance!==undefined,'Informe balance (fatura do cartão) e/ou checking_balance (saldo da conta corrente).');
/** Applies a report to the stored card. Same-day reports without id replace each other, so retries never duplicate. */
export function applyCardReport(stored:unknown,raw:unknown,today:string):CreditCard{
 const report=cardReportSchema.parse(raw);const date=report.date??today;const card=stored===undefined||stored===null?initialCreditCard:creditCardSchema.parse(stored);
 const checking=report.checking_balance!==undefined?{balance:report.checking_balance,date}:undefined;
 if(report.balance===undefined)return creditCardSchema.parse({...card,checkingBalance:checking!.balance,checkingDate:checking!.date});
 return recordCardBalance(card,{id:report.id??`card-${date}`,date,balance:report.balance,notes:report.notes??''},checking);
}
/** Everything the Financeiro page shows, computed from the stored profile. */
export function financePlan(profile:Record<string,any>,today:string){
 const parsed=financeSchema.safeParse(profile.personal_finance);const finance=parsed.success?parsed.data:initialFinance;
 const result=forecast(finance,readCreditCard(profile.personal_credit_card),profile.personal_car,today);
 return {today,cartao:result.plan.card,ter_na_conta_10_dias:result.plan.needed,debitos_10_dias:result.plan.debits.items,total_debitos_10_dias:result.plan.debitTotal,margem:result.plan.margin,saldo_conta_corrente:result.plan.checkingBalance,saldo_conta_data:result.plan.checkingDate,disponivel_para_cartao:result.plan.available,pagar_no_cartao_agora:result.plan.payNow,
  mensal:{receita:result.income,fixos:result.fixed,variaveis:result.variable,parcela_carro:result.instalment?.value??0},previsao_12_meses:result.points,cartao_quitado_em:result.paidOff,juros_incluidos:result.interestIncluded};
}
