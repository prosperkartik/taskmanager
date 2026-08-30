// Period-key logic: how tasks "reset" without any cron job.
// A completed task stores the period key it was completed in. When the local
// day / ISO week / month rolls over, the stored key no longer matches the
// current key, so the task renders as not-done again. Keep-an-eye items use
// the fixed key "done" (they never reset).

import type { ListId, Task } from './types';

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function dailyKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function weeklyKey(d: Date): string {
  // ISO 8601 week number ("Thursday trick"): the week belongs to the year of its Thursday.
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayOfWeek = (t.getDay() + 6) % 7; // Monday = 0
  t.setDate(t.getDate() - dayOfWeek + 3);
  const isoYear = t.getFullYear();
  const jan4 = new Date(isoYear, 0, 4);
  const jan4DayOfWeek = (jan4.getDay() + 6) % 7;
  const week1Monday = new Date(isoYear, 0, 4 - jan4DayOfWeek);
  const week = 1 + Math.round((t.getTime() - week1Monday.getTime()) / (7 * 24 * 3600 * 1000));
  return `${isoYear}-W${pad(week)}`;
}

export function monthlyKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function periodKey(list: ListId, d: Date): string {
  if (list === 'daily') return dailyKey(d);
  if (list === 'weekly') return weeklyKey(d);
  if (list === 'monthly') return monthlyKey(d);
  // One-time and keep-an-eye items store their completion DATETIME: the board
  // hides them 24h later and the LOG drawer shows when they were finished.
  // (Legacy eye completions stored the fixed string "done" — treated as done,
  // swept straight to the log.)
  return localInputValue(d);
}

export function isDone(task: Task, now: Date): boolean {
  if (task.completed_period === null) return false;
  // One-time / keep-an-eye: done forever, whenever it happened.
  if (task.list === 'once' || task.list === 'eye') return true;
  return task.completed_period === periodKey(task.list, now);
}

// "YYYY-MM-DDTHH:mm" for the current local time — comparable to scheduled_at strings.
export function localInputValue(d: Date): string {
  return `${dailyKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

export function formatHeaderDate(d: Date): string {
  return `${DAYS[d.getDay()]} · ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

// Compact chip label for a local datetime string: "14:30" today, "AUG 30 · 14:30"
// otherwise. Date-only values (legacy completion records) become "TODAY" / "AUG 30".
export function formatSchedule(scheduledAt: string, now: Date): string {
  const [datePart, timePart] = scheduledAt.split('T');
  if (!datePart) return scheduledAt;
  const [, m, day] = datePart.split('-').map(Number);
  const month = m >= 1 && m <= 12 ? MONTHS[m - 1] : '?';
  if (!timePart) return datePart === dailyKey(now) ? 'TODAY' : `${month} ${day}`;
  if (datePart === dailyKey(now)) return timePart;
  return `${month} ${day} · ${timePart}`;
}

// Short label for any stored period key: "W35" for weeks, "AUG" for months,
// dates/datetimes via formatSchedule.
export function periodLabel(period: string, now: Date): string {
  if (/^\d{4}-W\d{2}$/.test(period)) return period.slice(5);
  if (/^\d{4}-\d{2}$/.test(period)) {
    const m = Number(period.slice(5));
    return m >= 1 && m <= 12 ? MONTHS[m - 1] : period;
  }
  return formatSchedule(period, now);
}

export function isOverdue(task: Task, now: Date): boolean {
  return task.scheduled_at !== null && task.scheduled_at < localInputValue(now) && !isDone(task, now);
}
