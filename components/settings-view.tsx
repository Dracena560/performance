'use client';
import {useEffect,useMemo,useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {ArrowDown,ArrowUp,Bell,Brain,Database,Dog,Download,Droplets,Dumbbell,Eye,EyeOff,Pill,Plus,RotateCcw,Save,Settings2,Sparkles,Target,Trash2,UserRound,Wallet,X} from 'lucide-react';
import {Button} from './ui/button';
import {ThemeToggle} from './theme-toggle';
import {LanguageToggle} from './i18n';
import {exportProfile,savePersonalSection} from '@/app/actions';
import {defaultSettings,dimensionKeys,isBuiltin,navigationToggles,reminderSources,settingsSchema,type Settings,type Topic} from '@/lib/settings';

const dimensionLabel:Record<string,string>={mente:'Mente',humor:'Humor',corpo:'Corpo',digestao:'Digestão'};
const kindLabel:Record<Topic['kind'],string>={checkin:'Check-in',activity:'Atividade',bowel:'Fezes'};
const navLabel:Record<string,string>={financeiro:'Financeiro',tenis:'Tênis',caju:'Caju'};
const sections=[['perfil','Perfil e menu',UserRound],['registrar','Registrar',Brain],['suplementos','Vitaminas',Sparkles],['remedios','Remédios',Pill],['agua','Água',Droplets],['metas','Metas do dia',Target],['vencimentos','Vencimentos',Bell],['financas','Finanças',Wallet],['treino','Treino',Dumbbell],['caju','Caju',Dog],['dados','Dados',Database]] as const;
const slug=(text:string)=>text.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,50)||'topico';
const move=<T,>(list:T[],i:number,d:number)=>{const j=i+d;if(j<0||j>=list.length)return list;const next=[...list];[next[i],next[j]]=[next[j],next[i]];return next;};
const numberValue=(v:string)=>v===''?0:Number(v);

/** Adds an item to a list from a small text field (Enter or the + button). */
function AddField({placeholder,onAdd,label}:{placeholder:string;onAdd:(v:string)=>void;label:string}){
 const [value,setValue]=useState('');const add=()=>{const v=value.trim();if(v){onAdd(v);setValue('');}};
 return <div className="set-add"><input aria-label={label} placeholder={placeholder} value={value} onChange={e=>setValue(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();add();}}}/><Button type="button" variant="secondary" size="small" onClick={add}><Plus size={15}/>Adicionar</Button></div>;
}
function Toggle({checked,onChange,label}:{checked:boolean;onChange:(v:boolean)=>void;label:string}){
 return <label className="set-toggle"><input type="checkbox" role="switch" checked={checked} onChange={e=>onChange(e.target.checked)}/><span aria-hidden/>{label}</label>;
}
function NumberField({label,value,onChange,min,max,step=1,unit,help}:{label:string;value:number;onChange:(v:number)=>void;min:number;max:number;step?:number;unit?:string;help?:string}){
 return <label className="set-number">{label}<span><input type="number" min={min} max={max} step={step} value={value} onChange={e=>onChange(numberValue(e.target.value))}/>{unit&&<small>{unit}</small>}</span>{help&&<small className="field-help">{help}</small>}</label>;
}
function Section({id,icon,title,help,children,actions}:{id:string;icon:React.ReactNode;title:string;help:string;children:React.ReactNode;actions?:React.ReactNode}){
 return <section className="panel set-section" id={id} aria-labelledby={`${id}-title`}><div className="panel-heading"><div><h2 id={`${id}-title`}>{icon} {title}</h2><p className="field-help">{help}</p></div>{actions}</div>{children}</section>;
}

