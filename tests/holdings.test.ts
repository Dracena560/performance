import test from 'node:test';
import assert from 'node:assert/strict';
import { addLot,position,fetchQuote,liveRows,weeklySnapshot,isoWeek,holdingsFromHistory,ratesToGBP } from '../lib/holdings';
const fake=(routes:Record<string,unknown>)=>(async(url:string)=>{const key=Object.keys(routes).find(k=>url.includes(k));if(!key)return {ok:false} as Response;const body=routes[key];return {ok:true,json:async()=>body,text:async()=>String(body)} as Response;}) as unknown as typeof fetch;
test('lots give quantity, average price and cost; live prices become pounds; weekly snapshot once per week',async()=>{
 let r=addLot([],{name:'D-Wave',symbol:'QBTS',asset_currency:'USD',date:'2026-09-01',amount:1000,price:20,currency:'USD'});
 r=addLot(r.holdings,{symbol:'QBTS',date:'2026-10-01',quantity:10,price:30,currency:'USD'});
 const h=r.holding;assert.deepEqual(position(h),{quantity:60,cost:1300,averagePrice:1300/60,mixedCurrencies:false});
 const q=await fetchQuote(h,fake({'yahoo.com':{chart:{result:[{meta:{regularMarketPrice:25,currency:'USD',regularMarketTime:1790000000}}]}}}));
 assert.equal(q?.price,25);
 const pence=await fetchQuote({...h,symbol:'URNU.L',currency:'GBP'},fake({'yahoo.com':{chart:{result:[{meta:{regularMarketPrice:1250,currency:'GBp'}}]}}}));assert.deepEqual([pence?.price,pence?.currency],[12.5,'GBP']);
 const stooq=await fetchQuote(h,fake({'stooq.com':'Symbol,Date,Time,Close\nQBTS.US,2026-10-06,22:00:00,24.5'}));assert.equal(stooq?.source,'Stooq');
 const rates=await ratesToGBP(['USD'],fake({'frankfurter':[{base:'USD',quote:'GBP',rate:0.75,date:'2026-10-06'}]}));assert.equal(rates.USD.rate,0.75);
 const rows=liveRows(r.holdings,{[h.id]:q},rates);assert.deepEqual([rows[0].value,rows[0].valueGBP,rows[0].gain,rows[0].gainPct],[1500,1125,200,15.4]);
 const now=new Date('2026-10-06T08:00:00Z');assert.equal(isoWeek(now),'2026-W41');
 const first=weeklySnapshot([],r.holdings,rows,rates,now);assert.equal(first.created,true);assert.equal(first.history[0].items[0].net_flow,300);
 assert.equal(weeklySnapshot(first.history,r.holdings,rows,rates,now).created,false);
 assert.equal(holdingsFromHistory(first.history)[0].id,h.id);
});
