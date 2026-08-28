'use client';

// One list panel (daily / keep-an-eye / weekly / monthly): header with count,
// mini progress, sortable task stack, quick-add input at the bottom.

import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { ListId, Task } from '@/lib/types';
import { isDone } from '@/lib/periods';
import { playKeyFromEvent } from '@/lib/sounds';
import ProgressBar from '@/components/progress-bar';
import TaskCard from '@/components/task-card';

interface ColumnProps {
  list: ListId;
  title: string;
  hint: string;
  tasks: Task[];
  now: Date;
  grow?: boolean;
  highlight?: boolean;
  stamped?: boolean;
  onToggle: (task: Task, at?: { x: number; y: number }) => void;
  onDelete: (task: Task) => void;
  onSchedule: (task: Task, value: string | null) => void;
  onAdd: (title: string, list: ListId, scheduledAt: string | null) => void;
}

export default function Column({
  list, title, hint, tasks, now, grow, highlight, stamped, onToggle, onDelete, onSchedule, onAdd,
}: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${list}` });
  const [draft, setDraft] = useState('');

  const done = tasks.filter((t) => isDone(t, now)).length;

  const submitDraft = () => {
    const title = draft.trim();
    if (!title) return;
    onAdd(title, list, null);
    setDraft('');
  };

  return (
    <section className={`panel column ${grow ? 'grow' : ''} ${highlight ? 'eye-hot' : ''} ${isOver ? 'drop-target' : ''}`}>
      <header className="col-head">
        <h2>{title}</h2>
        <span className="count-chip">{done}/{tasks.length}</span>
      </header>
      <div className="col-hint">{hint}</div>
      {tasks.length > 0 && <ProgressBar done={done} total={tasks.length} />}

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="col-body">
          {stamped && <div className="clear-stamp">ALL CLEAR ★</div>}
          {tasks.map((t) => (
            <TaskCard key={t.id} task={t} now={now} onToggle={onToggle} onDelete={onDelete} onSchedule={onSchedule} />
          ))}
          {tasks.length === 0 && <div className="empty-slot">NO TASKS — DROP OR ADD ONE</div>}
        </div>
      </SortableContext>

      <form
        className="quick-add"
        onSubmit={(e) => {
          e.preventDefault();
          submitDraft();
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={playKeyFromEvent}
          placeholder={`+ ADD TO ${title}`}
          aria-label={`Add task to ${title}`}
        />
      </form>
    </section>
  );
}
