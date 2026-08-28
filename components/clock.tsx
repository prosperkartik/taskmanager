'use client';

// Live New York (EST/EDT) clock + date chip. Isolated component so the
// once-a-second tick re-renders only this chip, not the whole board.

import { useEffect, useState } from 'react';

const DATE_FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

const TIME_FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
  timeZoneName: 'short',
});

export default function Clock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  return (
    <span className="date-chip clock-chip">
      {DATE_FMT.format(now).toUpperCase().replace(',', ' ·')} · {TIME_FMT.format(now)}
    </span>
  );
}
