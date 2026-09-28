'use client';

import { CalendarDays, FileText, Trash2 } from 'lucide-react';
import type { Deadline } from '@/lib/life';

export function DocumentEditor({ value, onChange, onRemove }: {
  value: Deadline;
  onChange: (value: Deadline) => void;
  onRemove: () => void;
}) {
  const field = (key: 'name' | 'number' | 'issued' | 'date' | 'url', label: string, type = 'text', placeholder?: string) => (
    <label>{label}<input type={type} value={value[key]} placeholder={placeholder} onChange={event => onChange({ ...value, [key]: event.target.value })}/></label>
  );
  return <article className="document-editor">
    <header className="document-editor-heading">
      <span className="document-editor-icon"><FileText size={22} aria-hidden="true"/></span>
      <div><small>{value.kind}</small><h3>{value.name || 'Novo documento'}</h3></div>
      <button type="button" className="document-remove" onClick={onRemove} aria-label={`Remover ${value.name || 'documento'}`}><Trash2 size={16}/><span>Remover</span></button>
    </header>
    <div className="document-editor-body">
      <fieldset className="document-fieldset">
        <legend><FileText size={16} aria-hidden="true"/>Identificação</legend>
        <div className="document-fields">
          <label>Categoria<select value={value.kind} onChange={event => onChange({ ...value, kind: event.target.value as Deadline['kind'] })}>{['Documento','Visto','Passaporte','Garantia','Assinatura','Consulta','Outro'].map(kind => <option key={kind}>{kind}</option>)}</select></label>
          {field('name', 'Nome', 'text', 'Ex.: Passaporte')}
          {field('number', 'Número / referência', 'text', 'Número do documento')}
          {field('url', 'Site / link do documento', 'url', 'https://')}
        </div>
      </fieldset>
      <fieldset className="document-fieldset">
        <legend><CalendarDays size={16} aria-hidden="true"/>Datas</legend>
        <div className="document-fields">
          {field('issued', 'Emissão / início', 'date')}
          {field('date', 'Vencimento / consulta', 'date')}
        </div>
      </fieldset>
      <label className="document-notes">Observações<textarea rows={3} value={value.notes} placeholder="Detalhes adicionais sobre este documento ou compromisso" onChange={event => onChange({ ...value, notes: event.target.value })}/></label>
    </div>
  </article>;
}
