'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowUpRight, ChevronLeft, HeartPulse, LayoutGrid, LogOut, Plus, RotateCw } from 'lucide-react';
import { demoPath, parentScreen, siteNavigation, type NavigationKey } from './site-navigation';
import { logout } from '@/app/actions';

type Props = {
  title: string;
  active: NavigationKey;
  demo?: boolean;
  /** Demo mode navigates in memory instead of changing routes. */
  onNavigate?: (key: NavigationKey) => void;
  /** When present, a floating “+” action appears beside the tab bar on compact widths. */
  onQuickAction?: () => void;
  quickActionLabel?: string;
  children: React.ReactNode;
};

/**
 * Application shell following the Apple HIG: a Liquid Glass sidebar on regular
 * widths, an icon rail on medium widths and a floating Liquid Glass tab bar on
 * compact widths. Content scrolls beneath the glass layer.
 */
export function AppShell({ title, active, demo = false, onNavigate, onQuickAction, quickActionLabel = 'Registrar', children }: Props) {
  const router = useRouter();
  const parent = parentScreen(usePathname() ?? '');
  const parentHref = parent ? (demo ? (demoPath(parent.key) ?? '/demo') : `/${parent.key}`) : null;
  /** Demo mode: links inside unchanged components point at private routes; send them to the fictitious pages instead. */
  const demoLinks = demo ? (event: React.MouseEvent) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = (event.target as HTMLElement).closest('a[href]') as HTMLAnchorElement | null;
    const href = anchor?.getAttribute('href');
    if (!href || !href.startsWith('/') || href.startsWith('/demo') || href.startsWith('/login') || anchor?.target === '_blank') return;
    const target = demoPath(href);
    if (target) { event.preventDefault(); event.stopPropagation(); router.push(target); }
  } : undefined;
  const activeIndex = Math.max(0, siteNavigation.findIndex(([key]) => key === active));
  const item = (key: NavigationKey, label: string, Icon: typeof HeartPulse, compact?: string, place: 'sidebar' | 'tabbar' = 'sidebar') => {
    const isActive = key === active;
    const props = {
      className: isActive ? 'active' : '',
      'aria-current': isActive ? ('page' as const) : undefined,
      onClick: onNavigate ? (event: React.MouseEvent) => { event.preventDefault(); onNavigate(key); } : undefined,
    };
    return <Link key={`${place}-${key}`} href={demo ? (key === 'hoje' ? '/demo' : `/demo/${key}`) : `/${key}`} {...props}><Icon size={place === 'tabbar' ? 22 : 20} strokeWidth={isActive ? 2.2 : 1.9} /><span>{place === 'tabbar' ? (compact ?? label) : label}</span>{key === 'hoje' && place === 'sidebar' && <span className="nav-today" aria-hidden />}</Link>;
  };
  return <div className="app-shell" onClickCapture={demoLinks}>
    <aside className="sidebar glass" aria-label="Navegação principal">
      <Link href={demo ? '/demo' : '/hoje'} className="brand" onClick={onNavigate ? (event) => { event.preventDefault(); onNavigate('hoje'); } : undefined}>
        <span className="brand-mark" aria-hidden><LayoutGrid /></span>
        <span className="brand-text"><b>Felipe</b><small>Painel pessoal</small></span>
      </Link>
      <nav className="sidebar-nav" aria-label="Seções">
        <span className="nav-label">Meu painel</span>
        {siteNavigation.map(([key, label, Icon, compact]) => item(key, label, Icon, compact))}
      </nav>
      <div className="sidebar-bottom">
        <div className="profile">
          <span className="avatar" aria-hidden>F</span>
          <span className="profile-text"><strong>Felipe</strong><small>{demo ? 'Demonstração' : 'Espaço pessoal'}</small></span>
          {!demo && <button className="button icon ghost frame-logout" aria-label="Sair" title="Sair" onClick={() => logout()}><LogOut size={18} /></button>}
        </div>
        <small className="timezone">Europe/London</small>
      </div>
    </aside>

    <main className="workspace">
      <header className="toolbar scroll-edge">
        <span className="toolbar-title">
          {parent && parentHref
            ? <Link href={parentHref} className="toolbar-back" aria-label={`Voltar para ${parent.label}`} title={`Voltar para ${parent.label}`}><ChevronLeft size={22} strokeWidth={2.2} aria-hidden /><span>{parent.label}</span></Link>
            : <><span className="toolbar-crumb">Meu painel</span><span className="slash" aria-hidden>/</span></>}
          <strong>{title}</strong>
        </span>
        <span className="toolbar-note">
          <button className="refresh-button" onClick={() => router.refresh()} title="Atualizar dados"><RotateCw size={15} aria-hidden />Atualizar</button>
          <span className="status-pill"><span className="tiny-dot" aria-hidden /><span>{demo ? 'Dados fictícios' : 'Espaço privado'}</span></span>
        </span>
      </header>
      {demo && <div className="demo-banner-wrap"><div className="demo-banner" role="note"><span><strong>Modo demonstração.</strong> Dados fictícios; alterações desaparecem ao recarregar. Não insira dados pessoais.</span><Link href="/login">Acesso privado <ArrowUpRight size={14} /></Link></div></div>}
      {children}
    </main>

    <nav className={`tabbar glass${onQuickAction ? ' has-fab' : ''}`} aria-label="Navegação" style={{ ['--i' as string]: activeIndex }}>
      <span className="tab-indicator" aria-hidden />
      {siteNavigation.map(([key, label, Icon, compact]) => item(key, label, Icon, compact, 'tabbar'))}
    </nav>
    {onQuickAction && <button className="fab glass-tint glass-interactive" aria-label={quickActionLabel} title={quickActionLabel} onClick={onQuickAction}><Plus /></button>}
  </div>;
}
