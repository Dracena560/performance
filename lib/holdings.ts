import { z } from 'zod';
import { dateValue } from './date-value';
import { appendSnapshot, investmentsSchema, monthlyPortfolio, investmentType, type InvestmentSnapshot } from './investments';

/**
 * Live portfolio: each holding has purchase lots (quantity, unit price, currency). Prices come from
 * Yahoo Finance (stocks/ETFs, Stooq as fallback) or CoinGecko (crypto); values are shown in pounds and a
 * weekly snapshot is appended to the investment history so the timeline keeps growing.
 */
const money=z.number().finite().nonnegative().nullable().default(null);
export const assetTypes=['Cripto','Ações','ETFs','Fundos','Renda fixa','Caixa','Outros'] as const;
export const lotSchema=z.object({id:z.string().min(1).max(100),date:dateValue.default(''),quantity:money,price:money,currency:z.string().regex(/^[A-Z]{3}$/).default('GBP'),amount:money,notes:z.string().max(500).default('')});
export const holdingSchema=z.object({
 id:z.string().trim().min(1).max(150),name:z.string().trim().min(1).max(200),symbol:z.string().trim().max(60).default(''),
 source:z.enum(['yahoo','coingecko','manual']).default('yahoo'),account:z.string().max(150).default(''),type:z.enum(assetTypes).default('Ações'),
 currency:z.string().regex(/^[A-Z]{3}$/).default('GBP'),manualPrice:money,active:z.boolean().default(true),notes:z.string().max(2000).default(''),
 lots:z.array(lotSchema).max(500).default([])
});
export const holdingsSchema=z.array(holdingSchema).max(300).superRefine((list,c)=>{if(new Set(list.map(h=>h.id)).size!==list.length)c.addIssue({code:'custom',message:'Cada ativo precisa de um id único.'});});
export type Holding=z.infer<typeof holdingSchema>;
export type Lot=z.infer<typeof lotSchema>;
export const readHoldings=(v:unknown):Holding[]=>{const p=holdingsSchema.safeParse(v??[]);return p.success?p.data:[];};

/** Quantity of a lot: informed, or amount ÷ unit price. */
export const lotQuantity=(l:Lot)=>l.quantity??(l.amount!==null&&l.price?l.amount/l.price:0);
export function position(h:Holding){
 const qty=h.lots.reduce((t,l)=>t+lotQuantity(l),0);
 const sameCcy=h.lots.filter(l=>l.currency===h.currency);
 const cost=sameCcy.reduce((t,l)=>t+(l.amount??(l.price!==null?lotQuantity(l)*l.price:0)),0);const costQty=sameCcy.reduce((t,l)=>t+lotQuantity(l),0);
 return {quantity:Math.round(qty*1e8)/1e8,cost:Math.round(cost*100)/100,averagePrice:costQty?cost/costQty:null,mixedCurrencies:sameCcy.length!==h.lots.length};
}

export type Quote={price:number;currency:string;at:string;source:string};
const coinIds:Record<string,string>={BTC:'bitcoin',ETH:'ethereum',ADA:'cardano',SOL:'solana',XRP:'ripple',DOGE:'dogecoin',DOT:'polkadot',LTC:'litecoin',LINK:'chainlink',MATIC:'matic-network',AVAX:'avalanche-2',BNB:'binancecoin'};
export const coinId=(symbol:string)=>coinIds[symbol.toUpperCase()]??symbol.toLowerCase();
/** London tickers quote in pence (GBp/GBX): converted to pounds. */
function normalise(price:number,currency:string){return currency==='GBp'||currency==='GBX'?{price:price/100,currency:'GBP'}:{price,currency:currency.toUpperCase()};}

