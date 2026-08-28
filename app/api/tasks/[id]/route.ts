// PATCH /api/tasks/:id — update whitelisted fields. DELETE /api/tasks/:id — remove.

import { NextResponse } from 'next/server';
import { deleteTask, updateTask, type TaskPatch } from '@/lib/db';
import { isListId } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function parseId(params: Promise<{ id: string }>): Promise<number | null> {
  const { id } = await params;
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = await parseId(ctx.params);
  if (id === null) return NextResponse.json({ error: 'invalid task id' }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch (err) {
    return NextResponse.json({ error: `invalid JSON body: ${String(err)}` }, { status: 400 });
  }

  const patch: TaskPatch = {};
  if (typeof body.title === 'string' && body.title.trim()) patch.title = body.title.trim();
  if ('list' in body) {
    if (!isListId(body.list)) return NextResponse.json({ error: `invalid list: ${String(body.list)}` }, { status: 400 });
    patch.list = body.list;
  }
  if (typeof body.position === 'number' && Number.isInteger(body.position)) patch.position = body.position;
  if ('scheduled_at' in body) patch.scheduled_at = typeof body.scheduled_at === 'string' && body.scheduled_at ? body.scheduled_at : null;
  if ('completed_period' in body) patch.completed_period = typeof body.completed_period === 'string' && body.completed_period ? body.completed_period : null;

  if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'no valid fields in patch' }, { status: 400 });

  try {
    const task = await updateTask(id, patch);
    return NextResponse.json({ task });
  } catch (err) {
    console.error('[api/tasks PATCH]', { id, patch }, err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = await parseId(ctx.params);
  if (id === null) return NextResponse.json({ error: 'invalid task id' }, { status: 400 });

  try {
    await deleteTask(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[api/tasks DELETE]', { id }, err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
