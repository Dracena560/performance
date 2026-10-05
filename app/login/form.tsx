'use client';
import { ThemeToggle } from '@/components/theme-toggle';
import { useActionState } from 'react';
import Link from 'next/link';
import { LayoutGrid, ArrowRight, LockKeyhole } from 'lucide-react';
import { login } from '../actions';
import { Button } from '@/components/ui/button';
import { LanguageToggle, useLang, usePageReady } from '@/components/i18n';
export default function LoginForm({ configured, next }: { configured: boolean; next?: string }) {
  const [state, action, pending] = useActionState(login, { error: '' });
  const { t } = useLang();
  usePageReady();
  return <main className="login">
    <div className="login-brand"><span className="brand-mark" aria-hidden><LayoutGrid /></span><span className="brand-text"><b>Felipe</b><small>{t('shell.tagline')}</small></span></div>
    <section className="login-card glass strong">
      <span className="login-lang"><LanguageToggle /><ThemeToggle /></span>
      <span className="eyebrow">{t('login.eyebrow')}</span>
      <h1>{t('login.title')}</h1>
      <p>{t('login.lead')}</p>
      {configured ? <form action={action}>
        <input name="next" type="hidden" value={next ?? ''} />
        <label>{t('login.email')}<input name="email" type="email" autoComplete="email" inputMode="email" required /></label>
        <label>{t('login.password')}<input name="password" type="password" autoComplete="current-password" required minLength={6} /></label>
        <Button size="large" disabled={pending}>{pending ? t('login.entering') : t('login.enter')}<ArrowRight size={18} /></Button>
        {state.error && <p role="alert" className="error">{state.error}</p>}
      </form> : <div className="setup-notice"><LockKeyhole size={20} /><div><strong>{t('login.setupTitle')}</strong><p>{t('login.setup')}</p></div></div>}
      <Link href="/demo" className="demo-link">{t('login.demo')} <ArrowRight size={16} /></Link>
      <Link href="/liga" className="demo-link">{t('login.league')} <ArrowRight size={16} /></Link>
      <small className="login-note"><LockKeyhole size={13} /> {t('login.note')}</small>
    </section>
    <p className="login-footer">{t('login.footer')}</p>
  </main>;
}
