import { Dog, HeartPulse, LayoutDashboard, Trophy, UserRound, Wallet } from 'lucide-react';

/** [key, label, Icon, compact label] — the compact label is used by the floating tab bar. */
export const siteNavigation = [
  ['hoje', 'Hoje', LayoutDashboard, 'Hoje'],
  ['saude', 'Saúde', HeartPulse, 'Saúde'],
  ['financeiro', 'Financeiro', Wallet, 'Finanças'],
  ['tenis', 'Tênis', Trophy, 'Tênis'],
  ['caju', 'Caju', Dog, 'Caju'],
  ['minhas-informacoes', 'Minhas informações', UserRound, 'Perfil'],
] as const;

export type NavigationKey = (typeof siteNavigation)[number][0];

/** Health sub-pages that keep the “Saúde” item selected. */
export const healthSections = ['alimentacao', 'exercicios', 'sono', 'exames', 'metas', 'registros', 'agua'] as const;

export function activeNavigation(pathOrView: string): NavigationKey {
  const key = pathOrView.replace(/^\//, '').split(/[/?#]/)[0];
  if (key === '' || key === 'demo') return 'hoje';
  if ((healthSections as readonly string[]).includes(key)) return 'saude';
  if (key === 'viagens' || key === 'perfil') return 'minhas-informacoes';
  if (key === 'financeiro') return 'financeiro';
  return (siteNavigation.find(([k]) => k === key)?.[0] ?? 'hoje');
}

/** Private routes that have a fictitious counterpart under /demo. */
export const demoRoutes = ['saude', 'tenis', 'tenis/liga', 'financeiro', 'financeiro/investimentos', 'minhas-informacoes', 'sono', 'exercicios', 'exames', 'caju', 'viagens', 'registros', 'alimentacao', 'metas', 'agua'] as const;

/** Maps a private path (e.g. "/sono?date=…") to its demo page, or null when there is none. */
export function demoPath(path: string): string | null {
  const [pathname, rest = ''] = path.split(/(?=[?#])/);
  const key = pathname.replace(/^\/+|\/+$/g, '');
  const suffix = rest.startsWith('#') ? rest : '';
  if (key === '' || key === 'hoje' || key === 'demo') return '/demo' + suffix;
  if (key === 'perfil') return '/demo/minhas-informacoes';
  return (demoRoutes as readonly string[]).includes(key) ? `/demo/${key}${suffix}` : null;
}

/** Parent screen in the navigation hierarchy (for the toolbar Back button), or null on top-level screens. */
export function parentScreen(pathname: string): { key: NavigationKey; label: string } | null {
  const path = pathname.replace(/^\/demo(?=\/|$)/, '').replace(/^\/+|\/+$/g, '');
  const [first, second] = path.split('/');
  if (!first) return null;
  if ((healthSections as readonly string[]).includes(first)) return { key: 'saude', label: 'Saúde' };
  if (first === 'financeiro' && second) return { key: 'financeiro', label: 'Financeiro' };
  if (first === 'tenis' && second) return { key: 'tenis', label: 'Tênis' };
  if (first === 'viagens' || first === 'perfil') return { key: 'minhas-informacoes', label: 'Minhas informações' };
  return null;
}
