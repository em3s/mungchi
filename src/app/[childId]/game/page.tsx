"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { isFeatureEnabled, loadFeatureFlags } from "@/lib/features";
import { getBalance, addTransaction } from "@/lib/coins";
import { USERS } from "@/lib/constants";
import { useThemeOverride } from "@/hooks/useThemeOverride";
import { BottomNav } from "@/components/BottomNav";
import { DinoGame } from "@/components/DinoGame";
import { Toast } from "@/components/Toast";
import { useToast } from "@/hooks/useToast";

export default function GamePage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = use(params);
  const router = useRouter();
  const { message: toastMsg, showToast } = useToast();
  const { override: themeOverride } = useThemeOverride(childId);
  const user = USERS.find((u) => u.id === childId);

  const [flagsLoaded, setFlagsLoaded] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [highScore, setHighScore] = useState(0);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const deductingRef = useRef(false);

  useEffect(() => {
    loadFeatureFlags().then(() => setFlagsLoaded(true));
  }, []);

  const featureDisabled = flagsLoaded && !isFeatureEnabled(childId, "game");

  useEffect(() => {
    if (featureDisabled) router.replace(`/${childId}`);
  }, [featureDisabled, childId, router]);

  useEffect(() => {
    if (!flagsLoaded || featureDisabled) return;
    getBalance(childId).then(setBalance);
  }, [childId, flagsLoaded, featureDisabled]);

  if (!flagsLoaded || featureDisabled || !user) return null;

  const canPlay = balance !== null && balance >= 1;

  async function handleGameStart() {
    if (deductingRef.current) return;
    deductingRef.current = true;
    const result = await addTransaction(childId, -1, "game", "🦖 공룡 달리기");
    deductingRef.current = false;
    if (result.ok && result.newBalance !== undefined) {
      setBalance(result.newBalance);
    }
  }

  function handleGameOver(score: number) {
    setLastScore(score);
    if (score > highScore) {
      setHighScore(score);
    }
  }

  return (
    <div className={`theme-preset-${themeOverride || user.theme} min-h-screen bg-[var(--bg)] pb-24`}>
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <button
          onClick={() => router.push(`/${childId}/shop`)}
          className="text-sm text-gray-400 active:opacity-60"
        >
          ← 별사탕샵
        </button>
        <div className="text-sm font-bold text-[var(--accent)]">
          🍬 {balance ?? "..."}
        </div>
      </div>

      {/* Title */}
      <div className="text-center mb-4">
        <h1 className="text-xl font-black text-gray-800">🦖 공룡 달리기</h1>
        <p className="text-xs text-gray-400 mt-1">
          장애물을 피해 달려보세요! (1🍬)
        </p>
      </div>

      {/* Game area */}
      <div className="px-4">
        {canPlay ? (
          <DinoGame
            playerEmoji="🏃"
            onGameStart={handleGameStart}
            onGameOver={handleGameOver}
          />
        ) : (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🍬</div>
            <div className="text-gray-500 font-bold mb-1">별사탕이 부족해요!</div>
            <div className="text-xs text-gray-400 mb-4">
              할일이나 퀴즈를 완료해서 별사탕을 모아보세요
            </div>
            <button
              onClick={() => router.push(`/${childId}/shop`)}
              className="px-4 py-2 rounded-xl bg-gray-200 text-gray-600 text-sm font-bold active:opacity-80"
            >
              별사탕샵으로
            </button>
          </div>
        )}
      </div>

      {/* High score */}
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

      <BottomNav childId={childId} />
      <Toast message={toastMsg} />
    </div>
  );
}
