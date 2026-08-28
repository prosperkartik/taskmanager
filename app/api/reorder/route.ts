// POST /api/reorder — persist list membership + positions after drag-and-drop.
// Body: { updates: [{ id, list, position }, ...] } (the whole board; it is small).

import { NextResponse } from 'next/server';
import { reorderTasks, type PositionUpdate } from '@/lib/db';
import { isListId } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: { updates?: unknown };
  try {
    body = await req.json();
  } catch (err) {
    return NextResponse.json({ error: `invalid JSON body: ${String(err)}` }, { status: 400 });
  }

  if (!Array.isArray(body.updates) || body.updates.length === 0 || body.updates.length > 500) {
    return NextResponse.json({ error: 'updates must be a non-empty array (max 500)' }, { status: 400 });
  }

  const updates: PositionUpdate[] = [];
  for (const u of body.updates) {
    const id = Number((u as Record<string, unknown>)?.id);
    const list = (u as Record<string, unknown>)?.list;
    const position = Number((u as Record<string, unknown>)?.position);
    if (!Number.isInteger(id) || id <= 0 || !isListId(list) || !Number.isInteger(position)) {
      return NextResponse.json({ error: `invalid update entry: ${JSON.stringify(u)}` }, { status: 400 });
    }
    updates.push({ id, list, position });
  }

  try {
    await reorderTasks(updates);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[api/reorder POST]', { count: updates.length }, err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
