'use client';
import {monthlyPortfolio,inPounds,investmentType,type InvestmentSnapshot} from '@/lib/investments';
const money=(v:number)=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(v);
export function InvestmentOverview({history,compact=false,hideTotals=false}:{history:InvestmentSnapshot[];compact?:boolean;hideTotals?:boolean}){
 const original=monthlyPortfolio(history).at(-1)?.items??[];
 const missing=original.filter(i=>i.currency!=='GBP'&&!i.fx);
 const items=monthlyPortfolio(inPounds(history)).at(-1)?.items??[];
 const total=items.reduce((sum,i)=>sum+i.value,0);
 const grouped=(key:'account'|'type')=>{const groups=new Map<string,number>();for(const item of items){const label=key==='account'?item.account:investmentType(item);groups.set(label,(groups.get(label)??0)+item.value);}return [...groups];};
 if(compact)return <span className="finance-expand-stats">{[[missing.length?'Subtotal disponível':'Total investido',total],...grouped('type')].map(([name,value])=><span key={name}><small>{name}</small><b>{money(Number(value))}</b></span>)}{missing.length>0&&<span><small>Câmbio pendente</small><b>{missing.length} posições</b></span>}</span>;
 return <section className="personal-page">{!hideTotals&&<div className="finance-totals"><article className="panel"><small>{missing.length?'Subtotal com câmbio disponível':'Total investido'}</small><strong>{money(total)}</strong><small>{original.length} posições · valores na cotação de cada registro</small></article>{grouped('type').map(([name,value])=><article className="panel" key={name}><small>{name}</small><strong>{money(value)}</strong></article>)}</div>}{missing.length>0&&<p className="error">Cotação pendente para {missing.map(i=>i.name).join(', ')}. Esses valores não foram incluídos no subtotal.</p>}<div className="finance-bottom"><section className="panel"><h2>Por corretora</h2><table className="summary-table"><tbody>{grouped('account').map(([name,value])=><tr key={name}><td>{name}</td><td>{money(value)}</td></tr>)}</tbody></table></section><section className="panel"><h2>Por investimento</h2><table className="summary-table"><thead><tr><th>Item</th><th>Corretora</th><th>Valor</th></tr></thead><tbody>{items.map(i=><tr key={i.asset_id}><td>{i.name}<small> · {investmentType(i)}</small></td><td>{i.account}</td><td>{money(i.value)}</td></tr>)}</tbody></table></section></div></section>;
}
