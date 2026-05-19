"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getEntries,
  getVocabLists,
  deleteList,
  removeEntry,
  updateEntry,
  renameList,
} from "@/lib/vocab";
import { PageHeader } from "@/components/PageHeader";
import { Toast } from "@/components/Toast";
import { useToast } from "@/hooks/useToast";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PinModal } from "@/components/PinModal";
import { TopTabs } from "@/components/TopTabs";
import { speakWord, speakKorean } from "@/lib/tts";
import type { VocabEntry } from "@/lib/types";

const SESSION_KEY = "mungchi_session";

function getVoiceName(lang: "en" | "ko"): string | undefined {
  if (typeof window === "undefined") return undefined;
  return localStorage.getItem(`vocab_voice_${lang}`) || undefined;
}

export default function VocabPage() {
  const { message: toastMsg, showToast } = useToast();

  const [authed, setAuthed] = useState(false);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(SESSION_KEY) === "true") setAuthed(true);
    setSessionLoaded(true);
  }, []);

  const handlePinSuccess = useCallback(() => {
    localStorage.setItem(SESSION_KEY, "true");
    setAuthed(true);
  }, []);

  const [entries, setEntries] = useState<VocabEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editWord, setEditWord] = useState("");
  const [editMeaning, setEditMeaning] = useState("");
  const editWordRef = useRef<HTMLInputElement>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [toggles, setToggles] = useState<Record<string, [string, string]>>({});
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [menuEntryId, setMenuEntryId] = useState<string | null>(null);

  const [maskMode, setMaskMode] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const [vocabLists, setVocabLists] = useState<
    { id: string; name: string; count: number; createdAt: string }[]
  >([]);
  const [listTitle, setListTitleState] = useState("");

  const view: "home" | "list" = selectedListId ? "list" : "home";

  const loadLists = useCallback(async () => {
    const lists = await getVocabLists();
    setVocabLists(lists);
  }, []);

  const handleBackToHome = useCallback(() => {
    setSelectedListId(null);
    setEntries([]);
    setListTitleState("");
    setToggles({});
    setMenuEntryId(null);
    setMaskMode(false);
    setRevealed(new Set());
    loadLists();
  }, [loadLists]);

  const { pullDistance, refreshing, threshold } = usePullToRefresh(
    loadLists,
    view === "home",
  );

  const loadEntries = useCallback(async () => {
    if (!selectedListId) return;
    const data = await getEntries(selectedListId);
    setEntries(data);
    setLoading(false);
  }, [selectedListId]);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  useEffect(() => {
    if (!selectedListId) return;
    const saved = localStorage.getItem(`vocab_toggles_${selectedListId}`);
    setToggles(saved ? (JSON.parse(saved) as Record<string, [string, string]>) : {});
  }, [selectedListId]);

  useEffect(() => {
    if (selectedListId) loadEntries();
  }, [selectedListId, loadEntries]);

  useEffect(() => {
    function onTabReset(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail?.href === "/" && selectedListId) {
        handleBackToHome();
      }
    }
    window.addEventListener("tab-reset", onTabReset);
    return () => window.removeEventListener("tab-reset", onTabReset);
  }, [selectedListId, handleBackToHome]);

  function handleOpenList(listId: string) {
    const list = vocabLists.find((l) => l.id === listId);
    setListTitleState(list?.name ?? "");
    setSelectedListId(listId);
    setLoading(true);
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
    const ok = await renameList(selectedListId, listTitle);
    if (ok) {
      showToast("이름을 저장했어요");
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
    const ok = await updateEntry(selectedListId!, entryId, w, m);
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
    const ok = await removeEntry(selectedListId!, entryId);
    if (ok) {
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
    }
  }

  function toggleReveal(entryId: string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
  }

  if (!sessionLoaded) {
    return (
      <div className="text-center pt-[60px] text-gray-400 text-xl">
        불러오는 중...
      </div>
    );
  }

  if (!authed) {
    return (
      <PinModal
        title="뭉치 단어장"
        subtitle="비밀번호를 입력하세요"
        emoji="📖"
        onSuccess={handlePinSuccess}
      />
    );
  }

  const ptrActive = pullDistance > 0 || refreshing;

  const checkCounts = entries.reduce<[number, number]>(
    (acc, e) => {
      const t = toggles[e.id];
      if (t?.[0] === "✓") acc[0]++;
      if (t?.[1] === "✓") acc[1]++;
      return acc;
    },
    [0, 0],
  );

  return (
    <div
      className="relative max-w-[480px] mx-auto px-4 pb-20 pt-4 md:max-w-[640px] md:px-6 md:pb-24"
      style={{
        transform: ptrActive ? `translateY(${pullDistance}px)` : undefined,
        transition: refreshing || pullDistance === 0 ? "transform 0.2s ease-out" : "none",
      }}
    >
      {ptrActive && (
        <div
          className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none"
          style={{ top: -40, height: 32, width: 32 }}
        >
          <div
            className={`w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center text-base ${refreshing ? "animate-spin" : ""}`}
            style={{
              opacity: Math.min(1, pullDistance / threshold),
            }}
          >
            {refreshing ? "⟳" : pullDistance >= threshold ? "↑" : "↓"}
          </div>
        </div>
      )}
      <TopTabs />
      <PageHeader title="📖 영어 단어" />

      {view === "home" && (
        <>
          {vocabLists.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              아직 단어장이 없어요
              <br />
              <span className="text-sm">만들기 탭에서 단어장을 만들어주세요</span>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {vocabLists.map((item) => (
                <li key={item.id} className="bg-white rounded-[14px] shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                  <button
                    onClick={() => handleOpenList(item.id)}
                    className="w-full flex items-center justify-between px-4 py-3.5 active:bg-gray-50 transition-colors rounded-[14px]"
                  >
                    <div className="text-left min-w-0 flex-1">
                      <div className="font-bold text-base text-gray-800">{item.name}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.count === 0 && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            const ok = await deleteList(item.id);
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
                      <span className="text-sm text-gray-400">{item.count}개</span>
                      <span className="text-gray-300">›</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {view === "list" && (
        <>
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
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="text-xs font-semibold text-gray-500 tracking-wider">
                  단어 ({entries.length})
                  <span className="text-green-600 ml-2">✓<sub>1</sub> {checkCounts[0]}</span>
                  <span className="text-green-600 ml-2">✓<sub>2</sub> {checkCounts[1]}</span>
                </div>
                <button
                  onClick={() => {
                    setMaskMode((m) => !m);
                    setRevealed(new Set());
                  }}
                  className={`text-sm font-semibold px-3 py-1.5 rounded-xl shrink-0 ${
                    maskMode
                      ? "bg-amber-500 text-white"
                      : "bg-white border border-gray-200 text-gray-600"
                  }`}
                >
                  {maskMode ? "가리기 종료" : "🙈 뜻 가리기"}
                </button>
              </div>

              {entries.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  단어가 없어요
                </div>
              ) : (
                <ul className="flex flex-col gap-2">
                  {entries.map((entry, index) => {
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
                    const meaningRevealed = !maskMode || revealed.has(entry.id);
                    return (
                      <li
                        key={entry.id}
                        className="bg-white rounded-[14px] px-3 py-2.5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-300 w-5 text-right shrink-0">{index + 1}</span>

                          <div
                            className="flex-1 min-w-0 py-0.5 select-none cursor-pointer"
                            onPointerDown={() => startLongPress(entry.id)}
                            onPointerUp={cancelLongPress}
                            onPointerLeave={cancelLongPress}
                            onTouchMove={cancelLongPress}
                            onClick={maskMode ? () => toggleReveal(entry.id) : undefined}
                          >
                            <div className="text-sm font-semibold text-gray-800 truncate">{entry.word}</div>
                            {maskMode && !meaningRevealed ? (
                              <div className="text-sm font-semibold text-gray-300 truncate tracking-widest mt-0.5">••••••</div>
                            ) : (
                              <div
                                className={`truncate mt-0.5 ${
                                  maskMode
                                    ? "text-sm font-semibold text-gray-800"
                                    : "text-xs text-gray-400"
                                }`}
                              >
                                {entry.meaning}
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => handleSpeak(() => speakKorean(entry.meaning, 1, getVoiceName("ko")))}
                            disabled={isSpeaking}
                            className="w-7 h-7 flex items-center justify-center text-orange-400 active:text-orange-600 shrink-0 text-xs font-bold disabled:opacity-30"
                            aria-label="한국어 발음"
                          >
                            한
                          </button>

                          <button
                            onClick={() => handleSpeak(() => speakWord(entry.word, 1, getVoiceName("en")))}
                            disabled={isSpeaking}
                            className="w-7 h-7 flex items-center justify-center text-blue-400 active:text-blue-600 shrink-0 text-xs font-bold disabled:opacity-30"
                            aria-label="영어 발음"
                          >
                            영
                          </button>

                          <button
                            onClick={() => handleSpeak(() => speakWord(entry.word, 3, getVoiceName("en")))}
                            disabled={isSpeaking}
                            className="w-7 h-7 flex items-center justify-center text-blue-300 active:text-blue-500 shrink-0 text-xs font-bold disabled:opacity-30"
                            aria-label="영어 발음 3회"
                          >
                            영<sub>3</sub>
                          </button>

                          {([0, 1] as const).map((slot) => {
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

              <button
                onClick={handleBackToHome}
                className="w-full mt-4 py-3 rounded-xl text-sm font-semibold text-gray-500 bg-gray-100 active:bg-gray-200"
              >
                단어장 목록으로
              </button>
            </>
          )}
        </>
      )}

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

      <Toast message={toastMsg} />
    </div>
  );
}
