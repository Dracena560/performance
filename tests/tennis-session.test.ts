import test from 'node:test';
import assert from 'node:assert/strict';
import { getExplicitTennisScore,getTennisOutcome,isCompetitiveTennisMatch,normalizeTennisSessionType } from '../lib/tennis-session';

const record=(payload:Record<string,unknown>)=>({payload});

test('training records never infer scores or outcomes from numeric narrative',()=>{
 for(const sample of [
  record({'Tipo de sessão':'Treino',analysis:'FC 158 bpm; Z4 38:23 e Z5 20:42'}),
  record({'Tipo informado':'Treino',analysis:'Apple Watch 17:34–19:18; duração 103.6 min'}),
  record({type:'Treino',score:'2-20',outcome:'derrota'}),
 ]){
  assert.equal(normalizeTennisSessionType(sample),'Treino');
  assert.equal(getExplicitTennisScore(sample),null);
  assert.equal(getTennisOutcome(sample),null);
  assert.equal(isCompetitiveTennisMatch(sample),false);
 }
});

test('explicit friendly Hani sets remain a win with score',()=>{
 const hani=record({match_type:'Simples · Amistoso',opponent_or_partner:'Hani',sets:[{felipe:6,adversario:2},{felipe:6,adversario:0}]});
 assert.equal(normalizeTennisSessionType(hani),'Simples · Amistoso');
 assert.equal(getExplicitTennisScore(hani),'6–2, 6–0');
 assert.equal(getTennisOutcome(hani),'vitória');
 assert.equal(isCompetitiveTennisMatch(hani),true);
});

test('league games retain explicit result and missing score remains absent',()=>{
 const league=record({match_type:'Jogo da liga',score:'6-4, 4-6, 10-8',outcome:'Vitória'});
 assert.equal(normalizeTennisSessionType(league),'Simples · Liga');
 assert.equal(getExplicitTennisScore(league),'6–4, 4–6, 10–8');
 assert.equal(getTennisOutcome(league),'vitória');
 const unknown=record({match_type:'Jogo amistoso',analysis:'FC 134-19 em zona'});
 assert.equal(getExplicitTennisScore(unknown),null);
 assert.equal(getTennisOutcome(unknown),null);
});
