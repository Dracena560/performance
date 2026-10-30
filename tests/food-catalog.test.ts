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
