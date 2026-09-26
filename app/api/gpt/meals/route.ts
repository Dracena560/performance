import { NextResponse } from 'next/server';
import { actionError, eventBase, mealActionSchema, requireActionKey, saveActionEvent } from '@/lib/gpt-action';

export async function POST(request: Request) {
  const access = requireActionKey(request);
  if ('error' in access) return access.error;
  try {
    const input = mealActionSchema.parse(await request.json());
    const items = input.items.map((item) => ({ food_id: null, ...item }));
    const event = await saveActionEvent(access.db, eventBase('meal', { name: input.name, meal_type: input.meal_type, items, hunger: input.hunger, satiety: input.satiety }, input.occurred_at, input.notes), input.idempotency_key);
    return NextResponse.json({ saved: true, event });
  } catch (error) { return actionError(error); }
}
