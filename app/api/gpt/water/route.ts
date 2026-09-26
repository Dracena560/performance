import { NextResponse } from 'next/server';
import { actionError, eventBase, requireActionKey, saveActionEvent, waterActionSchema } from '@/lib/gpt-action';

export async function POST(request: Request) {
  const access = requireActionKey(request);
  if ('error' in access) return access.error;
  try {
    const input = waterActionSchema.parse(await request.json());
    const event = await saveActionEvent(access.db, eventBase('water', { volume: input.volume_ml, beverage: 'água' }, input.occurred_at, input.notes), input.idempotency_key);
    return NextResponse.json({ saved: true, event });
  } catch (error) { return actionError(error); }
}
