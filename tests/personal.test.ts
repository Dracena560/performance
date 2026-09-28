import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialFinance,moneyTotal,grouped,financeSchema,tripSchema } from '../lib/personal';
import { dailyActivity } from '../lib/daily-activity';
test('screenshot budget and payment totals reconcile to the penny',()=>{
 assert.equal(initialFinance.rows.length,31);assert.equal(moneyTotal(initialFinance.rows),3876.12);
 assert.deepEqual(grouped(initialFinance.rows,'payment'),[{name:'Direct Debit Santander',value:2716.12},{name:'Revolut',value:500},{name:'Wise Jar',value:660}]);
 assert.equal(moneyTotal(initialFinance.rows.filter(r=>r.type==='Fixo')),3416.12);assert.equal(moneyTotal(initialFinance.rows.filter(r=>r.type==='Variável')),460);
 assert.equal(Math.round((5300-moneyTotal(initialFinance.rows))*100)/100,1423.88);
 assert.equal(financeSchema.safeParse({...initialFinance,rows:[{...initialFinance.rows[0],day:32}]}).success,false);
 assert.equal(tripSchema.safeParse({id:'a',place:'London',country:'UK',date:'',rating:11,details:''}).success,false);
});
test('daily totals never borrow yesterday or workout calories; latest snapshot wins',()=>{
 const rows=[{category:'daily_metrics',recorded_on:'2026-09-26',recorded_at:'2026-09-26T22:00:00Z',payload:{steps:7774,total_calories:2300}},{category:'workout',recorded_on:'2026-09-27',recorded_at:'2026-09-27T10:00:00Z',payload:{steps:2000,total_calories:400}}];
 assert.deepEqual(dailyActivity(rows,'2026-09-27'),{steps:null,distance:null,stand:null,standHours:null,exercise:null,active:null,total:null});
 const summary=dailyActivity([...rows,{category:'daily_metrics',recorded_on:'2026-09-26',recorded_at:'2026-09-26T23:00:00Z',payload:{steps:8000,active_calories:450,stand_hours:12}}],'2026-09-26');
 assert.equal(summary.steps,8000);assert.equal(summary.total,2300);assert.equal(summary.active,450);assert.equal(summary.stand,720);
});

test('expanded car profile preserves legacy dates and supports avatars and history',async()=>{
 const {carSchema}=await import('../lib/personal');
 const legacy={model:'Eclipse Cross',registration:'AB12 CDE',purchase:'2026-01-10',insurance:'2026-01-11',permit:'2026-02-01',notes:'Meu carro'};
 const converted=carSchema.parse(legacy);
 assert.equal(converted.insurance,legacy.insurance);assert.equal(converted.permit,legacy.permit);assert.equal(converted.km,null);assert.deepEqual(converted.previous,[]);
 const record={...converted,km:34000,insuranceSite:'https://example.com',insuranceExpiry:'2027-01-11',permitSite:'https://example.org',permitExpiry:'2027-02-01',photo:'data:image/jpeg;base64,/9j/AA==',previous:[{id:'one',model:'Carro antigo',purchase:'2020-01-01',sold:'2025-01-01',photo:'data:image/jpeg;base64,/9j/AA=='}]};
 const saved=carSchema.parse(JSON.parse(JSON.stringify(record)));assert.equal(saved.photo,record.photo);assert.equal(saved.previous[0].model,'Carro antigo');assert.equal(saved.km,34000);
 assert.equal(carSchema.safeParse({...record,insuranceSite:'javascript:alert(1)'}).success,false);
 assert.equal(carSchema.safeParse({...record,insuranceExpiry:'2025-01-01'}).success,false);
 assert.equal(carSchema.safeParse({...record,purchase:'2026-02-31'}).success,false);
 assert.equal(carSchema.safeParse({...record,photo:'data:image/svg+xml;base64,AAAA'}).success,false);
});
