'use client';
import {useEffect,useState} from 'react';
import {Moon,Sun} from 'lucide-react';
import {useLang} from './i18n';

export const THEME_COOKIE='theme';
/** Light / Dark switch. Light is the default; the choice is kept in a cookie for a year so pages render in it from the server. */
export function ThemeToggle(){
 const {lang}=useLang();const [dark,setDark]=useState(false);
 useEffect(()=>setDark(document.documentElement.dataset.theme==='dark'),[]);
 const toggle=()=>{const next=!dark;setDark(next);const theme=next?'dark':'light';document.documentElement.dataset.theme=theme;document.cookie=`${THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',next?'#000000':'#F2F2F7');};
 const label=lang==='en'?(dark?'Switch to light mode':'Switch to dark mode'):(dark?'Mudar para o modo claro':'Mudar para o modo escuro');
 return <button type="button" className="button icon ghost theme-toggle" onClick={toggle} aria-label={label} title={label} aria-pressed={dark}>{dark?<Sun size={17}/>:<Moon size={17}/>}</button>;
}
