import { notFound } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { DiaryRegister } from '@/components/diary-register';
import { NotebookPen } from 'lucide-react';
export const dynamic='force-dynamic';
export default function Page(){if(process.env.NODE_ENV==='production')notFound();return <AppShell title="Registros" active="saude" demo><div className="content"><div className="page-heading"><div className="health-hero-lead"><span className="health-hero-icon" aria-hidden style={{['--icon-tint' as string]:'var(--tint-mind)'}}><NotebookPen/></span><div><span className="eyebrow">SEU DIÁRIO</span><h1>Registrar no diário</h1><p>Check-in, atividade, fezes, água, vitaminas e remédios, sempre com data e horário.</p></div></div></div><DiaryRegister/></div></AppShell>;}
