// Shared task types for API, DB layer, and UI.

export const LIST_IDS = ['daily', 'once', 'eye', 'weekly', 'monthly'] as const;
export type ListId = (typeof LIST_IDS)[number];

export const LIST_LABELS: Record<ListId, string> = {
  daily: 'DAILY',
  once: 'ONE-TIME',
  eye: 'KEEP AN EYE',
  weekly: 'WEEKLY',
  monthly: 'MONTHLY',
};

// Two fully separate boards behind one UI: the default work board and the
// "secret" personal board (eye icon in the topbar). Not persisted across
// refreshes on purpose — the app always opens on work.
export const SPACES = ['work', 'personal'] as const;
export type Space = (typeof SPACES)[number];

export function isSpace(value: unknown): value is Space {
  return typeof value === 'string' && (SPACES as readonly string[]).includes(value);
}

export interface Task {
  id: number;
  title: string;
  list: ListId;
  space: Space;
  position: number;
  // Local naive datetime "YYYY-MM-DDTHH:mm" straight from <input type="datetime-local">.
  // Stored as text on purpose: the board is single-user, so "local time" is unambiguous.
  scheduled_at: string | null;
  // Period key the task was completed in ("2026-08-28", "2026-W35", "2026-08", or "done"
  // for keep-an-eye items). Completion silently expires when the period rolls over.
  completed_period: string | null;
}

export function isListId(value: unknown): value is ListId {
  return typeof value === 'string' && (LIST_IDS as readonly string[]).includes(value);
}
