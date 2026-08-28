// Neon Postgres data layer. One `tasks` table, created lazily on first use.
// All reset/period logic lives client-side (lib/periods.ts); the DB only
// stores strings. Uses the Neon HTTP driver — no connection pooling to manage.

import { neon } from '@neondatabase/serverless';
import type { ListId, Task } from './types';

const DB_URL = process.env.POSTGRES_URL ?? process.env.DATABASE_URL ?? '';

let ensured = false;

async function query(text: string, params: unknown[] = []): Promise<Record<string, unknown>[]> {
  if (!DB_URL) {
    throw new Error(
      'db: POSTGRES_URL / DATABASE_URL not set. Locally: `vercel env pull`. On Vercel: connect the Neon integration.'
    );
  }
  const sql = neon(DB_URL);
  // Driver returns rows directly by default; tolerate { rows } in case fullResults is on.
  const result = (await sql.query(text, params)) as unknown;
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  return (result as { rows: Record<string, unknown>[] }).rows ?? [];
}

async function ensureSchema(): Promise<void> {
  if (ensured) return;
  await query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      list TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      scheduled_at TEXT,
      completed_period TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  ensured = true;
}

const TASK_COLUMNS = 'id, title, list, position, scheduled_at, completed_period';

export async function listTasks(): Promise<Task[]> {
  await ensureSchema();
  const rows = await query(`SELECT ${TASK_COLUMNS} FROM tasks ORDER BY list, position, id`);
  return rows as unknown as Task[];
}

export async function createTask(title: string, list: ListId, scheduledAt: string | null): Promise<Task> {
  await ensureSchema();
  const rows = await query(
    `INSERT INTO tasks (title, list, position, scheduled_at)
     VALUES ($1, $2, COALESCE((SELECT MAX(position) + 1 FROM tasks WHERE list = $2), 0), $3)
     RETURNING ${TASK_COLUMNS}`,
    [title, list, scheduledAt]
  );
  if (!rows[0]) throw new Error(`db.createTask: insert returned no row (title=${JSON.stringify(title)})`);
  return rows[0] as unknown as Task;
}

export interface TaskPatch {
  title?: string;
  list?: ListId;
  position?: number;
  scheduled_at?: string | null;
  completed_period?: string | null;
}

export async function updateTask(id: number, patch: TaskPatch): Promise<Task> {
  await ensureSchema();
  const entries = Object.entries(patch).filter(([, v]) => v !== undefined);
  if (entries.length === 0) throw new Error(`db.updateTask: empty patch for id=${id}`);
  const setClause = entries.map(([key], i) => `${key} = $${i + 1}`).join(', ');
  const params = [...entries.map(([, v]) => v), id];
  const rows = await query(
    `UPDATE tasks SET ${setClause} WHERE id = $${entries.length + 1} RETURNING ${TASK_COLUMNS}`,
    params
  );
  if (!rows[0]) throw new Error(`db.updateTask: no task with id=${id}`);
  return rows[0] as unknown as Task;
}

export async function deleteTask(id: number): Promise<void> {
  await ensureSchema();
  await query('DELETE FROM tasks WHERE id = $1', [id]);
}

export interface PositionUpdate {
  id: number;
  list: ListId;
  position: number;
}

export async function reorderTasks(updates: PositionUpdate[]): Promise<void> {
  await ensureSchema();
  await Promise.all(
    updates.map((u) => query('UPDATE tasks SET list = $1, position = $2 WHERE id = $3', [u.list, u.position, u.id]))
  );
}
