"use client";

import { useState, useEffect, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { isFeatureEnabled, loadFeatureFlags } from "@/lib/features";
import {
  getEntries,
  getVocabLists,
  createList,
  addEntry,
  removeEntry,
  updateEntry,
  toggleSpelling,
  renameList,
  saveQuizResult,
  getVocabConfig,
  getQuizStatuses,
  loadDictionary,
} from "@/lib/vocab";
import { addTransaction, getBalance } from "@/lib/coins";
import { BottomNav } from "@/components/BottomNav";
import { WordInput } from "@/components/WordInput";
import { VocabQuiz } from "@/components/VocabQuiz";
import { Toast } from "@/components/Toast";
import { VocabSettings } from "@/components/VocabSettings";
import { useToast } from "@/hooks/useToast";
import type { VocabEntry, VocabQuizType, DictionaryEntry } from "@/lib/types";

type ViewState = "home" | "list" | "quiz" | "result";

export default function VocabPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = use(params);
  const router = useRouter();
  const { message: toastMsg, showToast } = useToast();

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
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [newListName, setNewListName] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [quizType, setQuizType] = useState<VocabQuizType>("basic");
  const [quizResult, setQuizResult] = useState<{
    total: number;
    correct: number;
    candy: number;
  } | null>(null);
  const [config, setConfig] = useState<Record<string, number>>({});
  const [coinBalance, setCoinBalance] = useState<number | null>(null);
  const [coinsEnabled, setCoinsEnabled] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const longPressRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [quizStatuses, setQuizStatuses] = useState<Map<string, { basic: boolean; spelling: boolean }>>(new Map());
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editWord, setEditWord] = useState("");
  const [editMeaning, setEditMeaning] = useState("");
  const editWordRef = useRef<HTMLInputElement>(null);

  // Vocab lists
  const [vocabLists, setVocabLists] = useState<
    { id: string; name: string; count: number; spellingCount: number; createdAt: string }[]
  >([]);
  const [listTitle, setListTitleState] = useState("");

  const loadLists = useCallback(async () => {
    const lists = await getVocabLists(childId);
    setVocabLists(lists);
    if (lists.length > 0) {
      const statuses = await getQuizStatuses(childId, lists.map((l) => l.id));
      setQuizStatuses(statuses);
    }
  }, [childId]);

  // Load entries for selected list
  const loadEntries = useCallback(async () => {
    if (!selectedListId) return;
    const data = await getEntries(childId, selectedListId);
    setEntries(data);
    setLoading(false);
  }, [childId, selectedListId]);

  // Initial load
  useEffect(() => {
    if (!flagsLoaded || featureDisabled) return;
    loadLists();
    loadDictionary();
    getVocabConfig().then(setConfig);
    const coins = isFeatureEnabled(childId, "coins");
    setCoinsEnabled(coins);
    if (coins) getBalance(childId).then(setCoinBalance);
  }, [childId, flagsLoaded, featureDisabled, loadLists]);

  // Load entries when selectedListId changes (list view only)
  useEffect(() => {
    if (selectedListId && view === "list") loadEntries();
  }, [selectedListId, loadEntries, view]);

  if (!flagsLoaded || featureDisabled) return null;

  const minWords = config.min_words ?? 3;

  function speakWord(word: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(word);
    u.lang = "en-US";
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  }

  function handleOpenList(listId: string) {
    const list = vocabLists.find((l) => l.id === listId);
    setListTitleState(list?.name ?? "");
    setSelectedListId(listId);
    setLoading(true);
    setView("list");
  }

  async function handleCreateNew() {
    const name = newListName.trim();
    if (!name) return;
    const result = await createList(childId, name);
    if (result.ok && result.listId) {
      setListTitleState(name);
      setSelectedListId(result.listId);
      setNewListName("");
      setLoading(true);
      setView("list");
    } else {
      showToast("단어장 생성에 실패했어요");
    }
  }

  function handleBackToHome() {
    setSelectedListId(null);
    setEntries([]);
    setListTitleState("");
    setShowAddForm(false);
    setView("home");
    loadLists();
  }

  async function handleTitleSave() {
    if (!selectedListId) return;
    const ok = await renameList(childId, selectedListId, listTitle);
    if (ok) {
      showToast("이름을 저장했어요");
    }
  }

  async function handleAddWord(dictEntry: DictionaryEntry) {
    const result = await addEntry(childId, selectedListId!, dictEntry);
    if (result.ok && result.entry) {
      setEntries((prev) => [...prev, result.entry!]);
      showToast(`"${dictEntry.word}" 추가!`);
    } else {
      showToast("이미 추가된 단어예요");
    }
  }

  async function handleAddCustom(word: string, meaning: string) {
    const result = await addEntry(childId, selectedListId!, null, { word, meaning });
    if (result.ok && result.entry) {
      setEntries((prev) => [...prev, result.entry!]);
      showToast(`"${word}" 추가!`);
    } else {
      showToast("이미 추가된 단어예요");
    }
  }

  function handleStartEdit(entry: VocabEntry) {
    setEditingEntryId(entry.id);
    setEditWord(entry.word);
    setEditMeaning(entry.meaning);
    setTimeout(() => editWordRef.current?.focus(), 0);
  }

  async function handleSaveEdit(entryId: string) {
    const w = editWord.trim();
    const m = editMeaning.trim();
    if (!w || !m) return;
    const entry = entries.find((e) => e.id === entryId);
    if (entry && w === entry.word && m === entry.meaning) {
      setEditingEntryId(null);
      return;
    }
    const ok = await updateEntry(childId, selectedListId!, entryId, w, m);
    if (ok) {
      setEntries((prev) =>
        prev.map((e) => (e.id === entryId ? { ...e, word: w, meaning: m } : e)),
      );
      showToast("수정 완료!");
    } else {
      showToast("수정에 실패했어요");
    }
    setEditingEntryId(null);
  }

  async function handleRemoveWord(entryId: string) {
    const ok = await removeEntry(childId, selectedListId!, entryId);
    if (ok) {
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
    }
  }

  function handleStartQuiz(type: VocabQuizType) {
    setQuizType(type);
    setView("quiz");
  }

  async function handleStartQuizFromHome(listId: string, type: VocabQuizType) {
    setSelectedListId(listId);
    setQuizType(type);
    setLoading(true);
    const [data] = await Promise.all([getEntries(childId, listId), loadDictionary()]);
    // 스펠링: spelling 체크된 단어만
    const quizEntries = type === "spelling" ? data.filter((e) => e.spelling) : data;
    setEntries(quizEntries);
    setLoading(false);
    setView("quiz");
  }

  async function handleQuizComplete(total: number, correct: number) {
    // 객관식: 고정 보상, 스펠링: 1🍬 × 맞춘 수
    // 매번 완주하면 무조건 보상
    const candy =
      quizType === "basic"
        ? (config.basic_reward ?? 1)
        : correct; // spelling: 1🍬 per correct

    await saveQuizResult(
      childId,
      selectedListId!,
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
        `${quizType === "basic" ? "객관식" : "스펠링"} 퀴즈 ${correct}/${total}`,
      );
      if (result.ok) setCoinBalance(result.newBalance ?? null);
    }

    setQuizResult({ total, correct, candy });
    setView("result");
  }

  return (
    <div className="pt-2 pb-24">
      {/* Header */}
      <div
        className="flex items-center justify-between py-4 sticky top-0 z-10"
        style={{ background: "var(--bg)" }}
      >
        <h1
          className="text-xl font-bold md:text-2xl select-none"
          onTouchStart={() => {
            longPressRef.current = setTimeout(() => setShowSettings(true), 800);
          }}
          onTouchEnd={() => clearTimeout(longPressRef.current)}
          onTouchCancel={() => clearTimeout(longPressRef.current)}
          onMouseDown={() => {
            longPressRef.current = setTimeout(() => setShowSettings(true), 800);
          }}
          onMouseUp={() => clearTimeout(longPressRef.current)}
          onMouseLeave={() => clearTimeout(longPressRef.current)}
        >
          📖 영어 단어
        </h1>
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
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateNew(); }}
              placeholder="새 단어장 이름"
              className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-3 text-sm text-gray-700"
            />
            <button
              onClick={handleCreateNew}
              disabled={!newListName.trim()}
              className="bg-[var(--accent,#6c5ce7)] text-white px-4 py-3 rounded-xl font-bold text-sm whitespace-nowrap active:opacity-80 disabled:opacity-40"
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
              {vocabLists.map((item) => {
                const qs = quizStatuses.get(item.id);
                const canQuiz = item.count >= minWords;
                return (
                  <li key={item.id} className="bg-white rounded-[14px] shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                    <button
                      onClick={() => handleOpenList(item.id)}
                      className="w-full flex items-center justify-between px-4 py-3.5 active:bg-gray-50 transition-colors rounded-[14px]"
                    >
                      <div className="text-left min-w-0 flex-1">
                        <div className="font-bold text-base text-gray-800">
                          {item.name}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">
                          {item.count}개
                        </span>
                        <span className="text-gray-300">›</span>
                      </div>
                    </button>
                    {canQuiz && (
                      <div className="flex gap-2 px-4 pb-3 -mt-1">
                        <button
                          onClick={() => handleStartQuizFromHome(item.id, "basic")}
                          className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 active:opacity-80 ${
                            qs?.basic
                              ? "bg-blue-50 text-blue-400"
                              : "bg-blue-500 text-white"
                          }`}
                        >
                          📝 객관식 {qs?.basic ? "✓" : `🍬${config.basic_reward ?? 1}`}
                        </button>
                        <button
                          onClick={() => handleStartQuizFromHome(item.id, "spelling")}
                          disabled={item.spellingCount === 0}
                          className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 active:opacity-80 ${
                            item.spellingCount === 0
                              ? "bg-gray-100 text-gray-300"
                              : qs?.spelling
                                ? "bg-purple-50 text-purple-400"
                                : "bg-purple-500 text-white"
                          }`}
                        >
                          ✏️ 스펠링 {item.spellingCount === 0 ? "0개" : qs?.spelling ? "✓" : `🍬${item.spellingCount}`}
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {/* List View */}
      {view === "list" && (
        <>
          {/* Title input */}
          <div className="mb-4">
            <input
              type="text"
              value={listTitle}
              onChange={(e) => setListTitleState(e.target.value)}
              onBlur={handleTitleSave}
              placeholder="단어장 이름"
              className="w-full text-lg font-bold text-gray-800 bg-transparent border-none outline-none placeholder:text-gray-300 px-1"
            />
          </div>

          {loading ? (
            <div className="text-center py-10 text-gray-400">
              불러오는 중...
            </div>
          ) : (
            <>
              {/* Add Form (inline) */}
              {showAddForm && (
                <div className="mb-3">
                  <WordInput
                    onSelect={handleAddWord}
                    onCustom={handleAddCustom}
                    onCancel={() => setShowAddForm(false)}
                    excludeWords={entries.map((e) => e.word)}
                  />
                </div>
              )}

              {/* Word List */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-semibold text-gray-500 tracking-wider">
                    단어 ({entries.length}) · <span className="text-purple-400">스펠링 {entries.filter((e) => e.spelling).length}</span>
                  </div>
                  {!showAddForm && (
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="text-sm font-semibold px-3 py-1 rounded-xl text-white bg-[var(--accent,#6c5ce7)]"
                    >
                      + 추가
                    </button>
                  )}
                </div>

                {entries.length === 0 && !showAddForm ? (
                  <div className="text-center py-10 text-gray-400">
                    영어 단어를 추가해보세요!
                  </div>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {entries.map((entry) => {
                      if (editingEntryId === entry.id) {
                        return (
                          <li
                            key={entry.id}
                            className="bg-white rounded-[14px] px-4 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
                          >
                            <input
                              ref={editWordRef}
                              value={editWord}
                              onChange={(e) => setEditWord(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(entry.id); }}
                              placeholder="단어 / 구문"
                              className="w-full text-base font-semibold text-gray-800 bg-transparent outline-none border-b border-gray-200 pb-2 mb-2"
                            />
                            <input
                              value={editMeaning}
                              onChange={(e) => setEditMeaning(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(entry.id); }}
                              placeholder="뜻"
                              className="w-full text-sm text-gray-600 bg-transparent outline-none mb-2"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setEditingEntryId(null)}
                                className="text-xs text-gray-400 px-3 py-1.5 rounded-lg active:bg-gray-100"
                              >
                                취소
                              </button>
                              <button
                                onClick={() => handleSaveEdit(entry.id)}
                                disabled={!editWord.trim() || !editMeaning.trim()}
                                className="text-xs font-semibold text-white bg-[var(--accent,#6c5ce7)] px-3 py-1.5 rounded-lg active:opacity-80 disabled:opacity-40"
                              >
                                저장
                              </button>
                            </div>
                          </li>
                        );
                      }
                      return (
                        <li
                          key={entry.id}
                          className="flex items-center gap-3 bg-white rounded-[14px] px-4 py-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.04)] md:px-5 md:py-[18px] md:gap-4 md:rounded-2xl"
                        >
                          <button
                            onClick={async () => {
                              const newVal = !entry.spelling;
                              const ok = await toggleSpelling(childId, selectedListId!, entry.id, newVal);
                              if (ok) {
                                setEntries((prev) =>
                                  prev.map((e) =>
                                    e.id === entry.id ? { ...e, spelling: newVal } : e,
                                  ),
                                );
                              }
                            }}
                            className={`w-7 h-7 rounded-full border-[2.5px] flex items-center justify-center shrink-0 transition-all text-sm md:w-[34px] md:h-[34px] md:text-base ${
                              entry.spelling
                                ? "bg-[var(--accent,#6c5ce7)] border-[var(--accent,#6c5ce7)] text-white"
                                : "bg-white border-[var(--accent,#6c5ce7)]"
                            }`}
                          >
                            {entry.spelling ? "✓" : ""}
                          </button>
                          <button
                            onClick={() => speakWord(entry.word)}
                            className="text-gray-400 text-base active:text-[var(--accent,#6c5ce7)] transition-colors shrink-0"
                            aria-label={`${entry.word} 발음 듣기`}
                          >
                            ▶
                          </button>
                          <span
                            onClick={() => handleStartEdit(entry)}
                            className="flex-1 text-base md:text-lg"
                          >
                            {entry.word}  <span className="text-gray-400">{entry.meaning}</span>
                          </span>
                          <button
                            onClick={() => handleRemoveWord(entry.id)}
                            className="text-gray-400 text-sm px-1 active:text-red-500 transition-colors"
                          >
                            ✕
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Quiz buttons */}
              {entries.length >= minWords && (
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => handleStartQuiz("basic")}
                    className="flex-1 py-3 rounded-xl bg-blue-500 text-white font-bold text-sm active:opacity-80"
                  >
                    📝 객관식 퀴즈
                  </button>
                  <button
                    onClick={() => handleStartQuiz("spelling")}
                    disabled={entries.filter((e) => e.spelling).length === 0}
                    className="flex-1 py-3 rounded-xl bg-purple-500 text-white font-bold text-sm active:opacity-80 disabled:opacity-40"
                  >
                    ✏️ 스펠링 퀴즈
                  </button>
                </div>
              )}

              <button
                onClick={handleBackToHome}
                className="w-full mt-2 py-3 rounded-xl text-sm font-semibold text-gray-500 bg-gray-100 active:bg-gray-200"
              >
                단어장 목록으로
              </button>
            </>
          )}
        </>
      )}

      {/* Quiz View */}
      {view === "quiz" && (
        <VocabQuiz
          entries={entries}
          quizType={quizType}
          onComplete={handleQuizComplete}
          onCancel={() => setView("home")}
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
            {quizType === "basic" ? "객관식" : "스펠링"} 퀴즈 완료!
          </div>
          {quizResult.candy > 0 && (
            <div className="text-lg font-bold text-amber-500 mb-4">
              🍬 별사탕 +{quizResult.candy}!
            </div>
          )}
          <button
            onClick={() => {
              setQuizResult(null);
              setSelectedListId(null);
              setEntries([]);
              setView("home");
              loadLists();
            }}
            className="w-full bg-[var(--accent,#6c5ce7)] text-white py-3 rounded-xl font-bold"
          >
            돌아가기
          </button>
        </div>
      )}

      <BottomNav childId={childId} />
      <Toast message={toastMsg} />
      {showSettings && (
        <VocabSettings
          onClose={() => setShowSettings(false)}
          onToast={showToast}
        />
      )}
    </div>
  );
}
