"use client";

import { useState, useEffect, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import {
  getEntries,
  getVocabLists,
  createList,
  deleteList,
  addEntry,
  removeEntry,
  updateEntry,
  toggleSpelling,
  renameList,
  saveQuizResult,
  getVocabConfig,
  getQuizStatuses,
  loadDictionary,
  getDailyWords,
  DAILY_LIST_ID,
} from "@/lib/vocab";
import { todayKST } from "@/lib/date";
import { addTransaction } from "@/lib/coins";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { WordInput } from "@/components/WordInput";
import { VocabQuiz } from "@/components/VocabQuiz";
import { Toast } from "@/components/Toast";
import { VocabSettings } from "@/components/VocabSettings";
import { useToast } from "@/hooks/useToast";
import { useFeatureGuard } from "@/hooks/useFeatureGuard";
import { useCoinBalance } from "@/hooks/useCoinBalance";
import { useLongPress } from "@/hooks/useLongPress";
import { speakWord, speakKorean, getAvailableVoices } from "@/lib/tts";
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
  const { flagsLoaded, allowed: vocabAllowed } = useFeatureGuard(childId, "vocab");

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
  const { coinsEnabled, coinBalance, setCoinBalance } = useCoinBalance(childId);
  const [showSettings, setShowSettings] = useState(false);
  const titleLongPress = useLongPress(() => setShowSettings(true));
  const [quizStatuses, setQuizStatuses] = useState<Map<string, { basic: boolean; spelling: boolean }>>(new Map());
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editWord, setEditWord] = useState("");
  const [editMeaning, setEditMeaning] = useState("");
  const editWordRef = useRef<HTMLInputElement>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // TTS 화자
  const [enVoices, setEnVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [koVoices, setKoVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [enVoiceName, setEnVoiceName] = useState("");
  const [koVoiceName, setKoVoiceName] = useState("");

  // 토글 (localStorage) — 2개, 빈값/체크
  const [toggles, setToggles] = useState<Record<string, [string, string]>>({});

  // TTS 재생 중 여부
  const [isSpeaking, setIsSpeaking] = useState(false);

  // 롱프레스 메뉴
  const [menuEntryId, setMenuEntryId] = useState<string | null>(null);

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
    if (!vocabAllowed) return;
    loadLists();
    loadDictionary();
    getVocabConfig().then(setConfig);
  }, [childId, vocabAllowed, loadLists]);

  // TTS 화자 로드
  useEffect(() => {
    getAvailableVoices().then((voices) => {
      setEnVoices(voices.filter((v) => v.lang.startsWith("en")));
      setKoVoices(voices.filter((v) => v.lang.startsWith("ko")));
      setEnVoiceName(localStorage.getItem("vocab_voice_en") ?? "");
      setKoVoiceName(localStorage.getItem("vocab_voice_ko") ?? "");
    });
  }, []);

  // 토글 로드 (리스트 변경 시)
  useEffect(() => {
    if (!selectedListId) return;
    const saved = localStorage.getItem(`vocab_toggles_${selectedListId}`);
    setToggles(saved ? (JSON.parse(saved) as Record<string, [string, string]>) : {});
  }, [selectedListId]);

  // Load entries when selectedListId changes (list view only)
  useEffect(() => {
    if (selectedListId && view === "list") loadEntries();
  }, [selectedListId, loadEntries, view]);

  if (!vocabAllowed) return null;

  const minWords = config.min_words ?? 3;

  const isDailyList = selectedListId === DAILY_LIST_ID;

  function handleOpenDaily() {
    const words = getDailyWords(childId, todayKST());
    setListTitleState("오늘의 단어장");
    setSelectedListId(DAILY_LIST_ID);
    setEntries(words);
    setView("list");
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
    setToggles({});
    setMenuEntryId(null);
    setView("home");
    loadLists();
  }

  function cycleToggle(entryId: string, slot: 0 | 1) {
    setToggles((prev) => {
      const cur = prev[entryId]?.[slot] ?? "";
      const next = cur === "✓" ? "" : "✓";
      const entry: [string, string] = [...(prev[entryId] ?? ["", ""])] as [string, string];
      entry[slot] = next;
      const updated = { ...prev, [entryId]: entry };
      if (selectedListId) localStorage.setItem(`vocab_toggles_${selectedListId}`, JSON.stringify(updated));
      return updated;
    });
  }

  function startLongPress(entryId: string) {
    longPressTimerRef.current = setTimeout(() => setMenuEntryId(entryId), 800);
  }

  function cancelLongPress() {
    clearTimeout(longPressTimerRef.current);
  }

  async function handleSpeak(fn: () => Promise<void>) {
    if (isSpeaking) return;
    setIsSpeaking(true);
    try { await fn(); } finally { setIsSpeaking(false); }
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
    } else if (result.duplicate) {
      showToast(`"${dictEntry.word}"는 이미 단어장에 있어요 (중복)`);
    } else {
      showToast("추가에 실패했어요");
    }
  }

  async function handleAddCustom(word: string, meaning: string) {
    const result = await addEntry(childId, selectedListId!, null, { word, meaning });
    if (result.ok && result.entry) {
      setEntries((prev) => [...prev, result.entry!]);
      showToast(`"${word}" 추가!`);
    } else if (result.duplicate) {
      showToast(`"${word}"는 이미 단어장에 있어요 (중복)`);
    } else {
      showToast("추가에 실패했어요");
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

  function handleStartDailyQuiz(type: VocabQuizType) {
    const words = getDailyWords(childId, todayKST());
    setSelectedListId(DAILY_LIST_ID);
    setQuizType(type);
    const quizEntries = type === "spelling" ? words.filter((e) => e.spelling) : words;
    setEntries(quizEntries);
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
    // 객관식: 완료 시 고정 보상, 스펠링: 이미 맞출 때마다 즉시 지급됨
    const candy =
      quizType === "basic"
        ? (config.basic_reward ?? 1)
        : correct; // spelling: 이미 지급 완료

    // daily list는 DB 저장 스킵 (list_id가 UUID 아님)
    if (!isDailyList) {
      await saveQuizResult(
        childId,
        selectedListId!,
        quizType,
        total,
        correct,
        candy,
      );
    }

    // 객관식만 완료 시 보상 지급 (스펠링은 onSpellingCorrect에서 즉시 지급)
    if (quizType === "basic" && candy > 0 && coinsEnabled) {
      const result = await addTransaction(
        childId,
        candy,
        "vocab_quiz",
        `객관식 퀴즈 ${correct}/${total}`,
      );
      if (result.ok) setCoinBalance(result.newBalance ?? null);
    }

    setQuizResult({ total, correct, candy });
    setView("result");
  }

  return (
    <div className="pt-2 pb-24">
      {/* Header */}
      <PageHeader
        title="📖 영어 단어"
        titleProps={titleLongPress}
        coinBalance={coinsEnabled ? coinBalance : undefined}
      />

      {/* Home View — vocab list + create new */}
      {view === "home" && (
        <>
          {/* Daily words card */}
          <div className="mb-4">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-[14px] shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
              <button
                onClick={handleOpenDaily}
                className="w-full flex items-center justify-between px-4 py-3.5 active:bg-amber-100/50 transition-colors"
              >
                <div className="text-left">
                  <div className="font-bold text-base text-amber-800">
                    🌟 오늘의 단어장
                  </div>
                  <div className="text-xs text-amber-600/70 mt-0.5">
                    매일 새로운 10개 단어
                  </div>
                </div>
                <span className="text-amber-400">›</span>
              </button>
              <div className="flex gap-2 px-4 pb-3 -mt-1">
                <button
                  onClick={() => handleStartDailyQuiz("basic")}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 active:opacity-80 bg-blue-500 text-white"
                >
                  📝 객관식 🍪{config.basic_reward ?? 1}
                </button>
                <button
                  onClick={() => handleStartDailyQuiz("spelling")}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 active:opacity-80 bg-purple-500 text-white"
                >
                  ✏️ 스펠링
                </button>
              </div>
            </div>
          </div>

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
                        {item.count === 0 && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              const ok = await deleteList(childId, item.id);
                              if (ok) {
                                showToast("단어장을 삭제했어요");
                                loadLists();
                              } else {
                                showToast("삭제에 실패했어요");
                              }
                            }}
                            className="text-xs text-red-400 px-2 py-1 rounded-lg active:bg-red-50"
                          >
                            삭제
                          </button>
                        )}
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
                          📝 객관식 {qs?.basic ? "✓" : `🍪${config.basic_reward ?? 1}`}
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
                          ✏️ 스펠링 {item.spellingCount === 0 ? "0개" : qs?.spelling ? "✓" : `🍪${item.spellingCount}`}
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
          {/* Title */}
          <div className="mb-4">
            {isDailyList ? (
              <div className="text-lg font-bold text-gray-800 px-1">🌟 오늘의 단어장</div>
            ) : (
              <input
                type="text"
                value={listTitle}
                onChange={(e) => setListTitleState(e.target.value)}
                onBlur={handleTitleSave}
                placeholder="단어장 이름"
                className="w-full text-lg font-bold text-gray-800 bg-transparent border-none outline-none placeholder:text-gray-300 px-1"
              />
            )}
          </div>

          {loading ? (
            <div className="text-center py-10 text-gray-400">
              불러오는 중...
            </div>
          ) : (
            <>
              {/* Add Form (inline) — daily에서는 숨김 */}
              {!isDailyList && showAddForm && (
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
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold text-gray-500 tracking-wider">
                      단어 ({entries.length}){!isDailyList && <> · <span className="text-purple-400">스펠링 {entries.filter((e) => e.spelling).length}</span></>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {!isDailyList && !showAddForm && (
                        <button
                          onClick={() => setShowAddForm(true)}
                          className="text-sm font-semibold px-3 py-1 rounded-xl text-white bg-[var(--accent,#6c5ce7)] ml-1"
                        >
                          + 추가
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {entries.length === 0 && !showAddForm ? (
                  <div className="text-center py-10 text-gray-400">
                    영어 단어를 추가해보세요!
                  </div>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {entries.map((entry, index) => {
                      if (!isDailyList && editingEntryId === entry.id) {
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
                          className="bg-white rounded-[14px] px-3 py-2.5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
                        >
                          <div className="flex items-center gap-1.5">
                            {/* 번호 */}
                            <span className="text-xs text-gray-300 w-5 text-right shrink-0">{index + 1}</span>

                            {/* 스펠링 체크 — 번호 바로 옆 */}
                            {!isDailyList && (
                              <button
                                onClick={async () => {
                                  const newVal = !entry.spelling;
                                  const ok = await toggleSpelling(childId, selectedListId!, entry.id, newVal);
                                  if (ok) {
                                    setEntries((prev) => prev.map((e) => e.id === entry.id ? { ...e, spelling: newVal } : e));
                                  }
                                }}
                                className={`w-7 h-7 rounded-full border-[2.5px] flex items-center justify-center shrink-0 transition-all text-sm ${
                                  entry.spelling
                                    ? "bg-[var(--accent,#6c5ce7)] border-[var(--accent,#6c5ce7)] text-white"
                                    : "bg-white border-[var(--accent,#6c5ce7)]"
                                }`}
                              >
                                {entry.spelling ? "✓" : ""}
                              </button>
                            )}

                            {/* 단어+뜻 — long press target */}
                            <div
                              className="flex-1 min-w-0 py-0.5 select-none"
                              onPointerDown={() => !isDailyList && startLongPress(entry.id)}
                              onPointerUp={cancelLongPress}
                              onPointerLeave={cancelLongPress}
                              onTouchMove={cancelLongPress}
                            >
                              <div className="text-sm font-semibold text-gray-800 truncate">{entry.word}</div>
                              <div className="text-xs text-gray-400 truncate mt-0.5">{entry.meaning}</div>
                            </div>

                            {/* 한국어 TTS */}
                            <button
                              onClick={() => handleSpeak(() => speakKorean(entry.meaning, 1, koVoiceName || undefined))}
                              disabled={isSpeaking}
                              className="w-7 h-7 flex items-center justify-center text-orange-400 active:text-orange-600 shrink-0 text-xs font-bold disabled:opacity-30"
                              aria-label="한국어 발음"
                            >
                              한
                            </button>

                            {/* 영어 TTS 1회 */}
                            <button
                              onClick={() => handleSpeak(() => speakWord(entry.word, 1, enVoiceName || undefined))}
                              disabled={isSpeaking}
                              className="w-7 h-7 flex items-center justify-center text-blue-400 active:text-blue-600 shrink-0 text-xs font-bold disabled:opacity-30"
                              aria-label="영어 발음"
                            >
                              영
                            </button>

                            {/* 영어 TTS 3회 */}
                            <button
                              onClick={() => handleSpeak(() => speakWord(entry.word, 3, enVoiceName || undefined))}
                              disabled={isSpeaking}
                              className="w-7 h-7 flex items-center justify-center text-blue-300 active:text-blue-500 shrink-0 text-xs font-bold disabled:opacity-30"
                              aria-label="영어 발음 3회"
                            >
                              영<sub>3</sub>
                            </button>

                            {/* 2개 토글 */}
                            {!isDailyList && ([0, 1] as const).map((slot) => {
                              const val = toggles[entry.id]?.[slot] ?? "";
                              return (
                                <button
                                  key={slot}
                                  onClick={() => cycleToggle(entry.id, slot)}
                                  className={`w-7 h-7 rounded-md border flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                                    val === "✓"
                                      ? "text-green-600 bg-green-50 border-green-200"
                                      : "text-gray-200 bg-gray-50 border-gray-100"
                                  }`}
                                >
                                  {val || "·"}
                                </button>
                              );
                            })}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Daily list quiz buttons */}
              {isDailyList && entries.length >= minWords && (
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => handleStartQuiz("basic")}
                    className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-1 active:opacity-80 bg-blue-500 text-white"
                  >
                    📝 객관식 🍪{config.basic_reward ?? 1}
                  </button>
                  <button
                    onClick={() => {
                      const spellingEntries = entries.filter((e) => e.spelling);
                      if (spellingEntries.length === 0) return;
                      setEntries(spellingEntries);
                      handleStartQuiz("spelling");
                    }}
                    disabled={entries.filter((e) => e.spelling).length === 0}
                    className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-1 active:opacity-80 bg-purple-500 text-white disabled:opacity-40"
                  >
                    ✏️ 스펠링
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
          onSpellingCorrect={async () => {
            if (!coinsEnabled) return;
            const result = await addTransaction(childId, 1, "vocab_quiz", "스펠링 정답 +1🍪");
            if (result.ok) setCoinBalance(result.newBalance ?? null);
          }}
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
              🍪 초코 +{quizResult.candy}!
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

      {/* 롱프레스 메뉴 */}
      {menuEntryId && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/20"
          onClick={() => setMenuEntryId(null)}
        >
          <div
            className="w-full bg-white rounded-t-2xl shadow-2xl p-4 pb-10"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const entry = entries.find((e) => e.id === menuEntryId);
              if (!entry) return null;
              return (
                <>
                  <div className="text-sm font-bold text-gray-700 mb-4 px-1">
                    {entry.word}
                    <span className="text-gray-400 font-normal ml-2">{entry.meaning}</span>
                  </div>
                  <button
                    onClick={() => { handleStartEdit(entry); setMenuEntryId(null); }}
                    className="w-full py-3.5 text-left px-4 rounded-xl active:bg-gray-50 text-gray-700 font-semibold text-sm"
                  >
                    ✏️ 수정
                  </button>
                  <button
                    onClick={() => { handleRemoveWord(menuEntryId); setMenuEntryId(null); }}
                    className="w-full py-3.5 text-left px-4 rounded-xl active:bg-red-50 text-red-500 font-semibold text-sm"
                  >
                    🗑 삭제
                  </button>
                  <button
                    onClick={() => setMenuEntryId(null)}
                    className="w-full py-3.5 text-left px-4 rounded-xl active:bg-gray-50 text-gray-400 text-sm"
                  >
                    취소
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      )}

      <BottomNav childId={childId} />
      <Toast message={toastMsg} />
      {showSettings && (
        <VocabSettings
          onClose={() => setShowSettings(false)}
          onToast={showToast}
          onVoiceChange={(en, ko) => { setEnVoiceName(en); setKoVoiceName(ko); }}
        />
      )}
    </div>
  );
}
