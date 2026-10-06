'use client';
import {useState} from 'react';
import {Dialog,DialogContent,DialogDescription,DialogTitle} from './ui/dialog';
import {Button} from './ui/button';

export type Field={key:string;label:string;type?:'text'|'date'|'number'|'select'|'textarea'|'checkbox';options?:readonly string[];placeholder?:string;wide?:boolean};
type Row=Record<string,any>;

/** Reads a dotted key such as "vet.phone". */
export const getPath=(row:Row,key:string)=>key.split('.').reduce<any>((v,k)=>v?.[k],row);
function setPath(row:Row,key:string,value:unknown):Row{const [head,...rest]=key.split('.');return rest.length?{...row,[head]:setPath(row[head]??{},rest.join('.'),value)}:{...row,[head]:value};}

/** A dialog with a two-column form built from a field list; numbers become numbers (or null when empty). */
export function RecordDialog({title,description,fields,initial,onSave,onClose,onDelete}:{title:string;description?:string;fields:Field[];initial:Row;onSave:(row:Row)=>Promise<void>;onClose:()=>void;onDelete?:()=>Promise<void>}){
 const [row,setRow]=useState<Row>(initial),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const run=async(action:()=>Promise<void>)=>{setBusy(true);setError('');try{await action();onClose();}catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar.');}finally{setBusy(false);}};
 return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose();}}>
  <DialogContent className="dialog-content club-dialog record-dialog"><DialogTitle>{title}</DialogTitle>{description&&<DialogDescription>{description}</DialogDescription>}
   <form className="personal-page" onSubmit={e=>{e.preventDefault();run(()=>onSave(row));}}>
    <div className="personal-form-grid">{fields.map(f=>{const value=getPath(row,f.key);const set=(v:unknown)=>setRow(r=>setPath(r,f.key,v));
     if(f.type==='checkbox')return <label key={f.key} className="record-check"><input type="checkbox" checked={Boolean(value)} onChange={e=>set(e.target.checked)}/>{f.label}</label>;
     return <label key={f.key} className={f.wide||f.type==='textarea'?'record-wide':''}>{f.label}
      {f.type==='select'?<select value={value??''} onChange={e=>set(e.target.value)}>{f.options!.map(o=><option key={o}>{o}</option>)}</select>
      :f.type==='textarea'?<textarea value={value??''} rows={3} placeholder={f.placeholder} onChange={e=>set(e.target.value)}/>
      :<input type={f.type==='date'?'date':f.type==='number'?'number':'text'} step={f.type==='number'?'any':undefined} inputMode={f.type==='number'?'decimal':undefined} placeholder={f.placeholder} value={value??''} onChange={e=>set(f.type==='number'?(e.target.value===''?null:Number(e.target.value)):e.target.value)}/>}
     </label>;})}</div>
    {error&&<p className="error" role="alert">{error}</p>}
    <div className="record-actions">{onDelete&&<Button type="button" variant="destructive" disabled={busy} onClick={()=>{if(window.confirm('Excluir este item?'))run(onDelete);}}>Excluir</Button>}<Button type="submit" disabled={busy}>{busy?'Salvando…':'Salvar'}</Button></div>
   </form>
  </DialogContent>
 </Dialog>;
}
