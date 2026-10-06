'use client';
import {useState} from 'react';
import {Activity,Camera,ChevronRight,Footprints,ImagePlus,Package,Pencil,Plus,Trash2,UtensilsCrossed,X} from 'lucide-react';
import {Button} from './ui/button';
import {Dialog,DialogContent,DialogDescription,DialogTitle} from './ui/dialog';
import {EChart,lineOption} from './echart';
import {activityByDay,dogMacro,dogNutrients,energyNeed,foodBagSchema,mealTotals,nutrientSources,type DogActivity,type DogMeal,type DogNutrient,type FoodBag} from '@/lib/dog-food';
import type {Dog} from '@/lib/dog';
import {londonToISO} from '@/lib/domain';

const num=(v:number,d=1)=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:d}).format(v);
const clock=(iso:string)=>new Intl.DateTimeFormat('pt-BR',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit'}).format(new Date(iso));
const dayLabel=(d:string)=>new Date(d+'T12:00:00Z').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});
const info=Object.fromEntries(dogNutrients.map(([k,l,u])=>[k,{label:l,unit:u}])) as Record<DogNutrient,{label:string;unit:string}>;

/** Shrinks a photo to a JPEG data URL under `maxLength` characters. */
export async function photoData(file:File,maxSide=1100,maxLength=300000){
 const bitmap=await createImageBitmap(file);const scale=Math.min(1,maxSide/Math.max(bitmap.width,bitmap.height));
 const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d')!.drawImage(bitmap,0,0,canvas.width,canvas.height);
 for(const q of [.82,.72,.62,.52,.42]){const url=canvas.toDataURL('image/jpeg',q);if(url.length<=maxLength)return url;}
 throw new Error('Foto grande demais mesmo após compressão.');
}

