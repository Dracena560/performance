import test from 'node:test';
import assert from 'node:assert/strict';
import { diaryDescription,diarySchema,medicines } from '../lib/diary-fields';

test('new diary check-in preserves multiple selections, notes and exact time',()=>{
 const value=diarySchema.parse({kind:'checkin',occurred_at:'2026-10-03T09:25:00+01:00',mental:['Ativo','Boa clareza'],emotions:['Motivado'],body:['Leve'],digestion:['Sem desconforto'],emotion_notes:'Dia produtivo',body_notes:'Sem dor'});
 assert.deepEqual(value.mental,['Ativo','Boa clareza']);
 assert.equal(value.occurred_at,'2026-10-03T09:25:00+01:00');
 assert.match(diaryDescription(value),/Boa clareza/);
 assert.match(diaryDescription(value),/Dia produtivo/);
});

test('each register kind requires its relevant information',()=>{
 assert.throws(()=>diarySchema.parse({kind:'bowel',occurred_at:'2026-10-03T09:25:00+01:00'}),/Selecione/);
 assert.throws(()=>diarySchema.parse({kind:'water',occurred_at:'2026-10-03T09:25:00+01:00'}),/volume/);
 assert.equal(diarySchema.parse({kind:'vitamins',occurred_at:'2026-10-03T09:25:00+01:00',routines:['Vitaminas do dia']}).routines[0],'Vitaminas do dia');
});

test('medicine catalog displays a composition and does not invent unknown strength',()=>{
 assert.ok(medicines.every(item=>item.composition.length>0));
 assert.match(medicines.find(item=>item.name==='Anadin Flu Max Strength')!.composition,/confirmar/i);
});
