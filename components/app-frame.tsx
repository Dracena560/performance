'use client';
import { usePathname } from 'next/navigation';
import { AppShell } from './app-shell';
import { activeNavigation } from './site-navigation';

export function AppFrame({ children, title }: { children: React.ReactNode; title: string }) {
  const pathname = usePathname();
  return <AppShell title={title} active={activeNavigation(pathname)}>{children}</AppShell>;
}
