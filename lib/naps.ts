import { localDate } from './domain';

export type Nap={id:string;date:string;at:string;minutes:number;feeling:string;notes:string};
type RecordLike={id:string;category:string;recorded_on:string;recorded_at:string|null;payload:Record<string,unknown>};

/** Naps are Registrar records (record_type "nap"); they never count as a night of sleep. */
export function napsFromRecords(records:RecordLike[]):Nap[]{
 return records.filter(record=>record.payload.record_type==='nap'&&typeof record.payload.nap_minutes==='number').map(record=>({
  id:record.id,date:record.recorded_on,at:record.recorded_at??`${record.recorded_on}T12:00:00Z`,minutes:record.payload.nap_minutes as number,
  feeling:typeof record.payload.woke_feeling==='string'?record.payload.woke_feeling:'',notes:typeof record.payload.notes==='string'?record.payload.notes:'',
 })).sort((a,b)=>b.at.localeCompare(a.at));
}

/** Last `days` days including today: how many naps, total and average minutes, days with a nap, most common feeling. */
export function napStats(naps:Nap[],today=localDate(),days=7){
 const from=new Date(Date.parse(today+'T12:00:00Z')-(days-1)*86400000).toISOString().slice(0,10);
 const recent=naps.filter(nap=>nap.date>=from&&nap.date<=today);
 const total=recent.reduce((sum,nap)=>sum+nap.minutes,0);
 const feelings=recent.filter(nap=>nap.feeling).reduce((map,nap)=>map.set(nap.feeling,(map.get(nap.feeling)??0)+1),new Map<string,number>());
 return {count:recent.length,total,average:recent.length?Math.round(total/recent.length):null,days:new Set(recent.map(nap=>nap.date)).size,feeling:[...feelings].sort((a,b)=>b[1]-a[1])[0]?.[0]??null};
}
