'use client';
import { useState } from 'react';
import { Upload, Check } from 'lucide-react';
import { importHealthWorkbook } from '@/app/actions';
import { Button } from './ui/button';
export function HistoryImport(){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 return <section className="panel form-page"><h2>Importar histórico</h2><p className="field-help">A planilha fica privada: ela é enviada somente ao seu banco e não é armazenada no site nem no GitHub.</p><form className="form-stack" onSubmit={async event=>{event.preventDefault();setBusy(true);setError('');setMessage('');try{const result=await importHealthWorkbook(new FormData(event.currentTarget));setMessage(`${result.imported} registros preparados para o seu histórico.`);}catch(err){setError((err as Error).message);}finally{setBusy(false);}}}><label>Planilha de saúde (.xlsx)<input required name="workbook" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" type="file"/></label>{error&&<p className="error">{error}</p>}{message&&<p className="success"><Check size={16}/>{message}</p>}<Button disabled={busy}><Upload size={16}/>{busy?'Importando…':'Importar para meu banco'}</Button></form></section>;
}
