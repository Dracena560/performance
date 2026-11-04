'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUp, Check, Loader2, Plus, Square, X, AlertCircle } from 'lucide-react';
import type { AssistantEvent } from '@/lib/assistant';

type Image={media_type:'image/jpeg';data:string};
type Step={name:string;state:'running'|'ok'|'error'};
type Turn={role:'user'|'assistant';text:string;images:Image[];steps:Step[];error?:string};
const MAX_IMAGES=6,MAX_SIDE=1568,MAX_BODY=3_500_000;
const labels:Record<string,string>={registrar_refeicao:'Registrando refeição',registrar_agua:'Registrando água',registrar_checkin:'Registrando check-in',registrar_diario:'Registrando',registrar_sono:'Registrando sono',registrar_exercicio:'Registrando exercício',registrar_tenis:'Registrando tênis',registrar_suplementos:'Registrando vitaminas',registrar_fezes:'Registrando',registrar_varios:'Salvando registros',escrever_diario:'Escrevendo no diário',consultar_diario:'Lendo o diário',registrar_comida_caju:'Registrando comida do Caju',registrar_atividade_caju:'Registrando atividade do Caju',consultar_caju:'Consultando o Caju',meu_dia:'Analisando o dia',consultar_resumo_diario:'Consultando o dia',consultar_itens:'Consultando registros',consultar_dados_site:'Consultando dados',editar_dados_site:'Salvando alteração',adicionar_dados_site:'Salvando',excluir_dados_site:'Excluindo',excluir_item:'Excluindo',editar_item:'Salvando alteração',estrutura_do_site:'Lendo a estrutura do site'};
const label=(name:string)=>labels[name]??(name.startsWith('consultar')?'Consultando':'Salvando');

/** Photos are shrunk in the browser: Claude does not use more than this and each request has a size limit. */
async function toImage(file:File):Promise<Image>{
 const bitmap=await createImageBitmap(file);const scale=Math.min(1,MAX_SIDE/Math.max(bitmap.width,bitmap.height));
 const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
 canvas.getContext('2d')!.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
 return {media_type:'image/jpeg',data:canvas.toDataURL('image/jpeg',0.85).split(',')[1]};
}
/** Sends the conversation; when it gets too heavy the oldest photos leave first, and Claude is told about it. */
function payload(turns:Turn[]){
 const list=turns.filter(turn=>turn.text||turn.images.length).slice(-40).map(({role,text,images})=>({role,text,images}));
 while(list[0]?.role==='assistant')list.shift();
 for(const turn of list){if(JSON.stringify({turns:list}).length<=MAX_BODY)break;if(turn.images.length&&turn!==list.at(-1)){turn.text=`[${turn.images.length} imagem(ns) enviada(s) antes, não disponível agora] ${turn.text}`;turn.images=[];}}
 return JSON.stringify({turns:list});
}
const Rich=({text}:{text:string})=><>{text.split(/(\*\*[^*]+\*\*)/g).map((part,i)=>part.startsWith('**')&&part.endsWith('**')?<strong key={i}>{part.slice(2,-2)}</strong>:part)}</>;

