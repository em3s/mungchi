// 사운드 효과 유틸리티 — Web Audio API 기반
// 각 컴포넌트에서 import해서 사용

let ctx: AudioContext | null = null;
function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone(
  freq: number,
  type: OscillatorType,
  dur: number,
  gain = 0.3,
  delay = 0,
) {
  const c = getCtx();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, c.currentTime + delay);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + dur);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(c.currentTime + delay);
  osc.stop(c.currentTime + delay + dur);
}

function sweep(
  from: number,
  to: number,
  dur: number,
  gain = 0.2,
) {
  const c = getCtx();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(from, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(to, c.currentTime + dur * 0.8);
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + dur);
}

function noise(dur: number, gain = 0.1, delay = 0) {
  const c = getCtx();
  const len = c.sampleRate * dur;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, c.currentTime + delay);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + dur);
  src.connect(g);
  g.connect(c.destination);
  src.start(c.currentTime + delay);
}

// ── 게임 사운드 ──

export const sfx = {
  /** 점프 — 주파수 상승 슝 */
  jump() {
    sweep(300, 800, 0.15, 0.2);
  },

  /** 게임오버 — 하강 뚜뚜 */
  gameOver() {
    tone(440, "square", 0.2, 0.15, 0);
    tone(330, "square", 0.2, 0.15, 0.2);
    tone(220, "square", 0.4, 0.15, 0.4);
  },

  /** 두더지 때리기 — 퍽! */
  whack() {
    noise(0.08, 0.3, 0);
    tone(200, "square", 0.1, 0.25, 0);
    tone(100, "sine", 0.08, 0.2, 0.03);
  },

  /** 골든 두더지 — 반짝퍽! */
  goldenWhack() {
    noise(0.06, 0.25, 0);
    tone(200, "square", 0.08, 0.2, 0);
    tone(1200, "sine", 0.1, 0.2, 0.05);
    tone(1600, "sine", 0.15, 0.25, 0.1);
    tone(2000, "sine", 0.2, 0.2, 0.15);
  },

  /** 게임 종료 — 짧은 팡파르 */
  gameEnd() {
    tone(523.25, "triangle", 0.15, 0.3, 0);
    tone(659.25, "triangle", 0.15, 0.3, 0.12);
    tone(783.99, "triangle", 0.15, 0.3, 0.24);
    tone(1046.5, "triangle", 0.15, 0.3, 0.36);
    tone(1318.51, "triangle", 0.4, 0.35, 0.48);
  },
};
