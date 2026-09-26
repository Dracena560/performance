import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const encoder = new TextEncoder();

type AuthorizationCode = {
  kind: 'authorization_code';
  sub: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  exp: number;
};

type AccessToken = {
  kind: 'access_token';
  sub: string;
  scope: string;
  exp: number;
};

function secret() {
  const value = process.env.HEALTH_GPT_ACTION_KEY;
  if (!value) throw new Error('A integração MCP ainda não foi configurada.');
  return value;
}

function base64url(value: Buffer | string) {
  return Buffer.from(value).toString('base64url');
}

function sign(value: string) {
  return createHmac('sha256', secret()).update(value).digest('base64url');
}

function encode(payload: object) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  return `${header}.${body}.${sign(`${header}.${body}`)}`;
}

function decode<T extends { exp: number; kind: string }>(token: string, kind: T['kind']): T | null {
  const [header, body, signature, ...extra] = token.split('.');
  if (!header || !body || !signature || extra.length) return null;
  const expected = sign(`${header}.${body}`);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as T;
    return payload.kind === kind && payload.exp > Math.floor(Date.now() / 1000) ? payload : null;
  } catch { return null; }
}

export function issueAuthorizationCode(input: Omit<AuthorizationCode, 'kind' | 'exp'>) {
  return encode({ ...input, kind: 'authorization_code', exp: Math.floor(Date.now() / 1000) + 300 });
}

export function readAuthorizationCode(code: string) {
  return decode<AuthorizationCode>(code, 'authorization_code');
}

export function issueAccessToken(userId: string) {
  const expiresIn = 60 * 60;
  return { accessToken: encode({ kind: 'access_token', sub: userId, scope: 'health:read health:write', exp: Math.floor(Date.now() / 1000) + expiresIn }), expiresIn };
}

export function readAccessToken(token: string) {
  return decode<AccessToken>(token, 'access_token');
}

export function codeChallenge(verifier: string) {
  return base64url(createHash('sha256').update(encoder.encode(verifier)).digest());
}
