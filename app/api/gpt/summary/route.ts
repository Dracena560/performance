import { NextResponse } from 'next/server';
import { actionError, dailySummary, requireActionKey } from '@/lib/gpt-action';

export async function GET(request: Request) {
  const access = requireActionKey(request);
  if ('error' in access) return access.error;
  try {
    const date = new URL(request.url).searchParams.get('date') ?? undefined;
    return NextResponse.json(await dailySummary(access.db, access.userId, date));
  } catch (error) { return actionError(error); }
}
