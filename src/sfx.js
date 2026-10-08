import { S } from './state.js';

let ctx;
export const unlock = () => {
  if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; } }
  if (ctx.state === 'suspended') ctx.resume();
};

const tone = (f, t0, dur, type = 'sine', vol = 0.12, f2) => {
  if (!ctx || !S.sound) return;
  const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + t0;
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
};
const noise = (dur, vol = 0.15) => {
  if (!ctx || !S.sound) return;
  const n = ctx.sampleRate * dur, buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = 900; g.gain.value = vol;
  s.buffer = buf; s.connect(f).connect(g).connect(ctx.destination); s.start();
};

export const sfx = {
  tap: () => tone(520, 0, 0.06, 'triangle', 0.08),
  splash: () => noise(0.35),
  bite: () => { tone(880, 0, 0.1, 'square', 0.1); tone(1180, 0.1, 0.12, 'square', 0.1); },
  coin: () => { tone(988, 0, 0.08, 'triangle'); tone(1319, 0.08, 0.18, 'triangle'); },
  ok: () => { tone(523, 0, 0.1, 'triangle'); tone(659, 0.1, 0.1, 'triangle'); tone(784, 0.2, 0.2, 'triangle'); },
  fail: () => tone(300, 0, 0.3, 'sawtooth', 0.07, 120),
  cluck: () => tone(700 + Math.random() * 200, 0, 0.12, 'square', 0.04, 450),
  pop: () => tone(400, 0, 0.1, 'sine', 0.1, 800),
};

// Nhạc nền: vài nốt thang ngũ cung thưa thớt, êm.
const PENTA = [261.6, 293.7, 329.6, 392, 440, 523.3, 587.3];
setInterval(() => {
  if (!ctx || !S.sound || document.hidden || Math.random() < 0.4) return;
  const f = PENTA[Math.floor(Math.random() * PENTA.length)];
  tone(f, 0, 2.2, 'sine', 0.03); if (Math.random() < 0.4) tone(f * 1.5, 0.15, 2, 'sine', 0.015);
}, 1800);

export const buzz = (ms = 30) => { try { navigator.vibrate?.(ms); } catch {} };
