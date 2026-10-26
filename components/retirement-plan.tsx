'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Flag, Sunset } from 'lucide-react';
import { savePersonalSection } from '@/app/actions';
import { carDebt, netWorth } from '@/lib/net-worth';
import { parseMoney, readCreditCard } from '@/lib/credit-card';
import { moneyTotal, type Finance } from '@/lib/personal';
import { assetDebts, projectRetirement, type Debt, type RetirementAssumptions } from '@/lib/retirement';
import type { InvestmentSnapshot } from '@/lib/investments';
import type { Asset, AssetCurrency } from '@/lib/assets';
import { EChart, lineOption } from './echart';
import { useSettings } from './settings-context';

const pounds=(v:number)=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(v);
const compact=(v:number)=>Math.abs(v)>=1e6?`£${(v/1e6).toLocaleString('pt-BR',{maximumFractionDigits:2})} mi`:Math.abs(v)>=1e3?`£${Math.round(v/1e3)} mil`:pounds(v);
const pct=(v:number)=>`${v.toLocaleString('pt-BR',{maximumFractionDigits:1})}%`;
const fields:[keyof RetirementAssumptions,string,string,number][]=[
 ['years','Anos até a aposentadoria','anos',1],['monthlySaving','Guardar por mês (mínimo hoje)','£',50],['salaryGrowth','Aumento de salário por ano','%',0.5],
 ['investmentReturn','Rendimento dos investimentos por ano','%',0.5],['propertyGrowth','Valorização dos imóveis por ano','%',0.5],['foreignCurrencyChange','Real (e outras moedas) contra a libra por ano','%',0.5],
 ['inflation','Inflação por ano','%',0.5],['freedInstalmentShare','Parcela quitada que vira poupança','%',10],['withdrawalRate','Retirada anual na aposentadoria','%',0.5],
];

