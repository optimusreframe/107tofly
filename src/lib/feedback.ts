// Client-only sensory feedback: audio, haptics, confetti.
// Safe to call from event handlers. No-ops during SSR.

let _ctx: AudioContext | null = null;
let _muted = false;

function isBrowser() {
  return typeof window !== "undefined";
}

export function setMuted(v: boolean) {
  _muted = v;
  if (isBrowser()) {
    try { window.localStorage.setItem("otto:muted", v ? "1" : "0"); } catch {}
  }
}
export function isMuted() {
  if (_muted) return true;
  if (!isBrowser()) return false;
  try { return window.localStorage.getItem("otto:muted") === "1"; } catch { return false; }
}

function ctx(): AudioContext | null {
  if (!isBrowser()) return null;
  if (_ctx) return _ctx;
  try {
    const AC: typeof AudioContext | undefined =
      (window as any).AudioContext ?? (window as any).webkitAudioContext;
    if (!AC) return null;
    _ctx = new AC();
  } catch { _ctx = null; }
  return _ctx;
}

function tone(freq: number, dur: number, type: OscillatorType = "sine", gain = 0.08, at = 0) {
  const ac = ctx();
  if (!ac || isMuted()) return;
  try {
    const t0 = ac.currentTime + at;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  } catch {}
}

export function playCorrect() {
  tone(660, 0.12, "triangle", 0.09, 0);
  tone(990, 0.16, "triangle", 0.08, 0.08);
}
export function playWrong() {
  tone(220, 0.18, "sawtooth", 0.06, 0);
  tone(160, 0.22, "sawtooth", 0.05, 0.09);
}
export function playLevelUp() {
  tone(523, 0.1, "triangle", 0.08, 0);
  tone(659, 0.1, "triangle", 0.08, 0.09);
  tone(784, 0.14, "triangle", 0.09, 0.18);
  tone(1046, 0.2, "triangle", 0.09, 0.28);
}
export function playTick() { tone(880, 0.04, "square", 0.04); }

export function haptic(pattern: number | number[] = 15) {
  if (!isBrowser()) return;
  try { (navigator as any).vibrate?.(pattern); } catch {}
}

// Confetti — lightweight canvas burst; no deps.
export function burstConfetti(opts: { x?: number; y?: number; count?: number; colors?: string[] } = {}) {
  if (!isBrowser()) return;
  const count = opts.count ?? 60;
  const colors = opts.colors ?? ["#22d3ee", "#a78bfa", "#f472b6", "#facc15", "#34d399"];
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:9999";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const g = canvas.getContext("2d");
  if (!g) { canvas.remove(); return; }
  const cx = opts.x ?? window.innerWidth / 2;
  const cy = opts.y ?? window.innerHeight / 3;
  const parts = Array.from({ length: count }, () => ({
    x: cx, y: cy,
    vx: (Math.random() - 0.5) * 10,
    vy: Math.random() * -8 - 3,
    g: 0.28 + Math.random() * 0.15,
    r: 3 + Math.random() * 4,
    a: 1,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    c: colors[Math.floor(Math.random() * colors.length)],
  }));
  let raf = 0;
  const start = performance.now();
  const tick = (now: number) => {
    const t = now - start;
    g.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of parts) {
      p.vy += p.g;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.a = Math.max(0, 1 - t / 1600);
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.rot);
      g.globalAlpha = p.a;
      g.fillStyle = p.c;
      g.fillRect(-p.r, -p.r * 0.4, p.r * 2, p.r * 0.8);
      g.restore();
    }
    if (t < 1700) raf = requestAnimationFrame(tick);
    else { cancelAnimationFrame(raf); canvas.remove(); }
  };
  raf = requestAnimationFrame(tick);
}

export function celebrateCorrect() {
  playCorrect();
  haptic(12);
}
export function shakeWrong() {
  playWrong();
  haptic([20, 40, 20]);
}
export function celebrateSessionComplete() {
  playLevelUp();
  haptic([15, 60, 15, 60, 15]);
  burstConfetti({ count: 90 });
}
