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