/** The field of the Hoje screen: write or send photos and Claude records it with the site's own tools. */
export function AssistantBox({demo=false}:{demo?:boolean}){
 const router=useRouter();
 const [turns,setTurns]=useState<Turn[]>([]),[text,setText]=useState(''),[images,setImages]=useState<Image[]>([]),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const abort=useRef<AbortController|null>(null),file=useRef<HTMLInputElement>(null),field=useRef<HTMLTextAreaElement>(null),end=useRef<HTMLDivElement>(null);
 useEffect(()=>{end.current?.parentElement?.scrollTo({top:end.current.parentElement.scrollHeight});},[turns]);
 useEffect(()=>{const el=field.current;if(!el)return;el.style.height='';if(text)el.style.height=`${Math.min(el.scrollHeight,180)}px`;},[text]);
 const addFiles=async(files:File[])=>{const list=files.filter(f=>f.type.startsWith('image/')).slice(0,MAX_IMAGES-images.length);if(!list.length)return;setNotice('');try{const next=await Promise.all(list.map(toImage));setImages(current=>[...current,...next].slice(0,MAX_IMAGES));}catch{setNotice('Não consegui abrir esta imagem. Tente JPG ou PNG.');}};
 const update=(fn:(turn:Turn)=>Turn)=>setTurns(current=>current.map((turn,i)=>i===current.length-1?fn(turn):turn));
 const send=async()=>{
  if(busy||(!text.trim()&&!images.length))return;
  if(demo){setNotice('Na demonstração o assistente fica desligado. Entre com a sua conta para usar.');return;}
  const next:Turn[]=[...turns,{role:'user',text:text.trim(),images,steps:[]}];
  setTurns([...next,{role:'assistant',text:'',images:[],steps:[]}]);setText('');setImages([]);setBusy(true);setNotice('');
  const controller=new AbortController();abort.current=controller;
  try{
   const response=await fetch('/api/assistant',{method:'POST',headers:{'content-type':'application/json'},body:payload(next),signal:controller.signal});
   if(!response.ok||!response.body){const data=await response.json().catch(()=>null);throw new Error(data?.error??'Não foi possível falar com o assistente.');}
   const reader=response.body.pipeThrough(new TextDecoderStream()).getReader();let buffer='';
   for(;;){
    const {value,done}=await reader.read();if(done)break;
    buffer+=value;const lines=buffer.split('\n');buffer=lines.pop()??'';
    for(const line of lines){if(!line.trim())continue;const event=JSON.parse(line) as AssistantEvent;
     if(event.type==='text')update(turn=>({...turn,text:turn.text+event.text}));
     else if(event.type==='tool')update(turn=>({...turn,steps:[...turn.steps,{name:event.name,state:'running'}]}));
     else if(event.type==='tool_done')update(turn=>{const steps=[...turn.steps];const i=steps.findLastIndex(step=>step.name===event.name&&step.state==='running');if(i>=0)steps[i]={...steps[i],state:event.ok?'ok':'error'};return {...turn,steps};});
     else if(event.type==='error')update(turn=>({...turn,error:event.message}));
     else if(event.type==='done'&&event.wrote)router.refresh();
    }
   }
  }catch(error){
   if(!controller.signal.aborted)update(turn=>({...turn,error:error instanceof Error?error.message:'Não foi possível falar com o assistente.'}));
   else router.refresh();
  }finally{setBusy(false);abort.current=null;}
 };
 return <section className={`assistant-box${turns.length?' has-thread':''}`} aria-label="Assistente">
  {turns.length>0&&<div className="assistant-thread" aria-live="polite">
   <button type="button" className="text-link assistant-new" disabled={busy} onClick={()=>{setTurns([]);setNotice('');}}>Nova conversa</button>
   {turns.map((turn,i)=><article key={i} className={`assistant-turn ${turn.role}`}>
    {turn.images.length>0&&<div className="assistant-images">{turn.images.map((image,j)=><img key={j} alt="Imagem enviada" src={`data:${image.media_type};base64,${image.data}`}/>)}</div>}
    {turn.steps.length>0&&<ul className="assistant-steps">{turn.steps.map((step,j)=><li key={j} className={step.state}>{step.state==='running'?<Loader2 size={14} className="assistant-spin"/>:step.state==='ok'?<Check size={14}/>:<AlertCircle size={14}/>}{label(step.name)}</li>)}</ul>}
    {turn.text&&<p><Rich text={turn.text}/></p>}
    {turn.role==='assistant'&&!turn.text&&!turn.steps.length&&!turn.error&&busy&&i===turns.length-1&&<p className="assistant-wait"><Loader2 size={15} className="assistant-spin"/>Pensando…</p>}
    {turn.error&&<p className="error" role="alert">{turn.error}</p>}
   </article>)}
   <div ref={end}/>
  </div>}
  <form className="assistant-field" onSubmit={e=>{e.preventDefault();send();}} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();addFiles([...e.dataTransfer.files]);}}>
   {images.length>0&&<div className="assistant-attachments">{images.map((image,i)=><span key={i}><img alt={`Imagem ${i+1} anexada`} src={`data:${image.media_type};base64,${image.data}`}/><button type="button" aria-label={`Remover imagem ${i+1}`} onClick={()=>setImages(current=>current.filter((_,j)=>j!==i))}><X size={12}/></button></span>)}</div>}
   <div className="assistant-row">
    <button type="button" className="assistant-icon" aria-label="Anexar imagem" disabled={images.length>=MAX_IMAGES} onClick={()=>file.current?.click()}><Plus size={22}/></button>
    <input ref={file} type="file" accept="image/*" multiple hidden onChange={e=>{addFiles([...(e.target.files??[])]);e.target.value='';}}/>
    <textarea ref={field} rows={1} aria-label="Mensagem para o assistente" placeholder="Registre uma refeição, um treino ou pergunte algo" value={text} onChange={e=>setText(e.target.value)} onPaste={e=>{const pasted=[...e.clipboardData.files];if(pasted.length){e.preventDefault();addFiles(pasted);}}} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();send();}}}/>
    {busy?<button type="button" className="assistant-send" aria-label="Parar" onClick={()=>abort.current?.abort()}><Square size={14} fill="currentColor"/></button>:<button className="assistant-send" aria-label="Enviar" disabled={!text.trim()&&!images.length}><ArrowUp size={18}/></button>}
   </div>
  </form>
  {notice&&<p className="field-help assistant-notice" role="status">{notice}</p>}
 </section>;
}
