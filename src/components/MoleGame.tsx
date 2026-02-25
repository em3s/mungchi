"use client";

import { useState, useRef, useCallback, useEffect } from "react";

/* ── 게임 설정 ── */
const GAME_DURATION = 30;
const HOLES = 9;
const GOLDEN_CHANCE = 0.1;

const PHASE_CONFIG = {
  1: { maxActive: 2, moleLifeMs: 2000, minSpawnMs: 1200, maxSpawnMs: 1600 },
  2: { maxActive: 3, moleLifeMs: 1400, minSpawnMs: 900, maxSpawnMs: 1200 },
  3: { maxActive: 4, moleLifeMs: 1000, minSpawnMs: 650, maxSpawnMs: 900 },
} as const;

function getPhase(elapsed: number): 1 | 2 | 3 {
  if (elapsed < 10) return 1;
  if (elapsed < 20) return 2;
  return 3;
}

function randBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

const CHEERS = [
  "대단해! 🎉",
  "두더지 잡기 왕! 👑",
  "잘했어! ⭐",
  "멋져! 💪",
  "최고야! 🏆",
];

/* ── 타입 ── */
interface HoleState {
  moleUp: boolean;
  isGolden: boolean;
  whacked: boolean;
  scorePopUp: number | null;
}

interface MoleGameProps {
  onGameStart: () => void;
  onGameOver: (score: number) => void;
}

function initHoles(): HoleState[] {
  return Array.from({ length: HOLES }, () => ({
    moleUp: false,
    isGolden: false,
    whacked: false,
    scorePopUp: null,
  }));
}

