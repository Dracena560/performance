import type { Metadata, Viewport } from 'next';
import './globals.css';
import { LangProvider } from '@/components/i18n';
import { DomTranslator } from '@/components/dom-translator';
import { getLang } from '@/lib/i18n-server';
import { cookies } from 'next/headers';
import { locales } from '@/lib/i18n';
export const metadata: Metadata = {
  title: 'Felipe · Painel pessoal',
  description: 'Seu painel pessoal: saúde, finanças, carro, documentos, viagens e rotina.',
  robots: { index: false, follow: false },
  manifest: '/manifest.webmanifest',
  icons: { icon: '/favicon.svg', apple: '/icon-192.png' },
  appleWebApp: { capable: true, title: 'Felipe', statusBarStyle: 'black-translucent' },
};
const theme = async () => ((await cookies()).get('theme')?.value === 'dark' ? 'dark' : 'light');
export async function generateViewport(): Promise<Viewport> {
  return { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: (await theme()) === 'dark' ? '#000000' : '#F2F2F7' };
}
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [lang, appearance] = await Promise.all([getLang(), theme()]);
  return <html lang={locales[lang]} data-lang={lang} data-theme={appearance}><body><LangProvider lang={lang}>{children}<DomTranslator lang={lang} /></LangProvider></body></html>;
}
