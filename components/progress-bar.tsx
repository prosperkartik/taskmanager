'use client';

// Striped progress bar. `big` variant is the hero bar in the center column.

interface ProgressBarProps {
  done: number;
  total: number;
  big?: boolean;
}

export default function ProgressBar({ done, total, big }: ProgressBarProps) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className={`progress ${big ? 'progress-big' : ''}`} aria-label={`${done} of ${total} done`}>
      <div className="track">
        <div className={`fill ${pct === 100 ? 'fill-full' : ''}`} style={{ width: `${pct}%` }} />
        {big && <span className="pct">{total === 0 ? 'NO DAILY TASKS YET' : `${done}/${total}`}</span>}
      </div>
    </div>
  );
}
