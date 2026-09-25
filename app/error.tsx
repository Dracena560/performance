'use client';
import { Button } from '@/components/ui/button';
export default function Error({reset}:{reset:()=>void}){return <main className="login"><section className="login-card"><h1>Não foi possível carregar.</h1><p>Confira sua conexão. Se este é o primeiro acesso, confirme que o banco foi configurado.</p><Button onClick={reset}>Tentar novamente</Button><a href="/login">Voltar ao acesso</a></section></main>;}
