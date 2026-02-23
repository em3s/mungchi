"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { isFeatureEnabled, loadFeatureFlags } from "@/lib/features";
import { todayKST } from "@/lib/date";
import {
  getEntries,
  addEntry,
  removeEntry,
  hasEarnedToday,
  saveQuizResult,
  getVocabConfig,
} from "@/lib/vocab";
import { addTransaction, getBalance } from "@/lib/coins";
import { BottomNav } from "@/components/BottomNav";
import { WordInput } from "@/components/WordInput";
import { VocabQuiz } from "@/components/VocabQuiz";
import { Toast } from "@/components/Toast";
import { useToast } from "@/hooks/useToast";
import type { VocabEntry, VocabQuizType, DictionaryEntry } from "@/lib/types";

type ViewState = "list" | "adding" | "quiz" | "result";

export default function VocabPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = use(params);
  const router = useRouter();
  const { message: toastMsg, showToast } = useToast();
  const today = todayKST();

  // Feature flag guard
  const [flagsLoaded, setFlagsLoaded] = useState(false);
  useEffect(() => {
    loadFeatureFlags().then(() => setFlagsLoaded(true));
  }, []);
  const featureDisabled = flagsLoaded && !isFeatureEnabled(childId, "vocab");
  useEffect(() => {
    if (featureDisabled) router.replace(`/${childId}`);
  }, [featureDisabled, childId, router]);

  // State
  const [entries, setEntries] = useState<VocabEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewState>("list");
  const [quizType, setQuizType] = useState<VocabQuizType>("basic");
  const [quizResult, setQuizResult] = useState<{
    total: number;
    correct: number;
    candy: number;
    alreadyEarned: boolean;
  } | null>(null);
  const [config, setConfig] = useState<Record<string, number>>({});
  const [coinBalance, setCoinBalance] = useState<number | null>(null);
  const [coinsEnabled, setCoinsEnabled] = useState(false);

  // Load data
  const loadEntries = useCallback(async () => {
    const data = await getEntries(childId, today);
    setEntries(data);
    setLoading(false);
  }, [childId, today]);

  useEffect(() => {
    if (!flagsLoaded || featureDisabled) return;
    loadEntries();
    getVocabConfig().then(setConfig);
    const coins = isFeatureEnabled(childId, "coins");
    setCoinsEnabled(coins);
    if (coins) getBalance(childId).then(setCoinBalance);
  }, [childId, flagsLoaded, featureDisabled, loadEntries]);

  if (!flagsLoaded || featureDisabled) return null;

  if (loading) {
    return (
      <div className="text-center pt-[60px] text-gray-400 text-xl">
        불러오는 중...
      </div>
    );
  }

  const minWords = config.min_words ?? 3;

  async function handleAddWord(dictEntry: DictionaryEntry) {
    const result = await addEntry(childId, today, dictEntry);
    if (result.ok && result.entry) {
      setEntries((prev) => [...prev, result.entry!]);
      showToast(`"${dictEntry.word}" 추가!`);
    } else {
      showToast("이미 추가된 단어예요");
    }
  }

  async function handleRemoveWord(entryId: string) {
    const ok = await removeEntry(childId, today, entryId);
    if (ok) {
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
    }
  }

  function handleStartQuiz(type: VocabQuizType) {
    setQuizType(type);
    setView("quiz");
  }

  async function handleQuizComplete(total: number, correct: number) {
    const rewardKey =
      quizType === "basic" ? "basic_reward" : "advanced_reward";
    const rewardAmount = config[rewardKey] ?? (quizType === "basic" ? 10 : 20);

    const alreadyEarned = await hasEarnedToday(childId, today, quizType);
    const candy = alreadyEarned ? 0 : rewardAmount;

    await saveQuizResult(childId, today, quizType, total, correct, candy);

    if (candy > 0 && coinsEnabled) {
      const result = await addTransaction(
        childId,
        candy,
        "vocab_quiz",
        `${quizType === "basic" ? "객관식" : "주관식"} 퀴즈 ${correct}/${total}`,
      );
      if (result.ok) setCoinBalance(result.newBalance ?? null);
    }

    setQuizResult({ total, correct, candy, alreadyEarned });
    setView("result");
  }

  return (
    <div className="pt-2 pb-24">
      {/* Header */}
      <div
        className="flex items-center justify-between py-4 sticky top-0 z-10"
        style={{ background: "var(--bg)" }}
      >
        <h1 className="text-xl font-bold md:text-2xl">📖 영어 단어</h1>
        {coinsEnabled && coinBalance !== null && (
          <span className="text-sm font-bold text-amber-500 bg-amber-50 px-3 py-1 rounded-full">
            🍬 {coinBalance}
          </span>
        )}
      </div>

      {view === "list" && (
        <>
          {/* Word List */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                오늘의 단어 ({entries.length})
              </div>
              <button
                onClick={() => setView("adding")}
                className="text-sm font-semibold px-3 py-1 rounded-xl text-white bg-[var(--accent,#6c5ce7)]"
              >
                + 추가
              </button>
            </div>

            {entries.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                영어 단어를 추가해보세요!
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {entries.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between bg-white rounded-[14px] px-4 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
                  >
                    <div>
                      <div className="font-bold text-base text-gray-800">
                        {entry.word}
                      </div>
                      <div className="text-sm text-gray-500">
                        {entry.meaning}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveWord(entry.id)}
                      className="text-gray-300 hover:text-red-400 text-lg ml-2"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Quiz Buttons */}
          {entries.length >= minWords && (
            <div className="mt-6">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                시험 보기
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleStartQuiz("basic")}
                  className="flex-1 bg-blue-500 text-white py-3 rounded-xl font-bold text-sm"
                >
                  📝 객관식
                  <div className="text-xs font-normal opacity-80 mt-0.5">
                    🍬 {config.basic_reward ?? 10}
                  </div>
                </button>
                <button
                  onClick={() => handleStartQuiz("advanced")}
                  className="flex-1 bg-purple-500 text-white py-3 rounded-xl font-bold text-sm"
                >
                  ✏️ 주관식
                  <div className="text-xs font-normal opacity-80 mt-0.5">
                    🍬 {config.advanced_reward ?? 20}
                  </div>
                </button>
              </div>
            </div>
          )}
          {entries.length > 0 && entries.length < minWords && (
            <div className="text-center text-sm text-gray-400 mt-4">
              {minWords}개 이상 단어를 추가하면 시험을 볼 수 있어요
            </div>
          )}
        </>
      )}

      {view === "adding" && (
        <WordInput
          onSelect={handleAddWord}
          onCancel={() => setView("list")}
          excludeWords={entries.map((e) => e.word)}
        />
      )}

      {view === "quiz" && (
        <VocabQuiz
          entries={entries}
          quizType={quizType}
          onComplete={handleQuizComplete}
          onCancel={() => setView("list")}
        />
      )}

      {view === "result" && quizResult && (
        <div className="text-center py-6">
          <div className="text-4xl mb-3">
            {quizResult.correct === quizResult.total
              ? "🎉"
              : quizResult.correct / quizResult.total >= 0.5
                ? "👏"
                : "💪"}
          </div>
          <div className="text-xl font-bold mb-1">
            {quizResult.correct} / {quizResult.total} 정답
          </div>
          <div className="text-sm text-gray-500 mb-4">
            {quizType === "basic" ? "객관식" : "주관식"} 퀴즈 완료!
          </div>
          {quizResult.candy > 0 ? (
            <div className="text-lg font-bold text-amber-500 mb-4">
              🍬 별사탕 +{quizResult.candy}!
            </div>
          ) : quizResult.alreadyEarned ? (
            <div className="text-sm text-gray-400 mb-4">
              오늘은 이미 별사탕을 받았어요
            </div>
          ) : null}
          <button
            onClick={() => {
              setQuizResult(null);
              setView("list");
            }}
            className="w-full bg-[var(--accent,#6c5ce7)] text-white py-3 rounded-xl font-bold"
          >
            돌아가기
          </button>
        </div>
      )}

      <BottomNav childId={childId} />
      <Toast message={toastMsg} />
    </div>
  );
}
