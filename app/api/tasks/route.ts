// GET /api/tasks — list all tasks. POST /api/tasks — create one.

import { NextResponse } from 'next/server';
import { completionStats, createTask, listTasks } from '@/lib/db';
import { isListId, isSpace } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [tasks, stats] = await Promise.all([listTasks(), completionStats()]);
    return NextResponse.json({ tasks, stats });
  } catch (err) {
    console.error('[api/tasks GET]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let body: { title?: unknown; list?: unknown; scheduled_at?: unknown; space?: unknown };
  try {
    body = await req.json();
  } catch (err) {
    return NextResponse.json({ error: `invalid JSON body: ${String(err)}` }, { status: 400 });
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 });
  if (!isListId(body.list)) return NextResponse.json({ error: `invalid list: ${String(body.list)}` }, { status: 400 });
  const scheduledAt = typeof body.scheduled_at === 'string' && body.scheduled_at ? body.scheduled_at : null;
  const space = isSpace(body.space) ? body.space : 'work';

  try {
    const task = await createTask(title, body.list, scheduledAt, space);
    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    console.error('[api/tasks POST]', { title, list: body.list }, err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
