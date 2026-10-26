import { z } from 'zod';
import { assetDebt, assetValue, isPaidOff, remainingInstalments, type Asset, type AssetCurrency } from './assets';

/**
 * Conservative but realistic defaults (nominal, per year): investments grow every year without crashes,
 * salaries (and therefore savings) rise with inflation plus a little, property follows inflation,
 * the real weakens slowly against the pound, and only half of a finished instalment becomes savings.
 */
export const retirementSchema=z.object({
 years:z.number().int().min(5).max(40).default(20),
 monthlySaving:z.number().min(0).max(100000).default(500),
 salaryGrowth:z.number().min(0).max(15).default(3),
 investmentReturn:z.number().min(0).max(15).default(5),
 propertyGrowth:z.number().min(-5).max(15).default(4),
 foreignCurrencyChange:z.number().min(-15).max(15).default(-2),
 inflation:z.number().min(0).max(15).default(2.5),
 freedInstalmentShare:z.number().min(0).max(100).default(50),
 withdrawalRate:z.number().min(1).max(10).default(4),
}).default({});
export type RetirementAssumptions=z.infer<typeof retirementSchema>;
export const defaultRetirement=retirementSchema.parse({});

export type Debt={name:string;balance:number;payment:number;months:number};
export type RetirementInput={liquid:number;goods:Asset[];rates:Partial<Record<AssetCurrency,number>>;debts?:Debt[];startYear:number};
export type RetirementYear={year:number;investments:number;property:number;debt:number;net:number;netToday:number;monthlySaving:number};

/** Debts in pounds from the Bens still being paid (remaining instalments at the current instalment). */
export function assetDebts(goods:Asset[],rates:Partial<Record<AssetCurrency,number>>):Debt[]{
 return goods.flatMap(asset=>{
  const f=asset.financing,rate=asset.currency==='GBP'?1:rates[asset.currency];
  if(!f||isPaidOff(asset)||!rate)return [];
  const months=remainingInstalments(f)??0,balance=(assetDebt(asset)??0)*rate;
  return balance>0&&months>0?[{name:asset.name,balance,payment:(f.instalmentValue??balance/rate/months)*rate,months}]:[];
 });
}

const round=(n:number)=>Math.round(n);
/** Month-by-month projection, one row per year (year 0 = today). Pure function: the page recomputes it from the latest data on every render. */
export function projectRetirement(input:RetirementInput,a:RetirementAssumptions=defaultRetirement){
 const monthly=(yearly:number)=>Math.pow(1+yearly/100,1/12)-1;
 const r=monthly(a.investmentReturn);
 const debts=(input.debts??[]).map(d=>({...d}));
 const props=input.goods.flatMap(asset=>{const rate=asset.currency==='GBP'?1:input.rates[asset.currency];const value=assetValue(asset);return rate&&value!==null?[{value:value*rate,foreign:asset.currency!=='GBP'}]:[];});
 const propertyAt=(m:number)=>props.reduce((t,p)=>t+p.value*Math.pow(1+a.propertyGrowth/100,m/12)*(p.foreign?Math.pow(1+a.foreignCurrencyChange/100,m/12):1),0);
 let investments=Math.max(0,input.liquid);
 const debtNow=()=>debts.reduce((t,d)=>t+d.balance,0);
 const row=(y:number,saving:number):RetirementYear=>{const property=propertyAt(y*12),debt=debtNow(),net=investments+property-debt;return {year:input.startYear+y,investments:round(investments),property:round(property),debt:round(debt),net:round(net),netToday:round(net/Math.pow(1+a.inflation/100,y)),monthlySaving:round(saving)};};
 const rows:RetirementYear[]=[row(0,a.monthlySaving)];
 const payoffs:{name:string;year:number}[]=[];
 for(let m=1;m<=a.years*12;m++){
  const year=Math.floor((m-1)/12);
  const saving=a.monthlySaving*Math.pow(1+a.salaryGrowth/100,year);
  let freed=0;
  for(const d of debts){
   if(d.months>0){d.balance=Math.max(0,d.balance-d.balance/d.months);d.months--;if(d.months===0){d.balance=0;payoffs.push({name:d.name,year:input.startYear+Math.ceil(m/12)});}}
   else freed+=d.payment*a.freedInstalmentShare/100;
  }
  investments=investments*(1+r)+saving+freed;
  if(m%12===0)rows.push(row(m/12,saving));
 }
 const last=rows.at(-1)!,deflator=Math.pow(1+a.inflation/100,a.years);
 return {
  rows,payoffs,last,
  totalSaved:round(rows.slice(1).reduce((t,y)=>t+y.monthlySaving*12,0)),
  investmentsToday:round(last.investments/deflator),
  /** Sustainable monthly income from the investments only (property is not sold), in today's money. */
  monthlyIncomeToday:round(last.investments/deflator*a.withdrawalRate/100/12),
 };
}