/** Caju's daily exercise: Outdoor Walks from my Apple Watch plus what ChatGPT sends for him. */
export function DogActivityPanel({dog,walks,today,onAdd,onEdit}:{dog:Dog;walks:DogActivity[];today:string;onAdd:()=>void;onEdit:(a:DogActivity)=>void}){
 const days=activityByDay(dog.activities,walks,today,30);const now=days.at(-1)!;const total=now.walks+now.other;const goal=dog.activityGoalMinutes;
 const week=days.slice(-7);const weekAvg=Math.round(week.reduce((t,d)=>t+d.walks+d.other,0)/7);const hit=days.filter(d=>d.walks+d.other>=goal&&goal>0).length;
 const recent=[...walks,...dog.activities].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8);
 return <section className="panel dog-panel dog-activity" aria-labelledby="dog-activity-title">
  <div className="panel-heading"><div><h2 id="dog-activity-title"><Activity size={19}/> {`Atividade do ${dog.name||'Caju'}`}</h2><p className="field-help">Suas caminhadas (Outdoor Walk) entram sozinhas; o resto do dia chega pelo ChatGPT ou pelo botão.</p></div><Button variant="secondary" size="small" onClick={onAdd}><Plus size={16}/>Adicionar</Button></div>
  <div className="dog-activity-now">
   <div className="dog-ring" style={{['--p' as string]:`${goal?Math.min(100,total/goal*100):0}%`}}><strong>{total}</strong><small>{`de ${goal} min`}</small></div>
   <ul><li><Footprints size={15}/><span>Caminhadas</span><b>{`${now.walks} min`}</b></li><li><Activity size={15}/><span>Outras atividades</span><b>{`${now.other} min`}</b></li><li><span>Distância hoje</span><b>{`${num(now.km)} km`}</b></li><li><span>Média de 7 dias</span><b>{`${weekAvg} min`}</b></li><li><span>Dias na meta (30 dias)</span><b>{hit}</b></li></ul>
  </div>
  <div className="dog-chart"><EChart height="100%" label="Minutos de atividade do Caju por dia nos últimos 30 dias" option={t=>({grid:{left:8,right:12,top:16,bottom:4,containLabel:true},tooltip:t.tooltip({formatter:(p:any)=>{const d=days[p[0].dataIndex];return `<b>${dayLabel(d.date)}</b><br>Caminhadas: ${d.walks} min<br>Outras: ${d.other} min${d.km?`<br>${num(d.km)} km`:''}`;}}),
   xAxis:{type:'category',data:days.map(d=>d.date),...t.axis(),splitLine:{show:false},axisLabel:{...(t.axis().axisLabel as object),formatter:dayLabel,hideOverlap:true}},yAxis:{type:'value',...t.axis(),axisLabel:{...(t.axis().axisLabel as object),formatter:(v:number)=>`${v} min`}},
   series:[{type:'bar',name:'Caminhadas',stack:'a',data:days.map(d=>d.walks),itemStyle:{color:t.color('--sys-green')},barMaxWidth:16},{type:'bar',name:'Outras',stack:'a',data:days.map(d=>d.other),itemStyle:{color:t.color('--sys-orange'),borderRadius:[4,4,0,0]},barMaxWidth:16,...(goal?{markLine:{symbol:'none',silent:true,label:{color:t.label2,formatter:`meta ${goal} min`,position:'insideEndTop'},lineStyle:{color:t.label2,type:[4,4]},data:[{yAxis:goal}]}}:{})}]})}/></div>
  <div className="health-chart-legend"><span style={{['--dot' as string]:'var(--sys-green)'}}><i/>Caminhadas do Apple Watch</span><span style={{['--dot' as string]:'var(--sys-orange)'}}><i/>Outras atividades</span></div>
  {recent.length>0&&<ul className="dog-list">{recent.map(a=><li key={a.id}><button onClick={()=>a.source!=='workout'&&onEdit(a)} disabled={a.source==='workout'}><span className="dog-med-icon">{a.source==='workout'?<Footprints size={16}/>:<Activity size={16}/>}</span><div><strong>{`${a.kind} · ${a.minutes} min`}</strong><small>{[dayLabel(a.date),a.distanceKm?`${num(a.distanceKm)} km`:'',a.steps?`${num(a.steps,0)} passos`:'',a.source==='workout'?'Apple Watch':a.withMe?'juntos':'só o Caju'].filter(Boolean).join(' · ')}</small></div></button></li>)}</ul>}
 </section>;
}

