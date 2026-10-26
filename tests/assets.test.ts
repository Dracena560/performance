import test from 'node:test';
import assert from 'node:assert/strict';
import { assetDebt, assetReminders, assetSchema, assetsInPounds, isPaidOff, registerInstalment } from '../lib/assets';
import { netWorth } from '../lib/net-worth';
import { readCreditCard } from '../lib/credit-card';

const land=assetSchema.parse({id:'t',name:'Terreno',type:'Terreno',currency:'BRL',purchasePrice:90000,financing:{instalmentsTotal:100,instalmentsPaid:40,instalmentValue:1000,dueDay:10,nextDue:'2026-10-10',outstanding:60000,outstandingDate:'2026-10-11',paidTotal:45000}});
const flat=assetSchema.parse({id:'a',name:'Apartamento',currency:'GBP',currentValue:200000});

test('paid off vs still paying, and what is owed',()=>{
 assert.equal(isPaidOff(flat),true);assert.equal(assetDebt(flat),0);
 assert.equal(isPaidOff(land),false);assert.equal(assetDebt(land),60000);
});

test('registering an instalment moves count, balance and next due date together',()=>{
 const next=registerInstalment(land,'2026-10-27');
 assert.equal(next.financing!.instalmentsPaid,41);
 assert.equal(next.financing!.outstanding,59000);
 assert.equal(next.financing!.nextDue,'2026-11-10');
 assert.equal(next.financing!.paidTotal,46000);
});

test('assets enter the net worth in pounds; missing rates are reported',()=>{
 assert.deepEqual(assetsInPounds([land,flat],{BRL:0.15}),{value:Math.round((90000*0.15+200000)*100)/100,debt:Math.round(60000*0.15*100)/100,missing:[],estimated:true});
 assert.deepEqual(assetsInPounds([land],{}).missing,['Terreno']);
 const n=netWorth({investments:[],card:readCreditCard({}),car:{},goods:[land],rates:{BRL:0.15}});
 assert.ok(n.assets.some(l=>l.label==='Bens'));assert.ok(n.liabilities.some(l=>l.label==='Financiamento de bens'));
});

test('next open instalment goes to the reminders',()=>{
 assert.equal(assetReminders([land,flat],'2026-10-01')[0].date,'2026-10-10');
});

import { withAutoDebit } from '../lib/assets';
test('direct debit counts instalments as paid on their due dates, without writing',()=>{
 const auto=assetSchema.parse({id:'r',name:'Apartamento',currency:'BRL',financing:{instalmentsTotal:10,instalmentsPaid:4,instalmentValue:100,dueDay:29,nextDue:'2026-10-29',outstanding:600,paidTotal:400,autoDebit:true}});
 assert.equal(withAutoDebit(auto,'2026-10-28'),auto);
 const after=withAutoDebit(auto,'2026-12-01').financing!;
 assert.deepEqual([after.instalmentsPaid,after.nextDue,after.outstanding,after.paidTotal],[6,'2026-12-29',400,600]);
 const done=withAutoDebit(auto,'2027-12-01');
 assert.equal(isPaidOff(done),true);assert.equal(done.financing!.nextDue,'');
 assert.equal(assetReminders([auto],'2026-10-27')[0].name,'Débito automático · Apartamento');
 const manual=assetSchema.parse({...auto,financing:{...auto.financing,autoDebit:false}});
 assert.equal(withAutoDebit(manual,'2027-01-01'),manual);
});
