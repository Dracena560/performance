import { z } from 'zod';
import { dateValue } from './date-value';

/** Nutrients printed on dog food bags, always stored per 100 g of food (GPT converts % and mg/kg). */
export const dogNutrients=[
 ['calories','Energia','kcal'],['protein','Proteína','g'],['fat','Gordura','g'],['carbs','Carboidratos','g'],['fibre','Fibra','g'],['ash','Matéria mineral','g'],['moisture','Umidade','g'],
 ['calcium','Cálcio','mg'],['phosphorus','Fósforo','mg'],['sodium','Sódio','mg'],['potassium','Potássio','mg'],['magnesium','Magnésio','mg'],['iron','Ferro','mg'],['zinc','Zinco','mg'],['copper','Cobre','mg'],
 ['omega3','Ômega-3','g'],['omega6','Ômega-6','g'],['vitamin_a','Vitamina A','UI'],['vitamin_d3','Vitamina D3','UI'],['vitamin_e','Vitamina E','mg'],['vitamin_c','Vitamina C','mg'],
 ['glucosamine','Glucosamina','mg'],['chondroitin','Condroitina','mg'],['taurine','Taurina','mg']
] as const;
export type DogNutrient=typeof dogNutrients[number][0];
export const dogMacro=['calories','protein','fat','carbs','fibre'] as const;
const nutrition=z.record(z.enum(dogNutrients.map(n=>n[0]) as [DogNutrient,...DogNutrient[]]),z.number().finite().nonnegative().nullable()).default({});

const id=z.string().min(1).max(100);
const requiredDate=dateValue.refine(v=>v!=='','Data obrigatória');
export const photoSchema=z.object({url:z.string().max(400000),caption:z.string().max(200).default('')});
export const foodBagSchema=z.object({
 id,brand:z.string().trim().min(1).max(120),product:z.string().max(200).default(''),
 type:z.enum(['Ração seca','Ração úmida','Petisco','Natural','Suplemento','Outro']).default('Ração seca'),
 sizeKg:z.number().finite().positive().max(100).nullable().default(null),price:z.number().finite().nonnegative().nullable().default(null),
 started:dateValue.default(''),finished:dateValue.default(''),active:z.boolean().default(true),
 per100g:nutrition,ingredients:z.string().max(10000).default(''),analysis:z.string().max(5000).default(''),additives:z.string().max(5000).default(''),
 feedingGuide:z.string().max(3000).default(''),notes:z.string().max(5000).default(''),photos:z.array(photoSchema).max(8).default([])
});
export const dogMealItemSchema=z.object({name:z.string().trim().min(1).max(200),grams:z.number().finite().positive().max(5000),foodId:z.string().max(100).default(''),nutrition});
export const dogMealSchema=z.object({id,at:z.string().datetime({offset:true}),date:requiredDate,name:z.string().max(120).default('Refeição'),items:z.array(dogMealItemSchema).min(1).max(30),notes:z.string().max(3000).default(''),source:z.string().max(60).default('manual')});
export const dogActivitySchema=z.object({id,date:requiredDate,kind:z.enum(['Passeio','Corrida','Brincadeira','Parque','Natação','Treino','Outro']).default('Passeio'),minutes:z.number().finite().nonnegative().max(1440),distanceKm:z.number().finite().nonnegative().max(200).nullable().default(null),steps:z.number().int().nonnegative().nullable().default(null),withMe:z.boolean().default(true),notes:z.string().max(2000).default(''),source:z.string().max(60).default('manual')});
export type FoodBag=z.infer<typeof foodBagSchema>;
export type DogMeal=z.infer<typeof dogMealSchema>;
export type DogActivity=z.infer<typeof dogActivitySchema>;
type Nutrition=Partial<Record<DogNutrient,number|null>>;

/** Items that point to a bag take the bag's nutrition when they were sent without their own. */
export function withBagNutrition(items:z.infer<typeof dogMealItemSchema>[],bags:FoodBag[]){
 return items.map(i=>{const bag=i.foodId?bags.find(b=>b.id===i.foodId):undefined;return bag&&!Object.keys(i.nutrition).length?{...i,nutrition:bag.per100g}:i;});
}
/** Totals of a list of meals (nutrition is per 100 g, so value × grams / 100). */
export function mealTotals(meals:DogMeal[]){
 const out:Partial<Record<DogNutrient,number>>={};let grams=0;
 for(const m of meals)for(const i of m.items){grams+=i.grams;for(const [k,v] of Object.entries(i.nutrition as Nutrition))if(typeof v==='number')out[k as DogNutrient]=(out[k as DogNutrient]??0)+v*i.grams/100;}
 return {grams:Math.round(grams),totals:Object.fromEntries(Object.entries(out).map(([k,v])=>[k,Math.round(v!*10)/10])) as Partial<Record<DogNutrient,number>>};
}
/** Which foods gave a nutrient on a day (for the "de onde veio" list). */
export function nutrientSources(meals:DogMeal[],key:DogNutrient){
 const rows=meals.flatMap(m=>m.items.map(i=>({food:i.name,meal:m.name,at:m.at,amount:typeof i.nutrition[key]==='number'?(i.nutrition[key] as number)*i.grams/100:0}))).filter(r=>r.amount>0);
 const total=rows.reduce((t,r)=>t+r.amount,0);return rows.map(r=>({...r,share:total?r.amount/total:0})).sort((a,b)=>b.amount-a.amount);
}

