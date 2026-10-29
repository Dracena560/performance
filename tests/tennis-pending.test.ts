import test from 'node:test';
import assert from 'node:assert/strict';
import { pendingMatches, tennisMatchPayload } from '../lib/tennis-pending';
import { getExplicitTennisSets } from '../lib/tennis-session';
import { appointmentSchema } from '../lib/tennis-club';

const players=[{id:'me',name:'Felipe',me:true},{id:'p',name:'Ravi'},{id:'h',name:'Hani'},{id:'s',name:'Satyam'}];
const doubles=appointmentSchema.parse({id:'a1',date:'2026-10-21',time:'19:00',type:'Duplas',partnerId:'p',opponentIds:['h','s']});

test('past doubles game without result is pending with full lineup',()=>{
 const [match]=pendingMatches([doubles],[],players,'Felipe','2026-10-22','09:00');
 assert.equal(match.label,'Felipe & Ravi vs Hani & Satyam');
 assert.equal(match.recordId,null);
});

test('game is not pending before it ends, nor after a result is saved',()=>{
 assert.equal(pendingMatches([doubles],[],players,'Felipe','2026-10-21','19:30').length,0);
 const done={id:'r',recorded_on:'2026-10-21',payload:{appointment_id:'a1',match_type:'Duplas',sets:[{felipe:6,adversario:4}]}};
 assert.equal(pendingMatches([doubles],[done],players,'Felipe','2026-10-22','09:00').length,0);
});

test('same-day record without score is completed instead of duplicated',()=>{
 const watch={id:'w',recorded_on:'2026-10-21',payload:{activity_type:'Tennis',duration_minutes:110}};
 assert.equal(pendingMatches([doubles],[watch],players,'Felipe','2026-10-22','09:00')[0].recordId,'w');
});

test('payload keeps partner apart from opponents and drops empty sets',()=>{
 const {payload}=tennisMatchPayload({date:'2026-10-21',match_type:'Duplas',partner:'Ravi',opponents:['Hani','Satyam'],sets:[{felipe:4,adversario:6},{felipe:7,adversario:3},{felipe:0,adversario:0}]});
 assert.equal(payload.partner,'Ravi');
 assert.equal(payload.opponent_or_partner,'Hani & Satyam');
 assert.deepEqual(payload.sets,[{felipe:4,adversario:6},{felipe:7,adversario:3}]);
 assert.equal(payload.outcome,undefined);
});

test('0–0 slots saved by the old form are not shown as sets',()=>{
 assert.equal(getExplicitTennisSets({payload:{sets:[{felipe:4,adversario:6},{felipe:7,adversario:3},{felipe:0,adversario:0}]}}).length,2);
});

test('a game logged without score is no longer pending; another game the same day still is',()=>{
 const ash=appointmentSchema.parse({id:'ash',date:'2026-10-28',time:'19:00',type:'Simples · Amistoso',opponentId:'a'});
 const craig=appointmentSchema.parse({id:'craig',date:'2026-10-28',time:'19:50',type:'Simples · Amistoso',opponentId:'c'});
 const roster=[...players,{id:'a',name:'Ash'},{id:'c',name:'Craig Tuck'}];
 const logged={id:'r1',recorded_on:'2026-10-28',payload:{match_type:'Simples · Amistoso',opponent_or_partner:'Ash',duration_minutes:50}};
 assert.deepEqual(pendingMatches([ash,craig],[logged],roster,'Felipe','2026-10-29','09:00').map(m=>m.id),['craig']);
 const linked={id:'r2',recorded_on:'2026-10-28',payload:{scheduled_match_id:'craig'}};
 assert.equal(pendingMatches([craig],[linked],roster,'Felipe','2026-10-29','09:00').length,0);
});
