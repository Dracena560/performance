import test from 'node:test';
import assert from 'node:assert/strict';
import { foodCatalog, portion, searchFoods } from '../lib/food-catalog';
import { parseJournalEntry, filterJournal } from '../lib/journal';
import { profileTargets } from '../lib/domain';

const meal=(id:string,at:string,items:any[])=>({id,timestamp:at,local_date:at.slice(0,10),timezone:'Europe/London',type:'meal',source:'ChatGPT',measurement_type:'estimated',estimated:true,notes:'',data:{kind:'meal',name:'x',meal_type:'Lanche',items,hunger:null,satiety:null}}) as any;
const ryvita={food_id:null,name:'Ryvita Dark Rye Crispbread',grams:31.5,nutrition:{calories:349,protein:11,caffeine:0}};

test('catalog joins foods and every eaten item, newest data wins, most used first',()=>{
 const foods=[{id:'f',name:'Skyr natural',brand:'Arla',nutrition:{calories:63,protein:11},favorite:false}] as any;
 const catalog=foodCatalog(foods,[meal('1','2026-10-01T09:00Z',[ryvita]),meal('2','2026-10-28T09:00Z',[{...ryvita,grams:21}])]);
 assert.equal(catalog[0].name,'Ryvita Dark Rye Crispbread');assert.equal(catalog[0].uses,2);assert.equal(catalog[0].grams,21);
 assert.deepEqual(searchFoods(catalog,'arla').map(f=>f.name),['Skyr natural']);
 assert.deepEqual(searchFoods(catalog,'rye ryvita').length,1);
 assert.equal(portion({calories:349},50).calories,174.5);
});

test('journal topics are kept and filterable; caffeine has a 400 mg default limit',()=>{
 const e={id:'a',...parseJournalEntry({occurred_on:'2026-10-30',title:'Culto',topics:['Religião','Religião']})};
 assert.deepEqual(e.topics,['Religião']);
 assert.equal(filterJournal([e],{topic:'religiao'}).length,1);
 assert.equal(profileTargets.caffeine.max,400);
});

import { portionLabel, unitReference, unitsFor } from '../lib/food-units';
test('household measures: typical, from history, and yours first',()=>{
 assert.equal(unitsFor('Pão sourdough',null)[0].label,'fatia');
 assert.equal(unitsFor('Pão sourdough',null)[0].grams,40);
 assert.equal(unitsFor('Azeite de oliva',null)[0].label,'colher de sopa');
 assert.equal(unitsFor('Ryvita Dark Rye Crispbread',10.5)[0].label,'unidade');
 const mine=unitsFor('Pão sourdough',60,[{label:'fatia',plural:'fatias',grams:45}]);
 assert.equal(mine[0].grams,45);assert.ok(mine[0].custom);assert.ok(mine.some(u=>u.label==='porção de costume'));
 assert.equal(portionLabel(2,mine[0]),'2 fatias');assert.equal(portionLabel(0.5,mine[0]),'½ fatia');
 assert.match(unitReference(unitsFor('Banana média',null)),/1 banana média ≈ 118 g/);
 assert.equal(unitsFor('Algo sem regra',null).length,0);
});
