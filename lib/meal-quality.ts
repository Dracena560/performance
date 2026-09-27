// A transparent diary heuristic, not a validated nutritional or medical score.
type MealEvent={type:string;local_date?:string;data:Record<string,unknown>};
type Item={grams?:number;nutrition?:Record<string,number|null|undefined>};
export function mealQuality(event:MealEvent){
 const items=(Array.isArray(event.data.items)?event.data.items:[]) as Item[];
 const total=(key:string)=>items.length&&items.every(item=>typeof item.grams==='number'&&Number.isFinite(item.grams)&&typeof item.nutrition?.[key]==='number'&&Number.isFinite(item.nutrition[key]))?items.reduce((sum,item)=>sum+item.grams!*item.nutrition![key]!/100,0):null;
 const kcal=total('calories');
 if(event.type!=='meal'||kcal===null)return {score:null,weight:0,reasons:['Dados nutricionais insuficientes para avaliar.']};
 if(kcal<=30)return {score:null,weight:0,reasons:['Registro de baixo aporte energético: neutro na média das refeições.']};
 const protein=total('protein'),fibre=total('fibre'),saturated=total('saturated_fat'),sodium=total('sodium');
 const parts:{points:number;max:number;reason:string}[]=[];
 // Relative to energy, so small snacks are not judged as full meals.
 if(protein!==null){const ratio=protein/kcal*500;parts.push({points:Math.min(1,ratio/20)*3,max:3,reason:ratio>=20?'Boa proporção de proteína.':'Menor proporção de proteína.'});}
 if(fibre!==null){const ratio=fibre/kcal*500;parts.push({points:Math.min(1,ratio/7)*3,max:3,reason:ratio>=7?'Boa densidade de fibras.':'Pouca fibra em relação à energia.'});}
 if(saturated!==null){const share=saturated*9/kcal;parts.push({points:share<=.1?2:share>=.2?0:2*(.2-share)/.1,max:2,reason:share<=.1?'Baixa proporção de gordura saturada.':'Gordura saturada reduz a nota.'});}
 if(sodium!==null){const ratio=sodium/kcal*500;parts.push({points:ratio<=500?2:ratio>=1000?0:2*(1000-ratio)/500,max:2,reason:ratio<=500?'Menor densidade de sódio.':'Sódio reduz a nota.'});}
 if(protein===null||fibre===null)return {score:null,weight:0,reasons:['Faltam proteína ou fibra para calcular uma nota comparável.']};
 const max=parts.reduce((sum,p)=>sum+p.max,0);
 return {score:Math.round(parts.reduce((sum,p)=>sum+p.points,0)/max*100)/10,weight:kcal,reasons:[...parts.map(p=>p.reason),...(saturated===null||sodium===null?['Avaliação parcial: faltam dados de sódio ou gordura saturada.']:[])]};
}
export function weightedMealQuality(events:MealEvent[]){
 const grades=events.filter(e=>e.type==='meal').map(mealQuality).filter(g=>g.score!==null&&g.weight>0);
 const weight=grades.reduce((sum,g)=>sum+g.weight,0);
 return weight?grades.reduce((sum,g)=>sum+g.score!*g.weight,0)/weight:null;
}
export function dailyMealQualityAverage(events:MealEvent[]){
 const days=new Map<string,MealEvent[]>();
 for(const e of events.filter(e=>e.type==='meal'))days.set(e.local_date??'', [...(days.get(e.local_date??'')??[]),e]);
 const scores=[...days.values()].map(weightedMealQuality).filter((n):n is number=>n!==null);
 return scores.length?scores.reduce((a,b)=>a+b,0)/scores.length:null;
}
