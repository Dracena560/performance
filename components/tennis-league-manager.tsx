'use client';
import {useEffect,useMemo,useState} from 'react';
import {useRouter} from 'next/navigation';
import {CalendarPlus,ChevronDown,ImagePlus,Pencil,Plus,Trash2,UserPlus} from 'lucide-react';
import {Dialog,DialogContent,DialogDescription,DialogTitle} from './ui/dialog';
import {PlayerPhoto} from './tennis-league-view';
import {useLang} from './i18n';
import {savePersonalSection} from '@/app/actions';
import {countryOptions} from '@/lib/countries';
import {flag,leaguePlayerSchema,quarterOf,recordResult,tennisLeagueSchema,type LeaguePlayer,type TennisLeague} from '@/lib/tennis-league';

/** Shrinks an image file to a JPEG data URL under `maxLength` characters. */
async function imageData(file:File,maxSide:number,maxLength:number){
 const bitmap=await createImageBitmap(file);const scale=Math.min(1,maxSide/Math.max(bitmap.width,bitmap.height));
 const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d')!.drawImage(bitmap,0,0,canvas.width,canvas.height);
 for(const q of [.86,.78,.7,.6,.5,.4]){const url=canvas.toDataURL('image/jpeg',q);if(url.length<=maxLength)return url;}
 throw new Error('Imagem grande demais mesmo após compressão.');
}
const emptyPlayer=():LeaguePlayer=>({id:'',name:'',nickname:'',country:'',photo:'',sex:'',hand:'',backhand:'',racket:'',strings:'',level:'',favouriteShot:'',favouritePlayer:'',since:'',notes:'',me:false});
const slug=(text:string)=>text.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

