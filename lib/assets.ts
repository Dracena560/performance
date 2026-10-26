import { z } from 'zod';
import { dateValue } from './date-value';

/** Bens (Financeiro › Bens): property, land, vehicles and other assets, paid off or still being paid. */
export const assetTypes=['Imóvel','Terreno','Veículo','Outro'] as const;
export const assetCurrencies=['BRL','GBP','EUR','USD'] as const;
export type AssetCurrency=(typeof assetCurrencies)[number];
const amount=z.number().finite().nonnegative().nullable().default(null);
const text=(max:number)=>z.string().trim().max(max).default('');

export const assetFinancingSchema=z.object({
 creditor:text(200),
 contract:text(200),
 /** Correction index of the instalments: IPCA, INCC, IGP-M, Fixo… */
 indexer:text(40),
 contractValue:amount,
 downPayment:amount,
 instalmentsTotal:z.number().int().min(0).max(600).nullable().default(null),
 instalmentsPaid:z.number().int().min(0).max(600).default(0),
 /** Current (corrected) value of one instalment. */
 instalmentValue:amount,
 dueDay:z.number().int().min(1).max(31).nullable().default(null),
 /** Next instalment still open; may be in the past when it is overdue. */
 nextDue:dateValue.default(''),
 lastDue:dateValue.default(''),
 /** Outstanding balance (saldo devedor) as reported on the latest statement. */
 outstanding:amount,
 outstandingDate:dateValue.default(''),
 paidTotal:amount,
 /** Paid by direct debit: each instalment counts as paid on its due date, without registering it. */
 autoDebit:z.boolean().default(false),
 notes:text(2000),
});
export type AssetFinancing=z.infer<typeof assetFinancingSchema>;

export const assetSchema=z.object({
 id:z.string().min(1).max(100),
 name:z.string().trim().min(1).max(200),
 type:z.enum(assetTypes).default('Outro'),
 location:text(200),
 currency:z.enum(assetCurrencies).default('BRL'),
 purchaseDate:dateValue.default(''),
 purchasePrice:amount,
 /** Estimated market value today; when empty the purchase price stands in. */
 currentValue:amount,
 currentValueDate:dateValue.default(''),
 /** Free label/value pairs: Quadra, Lote, Área, Matrícula, Placa… */
 details:z.array(z.tuple([z.string().trim().min(1).max(100),z.string().trim().max(500)])).max(50).default([]),
 financing:assetFinancingSchema.nullable().default(null),
 documents:z.array(z.object({name:z.string().trim().min(1).max(200),url:z.string().trim().max(2000).default('')})).max(50).default([]),
 notes:text(5000),
});
export const assetsSchema=z.array(assetSchema).max(200);
export type Asset=z.infer<typeof assetSchema>;
export const readAssets=(value:unknown):Asset[]=>{const parsed=assetsSchema.safeParse(value??[]);return parsed.success?parsed.data:[];};

export const remainingInstalments=(f:AssetFinancing)=>f.instalmentsTotal===null?null:Math.max(0,f.instalmentsTotal-f.instalmentsPaid);
/** Paid off when there is no financing or nothing is left to pay. */
export function isPaidOff(asset:Asset){const f=asset.financing;if(!f)return true;const left=remainingInstalments(f);return left===0||(left===null&&f.outstanding===0);}
/** What is still owed: the statement balance, otherwise remaining instalments × current instalment. */
export function assetDebt(asset:Asset):number|null{
 const f=asset.financing;if(!f||isPaidOff(asset))return 0;
 if(f.outstanding!==null)return f.outstanding;
 const left=remainingInstalments(f);return left!==null&&f.instalmentValue!==null?Math.round(left*f.instalmentValue*100)/100:null;
}
export const assetValue=(asset:Asset)=>asset.currentValue??asset.purchasePrice;

