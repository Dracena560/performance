'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Plus, Search, Trash2, X } from 'lucide-react';
import { savePersonalSection } from '@/app/actions';
import { nutrientInfo, nutrients, type MealTemplate, type Nutrition } from '@/lib/domain';
import { portion, searchFoods, type CatalogFood } from '@/lib/food-catalog';
import { portionLabel, unitReference, unitsFor, type FoodUnit, type FoodUnits } from '@/lib/food-units';

const fmt=(v:number|null|undefined,d=1)=>v===null||v===undefined?'—':new Intl.NumberFormat('pt-BR',{maximumFractionDigits:d}).format(v);
const macros=(n:Nutrition)=>`${fmt(n.calories,0)} kcal · P ${fmt(n.protein)} · C ${fmt(n.carbs)} · G ${fmt(n.fat)}`;
type Item=MealTemplate['items'][number];
/** Quantity as typed: `unit` -1 means grams, otherwise an index in the food's measures. */
type Measure={qty:number;unit:number};
const keyOf=(name:string)=>name.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/\s+/g,' ').trim();
const measuresOf=(food:CatalogFood|undefined,name:string,units:FoodUnits)=>unitsFor(food?.name??name,food?.uses?food.grams:null,units[food?.key??keyOf(name)]??[]);

/** Builds a meal from the foods you already eat: search by item or brand, then say how much in slices, spoons… or grams. */
export function FoodPicker({catalog,items,onChange,units={}}:{catalog:CatalogFood[];items:Item[];onChange:(items:Item[])=>void;units?:FoodUnits}){
 const [query,setQuery]=useState('');
 const [measures,setMeasures]=useState<Measure[]>(()=>items.map(item=>({qty:item.grams,unit:-1})));
 const results=useMemo(()=>searchFoods(catalog,query).slice(0,query?40:12),[catalog,query]);
 const foodFor=(item:Item)=>catalog.find(food=>food.key===keyOf(item.name)||keyOf(`${food.name} · ${food.brand}`)===keyOf(item.name))??catalog.find(food=>keyOf(item.name).startsWith(keyOf(food.name)));
 const apply=(index:number,measure:Measure,list=items,unitsList?:FoodUnit[])=>{
  const item=list[index],options=unitsList??measuresOf(foodFor(item),item.name,units),unit=options[measure.unit];
  const grams=unit?Math.round(measure.qty*unit.grams*10)/10:measure.qty;
  const next=list.map((row,i)=>i===index?{...row,grams,portion:unit?portionLabel(measure.qty,unit):undefined}:row);
  setMeasures(current=>{const copy=[...current];copy[index]=measure;return copy;});onChange(next);
 };
 const add=(food:CatalogFood)=>{
  const options=measuresOf(food,food.name,units);
  const item:Item={food_id:food.foodId,name:food.brand&&!food.name.toLowerCase().includes(food.brand.toLowerCase())?`${food.name} · ${food.brand}`:food.name,grams:food.grams||100,nutrition:food.nutrition};
  const list=[...items,item];setQuery('');
  if(options.length){setMeasures(current=>[...current,{qty:1,unit:0}]);apply(list.length-1,{qty:1,unit:0},list,options);}
  else{setMeasures(current=>[...current,{qty:item.grams,unit:-1}]);onChange(list);}
 };
 const remove=(index:number)=>{setMeasures(current=>current.filter((_,i)=>i!==index));onChange(items.filter((_,i)=>i!==index));};
 const total=items.reduce((t,item)=>{const p=portion(item.nutrition,item.grams);for(const k of ['calories','protein','carbs','fat'] as const)t[k]=(t[k]??0)+(p[k]??0);return t;},{} as Nutrition);
 return <div className="food-picker">
  <label className="food-search"><Search size={16}/><input type="search" placeholder={catalog.length?`Buscar entre ${catalog.length} alimentos (item ou marca)`:'Nenhum alimento registrado ainda'} value={query} onChange={e=>setQuery(e.target.value)}/></label>
  {catalog.length>0&&<ul className="food-results">{results.map(food=>{const ref=unitReference(measuresOf(food,food.name,units).slice(0,2));return <li key={food.key}><button type="button" onClick={()=>add(food)}><span><strong>{food.name}</strong>{food.brand&&<em>{food.brand}</em>}<small>{macros(food.nutrition)} por 100 g{food.uses?` · ${food.uses}×`:''}</small>{ref&&<small className="food-ref">{ref}</small>}</span><Plus size={16}/></button></li>;})}{!results.length&&<li className="field-help">Nada encontrado. Peça ao ChatGPT/Claude para registrar este alimento uma vez e ele passa a aparecer aqui.</li>}</ul>}
  {items.length>0&&<div className="food-selected">
   {items.map((item,i)=>{const options=measuresOf(foodFor(item),item.name,units),m=measures[i]??{qty:item.grams,unit:-1};return <div key={i} className="food-selected-row">
    <span><strong>{item.name}</strong><small>{macros(portion(item.nutrition,item.grams))}</small></span>
    <div className="food-amount">
     <input type="number" min="0.1" max="10000" step="any" value={m.qty} aria-label={`Quantidade de ${item.name}`} onChange={e=>apply(i,{...m,qty:Number(e.target.value)||0})}/>
     <select aria-label={`Medida de ${item.name}`} value={m.unit} onChange={e=>{const unit=Number(e.target.value);apply(i,{qty:unit===-1?item.grams:1,unit});}}>{options.map((unit,index)=><option key={unit.label} value={index}>{`${unit.label} (${fmt(unit.grams)} g)`}</option>)}<option value={-1}>gramas</option></select>
     {m.unit!==-1&&<em>= {fmt(item.grams)} g</em>}
    </div>
    <button type="button" className="button icon ghost" aria-label={`Remover ${item.name}`} onClick={()=>remove(i)}><Trash2 size={16}/></button>
   </div>;})}
   <p className="food-total">Total: <b>{macros(total)}</b></p>
  </div>}
 </div>;
}

