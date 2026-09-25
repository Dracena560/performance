import { configured } from '@/lib/supabase/server';
import LoginForm from './form';
export default function Page(){return <LoginForm configured={configured()}/>;}
