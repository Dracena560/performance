'use client';
import {useEffect} from 'react';
import {createTranslator} from '@/lib/i18n-dom';
import {english} from '@/lib/i18n-en';
import {englishExtra} from '@/lib/i18n-en-extra';
import {englishLife} from '@/lib/i18n-en-life';
import type {Lang} from '@/lib/i18n';

const ATTRS=['placeholder','title','aria-label','alt'];
const SKIP='script,style,textarea,code,pre,[contenteditable="true"],[data-no-translate]';
const SKIP_ATTRS='[contenteditable="true"],[data-no-translate]';

/**
 * Shows the whole interface in English: translates text and accessible labels as React renders them,
 * keeps <option> values in Portuguese so saved data does not change, and wraps confirm/alert.
 */
export function DomTranslator({lang}:{lang:Lang}){
 useEffect(()=>{
  const root=document.documentElement;
  if(lang!=='en'){root.setAttribute('data-translated','');return;}
  const translate=createTranslator({...english,...englishExtra,...englishLife});const done=new WeakMap<Node,string>();
  const text=(node:Text)=>{const parent=node.parentElement;if(!parent||parent.closest(SKIP))return;const value=node.nodeValue??'';if(done.get(node)===value)return;
   if(parent.tagName==='OPTION'&&!parent.hasAttribute('value'))parent.setAttribute('value',parent.textContent??'');
   const next=translate(value);done.set(node,next);if(next!==value)node.nodeValue=next;};
  const attrs=(el:Element)=>{if(el.closest(SKIP_ATTRS))return;for(const name of ATTRS){const value=el.getAttribute(name);if(!value)continue;if((el as any).__tr?.[name]===value)continue;const next=translate(value);(el as any).__tr={...(el as any).__tr,[name]:next};if(next!==value)el.setAttribute(name,next);}};
  const walk=(start:Node)=>{if(start.nodeType===3){text(start as Text);return;}if(start.nodeType!==1)return;const el=start as Element;attrs(el);const tw=document.createTreeWalker(el,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT);let n:Node|null=tw.nextNode();while(n){if(n.nodeType===3)text(n as Text);else attrs(n as Element);n=tw.nextNode();}};
  let observer:MutationObserver|null=null,titleObserver:MutationObserver|null=null,timer=0;
  const start=()=>{walk(document.body);document.title=translate(document.title);root.setAttribute('data-translated','');
  observer=new MutationObserver(list=>{for(const m of list){if(m.type==='characterData')text(m.target as Text);else if(m.type==='attributes')attrs(m.target as Element);else m.addedNodes.forEach(walk);}});
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:ATTRS});
  titleObserver=new MutationObserver(()=>{const next=translate(document.title);if(next!==document.title)document.title=next;});const head=document.querySelector('title');if(head)titleObserver.observe(head,{childList:true,characterData:true,subtree:true});};
  // Wait until the streamed page has hydrated, so React never sees text it did not render.
  let started=false;const go=()=>{if(started)return;started=true;window.clearTimeout(timer);window.setTimeout(start,0);};
  const later=()=>{timer=window.setTimeout(go,2500);};
  if((window as any).__pageReady)go();else{window.addEventListener('page-ready',go,{once:true});if(document.readyState==='complete')later();else window.addEventListener('load',later,{once:true});}
  const confirm=window.confirm,alert=window.alert;window.confirm=message=>confirm(translate(String(message??'')));window.alert=message=>alert(translate(String(message??'')));
  return()=>{window.removeEventListener('load',later);window.removeEventListener('page-ready',go);clearTimeout(timer);observer?.disconnect();titleObserver?.disconnect();window.confirm=confirm;window.alert=alert;};
 },[lang]);
 return null;
}