/** What Caju ate today: energy against his need, macros, vitamins and minerals with where they came from. */
export function DogNutritionPanel({dog,today,onAdd,onEdit}:{dog:Dog;today:string;onAdd:()=>void;onEdit:(m:DogMeal)=>void}){
 const [open,setOpen]=useState<DogNutrient|null>(null);
 const meals=dog.meals.filter(m=>m.date===today).sort((a,b)=>a.at.localeCompare(b.at));const {grams,totals}=mealTotals(meals);
 const weight=[...dog.weights].sort((a,b)=>a.date.localeCompare(b.date)).at(-1)?.kg??null;const need=dog.kcalPerDay??energyNeed(weight);
 const micro=dogNutrients.filter(([k])=>!(dogMacro as readonly string[]).includes(k)&&(totals[k]??0)>0);
 const history=Array.from({length:14},(_,i)=>{const date=new Date(Date.parse(today+'T12:00:00Z')-(13-i)*86400000).toISOString().slice(0,10);return {date,kcal:mealTotals(dog.meals.filter(m=>m.date===date)).totals.calories??null};});
 const sources=open?nutrientSources(meals,open):[];
 return <section className="panel dog-panel dog-nutrition" aria-labelledby="dog-food-title">
  <div className="panel-heading"><div><h2 id="dog-food-title"><UtensilsCrossed size={19}/> Alimentação de hoje</h2><p className="field-help">{need?`Necessidade estimada: ${num(need,0)} kcal/dia${dog.kcalPerDay?' (definida na ficha)':weight?` para ${num(weight)} kg`:''}.`:'Registre o peso para estimar a necessidade de energia.'}</p></div><Button variant="secondary" size="small" onClick={onAdd}><Plus size={16}/>Registrar comida</Button></div>
  <div className="dog-macros">
   <article className="kcal"><small>Energia</small><strong>{num(totals.calories??0,0)}<span> kcal</span></strong>{need&&<i><em style={{width:`${Math.min(100,(totals.calories??0)/need*100)}%`}}/></i>}<small>{need?`${Math.round((totals.calories??0)/need*100)}% da necessidade · ${grams} g de comida`:`${grams} g de comida`}</small></article>
   {(['protein','fat','carbs','fibre'] as const).map(k=><article key={k}><small>{info[k].label}</small><strong>{num(totals[k]??0)}<span>{` ${info[k].unit}`}</span></strong></article>)}
  </div>
  <h3>Vitaminas e minerais consumidos</h3>
  {micro.length?<ul className="dog-micro">{micro.map(([k])=><li key={k}><button onClick={()=>setOpen(k)}><span>{info[k].label}</span><b>{`${num(totals[k]!)} ${info[k].unit}`}</b><ChevronRight size={15} aria-hidden/></button></li>)}</ul>:<p className="field-help">Nenhuma vitamina ou mineral informado nas refeições de hoje. Cadastre a ração com os nutrientes do saco para que entrem sozinhos.</p>}
  <h3>Refeições</h3>
  {meals.length?<ul className="dog-list">{meals.map(m=>{const t=mealTotals([m]).totals;return <li key={m.id}><button onClick={()=>onEdit(m)}><time>{clock(m.at)}</time><div><strong>{m.name}</strong><small>{`${m.items.map(i=>`${i.name} ${num(i.grams,0)} g`).join(' · ')}${t.calories?` · ${num(t.calories,0)} kcal`:''}`}</small></div></button></li>;})}</ul>:<p className="field-help">Nada registrado hoje.</p>}
  {history.some(h=>h.kcal)&&<><h3>Energia nos últimos 14 dias</h3><div className="dog-chart small"><EChart height="100%" label="Calorias consumidas pelo Caju por dia" option={t=>{const o:any=lineOption(t,{categories:history.map(h=>h.date),min:0,format:v=>`${num(v,0)} kcal`,labelFormat:dayLabel,series:[{name:'Energia',values:history.map(h=>h.kcal),color:'--sys-orange',area:true,connectNulls:false}]});if(need)o.series[0].markLine={symbol:'none',silent:true,label:{color:t.label2,formatter:`necessidade ${need}`,position:'insideEndTop'},lineStyle:{color:t.color('--sys-green'),type:[4,4]},data:[{yAxis:need}]};return o;}}/></div></>}
  {open&&<Dialog open onOpenChange={v=>{if(!v)setOpen(null);}}><DialogContent className="dialog-content nutrient-dialog"><DialogTitle>{info[open].label}</DialogTitle><DialogDescription>{`${num(totals[open]??0)} ${info[open].unit} hoje`}</DialogDescription>
   <ol className="nutrient-foods-list">{sources.map((f,i)=><li key={i}><div><strong>{f.food}</strong><small>{`${f.meal} · ${clock(f.at)}`}</small></div><b>{`${num(f.amount)} ${info[open].unit}`}</b><i aria-hidden><em style={{width:`${f.share*100}%`}}/></i><span>{`${Math.round(f.share*100)}% do dia`}</span></li>)}</ol>
  </DialogContent></Dialog>}
 </section>;
}

