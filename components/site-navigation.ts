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

/** Private routes that have a fictitious counterpart under /demo. */
export const demoRoutes = ['saude', 'tenis', 'financeiro', 'financeiro/investimentos', 'minhas-informacoes', 'sono', 'exercicios', 'saude-geral', 'viagens', 'registros', 'historico', 'alimentacao', 'metas', 'agua', 'check-in', 'timeline'] as const;

/** Maps a private path (e.g. "/sono?date=…") to its demo page, or null when there is none. */
export function demoPath(path: string): string | null {
  const [pathname, rest = ''] = path.split(/(?=[?#])/);
  const key = pathname.replace(/^\/+|\/+$/g, '');
  const suffix = rest.startsWith('#') ? rest : '';
  if (key === '' || key === 'hoje' || key === 'demo') return '/demo' + suffix;
  if (key === 'perfil') return '/demo/minhas-informacoes';
  return (demoRoutes as readonly string[]).includes(key) ? `/demo/${key}${suffix}` : null;
}
