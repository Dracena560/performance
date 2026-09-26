import { HistoryImport } from '@/components/history-import';
import { AppFrame } from '@/components/app-frame';
import { supabase } from '@/lib/supabase/server';
export default async function Page(){const db=await supabase();const {data:{user}}=await db.auth.getUser();const {count}=user?await db.from('health_records').select('*',{count:'exact',head:true}).eq('user_id',user.id):{count:0};return <AppFrame title="Histórico"><div className="content"><div className="page-heading"><div><span className="eyebrow">DADOS PRIVADOS</span><h1>Histórico de saúde</h1><p>{count?`${count.toLocaleString('pt-BR')} registros privados já estão no seu banco.`:'Importe sua planilha e preserve as métricas retroativas.'}</p></div></div><HistoryImport/></div></AppFrame>;}
