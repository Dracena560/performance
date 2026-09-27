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
 assert.deepEqual(dailyActivity(rows,'2026-09-27'),{steps:null,distance:null,stand:null,active:null,total:null});
 const summary=dailyActivity([...rows,{category:'daily_metrics',recorded_on:'2026-09-26',recorded_at:'2026-09-26T23:00:00Z',payload:{steps:8000,active_calories:450,stand_hours:12}}],'2026-09-26');
 assert.equal(summary.steps,8000);assert.equal(summary.total,2300);assert.equal(summary.active,450);assert.equal(summary.stand,720);
});
