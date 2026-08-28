'use client';

// A single draggable task card: tick box (star when done), title with animated
// strike-through, schedule chip, and hover actions (reschedule / delete).

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '@/lib/types';
import { formatSchedule, isDone, isOverdue } from '@/lib/periods';

interface TaskCardProps {
  task: Task;
  now: Date;
  overlay?: boolean;
  onToggle: (task: Task, at?: { x: number; y: number }) => void;
  onDelete: (task: Task) => void;
  onSchedule: (task: Task, value: string | null) => void;
}

export default function TaskCard({ task, now, overlay, onToggle, onDelete, onSchedule }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: overlay,
  });
  const [editingTime, setEditingTime] = useState(false);

  const done = isDone(task, now);
  const overdue = isOverdue(task, now);

  const style = overlay
    ? undefined
    : { transform: CSS.Translate.toString(transform), transition, opacity: isDragging ? 0.35 : 1 };

  return (
    <article
      ref={overlay ? undefined : setNodeRef}
      style={style}
      className={`task ${done ? 'done' : ''} ${overdue ? 'late' : ''}`}
      {...(overlay ? {} : attributes)}
      {...(overlay ? {} : listeners)}
    >
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

      <div className="task-main">
        <div className="task-title">{task.title}</div>
        {task.scheduled_at && !editingTime && (
          <div className={`time-chip ${overdue ? 'time-late' : ''}`}>
            ⏰ {formatSchedule(task.scheduled_at, now)}{overdue ? ' · LATE' : ''}
          </div>
        )}
        {editingTime && (
          <div className="time-edit">
            <input
              type="datetime-local"
              defaultValue={task.scheduled_at ?? ''}
              onChange={(e) => onSchedule(task, e.target.value || null)}
            />
            <button className="mini-btn" onClick={() => setEditingTime(false)}>OK</button>
            {task.scheduled_at && (
              <button
                className="mini-btn"
                onClick={() => {
                  onSchedule(task, null);
                  setEditingTime(false);
                }}
              >
                CLEAR
              </button>
            )}
          </div>
        )}
      </div>

      {!overlay && (
        <div className="task-actions">
          <button className="icon-btn" aria-label="Schedule task" onClick={() => setEditingTime((v) => !v)}>◷</button>
          <button className="icon-btn icon-del" aria-label="Delete task" onClick={() => onDelete(task)}>✕</button>
        </div>
      )}
    </article>
  );
}
