'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {Camera,Pencil,Plus,RefreshCw,Trash2,TrendingDown,TrendingUp,Upload,X} from 'lucide-react';
import {Button} from './ui/button';
import {Dialog,DialogContent,DialogDescription,DialogTitle} from './ui/dialog';
import {refreshPortfolio,savePersonalSection} from '@/app/actions';
import {assetTypes,holdingSchema,holdingsFromHistory,holdingsSchema,lotQuantity,position,type Holding,type LiveRow} from '@/lib/holdings';
import type {InvestmentSnapshot} from '@/lib/investments';

const gbp=(v:number|null)=>v===null?'—':new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(v);
const cur=(v:number|null,c:string)=>v===null?'—':new Intl.NumberFormat('en-GB',{style:'currency',currency:c,maximumFractionDigits:v<1?6:2}).format(v);
const qty=(v:number)=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:8}).format(v);
const when=(iso:string|null)=>iso?new Intl.DateTimeFormat('pt-BR',{timeZone:'Europe/London',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(iso)):'—';
const blank=():Holding=>holdingSchema.parse({id:`ativo-${Date.now().toString(36)}`,name:'Novo ativo',source:'yahoo',currency:'USD',lots:[]});

/** Holdings with quantities and purchase lots, priced live; edits save to the profile. */
export function LivePortfolio({initial,rows:initialRows,updatedAt,history,demo=false}:{initial:Holding[];rows:LiveRow[];updatedAt:string|null;history:InvestmentSnapshot[];demo?:boolean}){
 const router=useRouter();
 const [holdings,setHoldings]=useState(initial),[rows,setRows]=useState(initialRows),[at,setAt]=useState(updatedAt),[editing,setEditing]=useState<Holding|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{setHoldings(initial);setRows(initialRows);setAt(updatedAt);},[initial,initialRows,updatedAt]);
 const total=rows.reduce((t,r)=>t+(r.valueGBP??0),0),cost=rows.reduce((t,r)=>t+(r.costGBP??0),0),gain=total-cost;
 const missing=rows.filter(r=>r.valueGBP===null);
 const run=async(fn:()=>Promise<void>)=>{setBusy(true);setMessage('');try{await fn();}catch(e){setMessage(e instanceof Error?e.message:'Algo deu errado.');}finally{setBusy(false);}};
 const save=(next:Holding[])=>run(async()=>{const parsed=holdingsSchema.parse(next);if(!demo){await savePersonalSection('holdings',parsed);const live=await refreshPortfolio();setRows(live.rows);setAt(live.updatedAt);}setHoldings(parsed);setEditing(null);router.refresh();});
 const refresh=(snapshot=false)=>run(async()=>{if(demo){setMessage('Demonstração: cotações fictícias.');return;}const live=await refreshPortfolio(snapshot);setRows(live.rows);setAt(live.updatedAt);setMessage(snapshot?(live.snapshot?.created?'Snapshot da semana criado.':'O snapshot desta semana já existe.'):'Cotações atualizadas.');});
 return <section className="panel live-portfolio" aria-labelledby="live-title">
  <div className="panel-heading"><div><span className="eyebrow">AO VIVO</span><h2 id="live-title">Carteira com cotações</h2><p className="field-help">{`Quantidade de cada ativo × preço atual (Yahoo Finance, CoinGecko). Atualizado ${when(at)}. Um snapshot entra no histórico toda semana.`}</p></div>
   <div className="live-actions"><Button variant="secondary" size="small" disabled={busy} onClick={()=>refresh()}><RefreshCw size={15}/>Atualizar</Button><Button variant="secondary" size="small" disabled={busy} onClick={()=>refresh(true)}><Camera size={15}/>Snapshot agora</Button><Button size="small" onClick={()=>setEditing(blank())}><Plus size={15}/>Ativo</Button></div></div>
  <div className="live-totals">
   <div><small>Valor agora</small><strong>{gbp(total)}</strong></div>
   <div><small>Investido</small><strong>{gbp(cost)}</strong></div>
   <div className={gain>=0?'up':'down'}><small>Resultado</small><strong>{`${gain>=0?'+':''}${gbp(gain)}`}</strong><span>{cost?`${gain>=0?'+':''}${(gain/cost*100).toFixed(1).replace('.',',')}%`:''}</span></div>
  </div>
  {missing.length>0&&<p className="field-help">{`Sem cotação agora: ${missing.map(m=>m.name).join(', ')}. Confira o código do ativo ou informe um preço manual.`}</p>}
  {rows.length?<div className="personal-table-scroll"><table className="summary-table live-table"><thead><tr><th>Ativo</th><th>Quantidade</th><th>Preço médio</th><th>Preço atual</th><th>Valor (£)</th><th>Resultado</th><th/></tr></thead><tbody>{rows.map(r=>{const h=holdings.find(x=>x.id===r.id)!;return <tr key={r.id}>
   <td><strong>{r.name}</strong><small>{[r.symbol,r.account,r.type].filter(Boolean).join(' · ')}</small></td>
   <td>{qty(r.quantity)}</td><td>{cur(r.averagePrice,r.currency)}</td>
   <td>{cur(r.price,r.currency)}<small>{r.source??'sem cotação'}</small></td>
   <td><strong>{gbp(r.valueGBP)}</strong>{r.currency!=='GBP'&&<small>{cur(r.value,r.currency)}</small>}</td>
   <td className={r.gain===null?'':r.gain>=0?'up':'down'}>{r.gain===null?'—':<>{r.gain>=0?<TrendingUp size={14}/>:<TrendingDown size={14}/>}{`${r.gainPct!>=0?'+':''}${String(r.gainPct).replace('.',',')}%`}<small>{cur(r.gain,r.currency)}</small></>}</td>
   <td><Button variant="ghost" size="icon" aria-label={`Editar ${r.name}`} onClick={()=>setEditing(h)}><Pencil size={16}/></Button></td></tr>;})}</tbody></table></div>
  :<div className="live-empty"><p>Cadastre seus ativos com a quantidade comprada, o preço na compra e a moeda. O valor passa a ser atualizado sozinho.</p>{history.length>0&&<Button variant="secondary" onClick={()=>save(holdingsFromHistory(history))}><Upload size={16}/>Começar com as posições atuais</Button>}</div>}
  {message&&<p className="field-help" role="status">{message}</p>}
  {editing&&<HoldingDialog holding={editing} busy={busy} onClose={()=>setEditing(null)} onSave={h=>save(holdings.some(x=>x.id===h.id)?holdings.map(x=>x.id===h.id?h:x):[...holdings,h])} onDelete={holdings.some(x=>x.id===editing.id)?()=>save(holdings.filter(x=>x.id!==editing.id)):undefined}/>}
 </section>;
}

