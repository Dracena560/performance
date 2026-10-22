import { NextResponse } from 'next/server';
import { codeChallenge, issueAccessToken, readAuthorizationCode, readRefreshToken } from '@/lib/mcp-oauth';

export async function POST(request: Request) {
  let fields: Record<string, unknown>;
  try {
    fields = request.headers.get('content-type')?.includes('application/json')
      ? await request.json()
      : Object.fromEntries(await request.formData());
  } catch { return NextResponse.json({ error: 'invalid_request' }, { status: 400 }); }
  if (fields.grant_type === 'refresh_token') {
    const refresh = typeof fields.refresh_token === 'string' ? readRefreshToken(fields.refresh_token) : null;
    if (!refresh || refresh.sub !== process.env.HEALTH_GPT_USER_ID) return NextResponse.json({ error: 'invalid_grant' }, { status: 400 });
    return tokenResponse(refresh.sub);
  }
  const code = fields.code; const verifier = fields.code_verifier;
  if (fields.grant_type !== 'authorization_code' || typeof code !== 'string' || typeof verifier !== 'string') return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  const payload = readAuthorizationCode(code);
  if (!payload || payload.codeChallenge !== codeChallenge(verifier) || payload.sub !== process.env.HEALTH_GPT_USER_ID) return NextResponse.json({ error: 'invalid_grant' }, { status: 400 });
  return tokenResponse(payload.sub);
}

function tokenResponse(userId: string) {
  const token = issueAccessToken(userId);
  return NextResponse.json({ access_token: token.accessToken, refresh_token: token.refreshToken, token_type: 'Bearer', expires_in: token.expiresIn, scope: 'health:read health:write' }, { headers: { 'cache-control': 'no-store' } });
}
