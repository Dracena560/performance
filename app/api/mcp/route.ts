import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { readAccessToken } from '@/lib/mcp-oauth';
import { callTool, mcpInstructions, toolList } from '@/lib/mcp-tools';

export const runtime = 'nodejs';

function rpc(id: unknown, result: unknown) { return NextResponse.json({ jsonrpc: '2.0', id: id ?? null, result }); }
function rpcError(id: unknown, code: number, message: string) { return NextResponse.json({ jsonrpc: '2.0', id: id ?? null, error: { code, message } }); }

function authenticated(request: Request) {
  const header = request.headers.get('authorization');
  const token = header?.match(/^Bearer (.+)$/i)?.[1];
  const access = token ? readAccessToken(token) : null;
  return access?.sub === process.env.HEALTH_GPT_USER_ID ? access : null;
}

function challenge(request: Request) {
  const origin = new URL(request.url).origin;
  return new NextResponse(null, { status: 401, headers: { 'www-authenticate': `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource", scope="health:read health:write"` } });
}

export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: { allow: 'POST, OPTIONS' } }); }

export async function POST(request: Request) {
  const access=authenticated(request);if (!access) return challenge(request);
  let body: { id?: unknown; method?: string; params?: any };
  try { body = await request.json(); } catch { return rpcError(null, -32700, 'JSON inválido.'); }
  if (body.method === 'initialize') return rpc(body.id, { protocolVersion: body.params?.protocolVersion ?? '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'painel-do-felipe', version: '2.0.0' }, instructions: mcpInstructions });
  if (body.method === 'notifications/initialized') return new NextResponse(null, { status: 202 });
  if (body.method === 'tools/list') return rpc(body.id, { tools: toolList });
  if (body.method === 'tools/call') {
    try { const name=body.params?.name;const required=toolList.find(tool=>tool.name===name)?.annotations.readOnlyHint?'health:read':'health:write';if(!access.scope.split(' ').includes(required))throw new Error('A conexão não tem permissão para esta operação.');const result=await callTool(name,body.params?.arguments);if(!toolList.find(tool=>tool.name===name)?.annotations.readOnlyHint)revalidatePath('/','layout');return rpc(body.id,result); }
    catch (error) { return rpc(body.id, { content: [{ type: 'text', text: error instanceof Error ? error.message : 'Não foi possível concluir a operação.' }], isError: true }); }
  }
  return rpcError(body.id, -32601, 'Método não suportado.');
}
