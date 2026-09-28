import test from 'node:test';
import assert from 'node:assert/strict';
import {appointmentSchema,matchGroup,tennisProfileSchema,upcomingMatches} from '../lib/tennis-club';
import {resources} from '../lib/site-crud';
test('upcoming games exclude cancelled and past times, retain unknown time today',()=>{
 const item=(id:string,date:string,time:string,cancelled=false)=>appointmentSchema.parse({id,date,time,cancelled});
 const result=upcomingMatches([item('old','2026-09-27',''),item('past','2026-09-28','09:00'),item('later','2026-09-29','10:00'),item('next','2026-09-28','18:00'),item('unknown','2026-09-28',''),item('cancelled','2026-09-28','17:00',true)],'2026-09-28','16:00');
 assert.deepEqual(result.map(i=>i.id),['next','unknown','later']);
});
test('match groups do not count doubles league or training as singles league',()=>{
 assert.equal(matchGroup('Duplas · Liga'),'doubles');assert.equal(matchGroup('Treino de duplas'),'training');assert.equal(matchGroup('Simples · Liga'),'league');assert.equal(matchGroup('Amistoso'),'friendly');assert.equal(matchGroup('Sessão de tênis'),'other');
});
test('editable tennis data uses the same schema in MCP and site',()=>{
 const profile=tennisProfileSchema.parse({});assert.equal(profile.racket,'Yonex Vcore 98');assert.equal(profile.sex,'');assert.deepEqual(resources.perfil_tenis.schema.parse(profile),profile);assert.equal(appointmentSchema.safeParse({id:'a',date:'2026-02-30',time:'25:00'}).success,false);
});
