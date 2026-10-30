import type { Food, HealthEvent, Nutrition } from './domain';

/** One food you eat: from the foods table or from any meal already registered (by you or by the AI). Values are per 100 g. */
export type CatalogFood={key:string;name:string;brand:string;foodId:string|null;nutrition:Nutrition;grams:number;uses:number;lastUsed:string};

const normalize=(value:string)=>value.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/\s+/g,' ').trim();

/** Every distinct food, most used first; the latest registration of a food wins (its nutrients and usual portion). */
export function foodCatalog(foods:Food[],events:HealthEvent[]):CatalogFood[]{
 const map=new Map<string,CatalogFood>();
 for(const food of foods){const key=normalize(`${food.name} ${food.brand}`);map.set(key,{key,name:food.name,brand:food.brand,foodId:food.id,nutrition:food.nutrition,grams:100,uses:0,lastUsed:''});}
 const meals=[...events].filter(event=>event.data.kind==='meal').sort((a,b)=>a.timestamp.localeCompare(b.timestamp));
 for(const event of meals){if(event.data.kind!=='meal')continue;for(const item of event.data.items){
  const known=item.food_id?foods.find(food=>food.id===item.food_id):undefined;
  const key=known?normalize(`${known.name} ${known.brand}`):normalize(item.name);if(!key)continue;
  const current=map.get(key);
  map.set(key,{key,name:known?.name??current?.name??item.name,brand:known?.brand??current?.brand??'',foodId:known?.id??current?.foodId??null,nutrition:{...(current?.nutrition??{}),...item.nutrition},grams:item.grams,uses:(current?.uses??0)+1,lastUsed:event.timestamp});
 }}
 return [...map.values()].sort((a,b)=>b.uses-a.uses||b.lastUsed.localeCompare(a.lastUsed)||a.name.localeCompare(b.name,'pt-BR'));
}

/** Search by item or brand: every typed word must appear, accents ignored. */
export function searchFoods(catalog:CatalogFood[],query:string){
 const words=normalize(query).split(' ').filter(Boolean);
 return words.length?catalog.filter(food=>{const text=normalize(`${food.name} ${food.brand}`);return words.every(word=>text.includes(word));}):catalog;
}

/** Nutrients of a portion (values per 100 g × grams). */
export function portion(nutrition:Nutrition,grams:number){
 return Object.fromEntries(Object.entries(nutrition).map(([key,value])=>[key,typeof value==='number'?Math.round(value*grams)/100:null])) as Nutrition;
}
