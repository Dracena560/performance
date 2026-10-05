import { test } from 'node:test';
import assert from 'node:assert/strict';
import { choiceScores,numericScores,dayEntries,weekEvolution,overall } from '../lib/day-log';
const date='2026-10-05';
const events=[
 {id:'e1',type:'checkin',timestamp:'2026-10-05T16:03:00Z',local_date:date,notes:'',data:{kind:'checkin',preset:'Check-in geral',scores:{motivation:9,stress:2,energy:null}}},
 {id:'e2',type:'water',timestamp:'2026-10-05T08:00:00Z',local_date:date,notes:'',data:{kind:'water',volume:650,beverage:'água'}},
 {id:'e3',type:'water',timestamp:'2026-10-04T08:00:00Z',local_date:'2026-10-04',notes:'',data:{kind:'water',volume:590,beverage:'água'}},
];
const records=[
 {id:'r1',category:'checkin_history',recorded_on:date,recorded_at:'2026-10-05T09:00:00Z',payload:{record_type:'checkin',mental:['Turbo','Boa clareza'],emotions:['Ansioso'],body:['Leve'],digestion:[],notes:'manhã'}},
 {id:'r2',category:'supplement',recorded_on:date,recorded_at:'2026-10-05T07:05:00Z',payload:{record_type:'vitamins',routines:['Vitaminas do dia']}},
 {id:'r3',category:'checkin_history',recorded_on:date,recorded_at:'2026-10-05T12:30:00Z',payload:{record_type:'activity',activities:['Leitura'],interest:'Alta'}},
 {id:'r4',category:'sleep',recorded_on:date,recorded_at:null,payload:{hours:7}},
];
test('Registrar choices and numeric check-ins become the same 0–10 dimensions',()=>{
 assert.deepEqual(choiceScores(records[0].payload),{mente:9.5,humor:3,corpo:8});
 assert.deepEqual(numericScores({motivation:9,stress:2,energy:null}),{humor:8.5});
 assert.equal(overall({mente:9.5,humor:3,corpo:8}),6.8);
});
test('the day log lists every Registrar item and event in time order, skipping other records',()=>{
 const log=dayEntries(events,records,date);
 assert.deepEqual(log.map(e=>e.kind),['vitamins','water','checkin','activity','checkin']);
 assert.deepEqual(log.find(e=>e.id==='r3')?.details,['Leitura','Alta']);
 assert.equal(log.find(e=>e.id==='r1')?.notes,'manhã');
});
test('week evolution counts items and averages wellbeing per day',()=>{
 const week=weekEvolution(events,records,date,2);
 assert.equal(week[0].date,'2026-10-04');assert.equal(week[0].count,1);assert.equal(week[0].water,590);assert.equal(week[0].wellbeing,null);
 assert.equal(week[1].count,5);assert.equal(week[1].byKind.checkin,2);assert.equal(week[1].wellbeing,7.7);
});
import { supplementIntake,foodContributions,dimensionAverages,wellbeingAndSleep } from '../lib/day-log';
test('supplements from the Registrar routines and from the MCP list, one row per supplement',()=>{
 const recs=[...records,{id:'r5',category:'supplement',recorded_on:date,recorded_at:'2026-10-05T21:00:00Z',payload:{period:'noite',items:['Magnésio'],notes:'antes de dormir'}}];
 const list=supplementIntake(recs,date);assert.ok(list.some(s=>s.name==='Vitamina D'));assert.equal(list.find(s=>s.name==='Magnésio')?.notes[0],'antes de dormir');
 const log=dayEntries(events,recs,date);assert.deepEqual(log.find(e=>e.id==='r5')?.details,['Magnésio']);
});
test('only foods with a relevant share of a nutrient are listed',()=>{
 const meal={id:'m',type:'meal',timestamp:'2026-10-05T12:00:00Z',local_date:date,data:{kind:'meal',name:'Almoço',items:[{name:'Laranja',grams:200,nutrition:{vitamin_c:50}},{name:'Arroz',grams:100,nutrition:{vitamin_c:1}},{name:'Brócolis',grams:100,nutrition:{vitamin_c:40}}]}};
 const r=foodContributions([meal],date,'vitamin_c');assert.equal(r.total,141);assert.deepEqual(r.items.map(i=>i.food),['Laranja','Brócolis']);
});
test('dimension averages and wellbeing beside the night of sleep',()=>{
 const log=dayEntries(events,records,date);assert.deepEqual(dimensionAverages(log),{mente:9.5,humor:5.8,corpo:8});
 const rows=wellbeingAndSleep(events,[...records,{id:'s',category:'sleep',recorded_on:date,recorded_at:null,payload:{time_asleep_minutes:450}}],date,2);assert.equal(rows[1].sleep,7);assert.equal(rows[1].wellbeing,7.7);assert.equal(rows[0].sleep,null);
});
