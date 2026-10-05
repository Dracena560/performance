import { HeartPulse, LayoutDashboard, Trophy, UserRound, Wallet } from 'lucide-react';

/** [key, label, Icon, compact label] — the compact label is used by the floating tab bar. */
export const siteNavigation = [
  ['hoje', 'Hoje', LayoutDashboard, 'Hoje'],
  ['saude', 'Saúde', HeartPulse, 'Saúde'],
  ['financeiro', 'Financeiro', Wallet, 'Finanças'],
  ['tenis', 'Tênis', Trophy, 'Tênis'],
  ['minhas-informacoes', 'Minhas informações', UserRound, 'Perfil'],
] as const;

export type NavigationKey = (typeof siteNavigation)[number][0];

/** Health sub-pages that keep the “Saúde” item selected. */
export const healthSections = ['alimentacao', 'exercicios', 'sono', 'saude-geral', 'metas', 'historico', 'registros', 'agua', 'check-in', 'timeline'] as const;

export function activeNavigation(pathOrView: string): NavigationKey {
  const key = pathOrView.replace(/^\//, '').split(/[/?#]/)[0];
  if (key === '' || key === 'demo') return 'hoje';
  if ((healthSections as readonly string[]).includes(key)) return 'saude';
  if (key === 'viagens' || key === 'perfil') return 'minhas-informacoes';
  if (key === 'financeiro') return 'financeiro';
  return (siteNavigation.find(([k]) => k === key)?.[0] ?? 'hoje');
}
