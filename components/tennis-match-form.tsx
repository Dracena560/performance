'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, CirclePlus, Minus, Plus } from 'lucide-react';
import { saveTennisMatch, tennisRosterNames } from '@/app/actions';
import { localDate } from '@/lib/domain';
import { tennisSessionTypes } from '@/lib/tennis-club';
import type { PendingMatch } from '@/lib/tennis-pending';
import { Button } from './ui/button';

type SetDraft={felipe:string;adversario:string};
export type TennisMatchDraft={date:string;type:(typeof tennisSessionTypes)[number];partner:string;opponents:string[];appointmentId:string;recordId:string|null};
/** Prefills the form from a scheduled game that is waiting for its result. */
export const pendingDraft=(match:PendingMatch):Partial<TennisMatchDraft>=>({date:match.date,type:match.type,partner:match.partner,opponents:match.opponents,appointmentId:match.id,recordId:match.recordId});
const emptySet=():SetDraft=>({felipe:'',adversario:''});
const numberOrNull=(value:FormDataEntryValue|null)=>value===null||value===''?null:Number(value);

/** Full match form: lineup (partner + two opponents in doubles), sets (2 by default, up to 5) and post-game check-in. */
export function TennisMatchForm({me,players:givenPlayers,initial,onSaved}:{me:string;players?:string[];initial?:Partial<TennisMatchDraft>;onSaved?:()=>void}){
 const router=useRouter();
 const [players,setPlayers]=useState<string[]>(givenPlayers??[]);
 useEffect(()=>{if(givenPlayers)setPlayers(givenPlayers);else tennisRosterNames().then(setPlayers).catch(()=>setPlayers([]));},[givenPlayers]);
 const [type,setType]=useState<TennisMatchDraft['type']>(initial?.type??'Simples · Amistoso');
 const [partner,setPartner]=useState(initial?.partner??'');
 const [opponents,setOpponents]=useState<string[]>([initial?.opponents?.[0]??'',initial?.opponents?.[1]??'']);
 const [sets,setSets]=useState<SetDraft[]>([emptySet(),emptySet()]);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const doubles=type==='Duplas',training=type==='Treino';
 const us=doubles&&partner.trim()?`${me} & ${partner.trim()}`:me;
 const them=(doubles?opponents:opponents.slice(0,1)).map(name=>name.trim()).filter(Boolean).join(' & ')||'Adversário';
 const changeSet=(index:number,key:keyof SetDraft,value:string)=>setSets(current=>current.map((set,i)=>i===index?{...set,[key]:value}:set));
 const submit=async(event:React.FormEvent<HTMLFormElement>)=>{
  event.preventDefault();const form=new FormData(event.currentTarget);setError('');setMessage('');
  if(sets.some(set=>(set.felipe==='')!==(set.adversario===''))){setError('Preencha os dois lados de cada set jogado.');return;}
  setBusy(true);
  try{
   await saveTennisMatch({record_id:initial?.recordId??null,appointment_id:initial?.appointmentId??'',date:String(form.get('date')),match_type:type,partner:doubles?partner:'',opponents:training?[]:doubles?opponents:opponents.slice(0,1),duration_minutes:numberOrNull(form.get('duration_minutes')),sets:training?[]:sets.filter(set=>set.felipe!=='').map(set=>({felipe:Number(set.felipe),adversario:Number(set.adversario)})),physical_energy:numberOrNull(form.get('physical_energy')),clarity:numberOrNull(form.get('clarity')),performance:numberOrNull(form.get('performance')),effort:numberOrNull(form.get('effort')),analysis:String(form.get('analysis')??''),notes:String(form.get('notes')??'')});
   setMessage('Partida salva.');router.refresh();onSaved?.();
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 };
 // Players come only from the roster (Jogadores), so the same person is never typed twice in different ways.
 const playerInput=(label:string,value:string,onChange:(value:string)=>void)=><label>{label}<select value={value} onChange={e=>onChange(e.target.value)}><option value="">Escolher jogador…</option>{[...new Set([...(value&&!players.includes(value)?[value]:[]),...players])].map(name=><option key={name} value={name}>{name}</option>)}</select></label>;
 return <form className="form-stack tennis-match-form" onSubmit={submit}>
  <div className="score-grid">
   <label>Data<input name="date" type="date" required defaultValue={initial?.date??localDate()}/></label>
   <label>Tipo<select value={type} onChange={e=>setType(e.target.value as TennisMatchDraft['type'])}>{tennisSessionTypes.map(option=><option key={option}>{option}</option>)}</select></label>
   {doubles&&playerInput('Seu parceiro',partner,setPartner)}
   {!training&&playerInput(doubles?'Adversário 1':'Adversário',opponents[0],value=>setOpponents([value,opponents[1]]))}
   {doubles&&playerInput('Adversário 2',opponents[1],value=>setOpponents([opponents[0],value]))}
   <label>Duração (min)<input name="duration_minutes" type="number" min="0" step="any"/></label>
  </div>
  {!training&&!players.length&&<p className="field-help">Cadastre os jogadores em Tênis → Jogadores para escolhê-los aqui.</p>}
  {!training&&<div className="scoreboard-entry">
   <h3>Placar por sets</h3>
   <p className="field-help">{us} vs {them}. O resultado é calculado pelos sets.</p>
   {sets.map((set,index)=><div className="set-row" key={index}>
    <span>Set {index+1}</span>
    <label>{doubles?'Vocês':me}<input value={set.felipe} onChange={e=>changeSet(index,'felipe',e.target.value)} type="number" min="0" max="99" inputMode="numeric"/></label>
    <label>{doubles?'Eles':'Adversário'}<input value={set.adversario} onChange={e=>changeSet(index,'adversario',e.target.value)} type="number" min="0" max="99" inputMode="numeric"/></label>
    {sets.length>1&&<button type="button" className="button icon ghost" aria-label={`Remover set ${index+1}`} onClick={()=>setSets(current=>current.filter((_,i)=>i!==index))}><Minus size={16}/></button>}
   </div>)}
   {sets.length<5&&<button type="button" className="text-link" onClick={()=>setSets(current=>[...current,emptySet()])}><Plus size={14}/> Adicionar set</button>}
  </div>}
  <div className="score-grid">
   {([['Energia física · 0–10','physical_energy'],['Clareza mental · 0–10','clarity'],['Performance · 0–10','performance'],['Esforço · 0–10','effort']] as const).map(([label,name])=><label key={name}>{label}<input name={name} type="number" min="0" max="10" step="any"/></label>)}
  </div>
  <label>Análise do jogo<textarea name="analysis" maxLength={10000}/></label>
  <label>Observações<textarea name="notes" maxLength={5000}/></label>
  {error&&<p className="error" role="alert">{error}</p>}
  {message&&<p className="success"><Check size={16}/>{message}</p>}
  <Button disabled={busy}><CirclePlus size={16}/>{busy?'Salvando…':'Salvar partida'}</Button>
 </form>;
}