const addMonths=(date:string,months:number,day:number)=>{const y=Number(date.slice(0,4)),m=Number(date.slice(5,7))-1+months;const last=new Date(Date.UTC(y,m+1,0)).getUTCDate();return new Date(Date.UTC(y,m,Math.min(day,last),12)).toISOString().slice(0,10);};
/** Records one instalment paid: count, totals, balance and the next due date move forward together. */
export function registerInstalment(asset:Asset,paidOn:string,value?:number):Asset{
 const f=asset.financing;if(!f||isPaidOff(asset))return asset;
 const paid=value??f.instalmentValue??0;const instalmentsPaid=f.instalmentsPaid+1;
 const done=f.instalmentsTotal!==null&&instalmentsPaid>=f.instalmentsTotal;
 const day=f.dueDay??Number((f.nextDue||paidOn).slice(8,10));
 return {...asset,financing:{...f,instalmentsPaid,paidTotal:Math.round(((f.paidTotal??0)+paid)*100)/100,outstanding:f.outstanding===null?null:Math.max(0,Math.round((f.outstanding-paid)*100)/100),outstandingDate:f.outstanding===null?f.outstandingDate:paidOn,nextDue:done?'':addMonths(f.nextDue||paidOn,1,day)}};
}

/**
 * Direct debit: instalments due between the stored next due date and today count as paid.
 * Derived on every render (nothing is written), so the stored statement stays the reference.
 * The balance falls in proportion to the instalments left, which fits SAC loans and uncorrected plans.
 */
export function withAutoDebit(asset:Asset,today:string):Asset{
 const f=asset.financing;if(!f?.autoDebit||!f.nextDue||isPaidOff(asset))return asset;
 const day=f.dueDay??Number(f.nextDue.slice(8,10));const left=remainingInstalments(f);
 let debited=0;while(addMonths(f.nextDue,debited,day)<=today&&(left===null||debited<left))debited++;
 if(!debited)return asset;
 const remaining=left===null?null:left-debited;
 const outstanding=f.outstanding===null?null:remaining===0?0:left?Math.round(f.outstanding*(remaining!/left)*100)/100:f.outstanding;
 return {...asset,financing:{...f,instalmentsPaid:f.instalmentsPaid+debited,paidTotal:f.paidTotal===null?null:Math.round((f.paidTotal+debited*(f.instalmentValue??0))*100)/100,outstanding,nextDue:remaining===0?'':addMonths(f.nextDue,debited,day)}};
}
export const effectiveAssets=(assets:Asset[],today:string)=>assets.map(asset=>withAutoDebit(asset,today));

/** Instalments shown in Próximos vencimentos (the next open one, or the monthly due day). */
export function assetReminders(assets:Asset[],today:string){
 return effectiveAssets(assets,today).filter(asset=>!isPaidOff(asset)&&asset.financing?.nextDue).map(asset=>({id:`asset-${asset.id}`,name:`${asset.financing!.autoDebit?'Débito automático':'Parcela'} · ${asset.name}`,source:'Bens',date:asset.financing!.nextDue,amount:asset.financing!.instalmentValue===null?null:formatMoney(asset.financing!.instalmentValue,asset.currency)}));
}

export function formatMoney(value:number,currency:AssetCurrency){return new Intl.NumberFormat(currency==='BRL'?'pt-BR':'en-GB',{style:'currency',currency,maximumFractionDigits:2}).format(value);}

/** Value and debt of all assets in pounds, for the net worth. Assets whose currency has no rate are listed in `missing`. */
export function assetsInPounds(assets:Asset[],rates:Partial<Record<AssetCurrency,number>>){
 let value=0,debt=0;const missing:string[]=[];let estimated=false;
 for(const asset of assets){
  const rate=asset.currency==='GBP'?1:rates[asset.currency];
  if(!rate){missing.push(asset.name);continue;}
  const worth=assetValue(asset);if(worth!==null)value+=worth*rate;if(asset.currentValue===null&&asset.purchasePrice!==null)estimated=true;
  const owed=assetDebt(asset);if(owed)debt+=owed*rate;
 }
 const cents=(n:number)=>Math.round(n*100)/100;
 return {value:cents(value),debt:cents(debt),missing,estimated};
}
