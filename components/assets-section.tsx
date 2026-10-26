'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Car, ChevronDown, FileText, Home, LandPlot, Package, Pencil, Plus, Trash2, X } from 'lucide-react';
import { savePersonalSection } from '@/app/actions';
import { assetCurrencies, assetDebt, assetTypes, assetValue, assetsInPounds, formatMoney, isPaidOff, registerInstalment, remainingInstalments, type Asset, type AssetCurrency, type AssetFinancing } from '@/lib/assets';
import { localDate } from '@/lib/domain';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';

const icons={'Imóvel':Home,'Terreno':LandPlot,'Veículo':Car,'Outro':Package} as const;
const pounds=(value:number)=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(value);
const br=(date:string)=>date?date.split('-').reverse().join('/'):'—';
const monthYear=(date:string)=>date?new Date(date+'T12:00:00Z').toLocaleDateString('pt-BR',{timeZone:'UTC',month:'short',year:'numeric'}).replace('.',''):'—';
const emptyFinancing=():AssetFinancing=>({creditor:'',contract:'',indexer:'',contractValue:null,downPayment:null,instalmentsTotal:null,instalmentsPaid:0,instalmentValue:null,dueDay:null,nextDue:'',lastDue:'',outstanding:null,outstandingDate:'',paidTotal:null,notes:''});
const emptyAsset=():Asset=>({id:crypto.randomUUID(),name:'',type:'Imóvel',location:'',currency:'BRL',purchaseDate:'',purchasePrice:null,currentValue:null,currentValueDate:'',details:[],financing:null,documents:[],notes:''});
const num=(value:string)=>value.trim()===''?null:Number(value.replace(',','.'));