/** Alimentação › Seus alimentos: every food you eat with nutrients per 100 g and what each measure weighs (editable). */
export function FoodLibrary({catalog,units={},demo=false}:{catalog:CatalogFood[];units?:FoodUnits;demo?:boolean}){
 const router=useRouter();
 const [query,setQuery]=useState(''),[open,setOpen]=useState<string|null>(null),[all,setAll]=useState(false);
 const [mine,setMine]=useState(units),[label,setLabel]=useState(''),[grams,setGrams]=useState(''),[error,setError]=useState('');
 const list=searchFoods(catalog,query);const shown=all||query?list:list.slice(0,15);
 const save=async(next:FoodUnits)=>{setError('');try{if(!demo){await savePersonalSection('food_units',next);router.refresh();}setMine(next);}catch(e){setError((e as Error).message);}};
 return <section className="panel food-library" aria-labelledby="food-library-title">
  <div className="panel-heading"><div><h2 id="food-library-title">Seus alimentos</h2><p className="field-help">{catalog.length} alimentos dos seus registros, com os nutrientes por 100 g e quanto pesa cada medida (fatia, colher…). Ajuste as medidas para ficarem do seu jeito.</p></div></div>
  <label className="food-search"><Search size={16}/><input type="search" placeholder="Buscar por item ou marca" value={query} onChange={e=>setQuery(e.target.value)}/></label>
  <ul className="food-library-list">{shown.map(food=>{const options=measuresOf(food,food.name,mine);return <li key={food.key} className={open===food.key?'open':''}>
   <button type="button" onClick={()=>{setOpen(open===food.key?null:food.key);setLabel('');setGrams('');}} aria-expanded={open===food.key}><span><strong>{food.name}</strong>{food.brand&&<em>{food.brand}</em>}<small>{macros(food.nutrition)}{food.uses?` · usado ${food.uses}×`:''}</small>{options.length>0&&<small className="food-ref">{unitReference(options.slice(0,3))}</small>}</span><ChevronDown size={16} className="expand-arrow"/></button>
   {open===food.key&&<div className="food-detail">
    <div className="food-units"><h4>Medidas</h4>{options.length?<ul>{options.map(unit=><li key={unit.label}><span>1 {unit.label}</span><b>{fmt(unit.grams)} g</b>{unit.custom&&<button type="button" aria-label={`Remover ${unit.label}`} onClick={()=>save({...mine,[food.key]:(mine[food.key]??[]).filter(c=>c.label!==unit.label)})}><X size={13}/></button>}</li>)}</ul>:<p className="field-help">Sem medida típica: use gramas ou crie a sua.</p>}
     <form className="food-unit-add" onSubmit={e=>{e.preventDefault();const g=Number(grams.replace(',','.'));if(!label.trim()||!(g>0))return;save({...mine,[food.key]:[...(mine[food.key]??[]).filter(c=>c.label!==label.trim()),{label:label.trim(),plural:'',grams:g}]});setLabel('');setGrams('');}}>
      <input placeholder="Medida (ex.: fatia)" value={label} onChange={e=>setLabel(e.target.value)} aria-label="Nome da medida"/><input placeholder="gramas" inputMode="decimal" value={grams} onChange={e=>setGrams(e.target.value)} aria-label="Gramas da medida"/><button className="button secondary small" type="submit"><Plus size={14}/>Salvar medida</button>
     </form>{error&&<p className="error">{error}</p>}
    </div>
    <dl>{nutrients.filter(k=>typeof food.nutrition[k]==='number').map(k=><div key={k}><dt>{nutrientInfo[k][0]}</dt><dd>{fmt(food.nutrition[k],2)} {nutrientInfo[k][1]}</dd></div>)}</dl>
   </div>}
  </li>;})}</ul>
  {!query&&list.length>15&&<button className="button secondary small" onClick={()=>setAll(v=>!v)}>{all?'Mostrar menos':`Ver todos os ${list.length}`}</button>}
 </section>;
}
