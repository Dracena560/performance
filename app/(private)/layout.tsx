import { redirect } from 'next/navigation';
import { configured,supabase } from '@/lib/supabase/server';
export const dynamic='force-dynamic';
export default async function Layout({children}:{children:React.ReactNode}){if(!configured())redirect('/login');const db=await supabase();const {data:{user}}=await db.auth.getUser();if(!user)redirect('/login');return children;}
