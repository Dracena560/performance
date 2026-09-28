import { z } from 'zod';
export const investmentItemSchema=z.object({asset_id:z.string().trim().min(1).max(150),name:z.string().trim().min(1).max(200),account:z.string().max(150),currency:z.string().regex(/^[A-Z]{3}$/),value:z.number().finite().nonnegative(),asset_type:z.enum(['Cripto','Ações','ETFs','Fundos','Renda fixa','Caixa','Outros']).optional(),fx:z.object({rate:z.number().finite().positive(),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),source:z.string().url()}).optional(),net_flow:z.number().finite().nullable().optional()});
export const investmentSnapshotSchema=z.object({id:z.string().min(1).max(150),as_of:z.string().datetime({offset:true}),items:z.array(investmentItemSchema).min(1).max(200),notes:z.string().max(5000).default('')}).superRefine((s,c)=>{if(new Set(s.items.map(i=>i.asset_id)).size!==s.items.length)c.addIssue({code:'custom',message:'Não repita um investimento na mesma atualização.'});});
export const investmentsSchema=z.array(investmentSnapshotSchema).max(1500);
export type InvestmentSnapshot=z.infer<typeof investmentSnapshotSchema>;
export function appendSnapshot(history:InvestmentSnapshot[],snapshot:InvestmentSnapshot){const found=history.find(s=>s.id===snapshot.id);if(found){if(JSON.stringify({...found,items:found.items.map(({fx,...item})=>({...item,asset_type:investmentType(item)}))})!==JSON.stringify({...snapshot,items:snapshot.items.map(({fx,...item})=>({...item,asset_type:investmentType(item)}))}))throw new Error('ID já usado com outros valores. Use um novo ID para a nova atualização.');return history;}for(const item of snapshot.items){const prior=history.flatMap(s=>s.items).find(i=>i.asset_id===item.asset_id);if(prior&&(prior.currency!==item.currency||prior.account!==item.account))throw new Error('Use um asset_id diferente para outra conta ou moeda.');}return investmentsSchema.parse([...history,snapshot]);}
export function investmentSeries(history:InvestmentSnapshot[],asset:string){return history.filter(s=>s.items.some(i=>i.asset_id===asset)).sort((a,b)=>Date.parse(a.as_of)-Date.parse(b.as_of)).map(s=>({id:s.id,date:s.as_of,...s.items.find(i=>i.asset_id===asset)!}));}
export function investmentChange(history:InvestmentSnapshot[],asset:string){const series=investmentSeries(history,asset),current=series.at(-1),previous=series.at(-2);return {series,current,previous,delta:current&&previous?current.value-previous.value:null,percent:current&&previous&&previous.value!==0?(current.value-previous.value)/previous.value*100:null,adjusted:current&&previous&&current.net_flow!=null?current.value-previous.value-current.net_flow:null};}

// A monthly snapshot uses the last known value of each asset at that month-end.
// Partial uploads retain older values, with their reference date exposed to the UI.
export function monthlyPortfolio(history:InvestmentSnapshot[]){
 const sorted=[...history].sort((a,b)=>Date.parse(a.as_of)-Date.parse(b.as_of));
 const monthOf=(date:string)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit'}).format(new Date(date)).slice(0,7);
 const months=[...new Set(sorted.map(s=>monthOf(s.as_of)))].sort();
 const assets=new Map<string,InvestmentSnapshot['items'][number]&{date:string}>();
 return months.map(month=>{
  for(const snapshot of sorted.filter(s=>monthOf(s.as_of)===month))for(const item of snapshot.items)assets.set(item.asset_id,{...item,date:snapshot.as_of});
  const items=[...assets.values()].map(item=>({...item,carried:monthOf(item.date)!==month}));
  const currencies=[...new Set(items.map(i=>i.currency))];
  return {month,items,totals:currencies.map(currency=>({currency,value:items.filter(i=>i.currency===currency).reduce((sum,i)=>sum+i.value,0),carried:items.filter(i=>i.currency===currency&&i.carried).length}))};
 });
}
export function monthlyAsset(history:InvestmentSnapshot[],asset:string){
 const points=investmentSeries(history,asset),months=new Map<string,typeof points[number]>();
 for(const point of points){const month=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit'}).format(new Date(point.date)).slice(0,7);months.set(month,point);}
 return [...months.entries()].map(([month,point],index,all)=>({...point,month,delta:index?point.value-all[index-1][1].value:null}));
}

export function investmentType(item:{name:string;asset_id:string;asset_type?:string}){
 if(item.asset_type)return item.asset_type;
 const text=(item.name+' '+item.asset_id).toLowerCase();
 if(/bitcoin|ethereum|cardano|(?:^|[- (])(btc|eth|ada)(?:$|[- )])/.test(text))return 'Cripto';
 if(/etf|global x|urnu/.test(text))return 'ETFs';
 if(/saldo|cash/.test(text))return 'Caixa';
 if(/d-wave|ionq|cameco|aifu|qbts/.test(text))return 'Ações';
 return 'Outros';
}
export function gbpValue(item:InvestmentSnapshot['items'][number]):number|null{return item.currency==='GBP'?item.value:item.fx?item.value*item.fx.rate:null;}
export function inPounds(history:InvestmentSnapshot[]):InvestmentSnapshot[]{return history.map(s=>({...s,items:s.items.flatMap(item=>{const value=gbpValue(item);return value===null?[]:[{...item,value,currency:'GBP',net_flow:item.net_flow==null?item.net_flow:item.net_flow*(item.currency==='GBP'?1:item.fx!.rate)}];})}));}
