'use client';

// Komi-styled date+time picker. Replaces the native datetime-local input,
// whose popup is the browser's unstylable default. Emits the same local naive
// "YYYY-MM-DDTHH:mm" format (or null on clear). The popover is fixed-positioned
// so it escapes the columns' overflow scrolling; scroll or outside-click closes it.

import { useCallback, useEffect, useRef, useState } from 'react';
import { dailyKey } from '@/lib/periods';

interface DateTimePickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
  // Open the popover as soon as the component mounts (used by the task card,
  // where the clock button already expressed the intent to edit).
  defaultOpen?: boolean;
  // Called after SET or CLEAR so the parent can dismiss edit mode.
  onDone?: () => void;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function dateKey(y: number, m: number, d: number): string {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

export default function DateTimePicker({ value, onChange, defaultOpen, onDone }: DateTimePickerProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [viewYear, setViewYear] = useState(0);
  const [viewMonth, setViewMonth] = useState(0);
  const [selDate, setSelDate] = useState<string | null>(null);
  const [selHour, setSelHour] = useState(9);
  const [selMin, setSelMin] = useState(0);

  const openPopover = useCallback(() => {
    const now = new Date();
    // Seed from the current value, else today at the next full hour.
    if (value) {
      const [d, t] = value.split('T');
      const [y, m] = d.split('-').map(Number);
      const [h, min] = (t ?? '09:00').split(':').map(Number);
      setViewYear(y);
      setViewMonth(m - 1);
      setSelDate(d);
      setSelHour(Number.isInteger(h) ? h : 9);
      setSelMin(MINUTES.includes(min) ? min : 0);
    } else {
      setViewYear(now.getFullYear());
      setViewMonth(now.getMonth());
      setSelDate(dailyKey(now));
      setSelHour(Math.min(now.getHours() + 1, 23));
      setSelMin(0);
    }
    const rect = wrapRef.current?.getBoundingClientRect();
    if (rect) {
      const popHeight = 380;
      const top = rect.bottom + popHeight > window.innerHeight ? Math.max(8, rect.top - popHeight) : rect.bottom + 6;
      const left = Math.min(rect.left, window.innerWidth - 320);
      setPos({ top, left });
    }
    setOpen(true);
  }, [value]);

  useEffect(() => {
    if (defaultOpen) openPopover();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onScroll = (e: Event) => {
      // Closing on outside scroll keeps the fixed popover glued to reality.
      if (wrapRef.current && e.target instanceof Node && wrapRef.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  const todayKey = dailyKey(new Date());
  const firstDow = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const shiftMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const pickQuick = (daysAhead: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    setSelDate(dailyKey(d));
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const apply = () => {
    if (!selDate) return;
    onChange(`${selDate}T${pad(selHour)}:${pad(selMin)}`);
    setOpen(false);
    onDone?.();
  };

  const clear = () => {
    onChange(null);
    setOpen(false);
    onDone?.();
  };

  const triggerLabel = value
    ? (() => {
        const [d, t] = value.split('T');
        const [, m, day] = d.split('-').map(Number);
        return `⏰ ${MONTHS[m - 1]} ${day} · ${t}`;
      })()
    : '⏰ PICK DATE + TIME';

  return (
    <div className="dtp" ref={wrapRef} onPointerDown={(e) => e.stopPropagation()}>
      <button type="button" className={`dtp-trigger ${value ? 'dtp-has-value' : ''}`} onClick={() => (open ? setOpen(false) : openPopover())}>
        {triggerLabel}
      </button>

      {open && pos && (
        <div className="dtp-pop" style={{ top: pos.top, left: pos.left }}>
          <div className="dtp-head">
            <button type="button" className="dtp-nav" onClick={() => shiftMonth(-1)}>‹</button>
            <span className="dtp-month">{MONTHS[viewMonth]} {viewYear}</span>
            <button type="button" className="dtp-nav" onClick={() => shiftMonth(1)}>›</button>
          </div>

          <div className="dtp-grid">
            {DOW.map((d, i) => (
              <span key={`dow-${i}`} className="dtp-dow">{d}</span>
            ))}
            {Array.from({ length: firstDow }, (_, i) => (
              <span key={`blank-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const key = dateKey(viewYear, viewMonth, i + 1);
              const cls = ['dtp-day'];
              if (key === todayKey) cls.push('dtp-day-today');
              if (key === selDate) cls.push('dtp-day-sel');
              return (
                <button type="button" key={key} className={cls.join(' ')} onClick={() => setSelDate(key)}>
                  {i + 1}
                </button>
              );
            })}
          </div>

          <div className="dtp-quick">
            <button type="button" className="dtp-chip" onClick={() => pickQuick(0)}>TODAY</button>
            <button type="button" className="dtp-chip" onClick={() => pickQuick(1)}>TMRW</button>
            <div className="dtp-time">
              <select value={selHour} onChange={(e) => setSelHour(Number(e.target.value))} aria-label="Hour">
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>{pad(h)}</option>
                ))}
              </select>
              <span className="dtp-colon">:</span>
              <select value={selMin} onChange={(e) => setSelMin(Number(e.target.value))} aria-label="Minutes">
                {MINUTES.map((m) => (
                  <option key={m} value={m}>{pad(m)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="dtp-actions">
            {value && <button type="button" className="dtp-clear" onClick={clear}>CLEAR</button>}
            <button type="button" className="dtp-set" onClick={apply}>SET ★</button>
          </div>
        </div>
      )}
    </div>
  );
}
