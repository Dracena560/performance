import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { checkinActionSchema, dailySummary, eventBase, mealActionSchema, saveActionEvent, waterActionSchema } from '@/lib/gpt-action';
import { readAccessToken } from '@/lib/mcp-oauth';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const toolList = [
  { name: 'registrar_agua', title: 'Registrar água', description: 'Registra água ingerida. Para os atalhos do dashboard, use preset "copo" (650 ml) ou "garrafa" (590 ml), sem pedir os mililitros. Use volume_ml somente para outro volume informado pelo usuário.', inputSchema: { type: 'object', properties: { preset: { type: 'string', enum: ['copo', 'garrafa'], description: 'Atalho fixo: copo = 650 ml; garrafa = 590 ml.' }, volume_ml: { type: 'number', minimum: 1, maximum: 10000, description: 'Use apenas quando não for copo nem garrafa.' }, occurred_at: { type: 'string', description: 'Data e hora em ISO 8601. Omita para agora.' }, notes: { type: 'string' } } }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }, securitySchemes: [{ type: 'oauth2', scopes: ['health:write'] }] },
  { name: 'registrar_checkin', title: 'Registrar check-in', description: 'Registra sono, energia, humor, atividade e observações de um check-in confirmado.', inputSchema: { type: 'object', properties: { preset: { type: 'string' }, scores: { type: 'object' }, activity: { type: 'string' }, moods: { type: 'array', items: { type: 'string' } }, environment: { type: 'array', items: { type: 'string' } }, occurred_at: { type: 'string' }, notes: { type: 'string' } } }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }, securitySchemes: [{ type: 'oauth2', scopes: ['health:write'] }] },
  { name: 'registrar_refeicao', title: 'Registrar refeição', description: 'Registra uma refeição confirmada. Separe todos os ingredientes em itens individuais. Para cada item, envie gramas e nutrientes por 100 g: calorias, macros, fibras, açúcar, sódio, vitaminas e minerais quando conhecidos. Quando a porção ou a nutrição vier apenas da descrição ou foto, use a melhor estimativa e estimated=true. Use estimated=false somente com rótulo ou valor informado pelo usuário.', inputSchema: { type: 'object', required: ['name', 'items'], properties: { name: { type: 'string' }, meal_type: { type: 'string' }, items: { type: 'array', items: { type: 'object', required: ['name', 'grams'], properties: { name: { type: 'string' }, grams: { type: 'number', minimum: 1 }, nutrition: { type: 'object', description: 'Valores por 100 g. Campos: calories (kcal); protein, carbs, fat, saturated_fat, fibre, sugar (g); sodium, vitamin_a, vitamin_c, vitamin_d, vitamin_b12, folate, calcium, iron, magnesium, potassium, zinc (mg). Use null quando desconhecido.' } } } }, hunger: { type: 'number', minimum: 0, maximum: 10 }, satiety: { type: 'number', minimum: 0, maximum: 10 }, estimated: { type: 'boolean', description: 'true para valores inferidos ou estimados; false apenas para dados confirmados.' }, occurred_at: { type: 'string' }, notes: { type: 'string' } } }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }, securitySchemes: [{ type: 'oauth2', scopes: ['health:write'] }] },
  { name: 'consultar_resumo_diario', title: 'Consultar resumo diário', description: 'Consulta água, refeições, metas e eventos de uma data.', inputSchema: { type: 'object', properties: { date: { type: 'string', description: 'Data AAAA-MM-DD. Omita para hoje.' } } }, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }, securitySchemes: [{ type: 'oauth2', scopes: ['health:read'] }] },
];

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

function database() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('O servidor ainda não foi configurado.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function textResult(value: unknown) { return { content: [{ type: 'text', text: JSON.stringify(value) }], structuredContent: value }; }
function input(value: unknown) { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }

async function callTool(name: string, argumentsValue: unknown) {
  const args = input(argumentsValue); const db = database(); const key = typeof args.idempotency_key === 'string' ? args.idempotency_key : randomUUID();
  if (name === 'registrar_agua') {
    const presetVolumes: Record<string, number> = { copo: 650, garrafa: 590 };
    const preset = typeof args.preset === 'string' ? args.preset.toLowerCase() : undefined;
    const volume = preset ? presetVolumes[preset] : args.volume_ml;
    if (typeof volume !== 'number') throw new Error('Informe um copo, uma garrafa ou o volume em mililitros.');
    const value = waterActionSchema.parse({ ...args, volume_ml: volume, idempotency_key: key });
    const event = await saveActionEvent(db, eventBase('water', { volume: value.volume_ml, beverage: 'água' }, value.occurred_at, value.notes), value.idempotency_key);
    return textResult({ saved: true, event });
  }
  if (name === 'registrar_checkin') {
    const value = checkinActionSchema.parse({ ...args, idempotency_key: key });
    const event = await saveActionEvent(db, eventBase('checkin', { preset: value.preset, scores: value.scores, activity: value.activity ?? '', moods: value.moods, environment: value.environment }, value.occurred_at, value.notes), value.idempotency_key);
    return textResult({ saved: true, event });
  }
  if (name === 'registrar_refeicao') {
    const value = mealActionSchema.parse({ ...args, idempotency_key: key });
    const event = await saveActionEvent(db, eventBase('meal', { name: value.name, meal_type: value.meal_type, items: value.items, hunger: value.hunger, satiety: value.satiety }, value.occurred_at, value.notes, value.estimated), value.idempotency_key);
    return textResult({ saved: true, event });
  }
  if (name === 'consultar_resumo_diario') return textResult(await dailySummary(db, process.env.HEALTH_GPT_USER_ID!, typeof args.date === 'string' ? args.date : undefined));
  throw new Error('Ferramenta não encontrada.');
}

export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: { allow: 'POST, OPTIONS' } }); }

export async function POST(request: Request) {
  if (!authenticated(request)) return challenge(request);
  let body: { id?: unknown; method?: string; params?: any };
  try { body = await request.json(); } catch { return rpcError(null, -32700, 'JSON inválido.'); }
  if (body.method === 'initialize') return rpc(body.id, { protocolVersion: body.params?.protocolVersion ?? '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'saude-do-felipe', version: '1.1.0' }, instructions: 'Use as ferramentas para consultar ou salvar dados. Para água, “copo” é sempre 650 ml e “garrafa” é sempre 590 ml; registre esses atalhos diretamente. Em refeições, separe cada ingrediente e registre nutrientes por 100 g, incluindo vitaminas e minerais. Se inferir porções ou nutrição a partir de texto ou imagem, salve como estimativa (estimated=true), nunca como valor exato.' });
  if (body.method === 'notifications/initialized') return new NextResponse(null, { status: 202 });
  if (body.method === 'tools/list') return rpc(body.id, { tools: toolList });
  if (body.method === 'tools/call') {
    try { return rpc(body.id, await callTool(body.params?.name, body.params?.arguments)); }
    catch (error) { return rpc(body.id, { content: [{ type: 'text', text: error instanceof Error ? error.message : 'Não foi possível concluir a operação.' }], isError: true }); }
  }
  return rpcError(body.id, -32601, 'Método não suportado.');
}
