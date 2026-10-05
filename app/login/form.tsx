'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import { HeartPulse, ArrowRight, LockKeyhole } from 'lucide-react';
import { login } from '../actions';
import { Button } from '@/components/ui/button';
export default function LoginForm({ configured, next }: { configured: boolean; next?: string }) {
  const [state, action, pending] = useActionState(login, { error: '' });
  return <main className="login">
    <div className="login-brand"><span className="brand-mark" aria-hidden><HeartPulse /></span><span className="brand-text"><b>Felipe</b><small>Saúde & Performance</small></span></div>
    <section className="login-card glass strong">
      <span className="eyebrow">Seu espaço pessoal</span>
      <h1>Um dia de cada vez.</h1>
      <p>Alimentação, hidratação e como você se sente. Tudo no mesmo lugar.</p>
      {configured ? <form action={action}>
        <input name="next" type="hidden" value={next ?? ''} />
        <label>E-mail<input name="email" type="email" autoComplete="email" inputMode="email" required /></label>
        <label>Senha<input name="password" type="password" autoComplete="current-password" required minLength={6} /></label>
        <Button size="large" disabled={pending}>{pending ? 'Entrando…' : 'Entrar'}<ArrowRight size={18} /></Button>
        {state.error && <p role="alert" className="error">{state.error}</p>}
      </form> : <div className="setup-notice"><LockKeyhole size={20} /><div><strong>Seu espaço está preparado</strong><p>O acesso aos seus dados será liberado quando o Supabase estiver conectado. Por enquanto, explore uma demonstração fictícia.</p></div></div>}
      <Link href="/demo" className="demo-link">Explorar demonstração <ArrowRight size={16} /></Link>
      <small className="login-note"><LockKeyhole size={13} /> Seus registros exigem uma sessão autenticada.</small>
    </section>
    <p className="login-footer">Feito para acompanhar o seu ritmo</p>
  </main>;
}
