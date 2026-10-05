import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seasonRecord,headToHead,honours,leaguePath,initials } from '../lib/tennis-stats';
const m=(id:string,date:string,outcome:string|null,opponent:string|null,sets:[number,number][],type='Simples · Liga',duration:number|null=60,postScore:number|null=7)=>({id,date,type,opponent,outcome,duration,postScore,sets:sets.map(([felipe,adversario])=>({felipe,adversario})),competitive:type!=='Treino'});
const list=[
 m('a','2026-09-01','vitória','Ana',[[6,0],[6,3]]),
 m('b','2026-09-05','derrota','Bruno',[[4,6],[3,6]],'Simples · Amistoso',95,5),
 m('c','2026-09-10','vitória','ana',[[3,6],[6,4],[7,5]]),
 m('d','2026-09-12',null,null,[],'Treino',120,9),
 m('e','2026-09-20','vitória','Carlos',[[6,2],[6,2]],'Duplas'),
];
test('season record counts decided matches, streak, form, sets and games',()=>{
 const r=seasonRecord(list);
 assert.equal(r.wins,3);assert.equal(r.losses,1);assert.equal(r.rate,75);assert.deepEqual(r.streak,{kind:'V',count:2});
 assert.deepEqual(r.form.map(f=>f.result),['V','D','V','V']);assert.equal(r.setsWon,6);assert.equal(r.setsLost,3);assert.equal(r.gamesWon,47);assert.equal(r.gamesLost,34);
 assert.equal(seasonRecord([]).rate,null);assert.equal(seasonRecord([]).streak,null);
});
test('head-to-head groups opponents case-insensitively, most played first',()=>{
 const h=headToHead(list);assert.equal(h[0].opponent,'Ana');assert.equal(h[0].wins,2);assert.equal(h[0].last,'2026-09-10');assert.equal(h.length,3);
});
test('honours board finds personal bests',()=>{
 const b=honours(list);assert.equal(b.bestStreak,2);assert.equal(b.longest?.id,'d');assert.equal(b.rated?.id,'d');assert.equal(b.bagels,1);assert.equal(b.comebacks,1);assert.equal(b.rival?.opponent,'Ana');assert.equal(b.minutes,395);
});
test('league path numbers league matches in date order',()=>{
 assert.deepEqual(leaguePath(list).map(p=>[p.id,p.round]),[['a',1],['c',2]]);
 assert.equal(initials('Exemplo Lima & Exemplo Costa'),'EC');assert.equal(initials('Felipe'),'F');assert.equal(initials(null),'?');
});
import { momentum,courtDays } from '../lib/tennis-stats';
test('momentum gives game difference and running win rate per decided match',()=>{
 const rows=momentum(list);assert.deepEqual(rows.map(r=>[r.id,r.diff,r.rate]),[['a',9,100],['b',-5,50],['c',1,67],['e',8,75]]);
 assert.equal(momentum(list,2).length,2);
});
test('court days sums minutes and sessions per day inside the range',()=>{
 const days=courtDays([...list,m('f','2026-09-12',null,null,[],'Treino',30)],'2026-09-05','2026-09-15');
 assert.deepEqual(days,[{date:'2026-09-05',minutes:95,sessions:1},{date:'2026-09-10',minutes:60,sessions:1},{date:'2026-09-12',minutes:150,sessions:2}]);
});
