'use client';

// Client root for the whole board.
// Layout: 20% (daily + keep-an-eye) / 60% (today HQ: progress, add form, schedule) / 20% (weekly + monthly).
// Completion is period-based: marking done stores the current period key, which
// silently expires when the day/week/month rolls over (lib/periods.ts). No cron.

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import confetti from 'canvas-confetti';
import type { ListId, Space, Task } from '@/lib/types';
import { LIST_IDS } from '@/lib/types';
import { dailyKey, formatHeaderDate, isDone, periodKey } from '@/lib/periods';
import { playAllClear, playComplete } from '@/lib/sounds';
import AddTaskForm from '@/components/add-task-form';
import Clock from '@/components/clock';
import Column from '@/components/column';
import ProgressBar from '@/components/progress-bar';
import SchedulePanel from '@/components/schedule-panel';
import TaskCard from '@/components/task-card';

const PALETTES: Record<Space, string[]> = {
  work: ['#d5232b', '#151310', '#e8b425', '#faf7ec'],
  personal: ['#6d28d9', '#151310', '#e8b425', '#faf7ec'],
};

async function api<T>(path: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${method} ${path} failed (${res.status}): ${text.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

function burstAt(x: number, y: number, colors: string[]) {
  confetti({
    particleCount: 70,
    spread: 70,
    startVelocity: 28,
    scalar: 0.9,
    origin: { x: x / window.innerWidth, y: y / window.innerHeight },
    colors,
    disableForReducedMotion: true,
  });
}

function bigCelebration(colors: string[]) {
  const opts = { colors, disableForReducedMotion: true };
  confetti({ ...opts, particleCount: 140, spread: 100, origin: { x: 0.5, y: 0.6 } });
  setTimeout(() => confetti({ ...opts, particleCount: 90, angle: 60, spread: 70, origin: { x: 0, y: 1 } }), 180);
  setTimeout(() => confetti({ ...opts, particleCount: 90, angle: 120, spread: 70, origin: { x: 1, y: 1 } }), 360);
}

export default function Board() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [allClearBanner, setAllClearBanner] = useState(false);
  // ADHD MODE: sound effects on completion. Per-browser preference; localStorage
  // can throw in private windows, so every access is guarded.
  const [soundOn, setSoundOn] = useState(true);
  // Secret second board (eye icon). Deliberately NOT persisted: a refresh
  // always lands on the work board.
  const [space, setSpace] = useState<Space>('work');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const load = useCallback(async () => {
    try {
      const data = await api<{ tasks: Task[] }>('/api/tasks', 'GET');
      setTasks(data.tasks);
      setError(null);
    } catch (err) {
      console.error('[board.load]', err);
      setError(String(err));
      setTasks((prev) => prev ?? []);
    }
  }, []);

  useEffect(() => {
    setNow(new Date());
    void load();
    try {
      const stored = localStorage.getItem('tm-sound');
      if (stored !== null) setSoundOn(stored === '1');
    } catch {
      // private window or blocked storage — keep the default
    }
    // Ticking `now` is what makes daily/weekly/monthly resets kick in while the tab stays open.
    const tick = setInterval(() => setNow(new Date()), 30_000);
    const onFocus = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      clearInterval(tick);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [load]);

  const spaceTasks = useMemo(() => (tasks ?? []).filter((t) => t.space === space), [tasks, space]);

  const byList = useMemo(() => {
    const map: Record<ListId, Task[]> = { daily: [], eye: [], weekly: [], monthly: [] };
    for (const t of spaceTasks) map[t.list]?.push(t);
    for (const list of LIST_IDS) map[list].sort((a, b) => a.position - b.position || a.id - b.id);
    return map;
  }, [spaceTasks]);

  const dailyDone = now ? byList.daily.filter((t) => isDone(t, now)).length : 0;
  const dailyTotal = byList.daily.length;
  const allDailyDone = dailyTotal > 0 && dailyDone === dailyTotal;

  const addTask = useCallback(
    async (title: string, list: ListId, scheduledAt: string | null) => {
      const tempId = -Math.floor(Math.random() * 1_000_000) - 1;
      const maxPos = Math.max(-1, ...byList[list].map((t) => t.position));
      const temp: Task = { id: tempId, title, list, space, position: maxPos + 1, scheduled_at: scheduledAt, completed_period: null };
      setTasks((prev) => [...(prev ?? []), temp]);
      try {
        const data = await api<{ task: Task }>('/api/tasks', 'POST', { title, list, scheduled_at: scheduledAt, space });
        setTasks((prev) => (prev ?? []).map((t) => (t.id === tempId ? data.task : t)));
      } catch (err) {
        console.error('[board.addTask]', { title, list }, err);
        setTasks((prev) => (prev ?? []).filter((t) => t.id !== tempId));
        setError(String(err));
      }
    },
    [byList, space]
  );

  const toggleTask = useCallback(
    async (task: Task, at?: { x: number; y: number }) => {
      if (!now || task.id < 0) return;
      const done = isDone(task, now);
      const nextPeriod = done ? null : periodKey(task.list, now);
      const prev = tasks;
      setTasks((p) => (p ?? []).map((t) => (t.id === task.id ? { ...t, completed_period: nextPeriod } : t)));

      if (!done && at) burstAt(at.x, at.y, PALETTES[space]);
      if (!done && soundOn) playComplete();
      if (!done && task.list === 'daily' && dailyTotal > 0 && dailyDone + 1 === dailyTotal) {
        bigCelebration(PALETTES[space]);
        if (soundOn) playAllClear();
        setAllClearBanner(true);
        setTimeout(() => setAllClearBanner(false), 4500);
      }

      try {
        await api(`/api/tasks/${task.id}`, 'PATCH', { completed_period: nextPeriod });
      } catch (err) {
        console.error('[board.toggleTask]', { id: task.id }, err);
        setTasks(prev);
        setError(String(err));
      }
    },
    [now, tasks, dailyDone, dailyTotal, soundOn, space]
  );

  const toggleSound = useCallback(() => {
    setSoundOn((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('tm-sound', next ? '1' : '0');
      } catch {
        // storage blocked — toggle still works for this visit
      }
      if (next) playComplete(); // audible confirmation that sound is back on
      return next;
    });
  }, []);

  const removeTask = useCallback(
    async (task: Task) => {
      if (!window.confirm(`Delete "${task.title}"?`)) return;
      const prev = tasks;
      setTasks((p) => (p ?? []).filter((t) => t.id !== task.id));
      try {
        await api(`/api/tasks/${task.id}`, 'DELETE');
      } catch (err) {
        console.error('[board.removeTask]', { id: task.id }, err);
        setTasks(prev);
        setError(String(err));
      }
    },
    [tasks]
  );

  const scheduleTask = useCallback(
    async (task: Task, value: string | null) => {
      const prev = tasks;
      setTasks((p) => (p ?? []).map((t) => (t.id === task.id ? { ...t, scheduled_at: value } : t)));
      try {
        await api(`/api/tasks/${task.id}`, 'PATCH', { scheduled_at: value });
      } catch (err) {
        console.error('[board.scheduleTask]', { id: task.id, value }, err);
        setTasks(prev);
        setError(String(err));
      }
    },
    [tasks]
  );

  // --- drag and drop ---------------------------------------------------------

  const taskById = useCallback((id: UniqueIdentifier) => (tasks ?? []).find((t) => t.id === id), [tasks]);

  const listFromOverId = useCallback(
    (overId: UniqueIdentifier): ListId | null => {
      if (typeof overId === 'string' && overId.startsWith('col-')) return overId.slice(4) as ListId;
      return taskById(overId)?.list ?? null;
    },
    [taskById]
  );

  const onDragStart = (e: DragStartEvent) => setActiveTask(taskById(e.active.id) ?? null);

  const onDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;
    const dragged = taskById(active.id);
    if (!dragged) return;
    const overList = listFromOverId(over.id);
    if (!overList || dragged.list === overList) return;
    // Cross-column move: drop the task at the end of the hovered list; fine-grained
    // placement happens in onDragEnd.
    setTasks((p) => {
      const rest = p ?? [];
      const maxPos = Math.max(
        -1,
        ...rest.filter((t) => t.list === overList && t.space === dragged.space).map((t) => t.position)
      );
      return rest.map((t) => (t.id === dragged.id ? { ...t, list: overList, position: maxPos + 1 } : t));
    });
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveTask(null);
    setTasks((p) => {
      const current = p ?? [];
      const dragged = current.find((t) => t.id === active.id);
      if (!dragged) return current;

      let next = current;
      if (over && over.id !== active.id) {
        const overTask = current.find((t) => t.id === over.id);
        if (overTask && overTask.list === dragged.list) {
          const listTasks = current
            .filter((t) => t.list === dragged.list)
            .sort((a, b) => a.position - b.position || a.id - b.id);
          const from = listTasks.findIndex((t) => t.id === dragged.id);
          const to = listTasks.findIndex((t) => t.id === overTask.id);
          if (from !== -1 && to !== -1) {
            const reordered = arrayMove(listTasks, from, to);
            const posById = new Map(reordered.map((t, i) => [t.id, i]));
            next = current.map((t) => (posById.has(t.id) ? { ...t, position: posById.get(t.id)! } : t));
          }
        }
      }

      // Renumber the active space's lists 0..n and persist them (drags only
      // ever happen inside the visible space; the hidden one is untouched).
      const renumbered = [...next];
      for (const list of LIST_IDS) {
        renumbered
          .filter((t) => t.list === list && t.space === space)
          .sort((a, b) => a.position - b.position || a.id - b.id)
          .forEach((t, i) => {
            t.position = i;
          });
      }
      const updates = renumbered
        .filter((t) => t.id > 0 && t.space === space)
        .map((t) => ({ id: t.id, list: t.list, position: t.position }));
      if (updates.length > 0) {
        api('/api/reorder', 'POST', { updates }).catch((err) => {
          console.error('[board.reorder]', err);
          setError(String(err));
          void load();
        });
      }
      return renumbered;
    });
  };

  // --- render ----------------------------------------------------------------

  if (!now || tasks === null) {
    return (
      <div className="boot">
        <span className="boot-star">★</span> LOADING BOARD
      </div>
    );
  }

  const columnProps = { now, onToggle: toggleTask, onDelete: removeTask, onSchedule: scheduleTask, onAdd: addTask };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveTask(null)}
    >
      <div className={`shell ${space === 'personal' ? 'theme-personal' : ''}`}>
        <header className="topbar">
          <div className="logo">
            <span className="logo-red">TASK</span>
            <span className="logo-black">MANAGER</span>
            <span className="logo-sub">{space === 'work' ? 'タスク · GET IT DONE' : 'ひみつ · PERSONAL BOARD'}</span>
          </div>
          <div className="topbar-right">
            <button
              className="space-eye"
              onClick={() => setSpace((s) => (s === 'work' ? 'personal' : 'work'))}
              aria-label="Switch board"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                <circle cx="12" cy="12" r="3" fill="currentColor" />
              </svg>
            </button>
            <button
              className={`sound-chip ${soundOn ? 'sound-on' : ''}`}
              onClick={toggleSound}
              title="Sound effects on task complete"
            >
              {soundOn ? '♪ ADHD MODE ON' : '♪ ADHD MODE OFF'}
            </button>
            <Clock />
            <span className={`day-chip ${allDailyDone ? 'day-chip-clear' : ''}`}>
              {allDailyDone ? 'ALL CLEAR ★' : `DAILY ${dailyDone}/${dailyTotal}`}
            </span>
          </div>
        </header>

        <div className="board">
          <aside className="col side">
            <Column
              list="daily"
              title="DAILY"
              hint={`RESETS AT MIDNIGHT · ${dailyKey(now)}`}
              tasks={byList.daily}
              grow
              stamped={allDailyDone}
              {...columnProps}
            />
            <Column
              list="eye"
              title="KEEP AN EYE"
              hint="SPECIALS · NO RESET"
              tasks={byList.eye}
              highlight={allDailyDone}
              {...columnProps}
            />
          </aside>

          <main className="col center">
            <section className="panel hq">
              <div className="hq-top">
                <div>
                  <div className="kicker">TODAY</div>
                  <h1 className="hq-date">{formatHeaderDate(now)}</h1>
                </div>
                <div className="hq-score">
                  <span className="hq-score-num">{dailyTotal === 0 ? '—' : `${Math.round((dailyDone / dailyTotal) * 100)}%`}</span>
                  <span className="hq-score-label">DAILY DONE</span>
                </div>
              </div>
              <ProgressBar done={dailyDone} total={dailyTotal} big />
            </section>

            <AddTaskForm onAdd={addTask} />

            <SchedulePanel tasks={spaceTasks} now={now} onToggle={toggleTask} />
          </main>

          <aside className="col side">
            <Column
              list="weekly"
              title="WEEKLY"
              hint="RESETS MONDAY"
              tasks={byList.weekly}
              grow
              {...columnProps}
            />
            <Column
              list="monthly"
              title="MONTHLY"
              hint="RESETS ON THE 1ST"
              tasks={byList.monthly}
              grow
              {...columnProps}
            />
          </aside>
        </div>

        {allClearBanner && (
          <div className="all-clear-banner">
            ALL DAILIES DONE ★ EYES ON THE SPECIALS
          </div>
        )}

        {error && (
          <div className="error-toast" role="alert">
            <span>{error}</span>
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        <div className="small-screen-gate">
          <div className="gate-card">
            <div className="gate-star">★</div>
            <h2>BIG SCREEN ONLY</h2>
            <p>This board is built for desktop. Open it on a screen at least 1100px wide.</p>
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="drag-ghost">
            <TaskCard task={activeTask} now={now} onToggle={() => {}} onDelete={() => {}} onSchedule={() => {}} overlay />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
