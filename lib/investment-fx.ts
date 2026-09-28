import {investmentType,type InvestmentSnapshot} from './investments';
export async function priceInPounds(snapshot:InvestmentSnapshot,fetcher:typeof fetch=fetch):Promise<InvestmentSnapshot>{
 const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(snapshot.as_of));
 const rates=new Map<string,{rate:number;date:string;source:string}>();
 for(const currency of new Set(snapshot.items.filter(i=>i.currency!=='GBP'&&!i.fx).map(i=>i.currency))){
  const source=`https://api.frankfurter.dev/v2/rates?date=${date}&base=${currency}&quotes=GBP`;
  const response=await fetcher(source,{cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error('Cotação indisponível. Tente salvar novamente.');
  const rows=await response.json();const row=Array.isArray(rows)?rows.find(r=>r.base===currency&&r.quote==='GBP'):null;
  if(!row||!Number.isFinite(row.rate)||row.rate<=0||!/^\d{4}-\d{2}-\d{2}$/.test(row.date)||row.date>date||Date.parse(date)-Date.parse(row.date)>7*86400000)throw new Error('Não há cotação válida para a data informada.');
  rates.set(currency,{rate:row.rate,date:row.date,source});
 }
 return {...snapshot,items:snapshot.items.map(item=>({...item,asset_type:investmentType(item) as NonNullable<typeof item.asset_type>,...(item.currency==='GBP'?{}:{fx:item.fx??rates.get(item.currency)!})}))};
}
