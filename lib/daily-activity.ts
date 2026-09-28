import { metricValue } from './health-metrics';
type Row={category:string;recorded_on:string;recorded_at:string|null;payload:Record<string,unknown>};
export function dailyActivity(records:Row[],date:string){
 // Daily totals are snapshots: choose the newest known field, never sum snapshots or substitute a workout.
 const rows=records.filter(r=>r.recorded_on===date&&r.category==='daily_metrics').sort((a,b)=>(b.recorded_at??'').localeCompare(a.recorded_at??''));
 const pick=(names:string[])=>{for(const row of rows){const value=metricValue(row.payload,names);if(value!==null)return value;}return null;};
 const minutes=pick(['stand minutes','stand time minutes','tempo em pe','tempo em pé']);const hours=pick(['stand hours','horas em pe','horas em pé']);
 return {standHours:hours,exercise:pick(['exercise minutes']),steps:pick(['steps','passos']),distance:pick(['distance km','distancia km','walking distance km','distance']),stand:minutes??(hours===null?null:hours*60),active:pick(['active calories','calorias ativas','kcal ativas','active kcal','active energy','energia ativa']),total:pick(['total calories','calorias totais','kcal totais','total kcal','total energy','energia total','calorias gastas'])};
}
