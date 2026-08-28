'use client';

// Center-column add form: title, target list chips, optional date+time, ADD.

import { useState } from 'react';
import type { ListId } from '@/lib/types';
import { LIST_IDS, LIST_LABELS } from '@/lib/types';
import DateTimePicker from '@/components/date-time-picker';

interface AddTaskFormProps {
  onAdd: (title: string, list: ListId, scheduledAt: string | null) => void;
}

export default function AddTaskForm({ onAdd }: AddTaskFormProps) {
  const [title, setTitle] = useState('');
  const [list, setList] = useState<ListId>('daily');
  const [when, setWhen] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onAdd(trimmed, list, when || null);
    setTitle('');
    setWhen('');
  };

  return (
    <form className="panel add-form" onSubmit={submit}>
      <input
        className="add-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="TYPE A TASK…"
        aria-label="New task title"
        autoFocus
      />
      <div className="add-row">
        <div className="list-chips" role="radiogroup" aria-label="Target list">
          {LIST_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className={`chip ${list === id ? 'chip-active' : ''}`}
              onClick={() => setList(id)}
            >
              {LIST_LABELS[id]}
            </button>
          ))}
        </div>
        <DateTimePicker value={when || null} onChange={(v) => setWhen(v ?? '')} />
        <button className="btn-add" type="submit">ADD ★</button>
      </div>
    </form>
  );
}
