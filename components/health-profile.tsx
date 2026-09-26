'use client';
import { useState } from 'react';
import { Save } from 'lucide-react';
import { saveHealthProfile } from '@/app/actions';
import { Button } from './ui/button';
const baseline={
 'Condição e histórico':'Prolapso leve da válvula mitral, conforme relato médico. Histórico de entorses no tornozelo no futebol, incluindo um episódio grave com recuperação funcional completa.',
 'Histórico familiar relevante':'Avó materna: hipertensão, AVC e tireoide. Avó paterna: diabetes e evento cardíaco. Avô paterno: cirrose de causa não esclarecida.',
 'Sensibilidades digestivas':'Algumas massas com glúten podem causar gases e estufamento; feijão, grão-de-bico e lentilha podem causar gases e diarreia; carne vermelha/churrasco pode causar gases; pilsen e lager em maior quantidade podem causar gases e diarreia. Alguns queijos podem desencadear enxaqueca com aura.',
 'Corpo e referência':'Altura 1,80 m. Peso de referência recente na planilha: 70,9 kg em 10/09/2026. Usar tendência, não leitura isolada. Histórico anterior: 78 kg, 14,9% de gordura corporal.',
 'Objetivo':'Manter saúde e atividade ao longo da vida, com mente clara e corpo capaz de caminhar, viajar e jogar tênis.',
 'Rotina e atividade':'Caminhadas com Caju pela manhã e fim da tarde; trabalho 9h–17h; tênis frequente; alongamento e faixas de resistência; sauna, jacuzzi e recuperação no clube quando apropriado.',
 'Suplementos de dia':'Vitamina D, vitamina E, ômega-3, CoQ10, selênio, vitamina C e glucosamina.',
 'Suplementos de noite':'Magnésio e ashwagandha.',
};
export function HealthProfile({initial}:{initial?:Record<string,unknown>}){const [value,setValue]=useState<Record<string,unknown>>({...baseline,...initial}),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');return <section className="panel form-page"><h2>Meu perfil de saúde</h2><p className="field-help">Base privada usada para contextualizar os registros e os insights. Revise antes de usar como referência contínua.</p><form className="form-stack" onSubmit={async event=>{event.preventDefault();setBusy(true);setError('');try{await saveHealthProfile(value);setMessage('Perfil de saúde salvo.');}catch(err){setError((err as Error).message);}finally{setBusy(false);}}}>{Object.entries(value).map(([key,text])=><label key={key}>{key}<textarea value={String(text??'')} maxLength={5000} onChange={e=>setValue(current=>({...current,[key]:e.target.value}))}/></label>)}<label>Outra informação de saúde relevante<textarea value={String(value['Outras informações']??'')} maxLength={5000} onChange={e=>setValue(current=>({...current,'Outras informações':e.target.value}))}/></label>{error&&<p className="error">{error}</p>}{message&&<p className="success">{message}</p>}<Button disabled={busy}><Save size={16}/>{busy?'Salvando…':'Salvar perfil'}</Button></form></section>}
