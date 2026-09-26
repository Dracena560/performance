import { HealthJournal } from '@/components/health-journal';
import { AppFrame } from '@/components/app-frame';
export default function Page(){return <AppFrame title="Registros"><div className="content"><div className="page-heading"><div><span className="eyebrow">SEU DIÁRIO</span><h1>Registros de saúde</h1><p>Sono, exercício, fezes, suplementos e tênis.</p></div></div><HealthJournal/></div></AppFrame>;}
