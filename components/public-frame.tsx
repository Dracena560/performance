'use client';
import Link from 'next/link';
import { LayoutGrid } from 'lucide-react';
import { LanguageToggle, useLang } from './i18n';
/** Chrome for pages anyone can open: brand, language switch, no private navigation. */
export function PublicFrame({children}:{children:React.ReactNode}){
 const {t}=useLang();
 return <div className="public-frame">
  <header className="public-bar"><Link href="/liga" className="brand"><span className="brand-mark" aria-hidden><LayoutGrid/></span><span className="brand-text"><b>{t('league.title')}</b><small>{t('league.public')}</small></span></Link><LanguageToggle/></header>
  <main className="public-main">{children}</main>
 </div>;
}
