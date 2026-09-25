import type { Metadata,Viewport } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Felipe · Saúde',description:'Seu diário pessoal de saúde e performance.',robots:{index:false,follow:false},manifest:'/manifest.webmanifest',icons:{icon:'/favicon.svg',apple:'/icon-192.png'},appleWebApp:{capable:true,title:'Felipe Saúde',statusBarStyle:'default'}};
export const viewport:Viewport={width:'device-width',initialScale:1,themeColor:'#142f3e'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>;}