/** Financeiro › Bens: what you own, what is paid off and what is still being paid. */
export function AssetsSection({initial,rates,demo=false}:{initial:Asset[];rates:Partial<Record<AssetCurrency,number>>;demo?:boolean}){
 const router=useRouter();
 const [assets,setAssets]=useState(initial);useEffect(()=>setAssets(initial),[initial]);
 const [editing,setEditing]=useState<Asset|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const today=localDate();
 const totals=assetsInPounds(assets,rates);
 const paidOff=assets.filter(isPaidOff).length;
 const persist=async(next:Asset[])=>{setBusy(true);setError('');try{if(!demo){await savePersonalSection('assets',next);router.refresh();}setAssets(next);return true;}catch(e){setError((e as Error).message);return false;}finally{setBusy(false);}};
 const remove=(asset:Asset)=>{if(confirm(`Remover ${asset.name}?`))persist(assets.filter(item=>item.id!==asset.id));};
 const payInstalment=(asset:Asset)=>{const f=asset.financing!;if(confirm(`Registrar a parcela ${f.instalmentsPaid+1}${f.instalmentsTotal?` de ${f.instalmentsTotal}`:''} de ${asset.name}${f.instalmentValue?` (${formatMoney(f.instalmentValue,asset.currency)})`:''} como paga hoje?`))persist(assets.map(item=>item.id===asset.id?registerInstalment(item,today):item));};

 return <details className="information-card finance-expand assets-expand" id="bens">
  <summary>
   <span className="finance-expand-heading"><span className="information-icon" aria-hidden><Building2/></span><strong>Bens</strong><ChevronDown className="expand-arrow" aria-hidden/></span>
   <span className="finance-expand-stats">
    <span><small>Bens</small><b>{assets.length}</b></span>
    <span><small>Quitados</small><b>{paidOff} de {assets.length}</b></span>
    <span><small>Valor estimado</small><b>{assets.length?pounds(totals.value):'—'}</b></span>
    <span><small>Saldo devedor</small><b>{totals.debt?pounds(totals.debt):'—'}</b></span>
   </span>
  </summary>
  <div className="information-body assets-body">
   <div className="assets-toolbar"><p className="field-help">Imóveis, terrenos, veículos e outros bens. Valores em libras usam a cotação do dia{rates.BRL?` (R$ 1 = £ ${rates.BRL.toLocaleString('pt-BR',{maximumFractionDigits:4})})`:''}. Bens sem valor atual usam o valor de compra.</p><button className="button primary" onClick={()=>{setError('');setEditing(emptyAsset());}}><Plus size={17}/>Adicionar bem</button></div>
   {error&&!editing&&<p className="error" role="alert">{error}</p>}
   {assets.length?<div className="assets-grid">{assets.map(asset=>{
    const Icon=icons[asset.type],f=asset.financing,left=f?remainingInstalments(f):null,debt=assetDebt(asset),value=assetValue(asset);
    const overdue=!!f&&!isPaidOff(asset)&&!!f.nextDue&&f.nextDue<today;
    const pct=f&&f.instalmentsTotal?Math.round(f.instalmentsPaid/f.instalmentsTotal*100):null;
    return <article key={asset.id} className="panel asset-card">
     <header>
      <span className="asset-icon" aria-hidden><Icon size={20}/></span>
      <div><h3>{asset.name}</h3><small>{[asset.type,asset.location].filter(Boolean).join(' · ')}</small></div>
      <span className={`asset-status ${isPaidOff(asset)?'paid':overdue?'late':'paying'}`}>{isPaidOff(asset)?'Quitado':overdue?'Parcela em aberto':'Pagando'}</span>
     </header>
     <dl className="asset-facts">
      <div><dt>{asset.currentValue!==null?'Valor atual':'Valor de compra'}</dt><dd>{value===null?'—':formatMoney(value,asset.currency)}</dd>{asset.currentValue!==null&&asset.currentValueDate&&<small>em {br(asset.currentValueDate)}</small>}</div>
      {asset.purchaseDate&&<div><dt>Compra</dt><dd>{br(asset.purchaseDate)}</dd>{asset.currentValue!==null&&asset.purchasePrice!==null&&<small>{formatMoney(asset.purchasePrice,asset.currency)}</small>}</div>}
      {asset.details.map(([label,detail])=><div key={label}><dt>{label}</dt><dd>{detail||'—'}</dd></div>)}
     </dl>
     {f&&!isPaidOff(asset)&&<section className="asset-financing">
      {pct!==null&&<div className="asset-progress"><span>{f.instalmentsPaid} de {f.instalmentsTotal} parcelas pagas</span><b>{pct}%</b><i><em style={{width:`${pct}%`}}/></i></div>}
      <dl className="asset-facts">
       <div><dt>Saldo devedor</dt><dd className="bad">{debt===null?'—':formatMoney(debt,asset.currency)}</dd>{f.outstandingDate&&<small>extrato de {br(f.outstandingDate)}</small>}</div>
       <div><dt>Parcela atual</dt><dd>{f.instalmentValue===null?'—':formatMoney(f.instalmentValue,asset.currency)}</dd>{f.indexer&&<small>corrigida por {f.indexer}</small>}</div>
       <div><dt>Próxima parcela</dt><dd className={overdue?'bad':''}>{br(f.nextDue)}</dd>{overdue&&<small>em aberto</small>}</div>
       <div><dt>Faltam</dt><dd>{left===null?'—':`${left} ${left===1?'parcela':'parcelas'}`}</dd>{f.lastDue&&<small>até {monthYear(f.lastDue)}</small>}</div>
       {f.paidTotal!==null&&<div><dt>Já pago</dt><dd className="good">{formatMoney(f.paidTotal,asset.currency)}</dd></div>}
       {(f.creditor||f.contract)&&<div className="wide"><dt>Contrato</dt><dd>{[f.creditor,f.contract].filter(Boolean).join(' · ')}</dd></div>}
      </dl>
      {f.notes&&<p className="field-help">{f.notes}</p>}
     </section>}
     {asset.documents.length>0&&<ul className="asset-docs">{asset.documents.map(doc=><li key={doc.name}><FileText size={14}/>{doc.url?<a href={doc.url} target="_blank" rel="noreferrer">{doc.name}</a>:doc.name}</li>)}</ul>}
     {asset.notes&&<p className="asset-notes">{asset.notes}</p>}
     <footer>
      {f&&!isPaidOff(asset)&&<button className="button tinted small" disabled={busy} onClick={()=>payInstalment(asset)}>Registrar parcela paga</button>}
      <span><button className="button icon ghost" aria-label={`Editar ${asset.name}`} onClick={()=>{setError('');setEditing(structuredClone(asset));}}><Pencil size={16}/></button><button className="button icon ghost" aria-label={`Remover ${asset.name}`} onClick={()=>remove(asset)}><Trash2 size={16}/></button></span>
     </footer>
    </article>;})}</div>:<p className="panel wb-empty">Nenhum bem cadastrado. Adicione aqui ou envie o extrato/escritura pelo ChatGPT/Claude.</p>}
  </div>
  {editing&&<AssetEditor asset={editing} busy={busy} error={error} onClose={()=>setEditing(null)} onSave={async asset=>{const exists=assets.some(item=>item.id===asset.id);if(await persist(exists?assets.map(item=>item.id===asset.id?asset:item):[...assets,asset]))setEditing(null);}}/>}
 </details>;
}

