"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { isFeatureEnabled, loadFeatureFlags } from "@/lib/features";
import { todayKST, WEEKDAYS } from "@/lib/date";
import {
  getEntries,
  getVocabLists,
  addEntry,
  removeEntry,
  updateVocabDate,
  setListTitle,
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

type ViewState = "home" | "list" | "adding" | "quiz" | "result";

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const weekday = WEEKDAYS[d.getDay()];
  return `${m}월 ${day}일 (${weekday})`;
}

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
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<ViewState>("home");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [newDate, setNewDate] = useState(today);
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

  // Vocab lists (date + count + title)
  const [vocabLists, setVocabLists] = useState<
    { date: string; count: number; title: string }[]
  >([]);
  const [listTitle, setListTitleState] = useState("");

  const loadLists = useCallback(async () => {
    const lists = await getVocabLists(childId);
    setVocabLists(lists);
  }, [childId]);

  // Load entries for selected date
  const loadEntries = useCallback(async () => {
    if (!selectedDate) return;
    const data = await getEntries(childId, selectedDate);
    setEntries(data);
    setLoading(false);
  }, [childId, selectedDate]);

  // Initial load
  useEffect(() => {
    if (!flagsLoaded || featureDisabled) return;
    loadLists();
    getVocabConfig().then(setConfig);
    const coins = isFeatureEnabled(childId, "coins");
    setCoinsEnabled(coins);
    if (coins) getBalance(childId).then(setCoinBalance);
  }, [childId, flagsLoaded, featureDisabled, loadLists]);

  // Load entries when selectedDate changes
  useEffect(() => {
    if (selectedDate) loadEntries();
  }, [selectedDate, loadEntries]);

  if (!flagsLoaded || featureDisabled) return null;

  const isEditable = selectedDate === today;
  const minWords = config.min_words ?? 3;

  function handleOpenList(date: string) {
    const list = vocabLists.find((l) => l.date === date);
    setListTitleState(list?.title ?? "");
    setSelectedDate(date);
    setLoading(true);
    setView("list");
  }

  function handleCreateNew() {
    setListTitleState("");
    setSelectedDate(newDate);
    setLoading(true);
    setView("list");
  }

  function handleBackToHome() {
    setSelectedDate(null);
    setEntries([]);
    setListTitleState("");
    setView("home");
    loadLists();
  }

  async function handleTitleSave() {
    if (!selectedDate) return;
    const ok = await setListTitle(childId, selectedDate, listTitle);
    if (ok) {
      showToast("제목을 저장했어요");
    }
  }

  async function handleChangeDate(newDateValue: string) {
    if (!selectedDate || !newDateValue || newDateValue === selectedDate) return;
    const ok = await updateVocabDate(childId, selectedDate, newDateValue);
    if (ok) {
      setSelectedDate(newDateValue);
      showToast(`날짜를 ${formatDate(newDateValue)}로 변경했어요`);
    } else {
      showToast("날짜 변경에 실패했어요");
    }
  }

  async function handleAddWord(dictEntry: DictionaryEntry) {
    const result = await addEntry(childId, selectedDate!, dictEntry);
    if (result.ok && result.entry) {
      setEntries((prev) => [...prev, result.entry!]);
      showToast(`"${dictEntry.word}" 추가!`);
    } else {
      showToast("이미 추가된 단어예요");
    }
  }

  async function handleRemoveWord(entryId: string) {
    const ok = await removeEntry(childId, selectedDate!, entryId);
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

    const alreadyEarned = await hasEarnedToday(
      childId,
      selectedDate!,
      quizType,
    );
    const candy = alreadyEarned ? 0 : rewardAmount;

    await saveQuizResult(
      childId,
      selectedDate!,
      quizType,
      total,
      correct,
      candy,
    );

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

      {/* Home View — vocab list + create new */}
      {view === "home" && (
        <>
          {/* New vocab list */}
          <div className="flex items-center gap-2 mb-6">
            <input
              type="date"
              value={newDate}
              max={today}
              onChange={(e) => setNewDate(e.target.value)}
              className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-3 text-sm text-gray-700"
            />
            <button
              onClick={handleCreateNew}
              className="bg-[var(--accent,#6c5ce7)] text-white px-4 py-3 rounded-xl font-bold text-sm whitespace-nowrap active:opacity-80"
            >
              + 새 단어장
            </button>
          </div>

          {/* Existing vocab lists */}
          {vocabLists.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              아직 단어장이 없어요
              <br />
              <span className="text-sm">새 단어장을 만들어보세요!</span>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {vocabLists.map((item) => (
                <li key={item.date}>
                  <button
                    onClick={() => handleOpenList(item.date)}
                    className="w-full flex items-center justify-between bg-white rounded-[14px] px-4 py-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.04)] active:bg-gray-50 transition-colors"
                  >
                    <div className="text-left min-w-0 flex-1">
                      <div className="font-bold text-base text-gray-800">
                        {item.title || formatDate(item.date)}
                      </div>
                      {item.title && (
                        <div className="text-xs text-gray-400">
                          {formatDate(item.date)}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400">
                        {item.count}개
                      </span>
                      <span className="text-gray-300">›</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* List View */}
      {view === "list" && (
        <>
          {/* Sub-header */}
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={handleBackToHome}
              className="text-xl px-2 py-1 rounded-xl text-[var(--accent,#6c5ce7)] font-bold active:bg-black/5"
            >
              ←
            </button>
            <input
              type="date"
              value={selectedDate ?? ""}
              onChange={(e) => handleChangeDate(e.target.value)}
              className="text-sm font-semibold text-gray-600 bg-transparent border-b border-dashed border-gray-300 px-1 py-0.5"
            />
          </div>
          {/* Title input */}
          <div className="mb-4">
            <input
              type="text"
              value={listTitle}
              onChange={(e) => setListTitleState(e.target.value)}
              onBlur={handleTitleSave}
              placeholder="제목 없음"
              className="w-full text-lg font-bold text-gray-800 bg-transparent border-none outline-none placeholder:text-gray-300 px-1"
            />
          </div>

          {loading ? (
            <div className="text-center py-10 text-gray-400">
              불러오는 중...
            </div>
          ) : (
            <>
              {/* Word List */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    단어 ({entries.length})
                  </div>
                  {isEditable && (
                    <button
                      onClick={() => setView("adding")}
                      className="text-sm font-semibold px-3 py-1 rounded-xl text-white bg-[var(--accent,#6c5ce7)]"
                    >
                      + 추가
                    </button>
                  )}
                </div>

                {entries.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    {isEditable
                      ? "영어 단어를 추가해보세요!"
                      : "이 날의 단어가 없어요"}
                  </div>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {entries.map((entry) => (
                      <li
                        key={entry.id}
                        className="flex items-center gap-3 bg-white rounded-[14px] px-4 py-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.04)] md:px-5 md:py-[18px] md:gap-4 md:rounded-2xl"
                      >
                        <span className="flex-1 text-base md:text-lg">
                          {entry.word}
                          <span className="text-sm text-gray-400 ml-2">
                            {entry.meaning}
                          </span>
                        </span>
                        {isEditable && (
                          <button
                            onClick={() => handleRemoveWord(entry.id)}
                            className="text-gray-400 text-sm px-1 active:text-red-500 transition-colors"
                          >
                            ✕
                          </button>
                        )}
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
        </>
      )}

      {/* Adding View */}
      {view === "adding" && (
        <WordInput
          onSelect={handleAddWord}
          onCancel={() => setView("list")}
          excludeWords={entries.map((e) => e.word)}
        />
      )}

      {/* Quiz View */}
      {view === "quiz" && (
        <VocabQuiz
          entries={entries}
          quizType={quizType}
          onComplete={handleQuizComplete}
          onCancel={() => setView("list")}
        />
      )}

      {/* Result View */}
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
              이미 별사탕을 받았어요
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
