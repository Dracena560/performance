'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowUpRight, ChevronLeft, HeartPulse, LayoutGrid, LogOut, Plus, RotateCw } from 'lucide-react';
import { demoPath, parentScreen, siteNavigation, type NavigationKey } from './site-navigation';
import { logout } from '@/app/actions';
import { LanguageToggle, useLang, usePageReady } from './i18n';
import type { MessageKey } from '@/lib/i18n';

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
  const { t } = useLang();
  usePageReady();
  const navLabel = (key: NavigationKey, compact = false) => {
    const short = `nav.${key}.short` as MessageKey;
    return compact && t(short) !== short ? t(short) : t(`nav.${key}` as MessageKey);
  };
  /** Pages pass their Portuguese title; top-level screens are shown in the chosen language. */
  const shownTitle = siteNavigation.some(([key, label]) => label === title && key === active) ? navLabel(active) : title;
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
    return <Link key={`${place}-${key}`} href={demo ? (key === 'hoje' ? '/demo' : `/demo/${key}`) : `/${key}`} {...props}><Icon size={place === 'tabbar' ? 22 : 20} strokeWidth={isActive ? 2.2 : 1.9} /><span>{navLabel(key, place === 'tabbar')}</span>{key === 'hoje' && place === 'sidebar' && <span className="nav-today" aria-hidden />}</Link>;
  };
  return <div className="app-shell" onClickCapture={demoLinks}>
    <aside className="sidebar glass" aria-label={t('shell.mainNav')}>
      <Link href={demo ? '/demo' : '/hoje'} className="brand" onClick={onNavigate ? (event) => { event.preventDefault(); onNavigate('hoje'); } : undefined}>
        <span className="brand-mark" aria-hidden><LayoutGrid /></span>
        <span className="brand-text"><b>Felipe</b><small>{t('shell.tagline')}</small></span>
      </Link>
      <nav className="sidebar-nav" aria-label={t('shell.sections')}>
        <span className="nav-label">{t('shell.myPanel')}</span>
        {siteNavigation.map(([key, label, Icon, compact]) => item(key, label, Icon, compact))}
      </nav>
      <div className="sidebar-bottom">
        <div className="profile">
          <span className="avatar" aria-hidden>F</span>
          <span className="profile-text"><strong>Felipe</strong><small>{demo ? t('shell.demo') : t('shell.personalSpace')}</small></span>
          {!demo && <button className="button icon ghost frame-logout" aria-label={t('shell.logout')} title={t('shell.logout')} onClick={() => logout()}><LogOut size={18} /></button>}
        </div>
        <small className="timezone">Europe/London</small>
      </div>
    </aside>

    <main className="workspace">
      <header className="toolbar scroll-edge">
        <span className="toolbar-title">
          {parent && parentHref
            ? <Link href={parentHref} className="toolbar-back" aria-label={t('shell.back', { label: navLabel(parent.key) })} title={t('shell.back', { label: navLabel(parent.key) })}><ChevronLeft size={22} strokeWidth={2.2} aria-hidden /><span>{navLabel(parent.key)}</span></Link>
            : <><span className="toolbar-crumb">{t('shell.myPanel')}</span><span className="slash" aria-hidden>/</span></>}
          <strong>{shownTitle}</strong>
        </span>
        <span className="toolbar-note">
          <LanguageToggle />
          <button className="refresh-button" onClick={() => router.refresh()} title={t('shell.refreshTitle')}><RotateCw size={15} aria-hidden />{t('shell.refresh')}</button>
          <span className="status-pill"><span className="tiny-dot" aria-hidden /><span>{demo ? t('shell.demoData') : t('shell.privateSpace')}</span></span>
        </span>
      </header>
      {demo && <div className="demo-banner-wrap"><div className="demo-banner" role="note"><span><strong>{t('shell.demoMode')}</strong> {t('shell.demoBanner')}</span><Link href="/login">{t('shell.privateAccess')} <ArrowUpRight size={14} /></Link></div></div>}
      {children}
    </main>

    <nav className={`tabbar glass${onQuickAction ? ' has-fab' : ''}`} aria-label={t('shell.mainNav')} style={{ ['--i' as string]: activeIndex }}>
      <span className="tab-indicator" aria-hidden />
      {siteNavigation.map(([key, label, Icon, compact]) => item(key, label, Icon, compact, 'tabbar'))}
    </nav>
    {onQuickAction && <button className="fab glass-tint glass-interactive" aria-label={quickActionLabel} title={quickActionLabel} onClick={onQuickAction}><Plus /></button>}
  </div>;
}
