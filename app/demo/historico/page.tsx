import { AppShell } from '@/components/app-shell';
import { HistoryImport } from '@/components/history-import';
import { History } from 'lucide-react';
export const dynamic='force-dynamic';
export default function Page(){const count=1285;return <AppShell title="Histórico" active="saude" demo><div className="content"><div className="page-heading"><div className="health-hero-lead"><span className="health-hero-icon" aria-hidden style={{['--icon-tint' as string]:'var(--sys-brown)'}}><History/></span><div><span className="eyebrow">DADOS PRIVADOS</span><h1>Histórico de saúde</h1><p>{`${count.toLocaleString('pt-BR')} registros fictícios já estão no seu banco.`}</p></div></div></div><HistoryImport/></div></AppShell>;}