export async function fetchQuote(h:Holding,fetcher:typeof fetch=fetch):Promise<Quote|null>{
 const at=new Date().toISOString();
 if(h.source==='manual'||!h.symbol)return h.manualPrice!==null?{price:h.manualPrice,currency:h.currency,at,source:'manual'}:null;
 try{
  if(h.source==='coingecko'){const id=coinId(h.symbol);const vs=h.currency.toLowerCase();const r=await fetcher(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=${vs},gbp`,{next:{revalidate:300},signal:AbortSignal.timeout(8000)} as RequestInit);if(!r.ok)throw new Error();const j=await r.json();const p=j?.[id]?.[vs]??j?.[id]?.gbp;if(typeof p!=='number')throw new Error();return {price:p,currency:j?.[id]?.[vs]!==undefined?h.currency:'GBP',at,source:'CoinGecko'};}
  const r=await fetcher(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(h.symbol)}?range=1d&interval=1d`,{headers:{'User-Agent':'Mozilla/5.0'},next:{revalidate:300},signal:AbortSignal.timeout(8000)} as RequestInit);
  if(r.ok){const j=await r.json();const meta=j?.chart?.result?.[0]?.meta;if(typeof meta?.regularMarketPrice==='number'){const n=normalise(meta.regularMarketPrice,String(meta.currency??h.currency));return {...n,at:meta.regularMarketTime?new Date(meta.regularMarketTime*1000).toISOString():at,source:'Yahoo Finance'};}}
  // Fallback: Stooq daily close (US tickers end in .us, London in .uk).
  const s=h.symbol.toLowerCase().replace(/\.l$/,'.uk');const stooq=s.includes('.')?s:`${s}.us`;
  const c=await fetcher(`https://stooq.com/q/l/?s=${encodeURIComponent(stooq)}&f=sd2t2c&h&e=csv`,{next:{revalidate:300},signal:AbortSignal.timeout(8000)} as RequestInit);
  if(c.ok){const line=(await c.text()).trim().split('\n')[1]?.split(',');const p=Number(line?.[3]);if(Number.isFinite(p)&&p>0){const n=normalise(p,stooq.endsWith('.uk')?'GBp':'USD');return {...n,at,source:'Stooq'};}}
 }catch{/* fall through to the manual price */}
 return h.manualPrice!==null?{price:h.manualPrice,currency:h.currency,at,source:'manual'}:null;
}
/** Today's rate from each currency to pounds (Frankfurter, ECB). */
export async function ratesToGBP(currencies:string[],fetcher:typeof fetch=fetch){
 const out:Record<string,{rate:number;date:string;source:string}>={GBP:{rate:1,date:new Date().toISOString().slice(0,10),source:'GBP'}};
 for(const c of new Set(currencies.filter(c=>c!=='GBP'))){try{const source=`https://api.frankfurter.dev/v2/rates?base=${c}&quotes=GBP`;const r=await fetcher(source,{next:{revalidate:3600},signal:AbortSignal.timeout(8000)} as RequestInit);if(!r.ok)continue;const rows=await r.json();const row=Array.isArray(rows)?rows.find((x:any)=>x.quote==='GBP'):null;if(row&&row.rate>0)out[c]={rate:row.rate,date:row.date,source};}catch{/* missing rate */}}
 return out;
}

export type LiveRow={id:string;name:string;symbol:string;account:string;type:string;currency:string;quantity:number;averagePrice:number|null;cost:number;price:number|null;priceCurrency:string|null;at:string|null;source:string|null;value:number|null;valueGBP:number|null;costGBP:number|null;gain:number|null;gainPct:number|null};
/** Current value of every active holding, in its own currency and in pounds. */
export function liveRows(holdings:Holding[],quotes:Record<string,Quote|null>,rates:Record<string,{rate:number}>):LiveRow[]{
 return holdings.filter(h=>h.active).map(h=>{const p=position(h);const q=quotes[h.id]??null;
  const toGBP=(v:number,c:string)=>rates[c]?v*rates[c].rate:null;
  // Price converted into the holding currency through pounds when the quote comes in another currency.
  const priceInCcy=q?q.currency===h.currency?q.price:(rates[q.currency]&&rates[h.currency]?q.price*rates[q.currency].rate/rates[h.currency].rate:null):null;
  const value=priceInCcy!==null?Math.round(p.quantity*priceInCcy*100)/100:null;
  const valueGBP=value!==null?toGBP(value,h.currency):null;const costGBP=toGBP(p.cost,h.currency);
  const gain=value!==null&&p.cost?Math.round((value-p.cost)*100)/100:null;
  return {id:h.id,name:h.name,symbol:h.symbol,account:h.account,type:h.type,currency:h.currency,quantity:p.quantity,averagePrice:p.averagePrice,cost:p.cost,price:priceInCcy,priceCurrency:q?h.currency:null,at:q?.at??null,source:q?.source??null,value,valueGBP:valueGBP===null?null:Math.round(valueGBP*100)/100,costGBP:costGBP===null?null:Math.round(costGBP*100)/100,gain,gainPct:gain!==null&&p.cost?Math.round(gain/p.cost*1000)/10:null};});
}

/** ISO week label, e.g. 2026-W41. */
export function isoWeek(date:Date){const d=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate()));const day=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()+4-day);const y=d.getUTCFullYear();const w=Math.ceil(((d.getTime()-Date.UTC(y,0,1))/86400000+1)/7);return `${y}-W${String(w).padStart(2,'0')}`;}
/**
 * The weekly snapshot: one investment-history entry per ISO week with every priced holding,
 * so the existing timeline charts keep working. Purchases made during the week go in net_flow.
 */
