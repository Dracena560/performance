import test from 'node:test';
import assert from 'node:assert/strict';
import {formatSleepDuration} from '../lib/sleep-duration';
test('Apple Health night keeps exact minutes for every stage and total',()=>{
  assert.deepEqual([465,116,306,43,10].map(formatSleepDuration),['7h45','1h56','5h06','43 min','10 min']);
  assert.equal(116+306+43,465); // Awake time is separate from time asleep.
  assert.equal(formatSleepDuration(7.75*60),'7h45');
  assert.equal(formatSleepDuration(null),'—');
  assert.equal(formatSleepDuration(0),'0 min');
  assert.equal(formatSleepDuration(59.8),'1h00');
});

import {sleepData,sleepNights} from '../lib/sleep-data';
import {sleepQuality} from '../lib/sleep-quality';
test('sleep screens share exact units and prefer minute fields over stale rounded hours',()=>{
 const payload={hours:7.8,time_asleep_minutes:465,rem_minutes:116,core_minutes:306,deep_minutes:43,awake_minutes:10};
 assert.deepEqual(sleepData(payload),{total:465,rem:116,core:306,deep:43,awake:10});
 assert.equal(sleepQuality(payload).score,9);
 assert.equal(sleepData({rem_h:2}).rem,120);
 assert.equal(sleepData({sleep:{time_asleep_minutes:465,rem:'1h56'}}).rem,116);
 assert.equal(sleepData({duration_hours:2,deep_minutes:null}).deep,null);
 assert.equal(sleepData({hours:'',rem:'not supplied'}).total,null);
});
test('one night per date: latest sleep entry wins independent of input order and unrelated exercise hours',()=>{
 const row=(id:string,category:string,time:string,payload:Record<string,unknown>)=>({id,category,recorded_on:'2026-09-28',recorded_at:time,payload});
 const old=row('a','sleep','2026-09-28T08:00:00Z',{hours:7});
 const current=row('b','sleep','2026-09-28T09:00:00Z',{time_asleep_minutes:465});
 const aggregate=row('c','daily_metrics','2026-09-28T10:00:00Z',{hours:8});
 const workout=row('d','activity','2026-09-28T11:00:00Z',{duration_hours:2});
 for(const rows of [[old,current,aggregate,workout],[workout,aggregate,current,old]])assert.deepEqual(sleepNights(rows),[current]);
});
