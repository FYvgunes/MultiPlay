// Quiz sesleri (Web Audio). Sessize alma satrançla aynı anahtarı paylaşır.

let ctx: AudioContext | null = null;
function ac(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType, gain = 0.14, delay = 0) {
  const c = ac();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t = c.currentTime + delay;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.03);
}

function muted(): boolean {
  try {
    return localStorage.getItem('oyun.muted') === '1';
  } catch {
    return false;
  }
}
function guard(fn: () => void) {
  if (!muted()) fn();
}

export const quizSounds = {
  correct: () =>
    guard(() => {
      tone(660, 0.1, 'triangle', 0.13);
      tone(880, 0.14, 'triangle', 0.12, 0.09);
    }),
  wrong: () =>
    guard(() => {
      tone(220, 0.18, 'sawtooth', 0.12);
      tone(160, 0.22, 'sawtooth', 0.1, 0.05);
    }),
  end: () =>
    guard(() => {
      tone(523, 0.14, 'sine', 0.12);
      tone(659, 0.14, 'sine', 0.12, 0.12);
      tone(784, 0.24, 'sine', 0.12, 0.24);
    }),
};