/** Retirement forecast recomputed from the current finances on every render, so it always follows the latest data. */
export function RetirementPlan({investments,creditCard,car,finance,goods,rates,liveTotal,demo=false}:{investments:InvestmentSnapshot[];creditCard:unknown;car:unknown;finance:Finance;goods:Asset[];rates:Partial<Record<AssetCurrency,number>>;liveTotal:number|null;demo?:boolean}){
 const router=useRouter();const settings=useSettings();
 const saved=settings.finance.retirement;
 const [assumptions,setAssumptions]=useState(saved);useEffect(()=>setAssumptions(saved),[saved]);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const startYear=new Date().getFullYear();
 const n=netWorth({investments,card:readCreditCard(creditCard),car,liveTotal});
 const line=(label:string,list:typeof n.assets)=>list.find(item=>item.label===label)?.value??0;
 const liquid=line('Investimentos',n.assets)+line('Conta corrente',n.assets)-line('Fatura do cartão',n.liabilities);
 const debts=useMemo(()=>{
  const list:Debt[]=assetDebts(goods,rates);
  const f=(car as any)?.extra?.financing??{},debt=carDebt(car),payment=parseMoney(f.instalment),months=parseMoney(f.remaining);
  if(debt&&debt.value>0&&payment&&months&&months>0)list.push({name:'Carro',balance:debt.value,payment,months:Math.ceil(months)});
  return list;
 },[goods,rates,car]);
 const p=projectRetirement({liquid,goods,rates,debts,startYear},assumptions);
 const budgetSurplus=finance.incomeFelipe+finance.incomeSara-moneyTotal(finance.rows);
 const milestones=[100000,250000,500000,1000000].map(target=>({target,year:p.rows.find(row=>row.net>=target)?.year})).filter(m=>m.year&&m.year>startYear);
 const dirty=JSON.stringify(assumptions)!==JSON.stringify(saved);
 const save=async()=>{setBusy(true);setError('');try{if(!demo){await savePersonalSection('settings',{...settings,finance:{...settings.finance,retirement:assumptions}});router.refresh();}}catch(e){setError((e as Error).message);}finally{setBusy(false);}};

 return <section className="panel retirement" aria-labelledby="retirement-title">
  <div className="panel-heading"><div><span className="eyebrow">PREVISÃO · CENÁRIO CONSERVADOR</span><h2 id="retirement-title"><Sunset size={19} aria-hidden/> Aposentadoria em {assumptions.years} anos</h2></div><span className="retirement-year">{p.last.year}</span></div>
  <div className="retirement-hero">
   <div><small>Patrimônio previsto em {p.last.year}</small><strong>{pounds(p.last.net)}</strong><p className="field-help">≈ <b>{pounds(p.last.netToday)}</b> em dinheiro de hoje (descontando {pct(assumptions.inflation)} de inflação ao ano).</p></div>
   <div className="retirement-income"><small>Renda mensal possível</small><strong>{pounds(p.monthlyIncomeToday)}<span>/mês</span></strong><p className="field-help">Em dinheiro de hoje, retirando {pct(assumptions.withdrawalRate)} ao ano só dos investimentos, sem vender imóveis.</p></div>
  </div>
  <dl className="retirement-kpis">
   <div><dt>Investimentos</dt><dd>{compact(p.last.investments)}</dd><small>hoje {compact(Math.max(0,liquid))}</small></div>
   <div><dt>Imóveis e bens</dt><dd>{compact(p.last.property)}</dd><small>hoje {compact(p.rows[0].property)}</small></div>
   <div><dt>Dívidas</dt><dd>{compact(p.last.debt)}</dd><small>hoje {compact(p.rows[0].debt)}</small></div>
   <div><dt>Você vai guardar</dt><dd>{compact(p.totalSaved)}</dd><small>de {pounds(assumptions.monthlySaving)} até {pounds(p.last.monthlySaving)}/mês</small></div>
  </dl>
  <EChart className="retirement-chart" height={260} label={`Previsão do patrimônio de ${startYear} a ${p.last.year}`} option={t=>lineOption(t,{categories:p.rows.map(row=>String(row.year)),format:v=>pounds(v),axisFormat:v=>compact(v),series:[
   {name:'Patrimônio líquido',values:p.rows.map(row=>row.net),color:'--tint-finance',area:true,width:3},
   {name:'Investimentos',values:p.rows.map(row=>row.investments),color:'--sys-blue'},
   {name:'Imóveis e bens',values:p.rows.map(row=>row.property),color:'--sys-orange'},
   {name:'Em dinheiro de hoje',values:p.rows.map(row=>row.netToday),color:'--gray',dashed:true},
  ]})}/>
  <div className="tennis-chart-legend" aria-hidden="true">{([['--tint-finance','Patrimônio líquido'],['--sys-blue','Investimentos'],['--sys-orange','Imóveis e bens'],['--gray','Em dinheiro de hoje']] as const).map(([color,label])=><span key={label}><i style={{['--legend' as string]:`var(${color})`}}/>{label}</span>)}</div>
  {(p.payoffs.length>0||milestones.length>0)&&<ul className="retirement-milestones">
   {p.payoffs.map(item=><li key={item.name}><Flag size={14}/><b>{item.year}</b> {item.name} quitado · {pct(assumptions.freedInstalmentShare)} da parcela passa a ser investida</li>)}
   {milestones.map(item=><li key={item.target}><Flag size={14}/><b>{item.year}</b> patrimônio passa de {compact(item.target)}</li>)}
  </ul>}
  {budgetSurplus>assumptions.monthlySaving&&<p className="field-help retirement-tip">Pelo seu orçamento sobram {pounds(budgetSurplus)} por mês. A previsão usa só {pounds(assumptions.monthlySaving)}; tudo o que você guardar além disso acelera o resultado.</p>}
  <details className="retirement-assumptions">
   <summary>Premissas da previsão<ChevronDown size={16} className="expand-arrow" aria-hidden/></summary>
   <p className="field-help">Cenário conservador: os investimentos sobem todo ano, sem quedas. O salário e o valor guardado aumentam junto. Os imóveis acompanham a inflação e o real perde um pouco de valor contra a libra. Dívidas são pagas até o fim e metade da parcela quitada vira investimento. A previsão usa sempre os dados atuais de investimentos, conta corrente, cartão, bens e carro, então muda sozinha quando você atualiza qualquer um deles.</p>
   <div className="score-grid">{fields.map(([key,label,unit,step])=><label key={key}>{label}<span className="retirement-input"><input type="number" step={step} value={assumptions[key]} onChange={e=>setAssumptions({...assumptions,[key]:Number(e.target.value)})}/><em>{unit}</em></span></label>)}</div>
   {error&&<p className="error" role="alert">{error}</p>}
   <div className="retirement-actions"><button className="button secondary" disabled={!dirty||busy} onClick={()=>setAssumptions(saved)}>Desfazer</button><button className="button primary" disabled={!dirty||busy} onClick={save}>{busy?'Salvando…':demo?'Aplicar':'Salvar premissas'}</button></div>
  </details>
 </section>;
}
