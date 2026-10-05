import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Felipe · Painel pessoal',
    short_name: 'Felipe',
    description: 'Saúde, finanças, carro, documentos, viagens e rotina em um só lugar',
    start_url: '/hoje',
    display: 'standalone',
    background_color: '#F2F2F7',
    theme_color: '#F2F2F7',
    lang: 'pt-BR',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