export function weeklySnapshot(history:InvestmentSnapshot[],holdings:Holding[],rows:LiveRow[],rates:Record<string,{rate:number;date:string;source:string}>,now=new Date()){
 const id=`auto-${isoWeek(now)}`;if(history.some(s=>s.id===id))return {history,created:false,id};
 const weekStart=new Date(now.getTime()-6*86400000).toISOString().slice(0,10);
 const items=rows.filter(r=>r.value!==null&&r.value>0).map(r=>{const h=holdings.find(x=>x.id===r.id)!;const flow=h.lots.filter(l=>l.date>=weekStart&&l.currency===h.currency).reduce((t,l)=>t+(l.amount??lotQuantity(l)*(l.price??0)),0);
  return {asset_id:r.id,name:r.name,account:r.account||'Carteira',currency:r.currency,value:r.value!,asset_type:investmentType({name:r.name,asset_id:r.id,asset_type:r.type}) as typeof assetTypes[number],...(r.currency!=='GBP'&&rates[r.currency]?{fx:{rate:rates[r.currency].rate,date:rates[r.currency].date,source:rates[r.currency].source}}:{}),net_flow:flow?Math.round(flow*100)/100:null};});
 if(!items.length)return {history,created:false,id};
 const snapshot={id,as_of:now.toISOString(),items,notes:'Snapshot semanal automático com cotações ao vivo.'};
 return {history:investmentsSchema.parse(appendSnapshot(history,snapshot as InvestmentSnapshot)),created:true,id};
}

/** Holdings started from the latest recorded positions (same ids, so the history continues). */
export function holdingsFromHistory(history:InvestmentSnapshot[]):Holding[]{
 const items=monthlyPortfolio(history).at(-1)?.items??[];
 return items.map(i=>holdingSchema.parse({id:i.asset_id,name:i.name,symbol:'',source:'manual',account:i.account,type:investmentType(i),currency:i.currency,manualPrice:null,lots:[]}));
}
/** Adds a purchase lot (MCP), creating the holding when needed. */
export function addLot(list:unknown,input:Record<string,any>){
 const holdings=readHoldings(list);const key=String(input.holding_id??input.symbol??input.name??'').toLowerCase();
 let h=holdings.find(x=>x.id.toLowerCase()===key||x.symbol.toLowerCase()===key||x.name.toLowerCase()===key);
 if(!h){if(!input.name)throw new Error('Ativo não encontrado: informe name para criar.');h=holdingSchema.parse({id:String(input.holding_id??input.symbol??input.name).toLowerCase().replace(/[^a-z0-9.-]+/g,'-'),name:input.name,symbol:input.symbol??'',source:input.source??'yahoo',account:input.account??'',type:input.type??'Ações',currency:input.asset_currency??input.currency??'GBP'});holdings.push(h);}
 const lot=lotSchema.parse({id:input.lot_id??`lot-${input.date??''}-${h.lots.length+1}`,date:input.date??'',quantity:input.quantity??null,price:input.price??null,currency:input.currency??h.currency,amount:input.amount??null,notes:input.notes??''});
 const next=holdings.map(x=>x.id===h!.id?{...x,lots:[...x.lots.filter(l=>l.id!==lot.id),lot]}:x);
 return {holdings:holdingsSchema.parse(next),holding:next.find(x=>x.id===h!.id)!,lot};
}
