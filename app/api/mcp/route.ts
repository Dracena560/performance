import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { checkinActionSchema, dailySummary, eventBase, mealActionSchema, saveActionEvent, waterActionSchema } from '@/lib/gpt-action';
import { readAccessToken } from '@/lib/mcp-oauth';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const toolList = [
  { name: 'registrar_agua', title: 'Registrar água', description: 'Registra água ingerida. Para os atalhos do dashboard, use preset "copo" (650 ml) ou "garrafa" (590 ml), sem pedir os mililitros. Use volume_ml somente para outro volume informado pelo usuário.', inputSchema: { type: 'object', properties: { preset: { type: 'string', enum: ['copo', 'garrafa'], description: 'Atalho fixo: copo = 650 ml; garrafa = 590 ml.' }, volume_ml: { type: 'number', minimum: 1, maximum: 10000, description: 'Use apenas quando não for copo nem garrafa.' }, occurred_at: { type: 'string', description: 'Data e hora em ISO 8601. Omita para agora.' }, notes: { type: 'string' } } }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }, securitySchemes: [{ type: 'oauth2', scopes: ['health:write'] }] },
  { name: 'registrar_checkin', title: 'Registrar check-in', description: 'Registra sono, energia, humor, atividade e observações de um check-in confirmado.', inputSchema: { type: 'object', properties: { preset: { type: 'string' }, scores: { type: 'object' }, activity: { type: 'string' }, moods: { type: 'array', items: { type: 'string' } }, environment: { type: 'array', items: { type: 'string' } }, occurred_at: { type: 'string' }, notes: { type: 'string' } } }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }, securitySchemes: [{ type: 'oauth2', scopes: ['health:write'] }] },
  { name: 'registrar_refeicao', title: 'Registrar refeição', description: 'Registra uma refeição confirmada. Separe todos os ingredientes em itens individuais e preencha TODOS os nutrientes por 100 g: macros, vitaminas e minerais. Não use null e não omita campos. Quando a porção ou nutrição vier de descrição ou foto, faça a melhor estimativa e use estimated=true. Use estimated=false somente com rótulo ou valor informado pelo usuário.', inputSchema: { type: 'object', required: ['name', 'items'], properties: { name: { type: 'string' }, meal_type: { type: 'string' }, items: { type: 'array', items: { type: 'object', required: ['name', 'grams', 'nutrition'], properties: { name: { type: 'string' }, grams: { type: 'number', minimum: 1 }, nutrition: { type: 'object', required: ['calories','protein','carbs','fat','saturated_fat','fibre','sugar','sodium','vitamin_a','vitamin_c','vitamin_d','vitamin_b12','folate','calcium','iron','magnesium','potassium','zinc'], properties: { calories: { type: 'number', minimum: 0, description: 'kcal por 100 g' }, protein: { type: 'number', minimum: 0, description: 'g por 100 g' }, carbs: { type: 'number', minimum: 0, description: 'g por 100 g' }, fat: { type: 'number', minimum: 0, description: 'g por 100 g' }, saturated_fat: { type: 'number', minimum: 0, description: 'g por 100 g' }, fibre: { type: 'number', minimum: 0, description: 'g por 100 g' }, sugar: { type: 'number', minimum: 0, description: 'g por 100 g' }, sodium: { type: 'number', minimum: 0, description: 'mg por 100 g' }, vitamin_a: { type: 'number', minimum: 0, description: 'µg por 100 g' }, vitamin_c: { type: 'number', minimum: 0, description: 'mg por 100 g' }, vitamin_d: { type: 'number', minimum: 0, description: 'µg por 100 g' }, vitamin_b12: { type: 'number', minimum: 0, description: 'µg por 100 g' }, folate: { type: 'number', minimum: 0, description: 'µg por 100 g' }, calcium: { type: 'number', minimum: 0, description: 'mg por 100 g' }, iron: { type: 'number', minimum: 0, description: 'mg por 100 g' }, magnesium: { type: 'number', minimum: 0, description: 'mg por 100 g' }, potassium: { type: 'number', minimum: 0, description: 'mg por 100 g' }, zinc: { type: 'number', minimum: 0, description: 'mg por 100 g' } } } } } }, hunger: { type: 'number', minimum: 0, maximum: 10 }, satiety: { type: 'number', minimum: 0, maximum: 10 }, estimated: { type: 'boolean', description: 'true para valores inferidos ou estimados; false apenas para dados confirmados.' }, occurred_at: { type: 'string' }, notes: { type: 'string' } } }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }, securitySchemes: [{ type: 'oauth2', scopes: ['health:write'] }] },
  { name: 'consultar_resumo_diario', title: 'Consultar resumo diário', description: 'Consulta água, refeições, metas e eventos de uma data.', inputSchema: { type: 'object', properties: { date: { type: 'string', description: 'Data AAAA-MM-DD. Omita para hoje.' } } }, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }, securitySchemes: [{ type: 'oauth2', scopes: ['health:read'] }] },
  { name: 'registrar_sono', title: 'Registrar sono', description: 'Registra sono manualmente ou a partir de uma imagem do Apple Health/Watch. Extraia tudo que estiver legível: duração, horários, acordado, REM, Core, profundo, frequência cardíaca, respiração, SpO2 e observações. Preserve valores ausentes como ausentes.', inputSchema: { type: 'object', required: ['date','data'], properties: { date: { type: 'string' }, data: { type: 'object' }, notes: { type: 'string' } } }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }, securitySchemes: [{ type: 'oauth2', scopes: ['health:write'] }] },
  { name: 'registrar_exercicio', title: 'Registrar exercício', description: 'Registra exercício manualmente ou a partir de imagem do Apple Fitness/Watch. Extraia todos os dados visíveis: modalidade, duração, calorias ativas e totais, distância, passos, FC, zonas, esforço e horários.', inputSchema: { type: 'object', required: ['date','data'], properties: { date: { type: 'string' }, data: { type: 'object' }, notes: { type: 'string' } } }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }, securitySchemes: [{ type: 'oauth2', scopes: ['health:write'] }] },
  { name: 'registrar_fezes', title: 'Registrar fezes', description: 'Registra fezes com quantidade, consistência pessoal de 0 a 10, horário, urgência, dor, gases, estufamento e observações.', inputSchema: { type: 'object', required: ['date','data'], properties: { date: { type: 'string' }, data: { type: 'object', required: ['quantidade','consistencia'] }, notes: { type: 'string' } } }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }, securitySchemes: [{ type: 'oauth2', scopes: ['health:write'] }] },
  { name: 'registrar_suplementos', title: 'Registrar suplementos', description: 'Registra suplementos do dia ou noite e horário. Rotina diurna: vitamina D, vitamina E, ômega-3, CoQ10, selênio, vitamina C e glucosamina. Rotina noturna: magnésio e ashwagandha. Registre apenas o que o usuário confirmou ter tomado.', inputSchema: { type: 'object', required: ['date','period','items'], properties: { date: { type: 'string' }, period: { type: 'string', enum: ['dia','noite'] }, items: { type: 'array', items: { type: 'string' } }, notes: { type: 'string' } } }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }, securitySchemes: [{ type: 'oauth2', scopes: ['health:write'] }] },
  { name: 'registrar_tenis', title: 'Registrar tênis', description: 'Registra treino ou jogo de tênis, inclusive dados pré e pós. Inclua tipo, adversário/parceiro, placar, duração, energia física, clareza, motivação, foco, esforço, sintomas, análise livre e todos os dados que o usuário fornecer.', inputSchema: { type: 'object', required: ['date','data'], properties: { date: { type: 'string' }, data: { type: 'object' }, notes: { type: 'string' } } }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }, securitySchemes: [{ type: 'oauth2', scopes: ['health:write'] }] },
  { name: 'planejar_semana', title: 'Planejar semana e metas', description: 'Quando o usuário enviar a agenda semanal ou foto do calendário, extraia os compromissos e crie um plano para cada dia com tipo de dia e metas de água, calorias, proteína, carboidratos, gordura, gordura saturada e fibra adequadas à carga. Explique a lógica sem fazer diagnóstico.', inputSchema: { type: 'object', required: ['plans'], properties: { plans: { type: 'array', items: { type: 'object', required: ['date','day_type','targets','agenda'], properties: { date: { type: 'string' }, day_type: { type: 'string' }, targets: { type: 'object' }, agenda: { type: 'array', items: { type: 'string' } }, rationale: { type: 'string' } } } } } }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }, securitySchemes: [{ type: 'oauth2', scopes: ['health:write'] }] },
  { name: 'meu_dia', title: 'Analisar meu dia', description: 'Use quando o usuário disser “Meu dia”. Consulta eventos, sono, exercício, suplementos, fezes, tênis e plano do dia. Depois de chamar, produza 3 a 5 insights concretos e cautelosos sobre padrões, recuperação, carga, hidratação e próximos passos; não apenas uma lista de totais e não faça diagnóstico médico.', inputSchema: { type: 'object', properties: { date: { type: 'string' } } }, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }, securitySchemes: [{ type: 'oauth2', scopes: ['health:read'] }] },
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
function dateFrom(value: unknown) { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()); }
async function saveRecord(db: ReturnType<typeof database>, category: string, args: Record<string, unknown>) { const date=dateFrom(args.date); const result=await db.from('health_records').insert({ user_id: process.env.HEALTH_GPT_USER_ID!, category, recorded_on: date, recorded_at: new Date().toISOString(), payload: args.data ?? args, source: 'ChatGPT' }).select().single(); if(result.error) throw new Error(result.error.message); return result.data; }

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
  if (name === 'registrar_sono') return textResult({ saved: true, record: await saveRecord(db,'sleep',args) });
  if (name === 'registrar_exercicio') return textResult({ saved: true, record: await saveRecord(db,'activity',args) });
  if (name === 'registrar_fezes') return textResult({ saved: true, record: await saveRecord(db,'bowel',args) });
  if (name === 'registrar_suplementos') return textResult({ saved: true, record: await saveRecord(db,'supplement',args) });
  if (name === 'registrar_tenis') return textResult({ saved: true, record: await saveRecord(db,'tennis',args) });
  if (name === 'planejar_semana') { const plans=Array.isArray(args.plans)?args.plans:[]; const saved=[]; for(const raw of plans){const plan=input(raw);const date=dateFrom(plan.date);const result=await db.from('day_plans').upsert({user_id:process.env.HEALTH_GPT_USER_ID!,local_date:date,day_type:String(plan.day_type??'customizado'),targets:input(plan.targets),agenda:Array.isArray(plan.agenda)?plan.agenda:[],rationale:String(plan.rationale??'')},{onConflict:'user_id,local_date'}).select().single();if(result.error)throw new Error(result.error.message);saved.push(result.data);} return textResult({saved:true,plans:saved}); }
  if (name === 'meu_dia') { const date=dateFrom(args.date);const [summary,records,plan]=await Promise.all([dailySummary(db,process.env.HEALTH_GPT_USER_ID!,date),db.from('health_records').select('category,recorded_at,payload,source').eq('user_id',process.env.HEALTH_GPT_USER_ID!).eq('recorded_on',date).order('recorded_at'),db.from('day_plans').select('*').eq('user_id',process.env.HEALTH_GPT_USER_ID!).eq('local_date',date).maybeSingle()]);if(records.error||plan.error)throw new Error(records.error?.message??plan.error?.message);return textResult({date,summary,health_records:records.data,plan:plan.data,analysis_instruction:'Compare carga planejada e realizada; conecte sono, exercício, digestão, refeições, hidratação e check-ins quando houver evidência. Diga também o que ainda não é possível concluir.'}); }
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
