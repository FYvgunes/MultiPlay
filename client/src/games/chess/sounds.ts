// Ses dosyası yok: sesler Web Audio ile sentezlenir (offline, hafif).

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

function tone(
  freq: number,
  dur: number,
  type: OscillatorType = 'sine',
  gain = 0.14,
  delay = 0,
) {
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

// ---- Sessize alma (localStorage'da kalıcı) ----
let muted = (() => {
  try {
    return localStorage.getItem('oyun.muted') === '1';
  } catch {
    return false;
  }
})();

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  try {
    localStorage.setItem('oyun.muted', value ? '1' : '0');
  } catch {
    /* yoksa boşver */
  }
}

function guard(fn: () => void) {
  if (!muted) fn();
}

export const sounds = {
  move: () => guard(() => tone(240, 0.07, 'triangle', 0.12)),
  capture: () =>
    guard(() => {
      tone(170, 0.09, 'square', 0.12);
      tone(95, 0.12, 'sine', 0.1, 0.01);
    }),
  check: () =>
    guard(() => {
      tone(880, 0.09, 'sine', 0.13);
      tone(1180, 0.12, 'sine', 0.1, 0.07);
    }),
  end: () =>
    guard(() => {
      tone(523, 0.14, 'sine', 0.12);
      tone(659, 0.14, 'sine', 0.12, 0.12);
      tone(784, 0.24, 'sine', 0.12, 0.24);
    }),
};
