import type { Metadata, Viewport } from 'next';
import './globals.css';
import { LangProvider } from '@/components/i18n';
import { getLang } from '@/lib/i18n-server';
import { locales } from '@/lib/i18n';
export const metadata: Metadata = {
  title: 'Felipe · Painel pessoal',
  description: 'Seu painel pessoal: saúde, finanças, carro, documentos, viagens e rotina.',
  robots: { index: false, follow: false },
  manifest: '/manifest.webmanifest',
  icons: { icon: '/favicon.svg', apple: '/icon-192.png' },
  appleWebApp: { capable: true, title: 'Felipe', statusBarStyle: 'black-translucent' },
};
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F2F2F7' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return <html lang={locales[lang]}><body><LangProvider lang={lang}>{children}</LangProvider></body></html>;
}
