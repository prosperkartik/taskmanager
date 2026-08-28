// Synthesized completion sounds — Web Audio only, no asset files.
// Gated behind the ADHD MODE toggle in the topbar. The AudioContext is created
// lazily on first play, which always happens inside a click (autoplay-safe).

let ctx: AudioContext | null = null;
let noiseBuf: AudioBuffer | null = null;

// Mirrors the ADHD MODE toggle so per-keystroke sounds can check it without
// prop-drilling through every input. Synced by the board on load and toggle.
let keySoundsEnabled = true;

export function setKeySoundsEnabled(on: boolean): void {
  keySoundsEnabled = on;
}

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

function noiseBuffer(ac: AudioContext): AudioBuffer {
  if (!noiseBuf) {
    noiseBuf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.1), ac.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

// Mechanical-keyboard clack: bandpass-filtered noise burst + a low "thock".
// `deep` = space / enter / backspace. Pitch jitters per press so it sounds organic.
export function playKey(deep = false): void {
  if (!keySoundsEnabled) return;
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;

  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac);
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = (deep ? 1500 : 2700) + Math.random() * (deep ? 300 : 900);
  bp.Q.value = 1.1;
  const g = ac.createGain();
  g.gain.setValueAtTime(deep ? 0.14 : 0.09, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + (deep ? 0.07 : 0.045));
  src.connect(bp);
  bp.connect(g);
  g.connect(ac.destination);
  src.start(t);
  src.stop(t + 0.09);

  tone(ac, (deep ? 120 : 175) + Math.random() * (deep ? 30 : 60), t, deep ? 0.06 : 0.04, 'sine', deep ? 0.11 : 0.06);
}

// Keydown helper for text inputs: letters click, space/enter/backspace thock.
export function playKeyFromEvent(e: { key: string }): void {
  if (e.key.length === 1) playKey(e.key === ' ');
  else if (e.key === 'Backspace' || e.key === 'Enter') playKey(true);
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
