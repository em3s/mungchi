"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { isFeatureEnabled, loadFeatureFlags } from "@/lib/features";
import { todayKST, WEEKDAYS } from "@/lib/date";
import {
  getEntries,
  getVocabDates,
  addEntry,
  removeEntry,
  hasEarnedToday,
  saveQuizResult,
  getVocabConfig,
} from "@/lib/vocab";
import { addTransaction, getBalance } from "@/lib/coins";
import { BottomNav } from "@/components/BottomNav";
import { Calendar } from "@/components/Calendar";
import { WordInput } from "@/components/WordInput";
import { VocabQuiz } from "@/components/VocabQuiz";
import { Toast } from "@/components/Toast";
import { useToast } from "@/hooks/useToast";
import type { VocabEntry, VocabQuizType, DictionaryEntry } from "@/lib/types";

type ViewState = "calendar" | "list" | "adding" | "quiz" | "result";

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
  const [view, setView] = useState<ViewState>("calendar");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
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

  // Calendar state
  const [calYear, setCalYear] = useState(() => parseInt(today.slice(0, 4)));
  const [calMonth, setCalMonth] = useState(
    () => parseInt(today.slice(5, 7)) - 1,
  );
  const [vocabDates, setVocabDates] = useState<Set<string>>(new Set());

  // Load vocab dates for calendar
  const loadVocabDates = useCallback(async () => {
    const dates = await getVocabDates(childId, calYear, calMonth);
    setVocabDates(dates);
  }, [childId, calYear, calMonth]);

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
    loadVocabDates();
    getVocabConfig().then(setConfig);
    const coins = isFeatureEnabled(childId, "coins");
    setCoinsEnabled(coins);
    if (coins) getBalance(childId).then(setCoinBalance);
  }, [childId, flagsLoaded, featureDisabled, loadVocabDates]);

  // Load entries when selectedDate changes
  useEffect(() => {
    if (selectedDate) loadEntries();
  }, [selectedDate, loadEntries]);

  if (!flagsLoaded || featureDisabled) return null;

  const isToday = selectedDate === today;
  const minWords = config.min_words ?? 3;

  // Calendar navigation
  function prevMonthNav() {
    if (calMonth === 0) {
      setCalYear(calYear - 1);
      setCalMonth(11);
    } else setCalMonth(calMonth - 1);
  }

  function nextMonthNav() {
    if (calMonth === 11) {
      setCalYear(calYear + 1);
      setCalMonth(0);
    } else setCalMonth(calMonth + 1);
  }

  function goToday() {
    const t = todayKST();
    setCalYear(parseInt(t.slice(0, 4)));
    setCalMonth(parseInt(t.slice(5, 7)) - 1);
  }

  function handleDateClick(date: string) {
    if (date > today) return;
    if (vocabDates.has(date)) {
      setSelectedDate(date);
      setLoading(true);
      setView("list");
    }
  }

  function handleNewVocabList() {
    setSelectedDate(today);
    setLoading(true);
    setView("list");
  }

  function handleBackToCalendar() {
    setSelectedDate(null);
    setEntries([]);
    setView("calendar");
    loadVocabDates();
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

      {/* Calendar View */}
      {view === "calendar" && (
        <>
          <Calendar
            year={calYear}
            month={calMonth}
            monthData={null}
            today={today}
            selectedDate={null}
            eventDates={vocabDates}
            onDateClick={handleDateClick}
            onPrevMonth={prevMonthNav}
            onNextMonth={nextMonthNav}
            onGoToday={goToday}
          />

          <div className="mt-4">
            <button
              onClick={handleNewVocabList}
              className="w-full bg-[var(--accent,#6c5ce7)] text-white py-4 rounded-2xl font-bold text-base active:opacity-80"
            >
              {vocabDates.has(today)
                ? "📖 오늘의 단어장"
                : "📖 새 단어장 만들기"}
            </button>
          </div>

          {vocabDates.size > 0 && (
            <div className="text-center text-sm text-gray-400 mt-3">
              이번 달 {vocabDates.size}일 학습
            </div>
          )}
        </>
      )}

      {/* List View */}
      {view === "list" && (
        <>
          {/* Sub-header */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={handleBackToCalendar}
              className="text-xl px-2 py-1 rounded-xl text-[var(--accent,#6c5ce7)] font-bold active:bg-black/5"
            >
              ←
            </button>
            <span className="text-sm font-semibold text-gray-600">
              {selectedDate && formatDate(selectedDate)}
            </span>
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
                  {isToday && (
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
                    {isToday
                      ? "영어 단어를 추가해보세요!"
                      : "이 날의 단어가 없어요"}
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
                        {isToday && (
                          <button
                            onClick={() => handleRemoveWord(entry.id)}
                            className="text-gray-300 hover:text-red-400 text-lg ml-2"
                          >
                            ×
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
