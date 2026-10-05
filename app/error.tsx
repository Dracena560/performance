'use client';
import { Button } from '@/components/ui/button';
export default function Error({ reset }: { reset: () => void }) {
  return <main className="login"><section className="login-card glass strong"><h1>Não foi possível carregar.</h1><p>Confira sua conexão. Se este é o primeiro acesso, confirme que o banco foi configurado.</p><div className="choice-row" style={{ marginTop: 24 }}><Button onClick={reset}>Tentar novamente</Button><Button variant="secondary" asChild><a href="/login">Voltar ao acesso</a></Button></div></section></main>;
}
