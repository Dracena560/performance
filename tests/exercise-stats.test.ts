import test from 'node:test';
import assert from 'node:assert/strict';
import { activityName,weeklyByActivity,totalsByActivity,zoneMinutes,recovery,tennisDetails } from '../lib/exercise-stats';
const s=(date:string,type:string,duration:number,payload:Record<string,unknown>={})=>({date,type,duration,active:duration*5,heart:120,payload});
test('exercise stats group activities, weeks, zones, recovery and tennis details',()=>{
 assert.equal(activityName('Outdoor Walk'),'Caminhada');assert.equal(activityName('Tennis'),'Tênis');
 const list=[s('2026-09-29','Tennis',129,{heart_rate_zones:[{zone:1,duration_seconds:4915},{zone:5,duration_seconds:26}],post_workout_heart_rate:[{elapsed_minutes:0,bpm:106},{elapsed_minutes:1,bpm:85},{elapsed_minutes:2,bpm:92}],tennis_stats:{aces:3}}),s('2026-10-05','Outdoor Walk',40),s('2026-10-06','Caminhada',20)];
 const w=weeklyByActivity(list,'2026-10-06',2);assert.deepEqual(w.weeks,['2026-09-28','2026-10-05']);assert.deepEqual(w.minutes['Caminhada'],[0,60]);assert.deepEqual(w.minutes['Tênis'],[129,0]);
 assert.equal(totalsByActivity(list)[0].type,'Tênis');assert.equal(totalsByActivity(list)[1].count,2);
 assert.deepEqual(zoneMinutes(list,'2026-09-01').minutes,[82,0,0,0,0]);
 assert.deepEqual(recovery(list)[0],{date:'2026-09-29',type:'Tênis',start:106,drop1:21,drop2:14});
 assert.equal(tennisDetails(list)[0].values.aces,3);
});
