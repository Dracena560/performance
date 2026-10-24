import test from 'node:test';
import assert from 'node:assert/strict';
import { napStats, napsFromRecords } from '../lib/naps';
import { sleepNights } from '../lib/sleep-data';

const record=(id:string,date:string,minutes:number,feeling='')=>({id,category:'checkin_history',recorded_on:date,recorded_at:`${date}T14:00:00Z`,payload:{record_type:'nap',nap_minutes:minutes,woke_feeling:feeling}});

test('naps come from Registrar records and never become nights',()=>{
 const rows=[record('a','2026-10-24',20,'Descansado'),record('b','2026-10-20',40,'Grogue'),{id:'c',category:'checkin_history',recorded_on:'2026-10-24',recorded_at:null,payload:{record_type:'checkin'}}];
 assert.deepEqual(napsFromRecords(rows).map(n=>n.id),['a','b']);
 assert.equal(sleepNights(rows).length,0);
});

test('weekly nap numbers',()=>{
 const naps=napsFromRecords([record('a','2026-10-24',20,'Descansado'),record('b','2026-10-20',40,'Descansado'),record('c','2026-10-10',90)]);
 assert.deepEqual(napStats(naps,'2026-10-24'),{count:2,total:60,average:30,days:2,feeling:'Descansado'});
});