function AssetEditor({asset,busy,error,onClose,onSave}:{asset:Asset;busy:boolean;error:string;onClose:()=>void;onSave:(asset:Asset)=>void}){
 const [draft,setDraft]=useState(asset);
 const set=<K extends keyof Asset>(key:K,value:Asset[K])=>setDraft(current=>({...current,[key]:value}));
 const fin=<K extends keyof AssetFinancing>(key:K,value:AssetFinancing[K])=>setDraft(current=>({...current,financing:{...(current.financing??emptyFinancing()),[key]:value}}));
 const f=draft.financing;
 const moneyInput=(label:string,value:number|null,onChange:(value:number|null)=>void)=><label>{label}<input inputMode="decimal" value={value??''} onChange={e=>onChange(num(e.target.value))}/></label>;
 return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose();}}><DialogContent className="dialog-content asset-dialog">
  <DialogTitle>{asset.name?`Editar ${asset.name}`:'Novo bem'}</DialogTitle>
  <DialogDescription>Preencha o que tiver. Dá para completar depois, aqui ou pelo ChatGPT/Claude.</DialogDescription>
  <form className="form-stack" onSubmit={e=>{e.preventDefault();onSave({...draft,details:draft.details.filter(([label])=>label.trim()),documents:draft.documents.filter(doc=>doc.name.trim())});}}>
   <div className="score-grid">
    <label>Nome<input required value={draft.name} onChange={e=>set('name',e.target.value)} placeholder="Terreno em São Carlos"/></label>
    <label>Tipo<select value={draft.type} onChange={e=>set('type',e.target.value as Asset['type'])}>{assetTypes.map(type=><option key={type}>{type}</option>)}</select></label>
    <label>Local<input value={draft.location} onChange={e=>set('location',e.target.value)} placeholder="Cidade, bairro"/></label>
    <label>Moeda<select value={draft.currency} onChange={e=>set('currency',e.target.value as AssetCurrency)}>{assetCurrencies.map(currency=><option key={currency}>{currency}</option>)}</select></label>
    <label>Data da compra<input type="date" value={draft.purchaseDate} onChange={e=>set('purchaseDate',e.target.value)}/></label>
    {moneyInput('Valor de compra',draft.purchasePrice,value=>set('purchasePrice',value))}
    {moneyInput('Valor atual estimado',draft.currentValue,value=>set('currentValue',value))}
    <label>Data do valor atual<input type="date" value={draft.currentValueDate} onChange={e=>set('currentValueDate',e.target.value)}/></label>
   </div>
   <fieldset className="asset-rows"><legend>Informações do bem</legend>
    {draft.details.map(([label,value],i)=><div key={i}><input aria-label="Informação" placeholder="Ex.: Lote" value={label} onChange={e=>set('details',draft.details.map((row,j)=>j===i?[e.target.value,row[1]]:row))}/><input aria-label="Valor" placeholder="Ex.: 120" value={value} onChange={e=>set('details',draft.details.map((row,j)=>j===i?[row[0],e.target.value]:row))}/><button type="button" className="button icon ghost" aria-label="Remover informação" onClick={()=>set('details',draft.details.filter((_,j)=>j!==i))}><X size={16}/></button></div>)}
    <button type="button" className="text-link" onClick={()=>set('details',[...draft.details,['','']])}><Plus size={14}/> Adicionar informação</button>
   </fieldset>
   <label className="checkbox-label"><input type="checkbox" checked={!!f} onChange={e=>set('financing',e.target.checked?emptyFinancing():null)}/><span>Ainda estou pagando (financiamento ou parcelamento)</span></label>
   {f&&<fieldset className="asset-rows"><legend>Pagamento</legend><div className="score-grid">
    <label>Credor<input value={f.creditor} onChange={e=>fin('creditor',e.target.value)}/></label>
    <label>Contrato<input value={f.contract} onChange={e=>fin('contract',e.target.value)}/></label>
    <label>Índice de correção<input value={f.indexer} onChange={e=>fin('indexer',e.target.value)} placeholder="IPCA, INCC, Fixo"/></label>
    {moneyInput('Valor do contrato',f.contractValue,value=>fin('contractValue',value))}
    {moneyInput('Entrada',f.downPayment,value=>fin('downPayment',value))}
    <label>Total de parcelas<input type="number" min="0" value={f.instalmentsTotal??''} onChange={e=>fin('instalmentsTotal',num(e.target.value))}/></label>
    <label>Parcelas pagas<input type="number" min="0" value={f.instalmentsPaid} onChange={e=>fin('instalmentsPaid',Number(e.target.value)||0)}/></label>
    {moneyInput('Parcela atual',f.instalmentValue,value=>fin('instalmentValue',value))}
    <label>Dia do vencimento<input type="number" min="1" max="31" value={f.dueDay??''} onChange={e=>fin('dueDay',num(e.target.value))}/></label>
    <label>Próxima parcela<input type="date" value={f.nextDue} onChange={e=>fin('nextDue',e.target.value)}/></label>
    <label>Última parcela<input type="date" value={f.lastDue} onChange={e=>fin('lastDue',e.target.value)}/></label>
    {moneyInput('Saldo devedor',f.outstanding,value=>fin('outstanding',value))}
    <label>Data do saldo<input type="date" value={f.outstandingDate} onChange={e=>fin('outstandingDate',e.target.value)}/></label>
    {moneyInput('Total já pago',f.paidTotal,value=>fin('paidTotal',value))}
   </div><label>Observações do pagamento<textarea rows={2} value={f.notes} onChange={e=>fin('notes',e.target.value)}/></label></fieldset>}
   <fieldset className="asset-rows"><legend>Documentos</legend>
    {draft.documents.map((doc,i)=><div key={i}><input aria-label="Documento" placeholder="Escritura, contrato…" value={doc.name} onChange={e=>set('documents',draft.documents.map((item,j)=>j===i?{...item,name:e.target.value}:item))}/><input aria-label="Link" placeholder="Link (opcional)" value={doc.url} onChange={e=>set('documents',draft.documents.map((item,j)=>j===i?{...item,url:e.target.value}:item))}/><button type="button" className="button icon ghost" aria-label="Remover documento" onClick={()=>set('documents',draft.documents.filter((_,j)=>j!==i))}><X size={16}/></button></div>)}
    <button type="button" className="text-link" onClick={()=>set('documents',[...draft.documents,{name:'',url:''}])}><Plus size={14}/> Adicionar documento</button>
   </fieldset>
   <label>Observações<textarea rows={3} value={draft.notes} onChange={e=>set('notes',e.target.value)}/></label>
   {error&&<p className="error" role="alert">{error}</p>}
   <button className="button primary" disabled={busy}>{busy?'Salvando…':'Salvar bem'}</button>
  </form>
 </DialogContent></Dialog>;
}