function HoldingDialog({holding,busy,onClose,onSave,onDelete}:{holding:Holding;busy:boolean;onClose:()=>void;onSave:(h:Holding)=>void;onDelete?:()=>void}){
 const [h,setH]=useState(holding);const p=position(h);
 const setLot=(i:number,patch:Partial<Holding['lots'][number]>)=>setH({...h,lots:h.lots.map((l,j)=>j===i?{...l,...patch}:l)});
 const n=(v:string)=>v===''?null:Number(v);
 return <Dialog open onOpenChange={v=>{if(!v&&!busy)onClose();}}><DialogContent className="dialog-content club-dialog record-dialog"><DialogTitle>{h.name}</DialogTitle><DialogDescription>Cada compra é um lote: informe a quantidade ou o valor investido, o preço do ativo na compra e a moeda.</DialogDescription>
  <form className="personal-page" onSubmit={e=>{e.preventDefault();onSave(holdingSchema.parse(h));}}>
   <div className="personal-form-grid">
    <label>Nome<input value={h.name} onChange={e=>setH({...h,name:e.target.value})}/></label>
    <label>Código (ticker)<input value={h.symbol} placeholder="QBTS, URNU.L, BTC" onChange={e=>setH({...h,symbol:e.target.value.toUpperCase()})}/></label>
    <label>Fonte da cotação<select value={h.source} onChange={e=>setH({...h,source:e.target.value as Holding['source']})}><option value="yahoo">Ações e ETFs (Yahoo Finance)</option><option value="coingecko">Cripto (CoinGecko)</option><option value="manual">Manual</option></select></label>
    <label>Moeda do ativo<input value={h.currency} maxLength={3} onChange={e=>setH({...h,currency:e.target.value.toUpperCase()})}/></label>
    <label>Corretora<input value={h.account} onChange={e=>setH({...h,account:e.target.value})}/></label>
    <label>Tipo<select value={h.type} onChange={e=>setH({...h,type:e.target.value as Holding['type']})}>{assetTypes.map(t=><option key={t}>{t}</option>)}</select></label>
    <label>Preço manual (se não houver cotação)<input type="number" step="any" value={h.manualPrice??''} onChange={e=>setH({...h,manualPrice:n(e.target.value)})}/></label>
    <label className="record-check"><input type="checkbox" checked={h.active} onChange={e=>setH({...h,active:e.target.checked})}/>Ativo na carteira</label>
   </div>
   <h3>{`Compras · ${qty(p.quantity)} no total${p.averagePrice?` · preço médio ${cur(p.averagePrice,h.currency)}`:''}`}</h3>
   <div className="lot-list">{h.lots.map((l,i)=><div key={l.id} className="lot-row">
    <label>Data<input type="date" value={l.date} onChange={e=>setLot(i,{date:e.target.value})}/></label>
    <label>Quantidade<input type="number" step="any" value={l.quantity??''} placeholder={l.quantity===null&&l.amount&&l.price?qty(lotQuantity(l)):''} onChange={e=>setLot(i,{quantity:n(e.target.value)})}/></label>
    <label>Valor investido<input type="number" step="any" value={l.amount??''} onChange={e=>setLot(i,{amount:n(e.target.value)})}/></label>
    <label>Preço na compra<input type="number" step="any" value={l.price??''} onChange={e=>setLot(i,{price:n(e.target.value)})}/></label>
    <label>Moeda<input value={l.currency} maxLength={3} onChange={e=>setLot(i,{currency:e.target.value.toUpperCase()})}/></label>
    <button type="button" className="lot-remove" aria-label="Remover compra" onClick={()=>setH({...h,lots:h.lots.filter((_,j)=>j!==i)})}><X size={15}/></button>
   </div>)}</div>
   <button type="button" className="text-link" onClick={()=>setH({...h,lots:[...h.lots,{id:`lot-${Date.now().toString(36)}`,date:new Date().toISOString().slice(0,10),quantity:null,price:null,currency:h.currency,amount:null,notes:''}]})}><Plus size={14}/>Adicionar compra</button>
   {p.mixedCurrencies&&<p className="field-help">Há compras em outra moeda: elas contam na quantidade, mas não no custo médio.</p>}
   <div className="record-actions">{onDelete&&<Button type="button" variant="destructive" disabled={busy} onClick={()=>{if(window.confirm(`Remover ${h.name} da carteira? O histórico de snapshots continua.`))onDelete();}}><Trash2 size={16}/>Remover</Button>}<Button type="submit" disabled={busy}>{busy?'Salvando…':'Salvar'}</Button></div>
  </form></DialogContent></Dialog>;
}