export function LeagueManager({initial,today}:{initial:TennisLeague;today:string}){
 const router=useRouter();const {locale}=useLang();
 const [league,setLeague]=useState(initial),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>setLeague(initial),[initial]);
 const seasons=[...league.seasons].sort((a,b)=>b.start.localeCompare(a.start));
 const [seasonId,setSeasonId]=useState(seasons[0]?.id??'');
 const season=league.seasons.find(s=>s.id===seasonId)??seasons[0];
 const [editing,setEditing]=useState<LeaguePlayer|null>(null);
 const [result,setResult]=useState({home:'',away:'',homeSets:'2',awaySets:'0',score:'',date:today});
 const [caption,setCaption]=useState('');
 const countries=useMemo(()=>typeof Intl!=='undefined'&&'DisplayNames' in Intl?countryOptions(locale):[],[locale]);
 const names=new Map(league.players.map(p=>[p.id,p]));

 async function save(next:TennisLeague,done:string){
  const parsed=tennisLeagueSchema.safeParse(next);if(!parsed.success){setMessage('Não salvo: '+parsed.error.issues[0]?.message);return false;}
  setBusy(true);setMessage('');try{await savePersonalSection('tennis_league',parsed.data);setLeague(parsed.data);setMessage(done);router.refresh();return true;}catch(e){setMessage('Não salvo: '+(e as Error).message);return false;}finally{setBusy(false);}
 }
 const updateSeason=(patch:Partial<NonNullable<typeof season>>)=>season&&setLeague({...league,seasons:league.seasons.map(s=>s.id===season.id?{...s,...patch}:s)});

 async function savePlayer(player:LeaguePlayer){
  const id=player.id||slug(player.name);if(!id){setMessage('Informe o nome.');return;}
  const parsed=leaguePlayerSchema.safeParse({...player,id});if(!parsed.success){setMessage('Não salvo: '+parsed.error.issues[0]?.message);return;}
  const exists=league.players.some(p=>p.id===id);if(!player.id&&exists){setMessage('Já existe um jogador com esse nome.');return;}
  const players=exists?league.players.map(p=>p.id===id?parsed.data:parsed.data.me?{...p,me:false}:p):[...league.players.map(p=>parsed.data.me?{...p,me:false}:p),parsed.data];
  if(await save({...league,players},`${parsed.data.name} salvo.`))setEditing(null);
 }
 async function removePlayer(id:string){
  const used=league.seasons.some(s=>s.matches.some(m=>m.home===id||m.away===id));if(used){setMessage('Este jogador tem resultados registrados; remova os resultados antes.');return;}
  if(!confirm('Remover este jogador de todas as temporadas?'))return;
  if(await save({...league,players:league.players.filter(p=>p.id!==id),seasons:league.seasons.map(s=>({...s,players:s.players.filter(p=>p!==id)}))},'Jogador removido.'))setEditing(null);
 }
 async function newSeason(){
  const latest=seasons[0];const next=latest?quarterOf(new Date(Date.parse(latest.end+'T12:00:00Z')+86400000).toISOString().slice(0,10)):quarterOf(today);
  const months=locale==='en-GB'?['January','February','March','April','May','June','July','August','September','October','November','December']:['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];const m=Number(next.start.slice(5,7))-1;
  if(await save({...league,seasons:[...league.seasons,{id:next.id,name:`${months[m]}–${months[m+2]} ${next.start.slice(0,4)}`,league:latest?.league??'',division:latest?.division??'',start:next.start,end:next.end,players:latest?.players??[],matches:[],images:[],notes:''}]},'Temporada criada.'))setSeasonId(next.id);
 }
 async function addResult(){
  if(!season)return;if(!result.home||!result.away){setMessage('Escolha os dois jogadores.');return;}
  try{const next=recordResult(league,season.id,{home:result.home,away:result.away,homeSets:Number(result.homeSets),awaySets:Number(result.awaySets),score:result.score,date:result.date});if(await save(next,'Resultado salvo.'))setResult({...result,home:'',away:'',score:''});}catch(e){setMessage((e as Error).message);}
 }
 async function addImage(file:File){
  if(!season)return;try{setBusy(true);const url=await imageData(file,1600,1400000);await save({...league,seasons:league.seasons.map(s=>s.id===season.id?{...s,images:[...s.images,{id:crypto.randomUUID(),url,caption,date:today}]}:s)},'Imagem adicionada.');setCaption('');}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}
 }

 return <section className="lg-manager wimbledon" aria-labelledby="lg-manager-title">
  <header className="wb-section-heading"><div><span className="eyebrow">GESTÃO</span><h2 id="lg-manager-title">Gerenciar liga</h2></div><span role="status" className="field-help">{busy?'Salvando…':message}</span></header>

  <details className="information-card finance-expand" open>
   <summary><span className="finance-expand-heading"><span className="information-icon" aria-hidden><UserPlus/></span><strong>Jogadores ({league.players.length})</strong><ChevronDown className="expand-arrow" aria-hidden/></span></summary>
   <div className="information-body">
    <button className="button secondary" onClick={()=>setEditing(emptyPlayer())}><Plus size={16}/>Adicionar jogador</button>
    <ul className="lg-manage-players">{[...league.players].sort((a,b)=>a.name.localeCompare(b.name)).map(p=><li key={p.id}><PlayerPhoto player={p} size={40}/><span><strong>{p.name}{p.me?' · você':''}</strong><small>{[p.country&&flag(p.country),p.hand,p.racket].filter(Boolean).join(' · ')||'Sem detalhes'}</small></span><button className="button icon ghost" aria-label={`Editar ${p.name}`} onClick={()=>setEditing(p)}><Pencil size={17}/></button></li>)}</ul>
   </div>
  </details>

  {season&&<details className="information-card finance-expand" open>
   <summary><span className="finance-expand-heading"><span className="information-icon" aria-hidden><CalendarPlus/></span><strong>Temporada</strong><ChevronDown className="expand-arrow" aria-hidden/></span></summary>
   <div className="information-body">
    <div className="lg-manage-row"><label>Temporada<select value={season.id} onChange={e=>setSeasonId(e.target.value)}>{seasons.map(s=><option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}</select></label><button className="button secondary" disabled={busy} onClick={newSeason}><CalendarPlus size={16}/>Nova temporada</button></div>
    <div className="personal-form-grid">
     <label>Nome<input value={season.name} onChange={e=>updateSeason({name:e.target.value})}/></label>
     <label>Divisão<input value={season.division} onChange={e=>updateSeason({division:e.target.value})}/></label>
     <label>Início<input type="date" value={season.start} onChange={e=>updateSeason({start:e.target.value})}/></label>
     <label>Fim<input type="date" value={season.end} onChange={e=>updateSeason({end:e.target.value})}/></label>
     <label>Liga<input value={season.league} onChange={e=>updateSeason({league:e.target.value})}/></label>
     <label>Observações<input value={season.notes} onChange={e=>updateSeason({notes:e.target.value})}/></label>
    </div>
    <fieldset className="lg-manage-roster"><legend>Jogadores nesta temporada ({season.players.length})</legend>{[...league.players].sort((a,b)=>a.name.localeCompare(b.name)).map(p=><label key={p.id}><input type="checkbox" checked={season.players.includes(p.id)} onChange={e=>updateSeason({players:e.target.checked?[...season.players,p.id]:season.players.filter(x=>x!==p.id)})}/>{p.name}</label>)}</fieldset>
    <div className="lg-manage-row"><button className="button primary" disabled={busy} onClick={()=>save(league,'Temporada salva.')}>Salvar temporada</button><button className="text-link danger-link" disabled={busy} onClick={()=>{if(confirm(`Excluir a temporada ${season.name} e todos os resultados dela?`))void save({...league,seasons:league.seasons.filter(s=>s.id!==season.id)},'Temporada excluída.').then(ok=>ok&&setSeasonId(seasons.find(s=>s.id!==season.id)?.id??''));}}><Trash2 size={15}/>Excluir temporada</button></div>

    <h3>Resultados</h3>
    <div className="lg-result-form">
     <label>Jogador (linha)<select value={result.home} onChange={e=>setResult({...result,home:e.target.value})}><option value="">Escolha</option>{season.players.map(id=><option key={id} value={id}>{names.get(id)?.name}</option>)}</select></label>
     <label>Sets<input type="number" min={0} max={5} value={result.homeSets} onChange={e=>setResult({...result,homeSets:e.target.value})}/></label>
     <label>Sets<input type="number" min={0} max={5} value={result.awaySets} onChange={e=>setResult({...result,awaySets:e.target.value})}/></label>
     <label>Adversário (coluna)<select value={result.away} onChange={e=>setResult({...result,away:e.target.value})}><option value="">Escolha</option>{season.players.filter(id=>id!==result.home).map(id=><option key={id} value={id}>{names.get(id)?.name}</option>)}</select></label>
     <label>Games (opcional)<input placeholder="6-4 3-6 10-8" value={result.score} onChange={e=>setResult({...result,score:e.target.value})}/></label>
     <label>Data<input type="date" value={result.date} onChange={e=>setResult({...result,date:e.target.value})}/></label>
     <button className="button primary" disabled={busy} onClick={addResult}><Plus size={16}/>Salvar resultado</button>
    </div>
    <p className="field-help">Um resultado por par na temporada: salvar de novo o mesmo confronto substitui o anterior.</p>
    <ul className="lg-manage-results">{[...season.matches].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).map(m=><li key={m.id}><span>{names.get(m.home)?.name} <b>{m.homeSets}–{m.awaySets}</b> {names.get(m.away)?.name}</span><small>{[m.date,m.score].filter(Boolean).join(' · ')}</small><button className="button icon ghost" aria-label="Remover resultado" disabled={busy} onClick={()=>{if(confirm('Remover este resultado?'))void save({...league,seasons:league.seasons.map(s=>s.id===season.id?{...s,matches:s.matches.filter(x=>x.id!==m.id)}:s)},'Resultado removido.');}}><Trash2 size={16}/></button></li>)}</ul>

    <h3>Imagens da temporada</h3>
    <div className="lg-manage-row"><label>Legenda<input value={caption} onChange={e=>setCaption(e.target.value)} placeholder="Tabela da temporada"/></label><label className="button secondary lg-upload"><ImagePlus size={16}/>Enviar imagem<input type="file" accept="image/*" hidden onChange={e=>{const f=e.target.files?.[0];if(f)void addImage(f);e.target.value='';}}/></label></div>
    <div className="lg-manage-images">{season.images.map(img=><figure key={img.id}><img src={img.url} alt={img.caption}/><figcaption>{img.caption||'Sem legenda'}<button className="button icon ghost" aria-label="Remover imagem" onClick={()=>{if(confirm('Remover esta imagem?'))void save({...league,seasons:league.seasons.map(s=>s.id===season.id?{...s,images:s.images.filter(i=>i.id!==img.id)}:s)},'Imagem removida.');}}><Trash2 size={15}/></button></figcaption></figure>)}</div>
   </div>
  </details>}

  {editing&&<Dialog open onOpenChange={open=>{if(!open&&!busy)setEditing(null);}}><DialogContent className="dialog-content club-dialog"><DialogTitle>{editing.id?editing.name:'Novo jogador'}</DialogTitle><DialogDescription>Esses dados aparecem na página pública da liga. Não inclua telefone ou e-mail.</DialogDescription>
   <div className="personal-page">
    <div className="lg-photo-edit"><PlayerPhoto player={editing} size={88}/><div><label className="button secondary lg-upload"><ImagePlus size={16}/>Escolher foto<input type="file" accept="image/*" hidden onChange={async e=>{const f=e.target.files?.[0];e.target.value='';if(!f)return;try{setEditing({...editing,photo:await imageData(f,320,150000)});}catch(err){setMessage((err as Error).message);}}}/></label>{editing.photo&&<button className="text-link danger-link" onClick={()=>setEditing({...editing,photo:''})}><Trash2 size={15}/>Remover foto</button>}<small className="field-help">Ou cole uma URL HTTPS de imagem:</small><input value={editing.photo.startsWith('data:')?'':editing.photo} placeholder="https://…" onChange={e=>setEditing({...editing,photo:e.target.value})}/></div></div>
    <div className="personal-form-grid">
     <label>Nome<input value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})}/></label>
     <label>Apelido<input value={editing.nickname} onChange={e=>setEditing({...editing,nickname:e.target.value})}/></label>
     <label>País<select value={editing.country} onChange={e=>setEditing({...editing,country:e.target.value})}><option value="">Não informado</option>{countries.map(c=><option key={c.code} value={c.code}>{flag(c.code)} {c.name}</option>)}</select></label>
     <label>Sexo<select value={editing.sex} onChange={e=>setEditing({...editing,sex:e.target.value})}><option value="">Não informado</option><option>Masculino</option><option>Feminino</option><option>Outro</option></select></label>
     <label>Mão<select value={editing.hand} onChange={e=>setEditing({...editing,hand:e.target.value as LeaguePlayer['hand']})}><option value="">Não informado</option><option>Destro</option><option>Canhoto</option></select></label>
     <label>Backhand<select value={editing.backhand} onChange={e=>setEditing({...editing,backhand:e.target.value as LeaguePlayer['backhand']})}><option value="">Não informado</option><option>Uma mão</option><option>Duas mãos</option></select></label>
     <label>Raquete (marca e modelo)<input value={editing.racket} onChange={e=>setEditing({...editing,racket:e.target.value})}/></label>
     <label>Corda<input value={editing.strings} onChange={e=>setEditing({...editing,strings:e.target.value})}/></label>
     <label>Nível (NTRP, UTR…)<input value={editing.level} onChange={e=>setEditing({...editing,level:e.target.value})}/></label>
     <label>Joga desde<input value={editing.since} onChange={e=>setEditing({...editing,since:e.target.value})}/></label>
     <label>Golpe favorito<input value={editing.favouriteShot} onChange={e=>setEditing({...editing,favouriteShot:e.target.value})}/></label>
     <label>Ídolo no tênis<input value={editing.favouritePlayer} onChange={e=>setEditing({...editing,favouritePlayer:e.target.value})}/></label>
    </div>
    <label>Observações<textarea value={editing.notes} onChange={e=>setEditing({...editing,notes:e.target.value})}/></label>
    <label className="lg-check"><input type="checkbox" checked={editing.me} onChange={e=>setEditing({...editing,me:e.target.checked})}/>Este jogador sou eu</label>
    <div className="lg-manage-row">{editing.id&&<button className="text-link danger-link" disabled={busy} onClick={()=>removePlayer(editing.id)}><Trash2 size={15}/>Remover jogador</button>}<button className="button primary" disabled={busy} onClick={()=>savePlayer(editing)}>{busy?'Salvando…':'Salvar jogador'}</button></div>
   </div>
  </DialogContent></Dialog>}
 </section>;
}
