"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { USERS } from "@/lib/constants";
import { createList } from "@/lib/vocab";

interface Props {
  showToast: (msg: string) => void;
}

export function AdminVocabSection({ showToast }: Props) {
  const [bulkVocabChildIds, setBulkVocabChildIds] = useState<string[]>(["sihyun", "misong"]);
  const [bulkVocabTitle, setBulkVocabTitle] = useState("");
  const [bulkVocabText, setBulkVocabText] = useState("");
  const [bulkVocabGenerating, setBulkVocabGenerating] = useState(false);

  return (
    <section className="bg-white rounded-2xl p-5 shadow-sm mb-4">
      <h2 className="text-lg font-bold mb-4">📖 단어장 만들기</h2>

      {/* 대상 유저 */}
      <div className="mb-4">
        <div className="flex gap-3 flex-wrap">
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

      {/* 형식 가이드 */}
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText("[단어장 제목]\napple | 사과\nbook | 책\ncat | 고양이");
          showToast("형식 복사됨!");
        }}
        className="w-full text-left bg-gray-50 border border-dashed border-gray-300 rounded-xl px-4 py-3 text-xs text-gray-500 mb-2 active:bg-gray-100 transition-colors"
      >
        <span className="font-semibold text-gray-600">📋 형식 (탭하면 복사)</span>
        <br />
        <span className="whitespace-pre-line mt-1 block font-mono">
          {`[단어장 제목]\napple | 사과\nbook | 책`}
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
        rows={6}
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

      {/* 단어장 미리보기 */}
      {(() => {
        const listName = bulkVocabTitle.trim();
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

        if (!listName && words.length === 0) return null;

        return (
          <div className="mb-3 border border-[#6c5ce7]/20 rounded-xl overflow-hidden">
            <div className="bg-[#6c5ce7]/8 px-4 py-2.5 border-b border-[#6c5ce7]/10">
              <div className="font-bold text-[#6c5ce7] text-sm">
                {listName || <span className="text-gray-300 font-normal">제목 없음</span>}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">{words.length}개 단어</div>
            </div>
            {words.length > 0 && (
              <div className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
                {words.map((w, i) => (
                  <div key={i} className="flex justify-between items-center px-4 py-2 text-sm">
                    <span className="font-medium text-gray-800">{w.word}</span>
                    <span className="text-gray-400">{w.meaning}</span>
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
  );
}
