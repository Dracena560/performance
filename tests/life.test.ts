import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reminders,dateValue,carExtraSchema } from '../lib/life';
import { appendSnapshot,investmentSnapshotSchema,investmentChange } from '../lib/investments';
test('reminder bands include month and upcoming dates without changing date at midnight',()=>{
 const today='2026-09-27';const make=(days:number)=>new Date(Date.parse(today+'T12:00:00Z')+days*86400000).toISOString().slice(0,10);
 const personal_dates=[-1,0,1,7,30,90,91].map(days=>({id:String(days),name:String(days),kind:'Documento',date:make(days),issued:'',number:'',url:'',notes:''}));
 const list=reminders({personal_dates,personal_car:{insuranceExpiry:'2026-10-04',extra:{mot:{next:'2026-09-28'}}}},today);
 assert.equal(list.find(r=>r.id==='-1')?.level,'Vencido');assert.equal(list.find(r=>r.id==='0')?.level,'Hoje');assert.equal(list.find(r=>r.id==='1')?.level,'Até 1 dia');assert.equal(list.find(r=>r.id==='7')?.level,'Até 7 dias');assert.equal(list.find(r=>r.id==='30')?.level,'Até 30 dias');assert.equal(list.find(r=>r.id==='90')?.level,'Até 90 dias');assert.equal(list.some(r=>r.id==='91'),false);assert.equal(list.find(r=>r.id==='mot')?.thisMonth,true);
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