const bagFields:[keyof FoodBag,string,'text'|'number'|'date'|'textarea'|'select'][]=[['brand','Marca','text'],['product','Produto / linha','text'],['type','Tipo','select'],['sizeKg','Tamanho do saco (kg)','number'],['price','Preço (£)','number'],['started','Começou em','date'],['finished','Acabou em','date'],['ingredients','Ingredientes','textarea'],['analysis','Níveis de garantia (como no saco)','textarea'],['additives','Aditivos por kg','textarea'],['feedingGuide','Tabela de alimentação','textarea'],['notes','Observações','textarea']];
/** The food bags: photos of the bag and label, ingredients and nutrients per 100 g. */
export function FoodBagsPanel({dog,onSave}:{dog:Dog;onSave:(bags:FoodBag[])=>Promise<void>}){
 const [editing,setEditing]=useState<FoodBag|null>(null),[photo,setPhoto]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const bags=[...dog.foodBags].sort((a,b)=>Number(b.active)-Number(a.active)||b.started.localeCompare(a.started));
 const blank=():FoodBag=>foodBagSchema.parse({id:`bag-${Date.now().toString(36)}`,brand:'Nova ração'});
 const save=async(next:FoodBag[])=>{setBusy(true);setError('');try{await onSave(next);setEditing(null);}catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar.');}finally{setBusy(false);}};
 return <section className="panel dog-panel dog-bags" aria-labelledby="dog-bags-title">
  <div className="panel-heading"><div><h2 id="dog-bags-title"><Package size={19}/> Ração e alimentos</h2><p className="field-help">Fotos do saco e da tabela nutricional, sempre guardadas. Mande as fotos pelo ChatGPT para preencher os nutrientes.</p></div><Button variant="secondary" size="small" onClick={()=>setEditing(blank())}><Plus size={16}/>Nova ração</Button></div>
  {bags.length?<div className="dog-bag-grid">{bags.map(b=>{const shown=dogNutrients.filter(([k])=>typeof b.per100g[k]==='number');return <article key={b.id} className={b.active?'':'old'}>
   <div className="dog-bag-photos">{b.photos.length?b.photos.slice(0,4).map((p,i)=><button key={i} onClick={()=>setPhoto(p.url)} aria-label={p.caption||'Ver foto'}><img src={p.url} alt={p.caption||`Foto de ${b.brand}`}/></button>):<span><Camera size={28}/></span>}</div>
   <div className="dog-bag-body"><small>{`${b.type}${b.active?' · em uso':' · anterior'}`}</small><strong>{[b.brand,b.product].filter(Boolean).join(' ')}</strong>
    <p>{[b.sizeKg?`${num(b.sizeKg)} kg`:'',b.price!==null?`£${num(b.price,2)}`:'',b.started?`desde ${dayLabel(b.started)}`:''].filter(Boolean).join(' · ')}</p>
    {shown.length>0&&<dl>{shown.slice(0,8).map(([k,l,u])=><div key={k}><dt>{l}</dt><dd>{`${num(b.per100g[k] as number)} ${u}`}</dd></div>)}</dl>}
    {shown.length>8&&<small>{`+${shown.length-8} nutrientes (por 100 g)`}</small>}
    <Button variant="ghost" size="small" onClick={()=>setEditing(b)}><Pencil size={15}/>Ver e editar</Button></div>
  </article>;})}</div>:<p className="field-help dog-empty"><Package size={16}/>Nenhuma ração cadastrada. Tire foto do saco e da tabela e mande pelo ChatGPT, ou adicione aqui.</p>}
  {photo&&<Dialog open onOpenChange={v=>{if(!v)setPhoto(null);}}><DialogContent className="dialog-content dog-photo-dialog"><DialogTitle>Foto</DialogTitle><img src={photo} alt="Foto da ração"/></DialogContent></Dialog>}
  {editing&&<Dialog open onOpenChange={v=>{if(!v&&!busy)setEditing(null);}}><DialogContent className="dialog-content club-dialog record-dialog"><DialogTitle>{[editing.brand,editing.product].filter(Boolean).join(' ')}</DialogTitle><DialogDescription>Nutrientes por 100 g. Valores do saco em % equivalem a g/100 g.</DialogDescription>
   <form className="personal-page" onSubmit={e=>{e.preventDefault();save(bags.some(b=>b.id===editing.id)?dog.foodBags.map(b=>b.id===editing.id?editing:b):[...dog.foodBags,editing]);}}>
    <div className="dog-bag-photos edit">{editing.photos.map((p,i)=><figure key={i}><img src={p.url} alt={p.caption||'Foto'}/><input aria-label="Legenda" placeholder="Legenda" value={p.caption} onChange={e=>setEditing({...editing,photos:editing.photos.map((x,j)=>j===i?{...x,caption:e.target.value}:x)})}/><button type="button" aria-label="Remover foto" onClick={()=>setEditing({...editing,photos:editing.photos.filter((_,j)=>j!==i)})}><X size={14}/></button></figure>)}
     {editing.photos.length<8&&<label className="dog-bag-upload"><ImagePlus size={22}/><span>Adicionar foto</span><input type="file" accept="image/*" multiple hidden onChange={async e=>{const files=[...(e.target.files??[])];e.target.value='';try{const urls=await Promise.all(files.slice(0,8-editing.photos.length).map(f=>photoData(f)));setEditing(cur=>cur&&{...cur,photos:[...cur.photos,...urls.map(url=>({url,caption:''}))]});}catch(err){setError((err as Error).message);}}}/></label>}</div>
    <div className="personal-form-grid">{bagFields.map(([k,l,type])=><label key={k} className={type==='textarea'?'record-wide':''}>{l}
     {type==='select'?<select value={editing.type} onChange={e=>setEditing({...editing,type:e.target.value as FoodBag['type']})}>{['Ração seca','Ração úmida','Petisco','Natural','Suplemento','Outro'].map(o=><option key={o}>{o}</option>)}</select>
     :type==='textarea'?<textarea rows={3} value={String(editing[k]??'')} onChange={e=>setEditing({...editing,[k]:e.target.value})}/>
     :<input type={type==='number'?'number':type==='date'?'date':'text'} step="any" value={editing[k]===null?'':String(editing[k]??'')} onChange={e=>setEditing({...editing,[k]:type==='number'?(e.target.value===''?null:Number(e.target.value)):e.target.value})}/>}</label>)}
     <label className="record-check"><input type="checkbox" checked={editing.active} onChange={e=>setEditing({...editing,active:e.target.checked})}/>Em uso agora</label></div>
    <h3>Nutrientes por 100 g</h3>
    <div className="personal-form-grid dog-nutrient-grid">{dogNutrients.map(([k,l,u])=><label key={k}>{`${l} (${u})`}<input type="number" step="any" min={0} value={editing.per100g[k]??''} onChange={e=>setEditing({...editing,per100g:{...editing.per100g,[k]:e.target.value===''?null:Number(e.target.value)}})}/></label>)}</div>
    {error&&<p className="error" role="alert">{error}</p>}
    <div className="record-actions">{dog.foodBags.some(b=>b.id===editing.id)&&<Button type="button" variant="destructive" disabled={busy} onClick={()=>{if(window.confirm('Excluir esta ração e as fotos?'))save(dog.foodBags.filter(b=>b.id!==editing.id));}}><Trash2 size={16}/>Excluir</Button>}<Button type="submit" disabled={busy}>{busy?'Salvando…':'Salvar'}</Button></div>
   </form></DialogContent></Dialog>}
 </section>;
}

/** Register one of Caju's meals: pick the food bag (or type a food) and the grams. */
export function DogMealForm({dog,initial,onSave,onDelete}:{dog:Dog;initial?:DogMeal;onSave:(meal:Record<string,unknown>)=>Promise<void>;onDelete?:()=>Promise<void>}){
 const nowLocal=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date()).replace(' ','T');
 const active=dog.foodBags.filter(b=>b.active);
 const [name,setName]=useState(initial?.name??'Refeição'),[when,setWhen]=useState(initial?new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(initial.at)).replace(' ','T'):nowLocal());
 const [items,setItems]=useState<{name:string;grams:string;foodId:string;nutrition:Record<string,number|null>}[]>(initial?.items.map(i=>({name:i.name,grams:String(i.grams),foodId:i.foodId,nutrition:i.nutrition as Record<string,number|null>}))??[{name:active[0]?[active[0].brand,active[0].product].filter(Boolean).join(' '):'',grams:dog.food.gramsPerDay?String(Math.round(dog.food.gramsPerDay/2)):'',foodId:active[0]?.id??'',nutrition:{}}]);
 const [notes,setNotes]=useState(initial?.notes??''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const set=(i:number,patch:Partial<typeof items[number]>)=>setItems(list=>list.map((x,j)=>j===i?{...x,...patch}:x));
 return <form className="form-stack" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{await onSave({id:initial?.id,name,at:londonToISO(when),notes,items:items.filter(i=>Number(i.grams)>0).map(i=>({name:i.name||'Alimento',grams:Number(i.grams),foodId:i.foodId,nutrition:i.foodId?{}:i.nutrition}))});}catch(err){setError(err instanceof Error?err.message:'Não foi possível salvar.');}finally{setBusy(false);}}}>
  <label>Data e horário<input type="datetime-local" required value={when} onChange={e=>setWhen(e.target.value)}/></label>
  <label>Refeição<select value={name} onChange={e=>setName(e.target.value)}>{['Café da manhã','Almoço','Jantar','Refeição','Petisco','Suplemento'].map(o=><option key={o}>{o}</option>)}</select></label>
  {items.map((it,i)=><fieldset key={i} className="dog-meal-item"><legend>{`Item ${i+1}`}</legend>
   <label>Alimento<select value={it.foodId} onChange={e=>{const bag=dog.foodBags.find(b=>b.id===e.target.value);set(i,{foodId:e.target.value,name:bag?[bag.brand,bag.product].filter(Boolean).join(' '):''});}}><option value="">Outro alimento</option>{dog.foodBags.map(b=><option key={b.id} value={b.id}>{[b.brand,b.product].filter(Boolean).join(' ')}</option>)}</select></label>
   {!it.foodId&&<label>Nome<input value={it.name} placeholder="Ex.: cenoura, frango cozido" onChange={e=>set(i,{name:e.target.value})}/></label>}
   <label>Quantidade (g)<input type="number" min={1} step="any" required value={it.grams} onChange={e=>set(i,{grams:e.target.value})}/></label>
   {!it.foodId&&<label>Energia (kcal por 100 g, opcional)<input type="number" min={0} step="any" value={it.nutrition.calories??''} onChange={e=>set(i,{nutrition:{...it.nutrition,calories:e.target.value===''?null:Number(e.target.value)}})}/></label>}
   {items.length>1&&<button type="button" className="text-link danger-link" onClick={()=>setItems(list=>list.filter((_,j)=>j!==i))}>Remover item</button>}
  </fieldset>)}
  <button type="button" className="text-link" onClick={()=>setItems(list=>[...list,{name:'',grams:'',foodId:'',nutrition:{}}])}><Plus size={14}/>Adicionar item</button>
  <label>Observações<textarea value={notes} onChange={e=>setNotes(e.target.value)}/></label>
  {!dog.foodBags.length&&<p className="field-help">Cadastre a ração na tela do Caju para os nutrientes entrarem sozinhos.</p>}
  {error&&<p className="error" role="alert">{error}</p>}
  <div className="record-actions">{onDelete&&<Button type="button" variant="destructive" disabled={busy} onClick={async()=>{if(window.confirm('Excluir esta refeição?')){setBusy(true);try{await onDelete();}finally{setBusy(false);}}}}>Excluir</Button>}<Button type="submit" disabled={busy}>{busy?'Salvando…':`Salvar comida do ${dog.name||'Caju'}`}</Button></div>
 </form>;
}
