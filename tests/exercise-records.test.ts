import test from 'node:test';
import assert from 'node:assert/strict';
import {dailyActivity} from '../lib/daily-activity';
import {exerciseCategory,exercisePayloadSchema,isWorkout,isTennis,secondsDuration} from '../lib/exercise-records';
test('one tennis record is used for both views, daily calories never add workout calories',()=>{
 const tennis={category:'tennis',recorded_on:'2026-09-28',recorded_at:'2026-09-28T20:00:00Z',payload:{active_calories:965,total_calories:1138,duration_seconds:6786}};
 const daily={...tennis,category:'daily_metrics',payload:{active_calories:1425,total_calories:3069,steps:14899,distance_km:9.15,stand_hours:13}};
 assert.equal(isWorkout(tennis),true);assert.equal(isTennis(tennis),true);assert.equal([daily,tennis].filter(isWorkout).length,1);
 assert.equal(dailyActivity([daily,tennis],'2026-09-28').total,3069);assert.equal(dailyActivity([daily,tennis],'2026-09-28').standHours,13);assert.equal(dailyActivity([daily,tennis],'2026-09-29').total,null);
 assert.equal(secondsDuration(6786),'1h 53min 06s');
});
test('MCP separates daily totals, tennis workouts and subjective/watch effort',()=>{
 const value=exercisePayloadSchema.parse({activity_type:'Tênis',watch_effort:1,effort:4,weather:{temperature_c:16},heart_rate_zones:[{zone:5,duration_seconds:0,min_bpm:171}],extra_detail:'preserved'});
 assert.equal(value.effort,4);assert.equal(value.watch_effort,1);assert.equal(value.extra_detail,'preserved');assert.equal(exerciseCategory(value),'tennis');assert.equal(exerciseCategory({...value,kind:'daily_metrics'}),'daily_metrics');assert.equal(exercisePayloadSchema.safeParse({duration_seconds:-1}).success,false);
});
