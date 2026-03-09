"use client";

import { useState, useRef } from "react";
import { addTransaction } from "@/lib/coins";

// --- Types ---

type FractionItem = {
  id: string;
  whole?: number;  // 대분수의 정수부분
  numer: number;
  denom: number;
  value: number;   // 실제 소수값
};

// --- Stage Data ---

const STAGES: FractionItem[][] = [
  // Stage 1: 가분수 (분모 2, 4)
  [
    { id: "a", numer: 5, denom: 4, value: 5 / 4 },      // 1.25
    { id: "b", numer: 3, denom: 2, value: 3 / 2 },      // 1.5
    { id: "c", numer: 7, denom: 4, value: 7 / 4 },      // 1.75
    { id: "d", numer: 9, denom: 4, value: 9 / 4 },      // 2.25
    { id: "e", numer: 11, denom: 4, value: 11 / 4 },    // 2.75
  ],
  // Stage 2: 대분수 (분모 3, 4)
  [
    { id: "a", whole: 1, numer: 1, denom: 3, value: 1 + 1 / 3 },  // 1.333
    { id: "b", whole: 1, numer: 3, denom: 4, value: 1 + 3 / 4 },  // 1.75
    { id: "c", whole: 2, numer: 1, denom: 4, value: 2 + 1 / 4 },  // 2.25
    { id: "d", whole: 2, numer: 2, denom: 3, value: 2 + 2 / 3 },  // 2.667
  ],
  // Stage 3: 가분수 + 대분수 혼합
  [
    { id: "a", numer: 4, denom: 3, value: 4 / 3 },                // 1.333
    { id: "b", whole: 1, numer: 3, denom: 4, value: 1 + 3 / 4 },  // 1.75
    { id: "c", numer: 7, denom: 3, value: 7 / 3 },                // 2.333
    { id: "d", whole: 2, numer: 3, denom: 4, value: 2 + 3 / 4 },  // 2.75
  ],
];

const MAX_VALUE = 3;
const THRESHOLD = 0.15; // 정답 허용 오차

// --- Fraction Display ---

function FractionDisplay({ item }: { item: FractionItem }) {
  return (
    <div className="flex items-center gap-1 leading-none">
      {item.whole !== undefined && (
        <span className="text-xl font-black">{item.whole}</span>
      )}
      <div className="flex flex-col items-center">
        <span className="text-sm font-bold leading-tight">{item.numer}</span>
        <div className="w-full h-[1.5px] bg-current" />
        <span className="text-sm font-bold leading-tight">{item.denom}</span>
      </div>
    </div>
  );
}

// --- Main Component ---

interface Props {
  user: { id: string };
  onCoinsEarned?: (n: number) => void;
}

