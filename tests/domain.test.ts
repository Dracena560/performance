import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eventSchema,scoresSchema,targetSchema,targetProgress,localDate,londonToISO,totals,type HealthEvent } from '../lib/domain';
test('check-in preserves zero separately from null and rejects out-of-range scores',()=>{
 assert.deepEqual(scoresSchema.parse({anxiety:0,stress:null}),{anxiety:0,stress:null});
 assert.equal(scoresSchema.safeParse({energy:11}).success,false);
 assert.equal(scoresSchema.safeParse({unexpected:2}).success,false);
});
test('four target semantics and invalid ranges',()=>{
 assert.match(targetProgress(14,{kind:'maximum',min:null,max:20}).text,/6/);
 assert.equal(targetProgress(21,{kind:'maximum',min:null,max:20}).status,'over');
 assert.equal(targetProgress(195,{kind:'range',min:180,max:220}).status,'within');
 assert.equal(targetProgress(125,{kind:'minimum',min:110,max:null}).status,'within');
 assert.equal(targetProgress(2400,{kind:'exact',min:3000,max:null}).percent,80);
 assert.equal(targetSchema.safeParse({kind:'range',min:20,max:10}).success,false);
});
test('London date uses BST and midnight correctly; gaps and ambiguous hours are rejected',()=>{
 assert.equal(localDate(new Date('2026-09-25T23:30:00Z')),'2026-09-26');
 assert.equal(londonToISO('2026-09-25T00:30'),'2026-09-24T23:30:00.000Z');
 assert.equal(londonToISO('2026-01-25T12:30'),'2026-01-25T12:30:00.000Z');
 assert.throws(()=>londonToISO('2026-03-29T01:30'));
 assert.throws(()=>londonToISO('2026-10-25T01:30'));
});
const base={id:'test',local_date:'2026-09-25',timestamp:'2026-09-25T12:00:00Z',timezone:'Europe/London',source:'manual',measurement_type:'measured',estimated:false,notes:''} as const;
test('only pure water is counted; empty data remains unknown',()=>{
 const events:HealthEvent[]=[{...base,type:'water',data:{kind:'water',volume:650,beverage:'água'}},{...base,type:'water',data:{kind:'water',volume:590,beverage:'outro líquido'}}];
 assert.equal(totals(events).water,650);assert.equal(totals([]).water,undefined);
});
test('nutrition scales grams from a per-100g snapshot and preserves unknown',()=>{
 const event:HealthEvent={...base,type:'meal',data:{kind:'meal',name:'Example',meal_type:'Almoço',hunger:null,satiety:null,items:[{name:'Food',food_id:null,grams:250,nutrition:{calories:100,protein:10,carbs:0,fat:2,saturated_fat:null,fibre:3,sugar:null,sodium:null}}]}};
 assert.equal(totals([event]).calories,250);assert.equal(totals([event]).protein,25);assert.equal(totals([event]).carbs,0);assert.equal(totals([event]).saturated_fat,undefined);
});
test('server validation rejects type mismatch and contradictory quality',()=>{
 const event={...base,type:'water',data:{kind:'water',volume:650,beverage:'água'}};
 assert.equal(eventSchema.safeParse(event).success,true);
 assert.equal(eventSchema.safeParse({...event,type:'checkin'}).success,false);
 assert.equal(eventSchema.safeParse({...event,estimated:true}).success,false);
});
