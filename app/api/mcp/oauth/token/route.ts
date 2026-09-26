import { NextResponse } from 'next/server';
import { codeChallenge, issueAccessToken, readAuthorizationCode } from '@/lib/mcp-oauth';

export async function POST(request: Request) {
  const form = await request.formData();
  const code = form.get('code'); const verifier = form.get('code_verifier'); const redirectUri = form.get('redirect_uri'); const clientId = form.get('client_id');
  if (form.get('grant_type') !== 'authorization_code' || typeof code !== 'string' || typeof verifier !== 'string' || typeof redirectUri !== 'string' || typeof clientId !== 'string') return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  const payload = readAuthorizationCode(code);
  if (!payload || payload.clientId !== clientId || payload.redirectUri !== redirectUri || payload.codeChallenge !== codeChallenge(verifier) || payload.sub !== process.env.HEALTH_GPT_USER_ID) return NextResponse.json({ error: 'invalid_grant' }, { status: 400 });
  const token = issueAccessToken(payload.sub);
  return NextResponse.json({ access_token: token.accessToken, token_type: 'Bearer', expires_in: token.expiresIn, scope: 'health:read health:write' }, { headers: { 'cache-control': 'no-store' } });
}
