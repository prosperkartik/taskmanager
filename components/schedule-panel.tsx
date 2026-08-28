'use client';

// Center-column schedule: every task with a date+time, grouped into
// LATE / TODAY / UP NEXT, sorted chronologically.

import type { Task } from '@/lib/types';
import { LIST_LABELS } from '@/lib/types';
import { dailyKey, formatSchedule, isDone, isOverdue } from '@/lib/periods';

interface SchedulePanelProps {
  tasks: Task[];
  now: Date;
  onToggle: (task: Task, at?: { x: number; y: number }) => void;
}

function Row({ task, now, onToggle }: { task: Task; now: Date; onToggle: SchedulePanelProps['onToggle'] }) {
  const done = isDone(task, now);
  const late = isOverdue(task, now);
  return (
    <div className={`sched-row ${done ? 'done' : ''} ${late ? 'late' : ''}`}>
      <button
        className="tickbox"
        aria-label={done ? 'Mark as not done' : 'Mark as done'}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          onToggle(task, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
        }}
      >
        {done ? '★' : ''}
      </button>
      <span className={`time-chip ${late ? 'time-late' : ''}`}>{formatSchedule(task.scheduled_at!, now)}</span>
      <span className="sched-title">{task.title}</span>
      <span className={`list-tag tag-${task.list}`}>{LIST_LABELS[task.list]}</span>
    </div>
  );
}

export default function SchedulePanel({ tasks, now, onToggle }: SchedulePanelProps) {
  const scheduled = tasks
    .filter((t): t is Task & { scheduled_at: string } => t.scheduled_at !== null)
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));

  const today = dailyKey(now);
  const late = scheduled.filter((t) => isOverdue(t, now));
  const todayRows = scheduled.filter((t) => t.scheduled_at.startsWith(today) && !isOverdue(t, now));
  const upcoming = scheduled.filter((t) => !t.scheduled_at.startsWith(today) && !isOverdue(t, now));

  return (
    <section className="panel schedule grow">
      <header className="col-head">
        <h2>SCHEDULE</h2>
        <span className="count-chip">{scheduled.length}</span>
      </header>
      <div className="col-hint">EVERYTHING WITH A DATE + TIME</div>

      <div className="sched-body">
        {scheduled.length === 0 && (
          <div className="empty-slot">NOTHING SCHEDULED — PICK A DATE + TIME WHEN ADDING A TASK</div>
        )}

        {late.length > 0 && (
          <>
            <div className="sched-group sched-group-late">LATE</div>
            {late.map((t) => <Row key={t.id} task={t} now={now} onToggle={onToggle} />)}
          </>
        )}

        {todayRows.length > 0 && (
          <>
            <div className="sched-group">TODAY</div>
            {todayRows.map((t) => <Row key={t.id} task={t} now={now} onToggle={onToggle} />)}
          </>
        )}

        {upcoming.length > 0 && (
          <>
            <div className="sched-group">UP NEXT</div>
            {upcoming.map((t) => <Row key={t.id} task={t} now={now} onToggle={onToggle} />)}
          </>
        )}
      </div>
    </section>
  );
}
