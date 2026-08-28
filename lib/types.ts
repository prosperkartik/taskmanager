// Shared task types for API, DB layer, and UI.

export const LIST_IDS = ['daily', 'eye', 'weekly', 'monthly'] as const;
export type ListId = (typeof LIST_IDS)[number];

export const LIST_LABELS: Record<ListId, string> = {
  daily: 'DAILY',
  eye: 'KEEP AN EYE',
  weekly: 'WEEKLY',
  monthly: 'MONTHLY',
};

export interface Task {
  id: number;
  title: string;
  list: ListId;
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