export function FractionLineGame({ user, onCoinsEarned }: Props) {
  const [stage, setStage] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [placed, setPlaced] = useState<Map<string, number>>(new Map());
  const [checked, setChecked] = useState(false);
  const [done, setDone] = useState(false);
  const lineRef = useRef<HTMLDivElement>(null);

  const items = STAGES[stage];
  const allPlaced = items.every((item) => placed.has(item.id));

  function handleCardTap(id: string) {
    if (checked) return;
    if (placed.has(id)) {
      // 이미 놓인 카드: 다시 집기
      setPlaced((prev) => {
        const m = new Map(prev);
        m.delete(id);
        return m;
      });
      setSelected(id);
    } else {
      setSelected((prev) => (prev === id ? null : id));
    }
  }

  function handleLineTap(e: React.MouseEvent<HTMLDivElement>) {
    if (!selected || checked) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const value = Math.max(0, Math.min(MAX_VALUE, (x / rect.width) * MAX_VALUE));
    setPlaced((prev) => new Map(prev).set(selected, value));
    setSelected(null);
  }

  async function handleCheck() {
    if (!allPlaced) return;
    setChecked(true);

    const correctCount = items.filter((item) => {
      const p = placed.get(item.id)!;
      return Math.abs(p - item.value) <= THRESHOLD;
    }).length;

    const coins =
      correctCount === items.length ? 3 :
      correctCount >= Math.ceil(items.length * 0.6) ? 1 : 0;

    if (coins > 0) {
      const result = await addTransaction(
        user.id, coins, "game",
        `📐 분수 수직선 스테이지 ${stage + 1}`,
      );
      if (result.ok) onCoinsEarned?.(coins);
    }
  }

  function handleNext() {
    if (stage + 1 >= STAGES.length) {
      setDone(true);
    } else {
      setStage((s) => s + 1);
      setPlaced(new Map());
      setSelected(null);
      setChecked(false);
    }
  }

  function handleReset() {
    setPlaced(new Map());
    setSelected(null);
    setChecked(false);
  }

  function handleRestart() {
    setStage(0);
    setPlaced(new Map());
    setSelected(null);
    setChecked(false);
    setDone(false);
  }

  // 결과 계산
  const correctCount = checked
    ? items.filter((item) => Math.abs(placed.get(item.id)! - item.value) <= THRESHOLD).length
    : 0;
  const earnedCoins = checked
    ? (correctCount === items.length ? 3 : correctCount >= Math.ceil(items.length * 0.6) ? 1 : 0)
    : 0;

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-5">
        <div className="text-6xl">🎉</div>
        <div className="text-xl font-black text-gray-800">모든 스테이지 완료!</div>
        <p className="text-sm text-gray-400">가분수와 대분수를 수직선에 올렸어요</p>
        <button
          onClick={handleRestart}
          className="px-8 py-3 rounded-2xl bg-[var(--accent)] text-white font-bold active:opacity-80"
        >
          처음부터 다시
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Stage indicator */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex gap-2">
          {STAGES.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i === stage
                  ? "bg-[var(--accent)] scale-125"
                  : i < stage
                  ? "bg-[var(--accent)]/40"
                  : "bg-gray-200"
              }`}
            />
          ))}
        </div>
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">
          {stage === 0 ? "Stage 1 — 가분수" : stage === 1 ? "Stage 2 — 대분수" : "Stage 3 — 혼합"}
        </span>
      </div>

      {/* Instructions */}
      <p className="text-center text-sm text-gray-500">
        {selected
          ? <span className="font-bold text-[var(--accent)]">수직선에서 위치를 탭하세요</span>
          : "분수 카드를 탭하고, 수직선에서 위치를 탭하세요"}
      </p>

      {/* Number line */}
      <div className="px-4">
        <div
          ref={lineRef}
          onClick={handleLineTap}
          className={`relative h-24 select-none ${selected ? "cursor-crosshair" : ""}`}
        >
          {/* Main line */}
          <div className="absolute top-10 left-0 right-0 h-[2px] bg-gray-300" />

          {/* Integer ticks + labels */}
          {[0, 1, 2, 3].map((n) => (
            <div
              key={n}
              className="absolute flex flex-col items-center"
              style={{ left: `${(n / MAX_VALUE) * 100}%`, top: "26px", transform: "translateX(-50%)" }}
            >
              <div className="w-[2px] h-8 bg-gray-400" />
              <span className="text-sm font-bold text-gray-500 mt-1">{n}</span>
            </div>
          ))}

          {/* Half ticks */}
          {[0.5, 1, 1.5, 2, 2.5].map((n) => (
            <div
              key={n}
              className="absolute w-px h-3 bg-gray-200"
              style={{ left: `${(n / MAX_VALUE) * 100}%`, top: "31px", transform: "translateX(-50%)" }}
            />
          ))}

          {/* Placed markers */}
          {Array.from(placed.entries()).map(([id, placedVal]) => {
            const item = items.find((i) => i.id === id)!;
            const isCorrect = Math.abs(placedVal - item.value) <= THRESHOLD;
            const pct = (placedVal / MAX_VALUE) * 100;
            const correctPct = (item.value / MAX_VALUE) * 100;

            return (
              <div key={id}>
                {/* Placed label + stem + dot */}
                <div
                  className={`absolute flex flex-col items-center pointer-events-none ${
                    checked
                      ? isCorrect ? "text-emerald-500" : "text-red-400"
                      : "text-[var(--accent)]"
                  }`}
                  style={{ left: `${pct}%`, top: 0, transform: "translateX(-50%)" }}
                >
                  <div className="bg-white border-2 border-current rounded-xl px-2 py-1 shadow-sm">
                    <FractionDisplay item={item} />
                  </div>
                  <div className="w-px h-3 bg-current" />
                  <div className="w-2.5 h-2.5 rounded-full bg-current" />
                </div>

                {/* Correct position marker (정답 위치, 오답일 때만) */}
                {checked && !isCorrect && (
                  <div
                    className="absolute w-3 h-3 rounded-full border-2 border-emerald-400 bg-emerald-100"
                    style={{ left: `${correctPct}%`, top: "33px", transform: "translateX(-50%)" }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Fraction cards */}
      <div className="px-4 flex flex-wrap gap-3 justify-center">
        {items.map((item) => {
          const isPlaced = placed.has(item.id);
          const isSelected = selected === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleCardTap(item.id)}
              disabled={checked}
              className={`px-4 py-3 rounded-2xl border-2 transition-all ${
                isPlaced
                  ? "opacity-25 border-gray-200 bg-white"
                  : isSelected
                  ? "border-[var(--accent)] bg-[var(--accent)]/10 scale-110 shadow-lg"
                  : "border-gray-200 bg-white shadow-sm active:scale-95"
              }`}
            >
              <FractionDisplay item={item} />
            </button>
          );
        })}
      </div>

      {/* Check button */}
      {!checked && (
        <div className="px-4">
          <button
            onClick={handleCheck}
            disabled={!allPlaced}
            className="w-full py-3 rounded-2xl bg-[var(--accent)] text-white font-bold text-base disabled:opacity-30 active:opacity-80 transition-opacity"
          >
            확인
          </button>
        </div>
      )}

      {/* Results */}
      {checked && (
        <div className="mx-4 p-5 bg-white rounded-2xl shadow-sm text-center">
          <div className="text-3xl font-black mb-1">
            {correctCount}/{items.length}
          </div>
          <div className="text-sm text-gray-500 mb-2">
            {correctCount === items.length ? "완벽해요! 🎉" : "틀린 위치는 초록 동그라미가 정답이에요"}
          </div>
          {earnedCoins > 0 && (
            <div className="text-base font-bold text-amber-500 mb-4">+{earnedCoins}🍪 획득!</div>
          )}
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleReset}
              className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-bold active:opacity-80"
            >
              다시
            </button>
            <button
              onClick={handleNext}
              className="px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white font-bold active:opacity-80"
            >
              {stage + 1 >= STAGES.length ? "완료!" : "다음 →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