type WalkRecord={id:string;category:string;recorded_on:string;payload:Record<string,unknown>};
const num=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?v:typeof v==='string'&&v.trim()&&!Number.isNaN(Number(v))?Number(v):null;
/** My Outdoor Walk workouts, which Caju always joins. */
export function walksFromWorkouts(records:WalkRecord[]):DogActivity[]{
 return records.filter(r=>['workout','activity'].includes(r.category)&&/outdoor\s*walk|caminhada|walk/i.test(String(r.payload.activity_type??r.payload.type??r.payload.workout_name??''))&&r.payload.with_caju!==false).map(r=>{
  const p=r.payload;const minutes=num(p.duration_minutes)??(num(p.duration_seconds)!==null?num(p.duration_seconds)!/60:0);
  return {id:`walk-${r.id}`,date:r.recorded_on,kind:'Passeio' as const,minutes:Math.round(minutes),distanceKm:num(p.distance_km),steps:num(p.steps),withMe:true,notes:'Caminhada registrada no Apple Watch',source:'workout'};});
}
/** Per-day activity for the last `days` days: walks from workouts plus what was sent for Caju. */
export function activityByDay(activities:DogActivity[],walks:DogActivity[],today:string,days=30){
 const all=[...walks,...activities];
 return Array.from({length:days},(_,i)=>{const date=new Date(Date.parse(today+'T12:00:00Z')-(days-1-i)*86400000).toISOString().slice(0,10);const list=all.filter(a=>a.date===date);
  return {date,walks:Math.round(list.filter(a=>a.source==='workout').reduce((t,a)=>t+a.minutes,0)),other:Math.round(list.filter(a=>a.source!=='workout').reduce((t,a)=>t+a.minutes,0)),km:Math.round(list.reduce((t,a)=>t+(a.distanceKm??0),0)*10)/10,count:list.length};});
}
/** Rough daily energy need of an adult dog: 95 × kg^0.75 (moderately active). */
export const energyNeed=(kg:number|null)=>kg?Math.round(95*Math.pow(kg,0.75)):null;

const slug=(v:string)=>v.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'item';
const londonDate=(iso:string)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(iso));
/** Builds a meal from what the page or ChatGPT sends; bag items take the bag's nutrition; same id replaces. */
export function prepareDogMeal(input:Record<string,any>,bags:FoodBag[]):DogMeal{
 const at=String(input.at??input.occurred_at??new Date().toISOString());
 const items=withBagNutrition((Array.isArray(input.items)?input.items:[]).map((i:any)=>{const bag=i.foodId||i.food_id?bags.find(b=>b.id===(i.foodId??i.food_id)):undefined;return {name:i.name??(bag?[bag.brand,bag.product].filter(Boolean).join(' '):'Alimento'),grams:Number(i.grams),foodId:i.foodId??i.food_id??'',nutrition:i.nutrition??{}};}),bags);
 return dogMealSchema.parse({id:input.id||`meal-${at.slice(0,16).replace(/[^0-9]/g,'')}-${slug(String(input.name??'refeicao'))}`,at,date:londonDate(at),name:input.name||'Refeição',items,notes:input.notes??'',source:input.source??'manual'});
}
export function prepareDogActivity(input:Record<string,any>):DogActivity{
 const date=String(input.date);return dogActivitySchema.parse({...input,id:input.id||`act-${date}-${slug(String(input.kind??'passeio'))}-${Math.round(Number(input.minutes)||0)}`,minutes:Number(input.minutes)||0,distanceKm:input.distanceKm??input.distance_km??null,withMe:input.withMe??input.with_me??true});
}
export function prepareFoodBag(input:Record<string,any>,bags:FoodBag[]):FoodBag{
 const found=bags.find(b=>b.id===input.id)??bags.find(b=>!input.id&&b.brand.toLowerCase()===String(input.brand??'').toLowerCase()&&b.product.toLowerCase()===String(input.product??'').toLowerCase());
 const photos=[...(found?.photos??[]),...(Array.isArray(input.add_photos)?input.add_photos:[])].slice(-8);
 return foodBagSchema.parse({...found,...input,id:found?.id??input.id??`bag-${slug(`${input.brand} ${input.product??''}`)}`,per100g:{...(found?.per100g??{}),...(input.per100g??{})},photos:input.photos??photos});
}
const replace=<T extends {id:string}>(list:T[],item:T)=>list.some(x=>x.id===item.id)?list.map(x=>x.id===item.id?item:x):[...list,item];
export function upsertById<T extends {id:string}>(list:T[],item:T){return replace(list,item);}
