'use client';
import {useEffect,useState,type ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import {Plus,Trash2} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from './ui/dialog';
import {savePersonalSection} from '@/app/actions';
import {localDate} from '@/lib/domain';
import {upcomingMatches,type TennisProfile,type Appointment} from '@/lib/tennis-club';

export type TennisClubView={profile:TennisProfile;matches:Appointment[];today:string;editProfile:()=>void;manageAgenda:()=>void};

/** Owns the player profile and the agenda (state, dialogs and saving); the page decides where each piece is drawn. */
export function TennisClub({initial,children}:{initial:TennisProfile;children:(view:TennisClubView)=>ReactNode}){
 const router=useRouter();const [profile,setProfile]=useState(initial),[editing,setEditing]=useState(false),[agenda,setAgenda]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>setProfile(initial),[initial]);
 const [now,setNow]=useState(()=>new Date());useEffect(()=>{const timer=setInterval(()=>setNow(new Date()),60000);return()=>clearInterval(timer);},[]);
 const time=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now);
 const today=localDate(now),matches=upcomingMatches(initial.upcoming,today,time);
 async function save(){setBusy(true);setError('');try{await savePersonalSection('tennis',profile);setEditing(false);setAgenda(false);router.refresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const update=(id:string,key:keyof Appointment,value:unknown)=>setProfile(p=>({...p,upcoming:p.upcoming.map(a=>a.id===id?{...a,[key]:value}:a)}));
 return <>
 {children({profile:initial,matches,today,editProfile:()=>{setProfile(initial);setError('');setEditing(true);},manageAgenda:()=>{setProfile(initial);setError('');setAgenda(true);}})}
 <Dialog open={editing||agenda} onOpenChange={open=>{if(!open&&!busy){setEditing(false);setAgenda(false);setProfile(initial);}}}><DialogContent className="dialog-content club-dialog"><DialogTitle>{editing?'Ficha do jogador':'Programação de jogos'}</DialogTitle><DialogDescription>{editing?'Seus dados e equipamentos.':'Partidas agendadas não entram nas estatísticas de jogos realizados. Horários em Europe/London.'}</DialogDescription><div className="personal-page">
 {editing?<div className="personal-form-grid">{([['name','Nome'],['sex','Sexo'],['level','Nível (NTRP, UTR, ranking)'],['since','Joga desde (ano)'],['club','Clube'],['league','Liga / divisão'],['racket','Raquete'],['strings','Corda e tensão'],['grip','Empunhadura']] as const).map(([key,label])=><label key={key}>{label}<input value={profile[key]} onChange={e=>setProfile({...profile,[key]:e.target.value})}/></label>)}{([['hand','Mão dominante',['Destro','Canhoto']],['backhand','Backhand',['Uma mão','Duas mãos']],['surface','Superfície favorita',['Grama','Saibro','Rápida','Carpete','Indoor']]] as const).map(([key,label,options])=><label key={key}>{label}<select value={profile[key]} onChange={e=>setProfile({...profile,[key]:e.target.value})}><option value="">Não informado</option>{options.map(o=><option key={o}>{o}</option>)}</select></label>)}<label>Última encordoação<input type="date" value={profile.restrung} onChange={e=>setProfile({...profile,restrung:e.target.value})}/></label></div>:<><button className="button secondary" onClick={()=>setProfile({...profile,upcoming:[...profile.upcoming,{id:crypto.randomUUID(),date:localDate(),time:'',opponent:'',location:'',type:'Simples · Amistoso',notes:'',cancelled:false}]})}><Plus size={16}/>Adicionar partida</button>{profile.upcoming.length===0&&<p className="field-help">Sua agenda está livre.</p>}{profile.upcoming.map(item=><article className="club-appointment" key={item.id}><div className="personal-form-grid">{([['date','Data','date'],['time','Horário','time'],['opponent','Adversário / parceiro','text'],['location','Local','text']] as const).map(([key,label,type])=><label key={key}>{label}<input type={type} value={item[key]} onChange={e=>update(item.id,key,e.target.value)}/></label>)}<label>Modalidade<select value={item.type} onChange={e=>update(item.id,'type',e.target.value)}>{['Simples · Liga','Simples · Amistoso','Duplas','Treino'].map(t=><option key={t}>{t}</option>)}</select></label><label>Status<select value={item.cancelled?'cancelled':'scheduled'} onChange={e=>update(item.id,'cancelled',e.target.value==='cancelled')}><option value="scheduled">Agendada</option><option value="cancelled">Cancelada</option></select></label></div><label>Observações<textarea value={item.notes} onChange={e=>update(item.id,'notes',e.target.value)}/></label><button className="text-link danger-link" onClick={()=>{if(confirm('Remover esta partida da agenda?'))setProfile({...profile,upcoming:profile.upcoming.filter(a=>a.id!==item.id)});}}><Trash2 size={15}/>Remover</button></article>)}</>}
 {error&&<p role="alert" className="error">{error}</p>}<button className="button primary" disabled={busy} onClick={save}>{busy?'Salvando…':'Salvar alterações'}</button></div></DialogContent></Dialog>
 </>;
}
