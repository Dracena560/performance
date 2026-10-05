import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMoney,upcomingDebits,cashPlan,forecast,applyCardReport,initialCreditCard,financePlan,creditCardSchema } from '../lib/credit-card';
import { reminders } from '../lib/life';
import type { Finance } from '../lib/personal';
const finance:Finance={incomeFelipe:3000,incomeSara:1000,rows:[
 {id:'rent',item:'Rent',category:'House',value:1500,payment:'Direct Debit Santander',day:1,type:'Fixo'},
 {id:'tax',item:'Council Tax',category:'House',value:200,payment:'Direct Debit Santander',day:20,type:'Fixo'},
 {id:'phone',item:'Phone',category:'Subscription',value:30,payment:'Direct Debit Santander',day:8,type:'Fixo'},
 {id:'land',item:'Land',category:'Property',value:100,payment:'Direct Debit Santander',day:null,type:'Fixo'},
 {id:'food',item:'Grocery',category:'Grocery',value:500,payment:'Revolut',day:null,type:'Variável'},
 {id:'gym',item:'Gym',category:'Fitness',value:70,payment:'Wise Jar',day:2,type:'Fixo'}
]};
const card=creditCardSchema.parse({limit:6800,dueDay:5,margin:150,checkingBalance:3000,checkingDate:'2026-09-28',history:[{id:'a',date:'2026-09-01',balance:7000,notes:''},{id:'b',date:'2026-09-28',balance:6480,notes:''}]});
test('money text from the car form is read in both notations',()=>{
 assert.equal(parseMoney('£ 1.234,56'),1234.56);assert.equal(parseMoney('£1,234.56'),1234.56);assert.equal(parseMoney('£ 250'),250);assert.equal(parseMoney('£ 12.000'),12000);assert.equal(parseMoney('7,9'),7.9);assert.equal(parseMoney(''),null);
});
test('only direct debits with a day inside the next 10 days count as money to keep in the account',()=>{
 const debits=upcomingDebits(finance,{extra:{financing:{instalment:'£ 250',paymentDay:'3',remaining:'12'}}},'2026-09-28');
 assert.equal(debits.end,'2026-10-07');assert.deepEqual(debits.items.map(d=>d.id),['rent','car-instalment']);assert.deepEqual(debits.undated.map(r=>r.id),['land']);
});
test('card payment keeps the debits and the £150 margin in the current account',()=>{
 const plan=cashPlan(finance,card,undefined,'2026-09-28');
 assert.equal(plan.card.balance,6480);assert.equal(plan.card.availableCredit,320);assert.equal(plan.card.dueDate,'2026-10-05');assert.equal(plan.card.daysToDue,7);
 assert.equal(plan.debitTotal,1500);assert.equal(plan.needed,1650);assert.equal(plan.available,1350);assert.equal(plan.payNow,1350);assert.equal(plan.card.afterPayment,5130);
 const short=cashPlan(finance,{...card,checkingBalance:1000},undefined,'2026-09-28');assert.equal(short.available,-650);assert.equal(short.payNow,0);
 assert.equal(cashPlan(finance,{...card,checkingBalance:null},undefined,'2026-09-28').payNow,null);
});
test('forecast pays the card with each month surplus, then builds a reserve',()=>{
 const result=forecast(finance,card,undefined,'2026-09-28');
 assert.equal(result.points.length,12);assert.equal(result.points[0].date,'2026-10-05');assert.equal(result.points[0].card,5130);
 assert.equal(result.points[1].surplus,1600);assert.equal(result.points[1].card,3530);assert.equal(result.points[3].card,330);
 assert.equal(result.points[4].card,0);assert.equal(result.points[4].reserve,1270);assert.equal(result.paidOff,'2027-02-05');
 const withInterest=forecast(finance,{...card,apr:24},undefined,'2026-09-28');assert.equal(withInterest.points[1].card,3632.6);
 const short=forecast({...finance,incomeSara:0},{...card,checkingBalance:null},undefined,'2026-09-28');assert.equal(short.points[0].surplus,600);
});
test('card reports keep one entry per day and can update the current account alone',()=>{
 const once=applyCardReport(undefined,{balance:6400,date:'2026-10-06'},'2026-10-06');assert.deepEqual(once.history.map(e=>e.balance),[6480,6400]);
 const again=applyCardReport(once,{balance:6390,date:'2026-10-06',checking_balance:2000},'2026-10-06');assert.deepEqual(again.history.map(e=>e.balance),[6480,6390]);assert.equal(again.checkingBalance,2000);
 const account=applyCardReport(again,{checking_balance:1800},'2026-10-07');assert.equal(account.history.length,2);assert.equal(account.checkingDate,'2026-10-07');
 assert.throws(()=>applyCardReport(again,{notes:'nada'},'2026-10-07'));assert.throws(()=>applyCardReport({history:'x'},{balance:1},'2026-10-07'));
});
test('the starting card and its due date appear as a commitment',()=>{
 assert.equal(initialCreditCard.history[0].balance,6480);assert.equal(initialCreditCard.limit,6800);assert.equal(initialCreditCard.dueDay,5);
 const due=reminders({personal_credit_card:initialCreditCard},'2026-10-02').find(r=>r.id==='credit-card');assert.equal(due?.date,'2026-10-05');assert.equal(due?.amount,'£6,480.00');
 const plan=financePlan({personal_finance:finance,personal_credit_card:card},'2026-09-28');assert.equal(plan.ter_na_conta_10_dias,1650);assert.equal(plan.pagar_no_cartao_agora,1350);assert.equal(plan.previsao_12_meses.length,12);
});
