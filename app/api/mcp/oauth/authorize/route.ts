import { NextResponse } from 'next/server';
import { issueAuthorizationCode } from '@/lib/mcp-oauth';
import { supabase } from '@/lib/supabase/server';

function escapeHtml(value: string) { return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]!)); }

function fields(input: URLSearchParams) {
  const responseType = input.get('response_type') ?? 'code';
  const clientId = input.get('client_id') ?? 'chatgpt';
  const redirectUri = input.get('redirect_uri') ?? '';
  const state = input.get('state') ?? '';
  const codeChallenge = input.get('code_challenge') ?? '';
  const method = input.get('code_challenge_method') ?? 'S256';
  try {
    const url = new URL(redirectUri);
    if (responseType !== 'code' || !clientId || url.protocol !== 'https:' || !codeChallenge || method !== 'S256') throw new Error();
  } catch { return null; }
  return { clientId, redirectUri, state, codeChallenge };
}

async function currentUser() {
  const db = await supabase();
  return (await db.auth.getUser()).data.user;
}

export async function GET(request: Request) {
  const input = fields(new URL(request.url).searchParams);
  if (!input) return new NextResponse('Solicitação OAuth inválida.', { status: 400 });
  const user = await currentUser();
  if (!user) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(request.url)}`, request.url));
  if (user.id !== process.env.HEALTH_GPT_USER_ID) return new NextResponse('Esta conta não tem acesso a esta integração.', { status: 403 });
  const hidden = [
    ['response_type', 'code'],
    ['client_id', input.clientId],
    ['redirect_uri', input.redirectUri],
    ['state', input.state],
    ['code_challenge', input.codeChallenge],
    ['code_challenge_method', 'S256'],
  ].map(([name, value]) => `<input type="hidden" name="${name}" value="${escapeHtml(value)}">`).join('');
  return new NextResponse(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Conectar Saúde do Felipe</title><style>body{font-family:system-ui;background:#101417;color:#f7f7f7;max-width:560px;margin:10vh auto;padding:24px}main{background:#1b2124;border-radius:16px;padding:32px}button{background:#fff;color:#111;border:0;border-radius:10px;padding:12px 18px;font-weight:700;font-size:16px}p{line-height:1.5;color:#c8d0d5}</style></head><body><main><h1>Conectar Saúde do Felipe</h1><p>Você está permitindo que o ChatGPT registre e consulte os seus dados de saúde neste dashboard.</p><form method="post">${hidden}<button type="submit">Autorizar conexão</button></form></main></body></html>`, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const params = new URLSearchParams();
  for (const key of ['response_type', 'client_id', 'redirect_uri', 'state', 'code_challenge', 'code_challenge_method']) {
    const value = form.get(key); if (typeof value === 'string') params.set(key, value);
  }
  params.set('response_type', 'code'); params.set('code_challenge_method', 'S256');
  const input = fields(params);
  if (!input) return new NextResponse('Solicitação OAuth inválida.', { status: 400 });
  const user = await currentUser();
  if (!user || user.id !== process.env.HEALTH_GPT_USER_ID) return new NextResponse('Sessão inválida.', { status: 401 });
  const code = issueAuthorizationCode({ sub: user.id, clientId: input.clientId, redirectUri: input.redirectUri, codeChallenge: input.codeChallenge });
  const callback = new URL(input.redirectUri); callback.searchParams.set('code', code); if (input.state) callback.searchParams.set('state', input.state);
  // Switch the consent form POST to a GET at the OAuth client's callback.
  return NextResponse.redirect(callback, 303);
}
