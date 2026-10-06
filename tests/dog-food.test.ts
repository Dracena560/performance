import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareDogMeal,prepareFoodBag,prepareDogActivity,mealTotals,nutrientSources,walksFromWorkouts,activityByDay,energyNeed } from '../lib/dog-food';
test('Caju food: bag nutrients fill meal items, totals per 100 g and sources',()=>{
 const bag=prepareFoodBag({brand:'Marca',product:'Adulto',per100g:{calories:370,protein:26,calcium:1200},add_photos:[{url:'data:image/jpeg;base64,AA',caption:'Saco'}]},[]);
 assert.equal(bag.id,'bag-marca-adulto');assert.equal(bag.photos.length,1);
 const again=prepareFoodBag({brand:'Marca',product:'Adulto',per100g:{fat:14},add_photos:[{url:'data:image/jpeg;base64,BB',caption:'Tabela'}]},[bag]);
 assert.equal(again.photos.length,2);assert.equal(again.per100g.calories,370);assert.equal(again.per100g.fat,14);
 const meal=prepareDogMeal({occurred_at:'2026-10-06T07:30:00Z',name:'Café da manhã',items:[{food_id:'bag-marca-adulto',grams:110},{name:'Cenoura',grams:30,nutrition:{calories:41}}]},[again]);
 assert.equal(meal.date,'2026-10-06');assert.equal(meal.items[0].name,'Marca Adulto');
 const t=mealTotals([meal]);assert.equal(t.grams,140);assert.equal(t.totals.calories,419.3);assert.equal(t.totals.calcium,1320);
 assert.equal(nutrientSources([meal],'calories')[0].food,'Marca Adulto');
});
test('Caju activity: my Outdoor Walks join his day, plus what was sent for him',()=>{
 const walks=walksFromWorkouts([{id:'w',category:'workout',recorded_on:'2026-10-06',payload:{activity_type:'Outdoor Walk',duration_minutes:41,distance_km:4.1}},{id:'t',category:'workout',recorded_on:'2026-10-06',payload:{activity_type:'Tennis',duration_minutes:90}}]);
 assert.equal(walks.length,1);
 const extra=prepareDogActivity({date:'2026-10-06',kind:'Parque',minutes:25});assert.equal(extra.withMe,true);
 const day=activityByDay([extra],walks,'2026-10-06',2).at(-1)!;assert.deepEqual([day.walks,day.other,day.km],[41,25,4.1]);
 assert.equal(energyNeed(14.6),710);
});