/** One Registrar topic: name, how it is chosen, its dimension and every option with its score. */
function TopicEditor({topic,index,count,onChange,onMove,onRemove}:{topic:Topic;index:number;count:number;onChange:(t:Topic)=>void;onMove:(d:number)=>void;onRemove:()=>void}){
 const set=(patch:Partial<Topic>)=>onChange({...topic,...patch});
 const scored=topic.dimension!==null;
 return <article className={`set-topic${topic.enabled?'':' off'}`}>
  <header>
   <input className="set-topic-title" aria-label="Nome do tópico" value={topic.title} onChange={e=>set({title:e.target.value})}/>
   <div className="set-row-actions">
    <button type="button" aria-label="Subir tópico" disabled={index===0} onClick={()=>onMove(-1)}><ArrowUp size={16}/></button>
    <button type="button" aria-label="Descer tópico" disabled={index===count-1} onClick={()=>onMove(1)}><ArrowDown size={16}/></button>
    <button type="button" aria-label={topic.enabled?'Ocultar tópico':'Mostrar tópico'} onClick={()=>set({enabled:!topic.enabled})}>{topic.enabled?<Eye size={16}/>:<EyeOff size={16}/>}</button>
    {!isBuiltin(topic.id)&&<button type="button" className="danger" aria-label="Excluir tópico" onClick={()=>{if(window.confirm(`Excluir o tópico ${topic.title}? Registros antigos continuam salvos.`))onRemove();}}><Trash2 size={16}/></button>}
   </div>
  </header>
  <div className="set-topic-meta">
   <label>Instrução<input value={topic.help} placeholder="Ex.: selecione quantos quiser" onChange={e=>set({help:e.target.value})}/></label>
   {topic.kind==='checkin'&&<label>Conta no bem-estar como<select value={topic.dimension??''} onChange={e=>set({dimension:(e.target.value||null) as Topic['dimension']})}><option value="">Não conta (só registro)</option>{dimensionKeys.map(d=><option key={d} value={d}>{dimensionLabel[d]}</option>)}</select></label>}
   <Toggle checked={topic.multiple} onChange={v=>set({multiple:v})} label="Permite várias opções"/>
   <Toggle checked={topic.notes} onChange={v=>set({notes:v})} label="Campo de observação"/>
  </div>
  <details className="set-topic-options" open={index===0}><summary>{`${topic.options.length} ${topic.options.length===1?'opção':'opções'}`}{scored&&<small>{` · média ${(topic.options.filter(o=>o.score!==null).reduce((t,o)=>t+(o.score??0),0)/Math.max(1,topic.options.filter(o=>o.score!==null).length)).toFixed(1).replace('.',',')}`}</small>}</summary>
  <ul className="set-options">{topic.options.map((o,i)=><li key={i}>
   <input aria-label="Nome da opção" value={o.label} onChange={e=>set({options:topic.options.map((x,j)=>j===i?{...x,label:e.target.value}:x)})}/>
   {scored&&<label className="set-score" title="Nota de 0 (ruim) a 10 (ótimo)"><span>Nota</span><input type="number" min={0} max={10} step={0.5} aria-label={`Nota de ${o.label}`} value={o.score??''} onChange={e=>set({options:topic.options.map((x,j)=>j===i?{...x,score:e.target.value===''?null:Math.max(0,Math.min(10,Number(e.target.value)))}:x)})}/><i style={{['--score' as string]:`${(o.score??0)*10}%`}} aria-hidden/></label>}
   <div className="set-row-actions">
    <button type="button" aria-label="Subir opção" disabled={i===0} onClick={()=>set({options:move(topic.options,i,-1)})}><ArrowUp size={15}/></button>
    <button type="button" aria-label="Descer opção" disabled={i===topic.options.length-1} onClick={()=>set({options:move(topic.options,i,1)})}><ArrowDown size={15}/></button>
    <button type="button" className="danger" aria-label={`Remover ${o.label}`} onClick={()=>set({options:topic.options.filter((_,j)=>j!==i)})}><X size={15}/></button>
   </div></li>)}</ul>
  <AddField label={`Nova opção em ${topic.title}`} placeholder="Nova opção" onAdd={v=>set({options:[...topic.options,{label:v,score:scored?5:null}]})}/>
  </details>
 </article>;
}

