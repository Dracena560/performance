import { HeartPulse, LayoutDashboard, Target, Trophy, UserRound } from 'lucide-react';

export const siteNavigation = [
  ['hoje', 'Hoje', LayoutDashboard],
  ['saude', 'Saúde', HeartPulse],
  ['financeiro', 'Financeiro', Target],
  ['tenis', 'Tênis', Trophy],
  ['minhas-informacoes', 'Minhas informações', UserRound],
] as const;
