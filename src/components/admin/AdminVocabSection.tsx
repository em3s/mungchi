"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { USERS } from "@/lib/constants";
import { invalidateDictionary, loadDictionary, createList } from "@/lib/vocab";
import type { DictionaryEntry } from "@/lib/types";

interface Props {
  showToast: (msg: string) => void;
}

export function AdminVocabSection({ showToast }: Props) {
  // 사전 관리
  const [dictWord, setDictWord] = useState("");
  const [dictMeaning, setDictMeaning] = useState("");
  const [dictLevel, setDictLevel] = useState(1);
  const [dictBulk, setDictBulk] = useState("");

  // 랜덤 단어장
  const [randomChildIds, setRandomChildIds] = useState<string[]>(["sihyun", "misong"]);
  const [randomCount, setRandomCount] = useState("10");
  const [randomTitle, setRandomTitle] = useState("");
  const [randomLevel, setRandomLevel] = useState<string>("all");
  const [randomGenerating, setRandomGenerating] = useState(false);
  const [randomPreview, setRandomPreview] = useState<DictionaryEntry[]>([]);

  // 벌크 단어장 생성
  const [bulkVocabChildIds, setBulkVocabChildIds] = useState<string[]>(["sihyun", "misong"]);
  const [bulkVocabTitle, setBulkVocabTitle] = useState("");
  const [bulkVocabText, setBulkVocabText] = useState("");
  const [bulkVocabGenerating, setBulkVocabGenerating] = useState(false);

  return (
    <>
      {/* === 사전 관리 === */}
      <section className="bg-white rounded-2xl p-5 shadow-sm mb-4">
        <h2 className="text-lg font-bold mb-4">📚 사전 관리</h2>

        {/* 단건 추가 */}
        <div className="mb-4">
          <label className="text-sm font-semibold text-gray-600 block mb-2">
            단어 추가
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={dictWord}
              onChange={(e) => setDictWord(e.target.value)}
              placeholder="English word"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={dictMeaning}
              onChange={(e) => setDictMeaning(e.target.value)}
              placeholder="한글 뜻"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm"
            />
            <select
              value={dictLevel}
              onChange={(e) => setDictLevel(Number(e.target.value))}
              className="border border-gray-200 rounded-xl px-2 py-2 text-sm"
            >
              <option value={1}>쉬움</option>
              <option value={2}>보통</option>
              <option value={3}>어려움</option>
            </select>
            <button
              onClick={async () => {
                if (!dictWord.trim() || !dictMeaning.trim()) return;
                const { error } = await supabase
                  .from("dictionary")
                  .upsert(
                    {
                      word: dictWord.trim().toLowerCase(),
                      meaning: dictMeaning.trim(),
                      level: dictLevel,
                    },
                    { onConflict: "word" },
                  );
                if (error) {
                  showToast("추가 실패");
                  return;
                }
                await invalidateDictionary();
                showToast(`"${dictWord.trim()}" 추가됨!`);
                setDictWord("");
                setDictMeaning("");
              }}
              disabled={!dictWord.trim() || !dictMeaning.trim()}
              className="bg-[#6c5ce7] text-white px-3 py-2 rounded-xl text-sm font-semibold disabled:opacity-40"
            >
              +
            </button>
          </div>
        </div>

        {/* 벌크 추가 */}
        <div>
          <label className="text-sm font-semibold text-gray-600 block mb-2">
            벌크 추가 (한 줄에: 영어단어 | 한글뜻)
          </label>

          {/* 프롬프트 예시 — 클릭하면 복사 */}
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText("apple | 사과\nbook | 책\ncat | 고양이");
              showToast("형식 복사됨!");
            }}
            className="w-full text-left bg-gray-50 border border-dashed border-gray-300 rounded-xl px-4 py-3 text-xs text-gray-500 mb-2 active:bg-gray-100 transition-colors"
          >
            <span className="font-semibold text-gray-600">📋 형식 (탭하면 복사)</span>
            <br />
            <span className="whitespace-pre-line mt-1 block font-mono">
              {`apple | 사과\nbook | 책\ncat | 고양이`}
            </span>
          </button>

          <textarea
            value={dictBulk}
            onChange={(e) => setDictBulk(e.target.value)}
            placeholder={"apple | 사과\nbook | 책\ncat | 고양이"}
            rows={5}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none mb-2"
          />

          {/* 실시간 파싱 미리보기 */}
          {dictBulk.trim() && (() => {
            const bulkLines = dictBulk.split("\n").map((l) => l.trim()).filter(Boolean);
            const parsed = bulkLines.map((line) => {
              const parts = line.split("|");
              if (parts.length < 2) return { line, ok: false } as const;
              const word = parts[0].trim().toLowerCase();
              const meaning = parts.slice(1).join("|").trim();
              return word && meaning
                ? { line, ok: true, word, meaning } as const
                : { line, ok: false } as const;
            });
            const valid = parsed.filter((p) => p.ok);
            const errors = parsed.filter((p) => !p.ok);
            return (
              <div className="mb-2 text-xs">
                <div className="flex gap-3 mb-1">
                  <span className="text-green-600 font-semibold">✓ {valid.length}개</span>
                  {errors.length > 0 && (
                    <span className="text-red-500 font-semibold">✗ {errors.length}개 오류</span>
                  )}
                </div>
                {errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-1">
                    {errors.map((e, i) => (
                      <div key={i} className="text-red-500">⚠ {e.line}</div>
                    ))}
                  </div>
                )}
                {valid.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 max-h-32 overflow-y-auto">
                    {valid.map((v, i) => v.ok && (
                      <div key={i} className="text-green-700">
                        <span className="font-medium">{v.word}</span>
                        <span className="text-green-500 mx-1">→</span>
                        {v.meaning}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          <button
            onClick={async () => {
              const bulkLines = dictBulk
                .split("\n")
                .map((l) => l.trim())
                .filter(Boolean);
              const rows = bulkLines
                .map((line) => {
                  const parts = line.split("|");
                  if (parts.length < 2) return null;
                  const word = parts[0].trim().toLowerCase();
                  const meaning = parts.slice(1).join("|").trim();
                  return word && meaning
                    ? { word, meaning, level: 1 }
                    : null;
                })
                .filter(
                  (r): r is { word: string; meaning: string; level: number } =>
                    r !== null,
                );
              if (rows.length === 0) return;
              const { error } = await supabase
                .from("dictionary")
                .upsert(rows, { onConflict: "word" });
              if (error) {
                showToast("벌크 추가 실패");
                return;
              }
              invalidateDictionary();
              showToast(`${rows.length}개 단어 추가됨!`);
              setDictBulk("");
            }}
            disabled={!dictBulk.trim()}
            className="w-full bg-[#6c5ce7] text-white py-3 rounded-xl font-bold text-base disabled:opacity-40"
          >
            벌크 추가
          </button>
        </div>
      </section>

      {/* === 랜덤 단어장 생성 === */}
      <section className="bg-white rounded-2xl p-5 shadow-sm mb-4">
        <h2 className="text-lg font-bold mb-4">🎲 랜덤 단어장 생성</h2>

        {/* 대상 아이 */}
        <div className="mb-4">
          <label className="text-sm font-semibold text-gray-600 block mb-2">대상 아이</label>
          <div className="flex gap-3">
            {USERS.map((child) => (
              <button
                key={child.id}
                onClick={() =>
                  setRandomChildIds((prev) =>
                    prev.includes(child.id)
                      ? prev.filter((c) => c !== child.id)
                      : [...prev, child.id],
                  )
                }
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  randomChildIds.includes(child.id)
                    ? "bg-[#6c5ce7] text-white shadow-md"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                <span>{child.emoji}</span>
                <span>{child.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 단어장 이름 + 단어 수 + 레벨 */}
        <div className="mb-4">
          <label className="text-sm font-semibold text-gray-600 block mb-1">단어장 이름</label>
          <input
            type="text"
            value={randomTitle}
            onChange={(e) => setRandomTitle(e.target.value)}
            placeholder="예: 동물 단어, 3월 1주차"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
          />
        </div>
        <div className="flex gap-2 mb-4">
          <div className="w-24">
            <label className="text-sm font-semibold text-gray-600 block mb-1">단어 수</label>
            <input
              type="number"
              value={randomCount}
              onChange={(e) => { setRandomCount(e.target.value); setRandomPreview([]); }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-center"
            />
          </div>
          <div className="w-24">
            <label className="text-sm font-semibold text-gray-600 block mb-1">난이도</label>
            <select
              value={randomLevel}
              onChange={(e) => { setRandomLevel(e.target.value); setRandomPreview([]); }}
              className="w-full border border-gray-200 rounded-xl px-2 py-2 text-sm"
            >
              <option value="all">전체</option>
              <option value="1">쉬움</option>
              <option value="2">보통</option>
              <option value="3">어려움</option>
            </select>
          </div>
        </div>

        {/* 미리보기 */}
        {randomPreview.length > 0 && (
          <div className="mb-4 bg-gray-50 rounded-xl p-3 max-h-48 overflow-y-auto">
            <div className="text-xs text-gray-500 mb-2">{randomPreview.length}개 단어 미리보기:</div>
            <div className="flex flex-col gap-1">
              {randomPreview.map((entry) => (
                <div key={entry.id} className="flex justify-between text-sm">
                  <span className="font-semibold text-gray-700">{entry.word}</span>
                  <span className="text-gray-500">{entry.meaning}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 버튼 */}
        <div className="flex gap-2">
          <button
            onClick={async () => {
              const count = parseInt(randomCount);
              if (!count || count <= 0) return;
              const dict = await loadDictionary();
              let pool = dict;
              if (randomLevel !== "all") {
                pool = dict.filter((e) => e.level === parseInt(randomLevel));
              }
              const shuffled = [...pool].sort(() => Math.random() - 0.5);
              setRandomPreview(shuffled.slice(0, count));
            }}
            disabled={!randomCount || parseInt(randomCount) <= 0}
            className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold text-sm active:bg-gray-200 disabled:opacity-40"
          >
            미리보기
          </button>
          <button
            onClick={async () => {
              const listName = randomTitle.trim();
              if (randomPreview.length === 0 || randomChildIds.length === 0 || !listName) return;
              setRandomGenerating(true);
              try {
                let created = 0;
                for (const childId of randomChildIds) {
                  const { ok, listId } = await createList(childId, listName);
                  if (!ok || !listId) continue;

                  const rows = randomPreview.map((e) => ({
                    user_id: childId,
                    list_id: listId,
                    dictionary_id: e.id,
                    word: e.word,
                    meaning: e.meaning,
                  }));
                  const { error } = await supabase.from("vocab_entries").insert(rows);
                  if (error) throw error;
                  created += randomPreview.length;
                }

                const names = randomChildIds
                  .map((id) => USERS.find((u) => u.id === id)?.name)
                  .join(", ");
                showToast(`${names}에게 ${created}개 랜덤 단어 추가!`);
                setRandomPreview([]);
              } catch {
                showToast("생성 실패");
              } finally {
                setRandomGenerating(false);
              }
            }}
            disabled={randomPreview.length === 0 || randomChildIds.length === 0 || !randomTitle.trim() || randomGenerating}
            className="flex-1 bg-[#6c5ce7] text-white py-3 rounded-xl font-bold text-sm disabled:opacity-40 active:opacity-80"
          >
            {randomGenerating ? "생성 중..." : "만들기"}
          </button>
        </div>
      </section>

      {/* === 벌크 단어장 생성 === */}
      <section className="bg-white rounded-2xl p-5 shadow-sm mb-4">
        {bulkVocabTitle && (
          <div className="text-2xl font-black text-gray-800 mb-4">{bulkVocabTitle}</div>
        )}

        {/* 대상 유저 */}
        <div className="mb-4">
          <div className="flex gap-3">
            {USERS.map((child) => (
              <button
                key={child.id}
                onClick={() =>
                  setBulkVocabChildIds((prev) =>
                    prev.includes(child.id)
                      ? prev.filter((c) => c !== child.id)
                      : [...prev, child.id],
                  )
                }
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  bulkVocabChildIds.includes(child.id)
                    ? "bg-[#6c5ce7] text-white shadow-md"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                <span>{child.emoji}</span>
                <span>{child.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 형식 가이드 — 클릭하면 복사 */}
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText("apple | 사과\nbook | 책\ncat | 고양이");
            showToast("형식 복사됨!");
          }}
          className="w-full text-left bg-gray-50 border border-dashed border-gray-300 rounded-xl px-4 py-3 text-xs text-gray-500 mb-2 active:bg-gray-100 transition-colors"
        >
          <span className="font-semibold text-gray-600">📋 형식 (탭하면 복사)</span>
          <br />
          <span className="whitespace-pre-line mt-1 block font-mono">
            {`apple | 사과\nbook | 책\ncat | 고양이`}
          </span>
        </button>

        <textarea
          value={bulkVocabText}
          onChange={(e) => {
            const text = e.target.value;
            const firstLine = text.split("\n")[0].trim();
            const titleMatch = firstLine.match(/^\[(.+)\]$/);
            if (titleMatch) {
              setBulkVocabTitle(titleMatch[1]);
              setBulkVocabText(text.split("\n").slice(1).join("\n").trimStart());
            } else {
              setBulkVocabText(text);
            }
          }}
          placeholder={"[단어장 제목]\napple | 사과\nbook | 책"}
          rows={5}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none mb-2"
        />

        {/* 실시간 파싱 미리보기 */}
        {bulkVocabText.trim() && (() => {
          const textLines = bulkVocabText.split("\n").map((l) => l.trim()).filter(Boolean);
          const parsed = textLines.map((line) => {
            const parts = line.split("|");
            if (parts.length < 2) return { line, ok: false } as const;
            const word = parts[0].trim().toLowerCase();
            const meaning = parts.slice(1).join("|").trim();
            return word && meaning
              ? { line, ok: true, word, meaning } as const
              : { line, ok: false } as const;
          });
          const valid = parsed.filter((p) => p.ok);
          const errors = parsed.filter((p) => !p.ok);
          return (
            <div className="mb-2 text-xs">
              <div className="flex gap-3 mb-1">
                <span className="text-green-600 font-semibold">✓ {valid.length}개</span>
                {errors.length > 0 && (
                  <span className="text-red-500 font-semibold">✗ {errors.length}개 오류</span>
                )}
              </div>
              {errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-1">
                  {errors.map((e, i) => (
                    <div key={i} className="text-red-500">⚠ {e.line}</div>
                  ))}
                </div>
              )}
              {valid.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 max-h-32 overflow-y-auto">
                  {valid.map((v, i) => v.ok && (
                    <div key={i} className="text-green-700">
                      <span className="font-medium">{v.word}</span>
                      <span className="text-green-500 mx-1">→</span>
                      {v.meaning}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        <button
          onClick={async () => {
            const listName = bulkVocabTitle.trim();
            if (!listName || bulkVocabChildIds.length === 0 || !bulkVocabText.trim()) return;

            const textLines = bulkVocabText.split("\n").map((l) => l.trim()).filter(Boolean);
            const words = textLines
              .map((line) => {
                const parts = line.split("|");
                if (parts.length < 2) return null;
                const word = parts[0].trim().toLowerCase();
                const meaning = parts.slice(1).join("|").trim();
                return word && meaning ? { word, meaning } : null;
              })
              .filter((r): r is { word: string; meaning: string } => r !== null);
            if (words.length === 0) return;

            setBulkVocabGenerating(true);
            try {
              let totalCreated = 0;
              for (const childId of bulkVocabChildIds) {
                // 기존 단어장 이름 매칭 → 있으면 기존에 추가, 없으면 신규 생성
                const { data: existing } = await supabase
                  .from("vocab_list_meta")
                  .select("id")
                  .eq("user_id", childId)
                  .eq("name", listName)
                  .maybeSingle();

                let listId: string;
                if (existing?.id) {
                  listId = existing.id;
                } else {
                  const { ok, listId: newId } = await createList(childId, listName);
                  if (!ok || !newId) continue;
                  listId = newId;
                }

                const rows = words.map((w) => ({
                  user_id: childId,
                  list_id: listId,
                  word: w.word,
                  meaning: w.meaning,
                }));
                const { error } = await supabase.from("vocab_entries").insert(rows);
                if (error) throw error;
                totalCreated += words.length;
              }

              const names = bulkVocabChildIds
                .map((id) => USERS.find((u) => u.id === id)?.name)
                .join(", ");
              showToast(`${names}에게 "${listName}" ${totalCreated}개 단어 추가!`);
              setBulkVocabText("");
              setBulkVocabTitle("");
            } catch {
              showToast("생성 실패");
            } finally {
              setBulkVocabGenerating(false);
            }
          }}
          disabled={!bulkVocabTitle.trim() || bulkVocabChildIds.length === 0 || !bulkVocabText.trim() || bulkVocabGenerating}
          className="w-full bg-[#6c5ce7] text-white py-3 rounded-xl font-bold text-base disabled:opacity-40"
        >
          {bulkVocabGenerating ? "생성 중..." : "단어장 만들기"}
        </button>
      </section>
    </>
  );
}
