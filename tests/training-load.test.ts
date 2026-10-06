import test from 'node:test';
import assert from 'node:assert/strict';
import { weeklyLoad,loadAdvice } from '../lib/training-load';
test('weekly load multiplies minutes by effort and compares the week with the 4 previous weeks',()=>{
 const sessions=[...[0,1,2,3].map(w=>({date:`2026-09-${String(8+w*7).padStart(2,'0')}`,duration:60,effort:5})),{date:'2026-10-06',duration:60,effort:10},{date:'2026-10-07',duration:30,effort:null}];
 const rows=weeklyLoad(sessions,'2026-10-07',5);
 assert.deepEqual(rows.map(r=>r.load),[300,300,300,300,750]);
 assert.equal(rows.at(-1)!.chronic,300);assert.equal(rows.at(-1)!.ratio,2.5);assert.equal(rows.at(-1)!.estimated,true);assert.equal(rows[0].chronic,null);
 assert.equal(loadAdvice(2.5).level,'Pico de carga');assert.equal(loadAdvice(1).level,'Faixa ideal');assert.equal(loadAdvice(null).level,'Sem base');
});
