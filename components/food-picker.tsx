'use client';
import { useMemo, useState } from 'react';
import { ChevronDown, Plus, Search, Trash2 } from 'lucide-react';
import { nutrientInfo, nutrients, type MealTemplate, type Nutrition } from '@/lib/domain';
import { portion, searchFoods, type CatalogFood } from '@/lib/food-catalog';

const fmt=(v:number|null|undefined,d=1)=>v===null||v===undefined?'—':new Intl.NumberFormat('pt-BR',{maximumFractionDigits:d}).format(v);
const macros=(n:Nutrition)=>`${fmt(n.calories,0)} kcal · P ${fmt(n.protein)} · C ${fmt(n.carbs)} · G ${fmt(n.fat)}`;
type Item=MealTemplate['items'][number];

/** Builds a meal from the foods you already eat: search by item or brand, pick, set the grams. */
export function FoodPicker({catalog,items,onChange}:{catalog:CatalogFood[];items:Item[];onChange:(items:Item[])=>void}){
 const [query,setQuery]=useState('');
 const results=useMemo(()=>searchFoods(catalog,query).slice(0,query?40:12),[catalog,query]);
 const add=(food:CatalogFood)=>{onChange([...items,{food_id:food.foodId,name:food.brand&&!food.name.toLowerCase().includes(food.brand.toLowerCase())?`${food.name} · ${food.brand}`:food.name,grams:food.grams||100,nutrition:food.nutrition}]);setQuery('');};
 const total=items.reduce((t,item)=>{const p=portion(item.nutrition,item.grams);for(const k of ['calories','protein','carbs','fat'] as const)t[k]=(t[k]??0)+(p[k]??0);return t;},{} as Nutrition);
 return <div className="food-picker">
  <label className="food-search"><Search size={16}/><input type="search" placeholder={catalog.length?`Buscar entre ${catalog.length} alimentos (item ou marca)`:'Nenhum alimento registrado ainda'} value={query} onChange={e=>setQuery(e.target.value)}/></label>
  {catalog.length>0&&<ul className="food-results">{results.map(food=><li key={food.key}><button type="button" onClick={()=>add(food)}><span><strong>{food.name}</strong>{food.brand&&<em>{food.brand}</em>}<small>{macros(food.nutrition)} por 100 g{food.uses?` · ${food.uses}×`:''}</small></span><Plus size={16}/></button></li>)}{!results.length&&<li className="field-help">Nada encontrado. Peça ao ChatGPT/Claude para registrar este alimento uma vez e ele passa a aparecer aqui.</li>}</ul>}
  {items.length>0&&<div className="food-selected">
   {items.map((item,i)=><div key={i} className="food-selected-row"><span><strong>{item.name}</strong><small>{macros(portion(item.nutrition,item.grams))}</small></span><label><input type="number" min="0.1" max="10000" step="any" value={item.grams} aria-label={`Gramas de ${item.name}`} onChange={e=>onChange(items.map((row,j)=>j===i?{...row,grams:Number(e.target.value)||0}:row))}/><em>g</em></label><button type="button" className="button icon ghost" aria-label={`Remover ${item.name}`} onClick={()=>onChange(items.filter((_,j)=>j!==i))}><Trash2 size={16}/></button></div>)}
   <p className="food-total">Total: <b>{macros(total)}</b></p>
  </div>}
 </div>;
}

/** Alimentação › Seus alimentos: every food you eat with its nutrients per 100 g. */
export function FoodLibrary({catalog}:{catalog:CatalogFood[]}){
 const [query,setQuery]=useState(''),[open,setOpen]=useState<string|null>(null),[all,setAll]=useState(false);
 const list=searchFoods(catalog,query);const shown=all||query?list:list.slice(0,15);
 return <section className="panel food-library" aria-labelledby="food-library-title">
  <div className="panel-heading"><div><h2 id="food-library-title">Seus alimentos</h2><p className="field-help">{catalog.length} alimentos dos seus registros, com os nutrientes por 100 g. Use em Registrar refeição para montar o prato sem a IA.</p></div></div>
  <label className="food-search"><Search size={16}/><input type="search" placeholder="Buscar por item ou marca" value={query} onChange={e=>setQuery(e.target.value)}/></label>
  <ul className="food-library-list">{shown.map(food=><li key={food.key} className={open===food.key?'open':''}>
   <button type="button" onClick={()=>setOpen(open===food.key?null:food.key)} aria-expanded={open===food.key}><span><strong>{food.name}</strong>{food.brand&&<em>{food.brand}</em>}<small>{macros(food.nutrition)}{food.uses?` · usado ${food.uses}×, porção ${fmt(food.grams,0)} g`:''}</small></span><ChevronDown size={16} className="expand-arrow"/></button>
   {open===food.key&&<dl>{nutrients.filter(k=>typeof food.nutrition[k]==='number').map(k=><div key={k}><dt>{nutrientInfo[k][0]}</dt><dd>{fmt(food.nutrition[k],2)} {nutrientInfo[k][1]}</dd></div>)}</dl>}
  </li>)}</ul>
  {!query&&list.length>15&&<button className="button secondary small" onClick={()=>setAll(v=>!v)}>{all?'Mostrar menos':`Ver todos os ${list.length}`}</button>}
 </section>;
}
