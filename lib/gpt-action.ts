import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { localDate, nutrients, scoreKeys, timezone, totals, type HealthEvent } from '@/lib/domain';

const required = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'HEALTH_GPT_ACTION_KEY', 'HEALTH_GPT_USER_ID'] as const;

function configured() {
  return required.every((key) => Boolean(process.env[key]));
}

export function unauthorized() {
  return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
}

export function requireActionKey(request: Request) {
  if (!configured()) {
    return { error: NextResponse.json({ error: 'A integração do GPT ainda não foi configurada no servidor.' }, { status: 503 }) };
  }
  const received = request.headers.get('x-health-action-key');
  const expected = process.env.HEALTH_GPT_ACTION_KEY!;
  if (!received) return { error: unauthorized() };
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { error: unauthorized() };
  return { db: createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } }), userId: process.env.HEALTH_GPT_USER_ID! };
}

export const idempotencySchema = z.string().uuid();
export const occurredAtSchema = z.string().datetime({ offset: true }).optional();

export function eventBase(kind: 'water' | 'checkin' | 'meal', data: Record<string, unknown>, occurredAt?: string, notes = '', estimated = false) {
  return {
    user_id: process.env.HEALTH_GPT_USER_ID!,
    timestamp: occurredAt ?? new Date().toISOString(),
    timezone,
    type: kind,
    source: 'ChatGPT',
    measurement_type: kind === 'checkin' ? 'subjective' : estimated ? 'estimated' : 'exact',
    estimated: kind === 'checkin' ? false : estimated,
    data: { kind, ...data },
    notes,
  };
}

export async function saveActionEvent(db: any, event: Record<string, unknown>, idempotencyKey: string) {
  const result = await db.from('events').upsert(
    { ...event, import_source: 'ChatGPT', source_record_id: idempotencyKey },
    { onConflict: 'user_id,import_source,source_record_id' },
  ).select('id, timestamp, local_date, type, data, notes').single();
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

const nutritionShape = Object.fromEntries(nutrients.map((nutrient) => [nutrient, z.number().nonnegative().nullable().optional().default(null)])) as unknown as Record<typeof nutrients[number], z.ZodTypeAny>;
export const actionNutritionSchema = z.object(nutritionShape);
const requiredMealNutrients = ['calories','protein','carbs','fat','saturated_fat','fibre','sugar','sodium','vitamin_a','vitamin_c','vitamin_d','vitamin_b12','folate','calcium','iron','magnesium','potassium','zinc'] as const;
export const actionMealItemSchema = z.object({
  name: z.string().trim().min(1).max(200),
  grams: z.number().positive().max(10000),
  nutrition: actionNutritionSchema.default({}),
}).superRefine((item, context) => {
  for (const nutrient of requiredMealNutrients) {
    if (typeof item.nutrition[nutrient] !== 'number') context.addIssue({ code: z.ZodIssueCode.custom, path: ['nutrition', nutrient], message: `Informe ${nutrient} por 100 g antes de salvar a refeição.` });
  }
});

export const waterActionSchema = z.object({
  volume_ml: z.number().positive().max(10000),
  occurred_at: occurredAtSchema,
  notes: z.string().max(5000).default(''),
  idempotency_key: idempotencySchema,
});

export const checkinActionSchema = z.object({
  preset: z.string().trim().min(1).max(50).default('Check-in pelo ChatGPT'),
  scores: z.record(z.enum(scoreKeys as [string, ...string[]]), z.number().min(0).max(10).nullable()).default({}),
  activity: z.string().max(100).optional(),
  moods: z.array(z.string().max(50)).max(20).default([]),
  environment: z.array(z.string().max(50)).max(20).default([]),
  occurred_at: occurredAtSchema,
  notes: z.string().max(5000).default(''),
  idempotency_key: idempotencySchema,
});

export const mealActionSchema = z.object({
  name: z.string().trim().min(1).max(200),
  meal_type: z.string().trim().min(1).max(50).default('refeição'),
  items: z.array(actionMealItemSchema).min(1).max(100),
  hunger: z.number().min(0).max(10).nullable().optional().default(null),
  satiety: z.number().min(0).max(10).nullable().optional().default(null),
  occurred_at: occurredAtSchema,
  notes: z.string().max(5000).default(''),
  estimated: z.boolean().optional().default(true),
  idempotency_key: idempotencySchema,
});

export async function dailySummary(db: any, userId: string, date?: string) {
  const selected = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : localDate();
  const [eventsResult, dayResult] = await Promise.all([
    db.from('events').select('id, timestamp, local_date, type, source, measurement_type, estimated, notes, data').eq('user_id', userId).eq('local_date', selected).order('timestamp'),
    db.from('days').select('targets, day_type').eq('user_id', userId).eq('local_date', selected).maybeSingle(),
  ]);
  if (eventsResult.error || dayResult.error) throw new Error(eventsResult.error?.message ?? dayResult.error?.message);
  const events = eventsResult.data as HealthEvent[];
  const day = dayResult.data as { targets?: object; day_type?: string } | null;
  return { date: selected, totals: totals(events), targets: day?.targets ?? {}, day_type: day?.day_type ?? 'normal', events };
}

export function actionError(error: unknown) {
  const message = error instanceof z.ZodError ? error.issues.map((issue) => issue.message).join(' ') : 'Não foi possível processar o registro.';
  return NextResponse.json({ error: message }, { status: 400 });
}
