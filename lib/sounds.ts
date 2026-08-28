// Synthesized completion sounds — Web Audio only, no asset files.
// Gated behind the ADHD MODE toggle in the topbar. The AudioContext is created
// lazily on first play, which always happens inside a click (autoplay-safe).

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch (err) {
    console.error('[sounds.audio] Web Audio unavailable', err);
    return null;
  }
}

function tone(
  ac: AudioContext,
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType,
  peak: number
): void {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

// Two-note rising "ding" — one task done.
export function playComplete(): void {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  tone(ac, 660, t, 0.12, 'triangle', 0.2);
  tone(ac, 990, t + 0.07, 0.2, 'triangle', 0.16);
}

// Short fanfare arpeggio — all dailies done.
export function playAllClear(): void {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  [523, 659, 784, 1047].forEach((f, i) => tone(ac, f, t + i * 0.09, 0.25, 'triangle', 0.16));
  tone(ac, 1568, t + 0.4, 0.45, 'triangle', 0.14);
}
