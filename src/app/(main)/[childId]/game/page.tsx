"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { getBalance, addTransaction } from "@/lib/coins";
import { useThemeOverride } from "@/hooks/useThemeOverride";
import { useFeatureGuard } from "@/hooks/useFeatureGuard";
import { useUser } from "@/hooks/useUser";
import { BottomNav } from "@/components/BottomNav";
import { DinoGame, DINO_DIFFICULTIES, type DinoDifficultyKey } from "@/components/DinoGame";
import { FractionLineGame } from "@/components/FractionLineGame";
import { Toast } from "@/components/Toast";
import { useToast } from "@/hooks/useToast";

const DIFFICULTY_INFO: Record<DinoDifficultyKey, { label: string; cost: number; color: string }> = {
  easy:     { label: "쉬움",       cost: 5, color: "bg-green-500" },
  hard:     { label: "어려움",     cost: 3, color: "bg-amber-500" },
  veryHard: { label: "많이 어려움", cost: 1, color: "bg-red-500" },
};

export default function GamePage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId, user } = useUser(params);
  const router = useRouter();
  const { message: toastMsg, showToast } = useToast();
  const { override: themeOverride } = useThemeOverride(childId);

  const [tab, setTab] = useState<"dino" | "fraction">("dino");
  const [difficulty, setDifficulty] = useState<DinoDifficultyKey>("easy");
  const [highScores, setHighScores] = useState<Record<string, number>>({});
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const deductingRef = useRef(false);
  const { allowed } = useFeatureGuard(childId, "game");

  const { data: balance, mutate: mutateBalance } = useSWR(
    allowed ? `coin_balance:${childId}` : null,
    () => getBalance(childId),
  );

  if (!allowed || !user) return null;

  const info = DIFFICULTY_INFO[difficulty];
  const canPlay = balance !== undefined && balance >= info.cost;

  async function handleGameStart() {
    if (deductingRef.current) return;
    deductingRef.current = true;
    setPlaying(true);
    const result = await addTransaction(childId, -info.cost, "game", `🦖 공룡 달리기 (${info.label})`);
    deductingRef.current = false;
    if (result.ok && result.newBalance !== undefined) {
      mutateBalance(result.newBalance, { revalidate: false });
    }
  }

  function handleGameOver(score: number) {
    setLastScore(score);
    setPlaying(false);
    const prev = highScores[difficulty] ?? 0;
    if (score > prev) {
      setHighScores((h) => ({ ...h, [difficulty]: score }));
    }
  }

  const highScore = highScores[difficulty] ?? 0;

  return (
    <div className={`theme-preset-${themeOverride || user.theme} min-h-screen bg-[var(--bg)] pb-24`}>
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <button
          onClick={() => router.push(`/${childId}/shop`)}
          className="text-sm text-gray-400 active:opacity-60"
        >
          ← 초코샵
        </button>
        <div className="text-sm font-bold text-[var(--accent)]">
          🍪 {balance ?? "..."}
        </div>
      </div>

      {/* Tab selector */}
      <div className="flex gap-2 mx-4 mb-1">
        {([["dino", "🦖 공룡 달리기"], ["fraction", "📐 분수 수직선"]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
              tab === key
                ? "bg-[var(--accent)] text-white shadow-md"
                : "bg-gray-100 text-gray-500 active:opacity-80"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* DinoGame 영역 */}
      {tab === "dino" && (
        <>
          {/* Difficulty selector */}
          {!playing && (
            <div className="flex justify-center gap-2 mb-4 px-4">
              {(Object.keys(DIFFICULTY_INFO) as DinoDifficultyKey[]).map((key) => {
                const d = DIFFICULTY_INFO[key];
                const active = difficulty === key;
                return (
                  <button
                    key={key}
                    onClick={() => setDifficulty(key)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                      active
                        ? `${d.color} text-white shadow-md scale-105`
                        : "bg-gray-100 text-gray-500 active:scale-95"
                    }`}
                  >
                    <div>{d.label}</div>
                    <div className={`text-[10px] mt-0.5 ${active ? "text-white/80" : "text-gray-400"}`}>
                      {d.cost}🍪
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          <div className="px-4">
            {canPlay ? (
              <DinoGame
                key={difficulty}
                playerEmoji="🦖"
                difficulty={DINO_DIFFICULTIES[difficulty]}
                onGameStart={handleGameStart}
                onGameOver={handleGameOver}
              />
            ) : (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🍪</div>
                <div className="text-gray-500 font-bold mb-1">초코가 부족해요!</div>
                <div className="text-xs text-gray-400 mb-4">
                  할일이나 퀴즈를 완료해서 초코를 모아보세요
                </div>
                <button
                  onClick={() => router.push(`/${childId}/shop`)}
                  className="px-4 py-2 rounded-xl bg-gray-200 text-gray-600 text-sm font-bold active:opacity-80"
                >
                  초코샵으로
                </button>
              </div>
            )}
          </div>
          {highScore > 0 && (
            <div className="text-center mt-4">
              <span className="text-xs text-gray-400">
                🏆 최고 점수: <span className="font-bold text-[var(--accent)]">{highScore}</span>
              </span>
              {lastScore !== null && lastScore < highScore && (
                <span className="text-xs text-gray-300 ml-2">
                  (이번: {lastScore})
                </span>
              )}
            </div>
          )}
        </>
      )}

      {/* 분수 수직선 게임 */}
      {tab === "fraction" && user && (
        <FractionLineGame
          user={user}
          onCoinsEarned={(n) => {
            mutateBalance();
            showToast(`+${n}🍪 획득!`);
          }}
        />
      )}

      <BottomNav childId={childId} />
      <Toast message={toastMsg} />
    </div>
  );
}
