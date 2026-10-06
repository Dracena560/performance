import test from 'node:test';
import assert from 'node:assert/strict';
import { number,seconds,kilometres,dateTime,shortcutWorkout } from '../lib/apple-shortcut';
test('numbers, durations, distances and dates as Shortcuts send them',()=>{
 assert.equal(number('1,075 kcal'),1075);assert.equal(number('7,9'),7.9);assert.equal(number('1.234,5'),1234.5);assert.equal(number('0,4 g'),0.4);
 assert.equal(seconds('2:09:06'),7746);assert.equal(seconds('1h 23min'),4980);assert.equal(seconds('83 min'),4980);assert.equal(seconds(45),2700);assert.equal(seconds(7746),7746);
 assert.equal(kilometres('4.1 km'),4.1);assert.equal(kilometres('4100 m'),4.1);assert.equal(kilometres('2 mi'),3.22);
 assert.equal(dateTime('2026-09-29T19:36:00+01:00'),'2026-09-29T18:36:00.000Z');
 assert.equal(dateTime('29/09/2026 19:36'),'2026-09-29T18:36:00.000Z');
 assert.equal(dateTime('29 Sep 2026 at 19:36'),'2026-09-29T18:36:00.000Z');
 assert.equal(dateTime('29 de set. de 2026 19:36'),'2026-09-29T18:36:00.000Z');
 assert.equal(dateTime('15/01/2026 10:00'),'2026-01-15T10:00:00.000Z');
});
test('a football workout from the Shortcut becomes a workout payload',()=>{
 const w=shortcutWorkout({tipo:'Futebol',inicio:'2026-10-06T19:00:00+01:00',fim:'2026-10-06T20:15:00+01:00',calorias_ativas:'820 kcal',distancia:'6,3 km',frequencia_cardiaca:'120\n150\n171\n133',dados:'Treino de Futebol'});
 assert.equal(w.date,'2026-10-06');
 assert.deepEqual([w.data.activity_type,w.data.duration_seconds,w.data.active_calories,w.data.distance_km,w.data.heart_rate_average,w.data.heart_rate_max],['Futebol',4500,820,6.3,144,171]);
 const onlyEnd=shortcutWorkout({type:'Outdoor Walk',duration:'41 min',end:'2026-10-06T08:41:00+01:00'});
 assert.equal(onlyEnd.data.started_at,'2026-10-06T07:00:00.000Z');
});
import { fromHealthAutoExport } from '../lib/apple-shortcut';
test('Health Auto Export workouts are understood',()=>{
 const list=fromHealthAutoExport({data:{workouts:[{name:'Soccer',start:'2026-10-06 19:00:00 +0100',end:'2026-10-06 20:15:00 +0100',duration:4500,activeEnergyBurned:{qty:820.4,units:'kcal'},distance:{qty:6.3,units:'km'},heartRate:{avg:{qty:144},max:{qty:176},min:{qty:88}},stepCount:[{qty:5000},{qty:3200}]}]}})!;
 const w=shortcutWorkout(list[0]);
 assert.deepEqual([w.date,w.data.activity_type,w.data.started_at,w.data.duration_seconds,w.data.active_calories,w.data.distance_km,w.data.heart_rate_max,w.data.steps],['2026-10-06','Soccer','2026-10-06T18:00:00.000Z',4500,820.4,6.3,176,8200]);
});
test('lists of Health samples from the Shortcut are summed or averaged',()=>{
 const w=shortcutWorkout({tipo:'Futebol',fim:'2026-10-06T20:15:00+01:00',calorias_ativas:['12.5 kcal','10 kcal','7.5 kcal'],distancia:['0.5 km','0,7 km'],frequencia_cardiaca:['120 count/min','160 count/min'],passos:'300\n500'});
 assert.deepEqual([w.data.active_calories,w.data.distance_km,w.data.heart_rate_average,w.data.heart_rate_max,w.data.steps],[30,1.2,140,160,800]);
});
