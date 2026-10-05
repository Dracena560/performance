import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reminders,nextMonthlyDate,dateValue,carExtraSchema } from '../lib/life';
import { appendSnapshot,investmentSnapshotSchema,investmentChange } from '../lib/investments';
test('reminders list everything due from today through the next five days',()=>{
 const today='2026-09-27';const make=(days:number)=>new Date(Date.parse(today+'T12:00:00Z')+days*86400000).toISOString().slice(0,10);
 const personal_dates=[-1,0,1,5,6].map(days=>({id:String(days),name:String(days),kind:'Documento',date:make(days),issued:'',number:'',url:'',notes:''}));
 const personal_bills=[{id:'energy',name:'Energia',site:'',value:120,currency:'GBP',date:'2026-08-30',monthly:true,notes:''},{id:'annual',name:'Seguro casa',site:'',value:null,currency:'GBP',date:'2026-08-30',monthly:false,notes:''},{id:'empty',name:'Água',site:'',value:null,currency:'GBP',date:'',monthly:true,notes:''}];
 const personal_finance={rows:[{id:'rent',item:'Aluguel',category:'House',value:1450,payment:'DD',day:1,type:'Fixo'},{id:'gym',item:'Academia',category:'Fitness',value:95,payment:'DD',day:20,type:'Fixo'},{id:'food',item:'Mercado',category:'Grocery',value:480,payment:'Revolut',day:null,type:'Variável'}]};
 const personal_car={insuranceExpiry:'2026-10-04',permitExpiry:'2026-09-30',extra:{mot:{next:'2026-09-28'},tax:{renewal:'2026-10-02'},financing:{nextPayment:'2026-08-29',instalment:'£ 250'}}};
 const list=reminders({personal_dates,personal_bills,personal_finance,personal_car},today);const byId=(id:string)=>list.find(r=>r.id===id);
 assert.deepEqual(['-1','6'].map(id=>byId('date-'+id)),[undefined,undefined]);
 assert.equal(byId('date-0')?.level,'Hoje');assert.equal(byId('date-1')?.level,'Amanhã');assert.equal(byId('date-5')?.level,'Em 5 dias');assert.equal(byId('date-5')?.source,'Documento');
 assert.equal(byId('bill-energy')?.date,'2026-09-30');assert.equal(byId('bill-energy')?.amount,'£120.00');assert.equal(byId('bill-annual'),undefined);assert.equal(byId('bill-empty'),undefined);
 assert.equal(byId('expense-rent')?.date,'2026-10-01');assert.equal(byId('expense-rent')?.source,'Gasto fixo');assert.equal(byId('expense-gym'),undefined);assert.equal(byId('expense-food'),undefined);
 assert.equal(byId('car-mot')?.days,1);assert.equal(byId('car-permit')?.days,3);assert.equal(byId('car-tax')?.days,5);assert.equal(byId('car-insurance'),undefined);
 assert.equal(byId('car-payment')?.date,'2026-09-29');assert.equal(byId('car-payment')?.amount,'£ 250');
 assert.deepEqual(list.map(r=>r.date),[...list.map(r=>r.date)].sort());
 assert.equal(nextMonthlyDate(31,'2026-02-10'),'2026-02-28');assert.equal(nextMonthlyDate(5,'2026-12-20'),'2027-01-05');
 assert.equal(dateValue.safeParse('2026-02-31').success,false);assert.equal(carExtraSchema.safeParse({mot:{next:'not-date'}}).success,false);
});
test('investment snapshots retain partial updates, compare matching assets and reject identity changes',()=>{
 const first=investmentSnapshotSchema.parse({id:'one',as_of:'2026-09-01T12:00:00Z',items:[{asset_id:'a',name:'Fund',account:'Wise',currency:'GBP',value:100},{asset_id:'b',name:'Other',account:'Bank',currency:'USD',value:500}]});
 const second=investmentSnapshotSchema.parse({id:'two',as_of:'2026-09-27T12:00:00Z',items:[{asset_id:'a',name:'Fund',account:'Wise',currency:'GBP',value:125,net_flow:20}]});
 const history=appendSnapshot(appendSnapshot([],first),second);assert.equal(appendSnapshot(history,second).length,2);
 const change=investmentChange(history,'a');assert.equal(change.delta,25);assert.equal(change.percent,25);assert.equal(change.adjusted,5);assert.equal(investmentChange(history,'b').current?.value,500);assert.equal(investmentChange(history,'b').delta,null);
 assert.throws(()=>appendSnapshot(history,{...second,items:[{...second.items[0],value:126}]}));assert.throws(()=>appendSnapshot(history,{...second,id:'three',items:[{...second.items[0],currency:'USD'}]}));
 const zero=appendSnapshot([],{...first,items:[{...first.items[0],value:0}]});assert.equal(investmentChange(appendSnapshot(zero,second),'a').percent,null);
});
