'use client';

// LOG drawer: every completed one-time and keep-an-eye task of the current
// board (visible or already swept off), newest first, with one-click restore.

import type { Task } from '@/lib/types';
import { formatSchedule } from '@/lib/periods';

interface HistoryDrawerProps {
  tasks: Task[];
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

export default function HistoryDrawer({ tasks, now, onRestore, onClose }: HistoryDrawerProps) {
  const sections: Array<[string, Task[]]> = [
    ['ONE-TIME', completedFor(tasks, 'once')],
    ['KEEP AN EYE', completedFor(tasks, 'eye')],
  ];
  const empty = sections.every(([, items]) => items.length === 0);

  return (
    <div className="hist-overlay" onClick={onClose}>
      <aside className="hist-drawer" onClick={(e) => e.stopPropagation()}>
        <header className="col-head">
          <h2>LOG</h2>
          <button className="icon-btn" aria-label="Close log" onClick={onClose}>✕</button>
        </header>
        <div className="col-hint">COMPLETED ONE-TIME + KEEP AN EYE · ↩ PUTS IT BACK ON THE BOARD</div>

        <div className="hist-body">
          {empty && <div className="empty-slot">NOTHING COMPLETED YET</div>}
          {sections.map(([label, items]) =>
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
        </div>
      </aside>
    </div>
  );
}
