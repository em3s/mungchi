"use client";

import { useState, useRef, useCallback } from "react";
import { useThemeOverride } from "@/hooks/useThemeOverride";
import { useFeatureGuard } from "@/hooks/useFeatureGuard";
import { useUser } from "@/hooks/useUser";
import { BottomNav } from "@/components/BottomNav";

// ── Web Audio API context (singleton) ──
let audioCtx: AudioContext | null = null;
function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function playTone(
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

function playNoise(dur: number, gain = 0.1, delay = 0) {
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

// ── Synthesized sounds ──
const synth = {
  correct() {
    playTone(880, "sine", 0.15, 0.3, 0);
    playTone(1174.66, "sine", 0.3, 0.3, 0.12);
  },
  wrong() {
    playTone(300, "square", 0.15, 0.15, 0);
    playTone(220, "square", 0.25, 0.15, 0.12);
  },
  coinPickup() {
    playTone(987.77, "sine", 0.08, 0.25, 0);
    playTone(1318.51, "sine", 0.08, 0.25, 0.07);
    playTone(1567.98, "sine", 0.2, 0.25, 0.14);
  },
  quizComplete() {
    playTone(523.25, "sine", 0.12, 0.25, 0);
    playTone(659.25, "sine", 0.12, 0.25, 0.1);
    playTone(783.99, "sine", 0.12, 0.25, 0.2);
    playTone(1046.5, "sine", 0.35, 0.3, 0.3);
    playTone(783.99, "sine", 0.12, 0.2, 0.3);
  },
  checkPop() {
    playTone(600, "sine", 0.06, 0.2, 0);
    playTone(900, "sine", 0.08, 0.15, 0.04);
  },
  coinDing() {
    playTone(1200, "sine", 0.25, 0.2, 0);
  },
  allClear() {
    playTone(523.25, "triangle", 0.15, 0.3, 0);
    playTone(659.25, "triangle", 0.15, 0.3, 0.12);
    playTone(783.99, "triangle", 0.15, 0.3, 0.24);
    playTone(1046.5, "triangle", 0.15, 0.3, 0.36);
    playTone(1318.51, "triangle", 0.4, 0.35, 0.48);
    playTone(783.99, "sine", 0.4, 0.15, 0.48);
    playTone(523.25, "sine", 0.4, 0.1, 0.48);
  },
  jump() {
    const c = getCtx();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(300, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, c.currentTime + 0.12);
    g.gain.setValueAtTime(0.2, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + 0.15);
  },
  gameOver() {
    playTone(440, "square", 0.2, 0.15, 0);
    playTone(330, "square", 0.2, 0.15, 0.2);
    playTone(220, "square", 0.4, 0.15, 0.4);
  },
  whack() {
    playNoise(0.08, 0.3, 0);
    playTone(200, "square", 0.1, 0.25, 0);
    playTone(100, "sine", 0.08, 0.2, 0.03);
  },
  goldenWhack() {
    playNoise(0.06, 0.25, 0);
    playTone(200, "square", 0.08, 0.2, 0);
    playTone(1200, "sine", 0.1, 0.2, 0.05);
    playTone(1600, "sine", 0.15, 0.25, 0.1);
    playTone(2000, "sine", 0.2, 0.2, 0.15);
  },
  badgeUnlock() {
    playTone(523.25, "sine", 0.1, 0.2, 0);
    playTone(659.25, "sine", 0.1, 0.2, 0.08);
    playTone(783.99, "sine", 0.1, 0.2, 0.16);
    playTone(1046.5, "sine", 0.1, 0.2, 0.24);
    playTone(1318.51, "sine", 0.3, 0.3, 0.32);
    playTone(1567.98, "sine", 0.2, 0.1, 0.4);
  },
  purchase() {
    playTone(800, "sine", 0.05, 0.2, 0);
    playTone(1000, "sine", 0.05, 0.2, 0.05);
    playTone(1200, "sine", 0.05, 0.2, 0.1);
    playNoise(0.08, 0.1, 0.15);
    playTone(1500, "sine", 0.2, 0.25, 0.18);
  },
};

type SoundEntry = {
  key: string;
  label: string;
  desc: string;
  play: () => void;
  style: string;
};

const SECTIONS: { title: string; icon: string; sounds: SoundEntry[] }[] = [
  {
    title: "퀴즈",
    icon: "📖",
    sounds: [
      { key: "correct", label: "✅ 정답", desc: "밝은 딩동", play: synth.correct, style: "bg-emerald-50 text-emerald-700 active:bg-emerald-100" },
      { key: "wrong", label: "❌ 오답", desc: "낮은 버즈", play: synth.wrong, style: "bg-red-50 text-red-700 active:bg-red-100" },
      { key: "coinPickup", label: "🍪 스펠링 정답", desc: "+1 초코 짤랑", play: synth.coinPickup, style: "bg-amber-50 text-amber-700 active:bg-amber-100" },
      { key: "quizComplete", label: "🎉 퀴즈 완료", desc: "축하 팡파르", play: synth.quizComplete, style: "bg-purple-50 text-purple-700 active:bg-purple-100" },
    ],
  },
  {
    title: "할일",
    icon: "✅",
    sounds: [
      { key: "checkPop", label: "☑️ 체크", desc: "팝", play: synth.checkPop, style: "bg-cyan-50 text-cyan-700 active:bg-cyan-100" },
      { key: "coinDing", label: "🍪 초코 획득", desc: "띵", play: synth.coinDing, style: "bg-amber-50 text-amber-700 active:bg-amber-100" },
      { key: "allClear", label: "🌟 올클리어", desc: "빠밤!", play: synth.allClear, style: "bg-purple-50 text-purple-700 active:bg-purple-100" },
    ],
  },
  {
    title: "게임",
    icon: "🎮",
    sounds: [
      { key: "jump", label: "🦘 점프", desc: "슝", play: synth.jump, style: "bg-green-50 text-green-700 active:bg-green-100" },
      { key: "gameOver", label: "💀 게임오버", desc: "뚜뚜", play: synth.gameOver, style: "bg-red-50 text-red-700 active:bg-red-100" },
      { key: "whack", label: "🔨 두더지 때리기", desc: "퍽!", play: synth.whack, style: "bg-orange-50 text-orange-700 active:bg-orange-100" },
      { key: "goldenWhack", label: "⭐ 골든 두더지", desc: "반짝퍽!", play: synth.goldenWhack, style: "bg-yellow-50 text-yellow-700 active:bg-yellow-100" },
    ],
  },
  {
    title: "기타",
    icon: "🏆",
    sounds: [
      { key: "badgeUnlock", label: "🏅 뱃지 획득", desc: "짜잔", play: synth.badgeUnlock, style: "bg-violet-50 text-violet-700 active:bg-violet-100" },
      { key: "purchase", label: "🛒 초코샵 구매", desc: "챠링", play: synth.purchase, style: "bg-amber-50 text-amber-700 active:bg-amber-100" },
    ],
  },
];

export default function SoundDemoPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId, user } = useUser(params);
  const { override: themeOverride } = useThemeOverride(childId);
  const { allowed } = useFeatureGuard(childId, "sound");
  const [playing, setPlaying] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handlePlay = useCallback((entry: SoundEntry) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPlaying(entry.key);
    entry.play();
    timerRef.current = setTimeout(() => setPlaying(null), 600);
  }, []);

  if (!allowed || !user) return null;

  return (
    <div className={`theme-preset-${themeOverride || user.theme} min-h-screen bg-[var(--bg)] pb-24`}>
      {/* Header */}
      <div className="text-center pt-6 pb-4">
        <h1 className="text-xl font-black text-gray-800">🔊 사운드 데모</h1>
        <p className="text-xs text-gray-400 mt-1">
          각 버튼을 눌러 효과음을 들어보세요
        </p>
        <p className="text-[10px] text-gray-300 mt-0.5">
          Web Audio API — 코드로 생성된 사운드
        </p>
      </div>

      {/* Sound sections */}
      <div className="px-4 space-y-5">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <h2 className="text-sm font-bold text-gray-500 mb-2 flex items-center gap-1">
              <span>{section.icon}</span>
              <span>{section.title}</span>
            </h2>
            <div className="space-y-1.5">
              {section.sounds.map((s) => (
                <button
                  key={s.key}
                  onClick={() => handlePlay(s)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 ${s.style} ${
                    playing === s.key ? "scale-[0.97] ring-2 ring-[var(--accent)]/30" : ""
                  }`}
                >
                  <span>{s.label}</span>
                  <span className="text-xs opacity-60">{s.desc}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <BottomNav childId={childId} />
    </div>
  );
}
