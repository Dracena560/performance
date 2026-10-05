'use client';
import {createContext,useContext,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {LANG_COOKIE,locales,translate,type Lang,type MessageKey} from '@/lib/i18n';

const LangContext=createContext<Lang>('pt');
export function LangProvider({lang,children}:{lang:Lang;children:React.ReactNode}){return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;}
export function useLang(){const lang=useContext(LangContext);return {lang,locale:locales[lang],t:(key:MessageKey,vars?:Record<string,string|number>)=>translate(lang,key,vars)};}

/** PT-BR / EN-UK switch: stores the choice in a cookie for a year and re-renders the server pages. */
export function LanguageToggle({className=''}:{className?:string}){
 const {lang,t}=useLang();const router=useRouter();const [pending,start]=useTransition();
 const choose=(next:Lang)=>{if(next===lang)return;document.cookie=`${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;document.documentElement.lang=locales[next];start(()=>router.refresh());};
 return <div className={`segmented lang-toggle ${className}`} role="group" aria-label={t('shell.language')} aria-busy={pending||undefined}>
  {([['pt','🇧🇷','PT'],['en','🇬🇧','EN']] as const).map(([value,flag,label])=><button key={value} type="button" aria-pressed={lang===value} className={lang===value?'selected':''} onClick={()=>choose(value)} title={value==='pt'?'Português (Brasil)':'English (UK)'}><span aria-hidden>{flag}</span>{label}</button>)}
 </div>;
}
