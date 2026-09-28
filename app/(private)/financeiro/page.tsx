import { Wallet,TrendingUp,ChevronDown } from 'lucide-react';
import { AppFrame } from '@/components/app-frame';
import { FinanceDashboard } from '@/components/personal-dashboard';
import { InvestmentsDashboard } from '@/components/investments-dashboard';
import { InvestmentOverview } from '@/components/investment-overview';
import { investmentsSchema } from '@/lib/investments';
import { personalData } from '@/lib/personal-data';
export const dynamic='force-dynamic';
export default async function Page(){const profile=await personalData();return <AppFrame title="Financeiro"><div className="content"><div className="personal-page"><header className="personal-heading"><div><span className="eyebrow">SEU PATRIMÔNIO</span><h1>Financeiro</h1><p>Investimentos e gastos, organizados em libras.</p></div></header><InvestmentOverview history={investmentsSchema.parse(profile.personal_investments??[])}/><details className="information-card"><summary><span className="information-icon"><Wallet/></span><span><strong>Tabela de gastos</strong><small>Expandir para consultar e editar</small></span><ChevronDown className="expand-arrow"/></summary><div className="information-body"><FinanceDashboard initial={profile.personal_finance} embedded/></div></details><details className="information-card" id="investimentos"><summary><span className="information-icon"><TrendingUp/></span><span><strong>Investimentos</strong><small>Expandir para acompanhar a evolução</small></span><ChevronDown className="expand-arrow"/></summary><div className="information-body"><InvestmentsDashboard initial={profile.personal_investments??[]} embedded/></div></details></div></div></AppFrame>}
