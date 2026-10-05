import { DiaryRegister } from '@/components/diary-register';
import { AppFrame } from '@/components/app-frame';
import { NotebookPen } from 'lucide-react';
export default function Page(){return <AppFrame title="Registros"><div className="content"><div className="page-heading"><div className="health-hero-lead"><span className="health-hero-icon" aria-hidden style={{['--icon-tint' as string]:'var(--tint-mind)'}}><NotebookPen/></span><div><span className="eyebrow">SEU DIÁRIO</span><h1>Registrar no diário</h1><p>Check-in, atividade, fezes, água, vitaminas e remédios, sempre com data e horário.</p></div></div></div><DiaryRegister/></div></AppFrame>;}
