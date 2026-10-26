import type { Asset, AssetCurrency } from './assets';

/** Latest rate to pounds for each asset currency (Frankfurter, cached for an hour). Missing rates are simply left out. */
export async function assetRates(assets:Asset[],fetcher:typeof fetch=fetch):Promise<Partial<Record<AssetCurrency,number>>>{
 const rates:Partial<Record<AssetCurrency,number>>={GBP:1};
 for(const currency of new Set(assets.map(asset=>asset.currency).filter(currency=>currency!=='GBP'))){
  try{
   const response=await fetcher(`https://api.frankfurter.dev/v2/rates?base=${currency}&quotes=GBP`,{next:{revalidate:3600},signal:AbortSignal.timeout(8000)} as RequestInit);
   if(!response.ok)continue;
   const rows=await response.json();const row=Array.isArray(rows)?rows.find((r:any)=>r.base===currency&&r.quote==='GBP'):null;
   if(row&&Number.isFinite(row.rate)&&row.rate>0)rates[currency]=row.rate;
  }catch{/* offline or provider down: the asset is listed as missing in the net worth */}
 }
 return rates;
}