export function SettingsView({initial,demo=false}:{initial:Settings;demo?:boolean}){
 const router=useRouter();
 const [s,setS]=useState(initial);useEffect(()=>setS(initial),[initial]);
 const [kind,setKind]=useState<Topic['kind']>('checkin'),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const dirty=useMemo(()=>JSON.stringify(s)!==JSON.stringify(initial),[s,initial]);
 const patch=<K extends keyof Settings>(key:K,value:Settings[K])=>setS(c=>({...c,[key]:value}));
 const topics=s.diary.topics;const ofKind=topics.map((t,i)=>({t,i})).filter(x=>x.t.kind===kind);
 const setTopics=(next:Topic[])=>patch('diary',{topics:next});
 const save=async()=>{setBusy(true);setError('');setMessage('');try{const parsed=settingsSchema.safeParse(s);if(!parsed.success)throw new Error(parsed.error.issues[0]?.message??'Revise os campos.');if(!demo)await savePersonalSection('settings',parsed.data);setMessage(demo?'Demonstração: nada foi salvo.':'Configurações salvas.');router.refresh();}catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar.');}finally{setBusy(false);}};
 const download=async()=>{try{const data=demo?{personal_settings:s}:await exportProfile();const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`painel-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);}catch(e){setError(e instanceof Error?e.message:'Não foi possível exportar.');}};

 return <div className="settings-page">
  <header className="page-heading"><div className="health-hero-lead"><span className="health-hero-icon" aria-hidden style={{['--icon-tint' as string]:'var(--sys-gray, #8e8e93)'}}><Settings2/></span><div><span className="eyebrow">AJUSTES</span><h1>Configurações</h1><p>Tudo o que o painel usa e que você pode mudar: opções do Registrar, notas, rotinas, metas, alertas e regras.</p></div></div></header>
  <nav className="set-jump" aria-label="Seções das configurações">{sections.map(([id,label,Icon])=><a key={id} href={`#${id}`}><Icon size={15}/>{label}</a>)}</nav>

  <Section id="perfil" icon={<UserRound size={19}/>} title="Perfil e menu" help="Como o painel se apresenta e quais seções aparecem no menu.">
   <div className="set-grid">
    <label>Seu nome<input value={s.profile.name} onChange={e=>patch('profile',{...s.profile,name:e.target.value})}/></label>
    <label>Subtítulo do menu<input value={s.profile.tagline} placeholder="Painel pessoal" onChange={e=>patch('profile',{...s.profile,tagline:e.target.value})}/></label>
   </div>
   <h3>Seções no menu</h3>
   <div className="set-toggles">{navigationToggles.map(k=><Toggle key={k} label={navLabel[k]} checked={!s.menu.hidden.includes(k)} onChange={v=>patch('menu',{hidden:v?s.menu.hidden.filter(x=>x!==k):[...s.menu.hidden,k]})}/>)}</div>
   <p className="field-help">Hoje, Saúde e Minhas informações ficam sempre visíveis. Uma seção oculta continua acessível pelo endereço.</p>
   <h3>Aparência e idioma</h3>
   <div className="set-inline"><span>Tema</span><ThemeToggle/><span>Idioma</span><LanguageToggle/></div>
   <p className="field-help">O site sempre abre no tema claro; a troca vale para este navegador.</p>
  </Section>

  <Section id="registrar" icon={<Brain size={19}/>} title="Registrar: tópicos e opções" help="Os tópicos que aparecem no botão Registrar. Nos tópicos do check-in, cada opção tem uma nota de 0 a 10 que alimenta o bem-estar (Mente, Humor, Corpo e Digestão).">
   <div className="segmented large set-kinds" role="tablist">{(Object.keys(kindLabel) as Topic['kind'][]).map(k=><button key={k} type="button" role="tab" aria-selected={kind===k} className={kind===k?'selected':''} onClick={()=>setKind(k)}>{kindLabel[k]}<small>{topics.filter(t=>t.kind===k).length}</small></button>)}</div>
   <div className="set-topics">{ofKind.map(({t,i},n)=><TopicEditor key={t.id} topic={t} index={n} count={ofKind.length}
    onChange={next=>setTopics(topics.map((x,j)=>j===i?next:x))}
    onMove={d=>{const target=ofKind[n+d];if(!target)return;const next=[...topics];[next[i],next[target.i]]=[next[target.i],next[i]];setTopics(next);}}
    onRemove={()=>setTopics(topics.filter((_,j)=>j!==i))}/>)}</div>
   <AddField label="Novo tópico" placeholder={`Novo tópico de ${kindLabel[kind].toLowerCase()} (ex.: Sono da noite, Dor, Foco)`} onAdd={title=>{let id=slug(title);while(topics.some(t=>t.id===id)||isBuiltin(id))id+='-2';setTopics([...topics,{id,kind,title,help:'Selecione quantos quiser',dimension:null,multiple:true,notes:false,enabled:true,options:[]}]);}}/>
   <p className="field-help">Renomear uma opção não altera registros antigos: eles guardam o texto da época. Ocultar um tópico só o tira do formulário.</p>
  </Section>

  <Section id="suplementos" icon={<Sparkles size={19}/>} title="Rotinas de vitaminas e suplementos" help="Cada rotina vira um botão em Registrar › Vitaminas. Os itens aparecem em Hoje e são cruzados com os seus exames."
   actions={<Button variant="secondary" size="small" onClick={()=>patch('routines',[...s.routines,{name:`Nova rotina ${s.routines.length+1}`,period:'outro',items:[]}])}><Plus size={15}/>Nova rotina</Button>}>
   <div className="set-cards">{s.routines.map((r,i)=><article key={i} className="set-card">
    <header><input aria-label="Nome da rotina" className="set-topic-title" value={r.name} onChange={e=>patch('routines',s.routines.map((x,j)=>j===i?{...x,name:e.target.value}:x))}/>
     <div className="set-row-actions"><button type="button" className="danger" aria-label={`Excluir ${r.name}`} onClick={()=>{if(window.confirm(`Excluir a rotina ${r.name}?`))patch('routines',s.routines.filter((_,j)=>j!==i));}}><Trash2 size={16}/></button></div></header>
    <label>Período<select value={r.period} onChange={e=>patch('routines',s.routines.map((x,j)=>j===i?{...x,period:e.target.value as typeof r.period}:x))}><option value="dia">Dia</option><option value="noite">Noite</option><option value="outro">Outro</option></select></label>
    <ul className="set-chips">{r.items.map((item,k)=><li key={k}>{item}<button type="button" aria-label={`Remover ${item}`} onClick={()=>patch('routines',s.routines.map((x,j)=>j===i?{...x,items:x.items.filter((_,m)=>m!==k)}:x))}><X size={13}/></button></li>)}</ul>
    <AddField label={`Novo item em ${r.name}`} placeholder="Ex.: Vitamina B12" onAdd={v=>patch('routines',s.routines.map((x,j)=>j===i?{...x,items:[...x.items,v]}:x))}/>
   </article>)}</div>
  </Section>

  <Section id="remedios" icon={<Pill size={19}/>} title="Remédios" help="Lista que aparece em Registrar › Remédio, com a composição para consulta."
   actions={<Button variant="secondary" size="small" onClick={()=>patch('medicines',[...s.medicines,{name:'',composition:''}])}><Plus size={15}/>Novo remédio</Button>}>
   <ul className="set-list">{s.medicines.map((m,i)=><li key={i}>
    <input aria-label="Nome do remédio" placeholder="Nome" value={m.name} onChange={e=>patch('medicines',s.medicines.map((x,j)=>j===i?{...x,name:e.target.value}:x))}/>
    <input aria-label="Composição" placeholder="Composição e concentração" value={m.composition} onChange={e=>patch('medicines',s.medicines.map((x,j)=>j===i?{...x,composition:e.target.value}:x))}/>
    <div className="set-row-actions"><button type="button" aria-label="Subir" disabled={i===0} onClick={()=>patch('medicines',move(s.medicines,i,-1))}><ArrowUp size={15}/></button><button type="button" className="danger" aria-label={`Remover ${m.name||'remédio'}`} onClick={()=>patch('medicines',s.medicines.filter((_,j)=>j!==i))}><X size={15}/></button></div>
   </li>)}</ul>
  </Section>

  <Section id="agua" icon={<Droplets size={19}/>} title="Botões rápidos de água" help="Os atalhos de volume em Hoje e Alimentação (até 6). A meta diária de água fica em Metas."
   actions={s.water.buttons.length<6?<Button variant="secondary" size="small" onClick={()=>patch('water',{buttons:[...s.water.buttons,{label:'Copo',ml:250}]})}><Plus size={15}/>Novo botão</Button>:undefined}>
   <ul className="set-list">{s.water.buttons.map((b,i)=><li key={i}>
    <input aria-label="Nome do botão" value={b.label} onChange={e=>patch('water',{buttons:s.water.buttons.map((x,j)=>j===i?{...x,label:e.target.value}:x)})}/>
    <span className="set-unit"><input type="number" min={10} max={5000} aria-label="Volume em ml" value={b.ml} onChange={e=>patch('water',{buttons:s.water.buttons.map((x,j)=>j===i?{...x,ml:Math.round(numberValue(e.target.value))}:x)})}/><small>ml</small></span>
    <div className="set-row-actions"><button type="button" aria-label="Subir" disabled={i===0} onClick={()=>patch('water',{buttons:move(s.water.buttons,i,-1)})}><ArrowUp size={15}/></button><button type="button" className="danger" aria-label={`Remover ${b.label}`} onClick={()=>patch('water',{buttons:s.water.buttons.filter((_,j)=>j!==i)})}><X size={15}/></button></div>
   </li>)}</ul>
  </Section>

  <Section id="metas" icon={<Target size={19}/>} title="Metas do resumo do dia" help="Referências do bloco Seu dia em resumo. Calorias, proteína, água e sódio ficam em Metas, por tipo de dia." actions={<Link className="text-link" href={demo?'/demo/metas':'/metas'}>Abrir Metas</Link>}>
   <div className="set-grid">
    <NumberField label="Meta de sono" value={s.day.sleepHours} min={4} max={12} step={0.5} unit="h" onChange={v=>patch('day',{...s.day,sleepHours:v})}/>
    <NumberField label="Noite boa a partir de" value={s.day.goodNightHours} min={4} max={12} step={0.5} unit="h" help="Usado na comparação sono × bem-estar." onChange={v=>patch('day',{...s.day,goodNightHours:v})}/>
    <NumberField label="Meta de movimento" value={s.day.movementMinutes} min={5} max={300} unit="min" onChange={v=>patch('day',{...s.day,movementMinutes:v})}/>
    <NumberField label="Dias no gráfico sono × bem-estar" value={s.day.historyDays} min={7} max={60} unit="dias" onChange={v=>patch('day',{...s.day,historyDays:v})}/>
   </div>
  </Section>

  <Section id="vencimentos" icon={<Bell size={19}/>} title="Próximos vencimentos" help="Quantos dias à frente o painel avisa e quais categorias entram na lista do Hoje.">
   <div className="set-grid"><NumberField label="Avisar com antecedência de" value={s.reminders.windowDays} min={1} max={60} unit="dias" onChange={v=>patch('reminders',{...s.reminders,windowDays:Math.round(v)})}/></div>
   <h3>Categorias</h3>
   <div className="set-toggles">{reminderSources.map(src=><Toggle key={src} label={src} checked={s.reminders.sources.includes(src)} onChange={v=>patch('reminders',{...s.reminders,sources:v?[...s.reminders.sources,src]:s.reminders.sources.filter(x=>x!==src)})}/>)}</div>
  </Section>

  <Section id="financas" icon={<Wallet size={19}/>} title="Finanças" help="Regras da reserva de emergência e nomes das rendas. Margem e saldo do cartão ficam no plano do cartão, em Financeiro.">
   <div className="set-grid">
    <NumberField label="Meta da reserva" value={s.finance.emergencyMonths} min={1} max={24} unit="meses" onChange={v=>patch('finance',{...s.finance,emergencyMonths:v})}/>
    <label>Nome da renda 1<input value={s.finance.incomeLabels[0]} onChange={e=>patch('finance',{...s.finance,incomeLabels:[e.target.value,s.finance.incomeLabels[1]]})}/></label>
    <label>Nome da renda 2<input value={s.finance.incomeLabels[1]} onChange={e=>patch('finance',{...s.finance,incomeLabels:[s.finance.incomeLabels[0],e.target.value]})}/></label>
   </div>
   <div className="set-toggles">
    <Toggle label="Contar a conta corrente na reserva" checked={s.finance.includeChecking} onChange={v=>patch('finance',{...s.finance,includeChecking:v})}/>
    <Toggle label="Descontar a fatura do cartão da reserva" checked={s.finance.subtractCard} onChange={v=>patch('finance',{...s.finance,subtractCard:v})}/>
   </div>
  </Section>

  <Section id="treino" icon={<Dumbbell size={19}/>} title="Carga de treino" help="Como Exercícios calcula e classifica a carga semanal (minutos × esforço).">
   <div className="set-grid">
    <NumberField label="Esforço quando o treino não tem nota" value={s.training.defaultEffort} min={0} max={10} step={0.5} unit="/10" onChange={v=>patch('training',{...s.training,defaultEffort:v})}/>
    <NumberField label="Acima do normal a partir de" value={s.training.highRatio} min={1} max={3} step={0.05} unit="× a média" onChange={v=>patch('training',{...s.training,highRatio:v})}/>
    <NumberField label="Pico de carga a partir de" value={s.training.spikeRatio} min={1} max={4} step={0.05} unit="× a média" onChange={v=>patch('training',{...s.training,spikeRatio:v})}/>
   </div>
  </Section>

  <Section id="caju" icon={<Dog size={19}/>} title="Caju" help="Lembretes da tela do Caju. A ficha dele (raça, chip, veterinário, ração) é editada na própria tela." actions={<Link className="text-link" href={demo?'/demo/caju':'/caju'}>Abrir Caju</Link>}>
   <div className="set-grid">
    <NumberField label="Mostrar cuidados dos próximos" value={s.dog.careWindowDays} min={7} max={180} unit="dias" onChange={v=>patch('dog',{...s.dog,careWindowDays:Math.round(v)})}/>
    <NumberField label="Avisar estoque de remédio com até" value={s.dog.lowStock} min={0} max={100} unit="doses" onChange={v=>patch('dog',{...s.dog,lowStock:Math.round(v)})}/>
   </div>
  </Section>

  <Section id="dados" icon={<Database size={19}/>} title="Seus dados" help="Cópia de segurança e restauração das configurações. O ChatGPT também lê e altera estas configurações pelo MCP (recurso configuracoes).">
   <div className="set-inline">
    <Button variant="secondary" onClick={download}><Download size={16}/>Baixar backup (JSON)</Button>
    <Button variant="destructive" onClick={()=>{if(window.confirm('Voltar todas as configurações ao padrão? Seus registros não são apagados. Clique em Salvar para confirmar.'))setS(defaultSettings);}}><RotateCcw size={16}/>Restaurar padrão</Button>
   </div>
   <p className="field-help">O backup inclui perfil, finanças, carro, exames, Caju, liga e configurações. Guarde em local seguro: ele contém dados pessoais.</p>
  </Section>

  {(dirty||message||error)&&<div className="set-savebar glass show" role="status">
   <span>{error?<b className="error">{error}</b>:message&&!dirty?message:'Você tem alterações não salvas.'}</span>
   {dirty&&<><Button variant="ghost" onClick={()=>{setS(initial);setError('');}}>Descartar</Button><Button onClick={save} disabled={busy}><Save size={16}/>{busy?'Salvando…':'Salvar alterações'}</Button></>}
  </div>}
 </div>;
}
