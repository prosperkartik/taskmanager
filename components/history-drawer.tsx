'use client';

// LOG drawer for the current board:
// - ONE-TIME / KEEP AN EYE: every completed task (visible or swept), newest
//   first, with one-click restore.
// - WEEKLY / MONTHLY: recurring tasks with how many times they were ever
//   completed and the last period ("✔ 3× · LAST W35").

import type { Task } from '@/lib/types';
import { formatSchedule, periodLabel } from '@/lib/periods';

export type CompletionStats = Record<number, { count: number; last: string }>;

interface HistoryDrawerProps {
  tasks: Task[];
  stats: CompletionStats;
  now: Date;
  onRestore: (task: Task) => void;
  onClose: () => void;
}

function completedFor(tasks: Task[], list: 'once' | 'eye'): Task[] {
  return tasks
    .filter((t) => t.list === list && t.completed_period !== null)
    .sort((a, b) => {
      // Legacy "done" entries (no timestamp) sink to the bottom.
      const aLegacy = a.completed_period === 'done';
      const bLegacy = b.completed_period === 'done';
      if (aLegacy !== bLegacy) return aLegacy ? 1 : -1;
      return b.completed_period!.localeCompare(a.completed_period!);
    });
}

export default function HistoryDrawer({ tasks, stats, now, onRestore, onClose }: HistoryDrawerProps) {
  const oneOffSections: Array<[string, Task[]]> = [
    ['ONE-TIME', completedFor(tasks, 'once')],
    ['KEEP AN EYE', completedFor(tasks, 'eye')],
  ];
  const recurringSections: Array<[string, Task[]]> = (['weekly', 'monthly'] as const).map((list) => [
    list === 'weekly' ? 'WEEKLY' : 'MONTHLY',
    tasks
      .filter((t) => t.list === list && (stats[t.id]?.count ?? 0) > 0)
      .sort((a, b) => (stats[b.id]?.count ?? 0) - (stats[a.id]?.count ?? 0)),
  ]);
  const empty =
    oneOffSections.every(([, items]) => items.length === 0) &&
    recurringSections.every(([, items]) => items.length === 0);

  return (
    <div className="hist-overlay" onClick={onClose}>
      <aside className="hist-drawer" onClick={(e) => e.stopPropagation()}>
        <header className="col-head">
          <h2>LOG</h2>
          <button className="icon-btn" aria-label="Close log" onClick={onClose}>✕</button>
        </header>
        <div className="col-hint">COMPLETED TASKS + REPEAT COUNTS · ↩ PUTS ONE-TIME / EYE BACK ON THE BOARD</div>

        <div className="hist-body">
          {empty && <div className="empty-slot">NOTHING COMPLETED YET</div>}

          {oneOffSections.map(([label, items]) =>
            items.length === 0 ? null : (
              <div key={label}>
                <div className="sched-group">{label}</div>
                {items.map((t) => (
                  <div key={t.id} className="hist-row">
                    <span className="hist-title">{t.title}</span>
                    <span className="time-chip">
                      {t.completed_period === 'done' ? 'EARLIER' : `✔ ${formatSchedule(t.completed_period!, now)}`}
                    </span>
                    <button className="icon-btn" title="Restore to board" onClick={() => onRestore(t)}>↩</button>
                  </div>
                ))}
              </div>
            )
          )}

          {recurringSections.map(([label, items]) =>
            items.length === 0 ? null : (
              <div key={label}>
                <div className="sched-group">{label}</div>
                {items.map((t) => (
                  <div key={t.id} className="hist-row">
                    <span className="hist-title hist-plain">{t.title}</span>
                    <span className="time-chip">✔ {stats[t.id]!.count}×</span>
                    <span className="hist-last">LAST {periodLabel(stats[t.id]!.last, now)}</span>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </aside>
    </div>
  );
}