export function MoleGame({ onGameStart, onGameOver }: MoleGameProps) {
  /* ── 디스플레이 state ── */
  const [displayState, setDisplayState] = useState<"ready" | "playing" | "gameover">("ready");
  const [displayScore, setDisplayScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [holes, setHoles] = useState<HoleState[]>(initHoles);
  const [finalCheer, setFinalCheer] = useState("");

  /* ── 게임 로직 refs ── */
  const stateRef = useRef<"ready" | "playing" | "gameover">("ready");
  const score = useRef(0);
  const startedRef = useRef(false);
  const startTimeRef = useRef(0);

  /* ── 타이머 refs ── */
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spawnRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moleTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const popTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  /* ── cleanup ── */
  const clearAllTimers = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (spawnRef.current) clearTimeout(spawnRef.current);
    moleTimers.current.forEach((t) => clearTimeout(t));
    moleTimers.current.clear();
    popTimers.current.forEach((t) => clearTimeout(t));
    popTimers.current.clear();
  }, []);

  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  /* ── 두더지 올리기 ── */
  const raiseMole = useCallback((holeIdx: number, lifeMs: number) => {
    if (stateRef.current !== "playing") return;

    const isGolden = Math.random() < GOLDEN_CHANCE;

    setHoles((prev) => {
      if (prev[holeIdx].moleUp) return prev;
      const next = [...prev];
      next[holeIdx] = { moleUp: true, isGolden, whacked: false, scorePopUp: null };
      return next;
    });

    const timer = setTimeout(() => {
      moleTimers.current.delete(holeIdx);
      setHoles((prev) => {
        const next = [...prev];
        next[holeIdx] = { ...next[holeIdx], moleUp: false };
        return next;
      });
    }, lifeMs);
    moleTimers.current.set(holeIdx, timer);
  }, []);

  /* ── 스폰 스케줄러 ── */
  const scheduleSpawn = useCallback(() => {
    if (stateRef.current !== "playing") return;

    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    const phase = getPhase(elapsed);
    const cfg = PHASE_CONFIG[phase];

    setHoles((prev) => {
      const activeCount = prev.filter((h) => h.moleUp).length;
      if (activeCount < cfg.maxActive) {
        const emptyHoles = prev
          .map((h, i) => (!h.moleUp ? i : -1))
          .filter((i) => i >= 0);
        if (emptyHoles.length > 0) {
          const pick = emptyHoles[Math.floor(Math.random() * emptyHoles.length)];
          setTimeout(() => raiseMole(pick, cfg.moleLifeMs), 0);
        }
      }
      return prev;
    });

    const delay = randBetween(cfg.minSpawnMs, cfg.maxSpawnMs);
    spawnRef.current = setTimeout(scheduleSpawn, delay);
  }, [raiseMole]);

  /* ── 게임 시작 ── */
  function startGame() {
    if (!startedRef.current) {
      startedRef.current = true;
      onGameStart();
    }

    stateRef.current = "playing";
    score.current = 0;
    startTimeRef.current = Date.now();
    setDisplayState("playing");
    setDisplayScore(0);
    setTimeLeft(GAME_DURATION);
    setHoles(initHoles());

    tickRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const remaining = GAME_DURATION - elapsed;
      setTimeLeft(remaining);

      if (remaining <= 0) {
        endGame();
      }
    }, 200);

    spawnRef.current = setTimeout(scheduleSpawn, 500);
  }

  /* ── 게임 종료 ── */
  function endGame() {
    stateRef.current = "gameover";
    clearAllTimers();
    setDisplayState("gameover");
    setHoles(initHoles());
    setTimeLeft(0);
    setFinalCheer(CHEERS[Math.floor(Math.random() * CHEERS.length)]);
    onGameOver(score.current);
  }

  /* ── 두더지 터치 ── */
  function handleWhack(idx: number) {
    if (stateRef.current !== "playing") return;

    setHoles((prev) => {
      if (!prev[idx].moleUp || prev[idx].whacked) return prev;

      const pts = prev[idx].isGolden ? 2 : 1;
      score.current += pts;
      setDisplayScore(score.current);

      // 자동 내리기 타이머 취소
      const mt = moleTimers.current.get(idx);
      if (mt) {
        clearTimeout(mt);
        moleTimers.current.delete(idx);
      }

      const next = [...prev];
      next[idx] = { ...next[idx], whacked: true, scorePopUp: pts };

      // 팝업 + 내리기 정리
      const pt = setTimeout(() => {
        popTimers.current.delete(idx);
        setHoles((p) => {
          const n = [...p];
          n[idx] = { moleUp: false, isGolden: false, whacked: false, scorePopUp: null };
          return n;
        });
      }, 350);
      popTimers.current.set(idx, pt);

      return next;
    });
  }

  /* ── 리셋 ── */
  function reset() {
    clearAllTimers();
    stateRef.current = "ready";
    startedRef.current = false;
    score.current = 0;
    setDisplayState("ready");
    setDisplayScore(0);
    setTimeLeft(GAME_DURATION);
    setHoles(initHoles());
  }

  /* ── 렌더 ── */
  return (
    <div className="select-none" style={{ touchAction: "none" }}>
      {/* ── Ready 화면 ── */}
      {displayState === "ready" && (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🐹</div>
          <button
            onTouchStart={(e) => { e.preventDefault(); startGame(); }}
            onMouseDown={(e) => { e.preventDefault(); startGame(); }}
            className="px-8 py-3 rounded-2xl bg-amber-500 text-white font-bold text-lg shadow-lg active:scale-95 transition-transform"
          >
            탭하면 시작!
          </button>
        </div>
      )}

      {/* ── 플레이 / 게임오버 ── */}
      {displayState !== "ready" && (
        <>
          {/* HUD */}
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="text-sm font-bold text-gray-700">
              점수: <span className="text-[var(--accent)]">{displayScore}</span>
            </div>
            <div className={`text-sm font-bold ${timeLeft <= 5 ? "text-red-500" : "text-gray-700"}`}>
              ⏱ {timeLeft}초
            </div>
          </div>

          {/* 타이머 바 */}
          <div className="w-full h-2 bg-gray-200 rounded-full mb-4 overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-200 ease-linear"
              style={{ width: `${(timeLeft / GAME_DURATION) * 100}%` }}
            />
          </div>

          {/* 게임 그리드 */}
          {displayState === "playing" && (
            <div className="grid grid-cols-3 gap-3 max-w-[400px] mx-auto">
              {holes.map((hole, i) => (
                <div
                  key={i}
                  onTouchStart={(e) => { e.preventDefault(); handleWhack(i); }}
                  onMouseDown={(e) => { e.preventDefault(); handleWhack(i); }}
                  className="relative aspect-square bg-amber-50 rounded-2xl border-2 border-amber-200 overflow-hidden cursor-pointer active:scale-95 transition-transform"
                >
                  {/* 구멍 */}
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-[35%] bg-amber-800/70 rounded-[50%]" />

                  {/* 두더지 */}
                  <div
                    className={`absolute bottom-[12%] left-1/2 -translate-x-1/2 text-5xl transition-transform duration-200 ${
                      hole.whacked
                        ? "animate-mole-whack"
                        : hole.moleUp
                          ? "animate-mole-up"
                          : "translate-y-full opacity-0"
                    }`}
                  >
                    {hole.isGolden ? "⭐" : "🐹"}
                  </div>

                  {/* 잡기 이펙트 */}
                  {hole.whacked && (
                    <div className="absolute inset-0 flex items-center justify-center text-3xl animate-bonk-flash">
                      💥
                    </div>
                  )}

                  {/* 점수 팝업 */}
                  {hole.scorePopUp !== null && (
                    <div className="absolute top-1 left-1/2 -translate-x-1/2 text-sm font-black text-amber-600 animate-score-float">
                      +{hole.scorePopUp}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── 게임오버 화면 ── */}
          {displayState === "gameover" && (
            <div className="text-center py-8">
              <div className="text-5xl mb-3">🐹</div>
              <div className="text-lg font-bold text-gray-600 mb-1">{finalCheer}</div>
              <div className="text-3xl font-black text-[var(--accent)] mb-1">
                {displayScore}점
              </div>
              <div className="text-xs text-gray-400 mb-6">30초 동안 {displayScore}마리 잡았어요!</div>

              <div className="flex gap-3 justify-center">
                <button
                  onTouchStart={(e) => { e.preventDefault(); reset(); startGame(); }}
                  onMouseDown={(e) => { e.preventDefault(); reset(); startGame(); }}
                  className="px-6 py-3 rounded-2xl bg-amber-500 text-white font-bold shadow active:scale-95 transition-transform"
                >
                  다시 하기 (1🍪)
                </button>
                <button
                  onClick={() => window.history.back()}
                  className="px-6 py-3 rounded-2xl bg-gray-200 text-gray-600 font-bold active:scale-95 transition-transform"
                >
                  그만하기
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
