import test from 'node:test';
import assert from 'node:assert/strict';
import { healthSummary } from '../lib/health-summary';
test('health summary averages the last 7 days and reads body, VO2max and tests',()=>{
 const today='2026-10-06';
 const records=[
  {id:'s1',category:'sleep',recorded_on:'2026-10-05',recorded_at:null,payload:{total_minutes:420}},
  {id:'s2',category:'sleep',recorded_on:'2026-10-06',recorded_at:null,payload:{total_minutes:480}},
  {id:'w1',category:'workout',recorded_on:'2026-10-06',recorded_at:null,payload:{activity_type:'Tennis',duration_minutes:90,watch_effort:6}},
  {id:'b1',category:'body_metrics',recorded_on:'2026-09-01',recorded_at:null,payload:{peso_kg:71.5}},
  {id:'b2',category:'body_metrics',recorded_on:'2026-09-10',recorded_at:null,payload:{'Peso (kg)':70.9,'Gordura (%)':12}}
 ];
 const profile={personal_health_display:{cards:[['VO₂ max','61,2']]},personal_exams:[{id:'e',date:'2026-09-01',title:'Check-up',next:'2026-12-01',results:[{id:'d',name:'Vitamina D',value:20,low:30,high:100}]}]};
 const s=healthSummary({events:[],records,profile,today});
 assert.equal(s.training.minutes,90);assert.equal(s.body.weight,70.9);assert.equal(s.body.fat,12);assert.equal(s.body.change,-0.6);assert.equal(s.body.vo2,'61,2');
 assert.deepEqual(s.tests.out,['Vitamina D']);assert.equal(s.tests.next,'2026-12-01');
});
