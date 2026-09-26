import { NextResponse } from 'next/server';
import { actionError, checkinActionSchema, eventBase, requireActionKey, saveActionEvent } from '@/lib/gpt-action';

export async function POST(request: Request) {
  const access = requireActionKey(request);
  if ('error' in access) return access.error;
  try {
    const input = checkinActionSchema.parse(await request.json());
    const event = await saveActionEvent(access.db, eventBase('checkin', { preset: input.preset, scores: input.scores, activity: input.activity, moods: input.moods, environment: input.environment }, input.occurred_at, input.notes), input.idempotency_key);
    return NextResponse.json({ saved: true, event });
  } catch (error) { return actionError(error); }
}
