import { configured } from '@/lib/supabase/server';
import LoginForm from './form';
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <LoginForm configured={configured()} next={next}/>;
}
