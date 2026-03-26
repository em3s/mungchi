"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { USERS } from "@/lib/constants";
import { createList } from "@/lib/vocab";

interface Props {
  showToast: (msg: string) => void;
}

function parseVocabText(raw: string): {
  title: string;
  words: { word: string; meaning: string }[];
  errors: string[];
} {
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  let title = "";
  let wordLines = lines;

  const firstMatch = lines[0]?.match(/^\[(.+)\]$/);
  if (firstMatch) {
    title = firstMatch[1];
    wordLines = lines.slice(1);
  }

  const words: { word: string; meaning: string }[] = [];
  const errors: string[] = [];
  for (const line of wordLines) {
    const parts = line.split("|");
    if (parts.length < 2) { errors.push(line); continue; }
    const word = parts[0].trim().toLowerCase();
    const meaning = parts.slice(1).join("|").trim();
    if (word && meaning) words.push({ word, meaning });
    else errors.push(line);
  }

  return { title, words, errors };
}

export function AdminVocabSection({ showToast }: Props) {
  const [childIds, setChildIds] = useState<string[]>(["sihyun", "misong"]);
  const [rawText, setRawText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [extracting, setExtracting] = useState(false);

  async function handleImageExtract(file: File) {
    setExtracting(true);
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);

      const res = await fetch("/api/extract-vocab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: file.type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "API 오류");
      setRawText(data.text.trim());
      showToast("단어 추출 완료! 확인 후 단어장 만들기를 눌러주세요.");
    } catch (e) {
      showToast(`추출 실패: ${e instanceof Error ? e.message : "다시 시도해주세요"}`);
    } finally {
      setExtracting(false);
    }
  }

  const { title, words, errors } = parseVocabText(rawText);
  const canSubmit = title.trim() !== "" && words.length > 0 && childIds.length > 0;

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
                setChildIds((prev) =>
                  prev.includes(child.id)
                    ? prev.filter((c) => c !== child.id)
                    : [...prev, child.id],
                )
              }
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                childIds.includes(child.id)
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

      {/* 이미지 추출 */}
      <label className={`flex items-center justify-center gap-2 w-full py-3 mb-3 rounded-xl border-2 border-dashed font-semibold text-sm cursor-pointer transition-all ${extracting ? "border-gray-200 text-gray-300 bg-gray-50" : "border-[#6c5ce7]/40 text-[#6c5ce7] bg-[#6c5ce7]/5 active:bg-[#6c5ce7]/10"}`}>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={extracting}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageExtract(file);
            e.target.value = "";
          }}
        />
        {extracting ? "🔍 추출 중..." : "📷 시험지 사진으로 추출"}
      </label>

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
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        placeholder={"[단어장 제목]\napple | 사과\nbook | 책"}
        rows={6}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none mb-2"
      />

      {/* 오류 표시 */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-2 text-xs">
          <div className="text-red-500 font-semibold mb-1">✗ {errors.length}개 오류</div>
          {errors.map((e, i) => (
            <div key={i} className="text-red-400">⚠ {e}</div>
          ))}
        </div>
      )}

      {/* 미리보기 카드 */}
      {(title || words.length > 0) && (
        <div className="mb-3 border border-[#6c5ce7]/20 rounded-xl overflow-hidden">
          <div className="bg-[#6c5ce7]/8 px-4 py-2.5 border-b border-[#6c5ce7]/10">
            <div className="font-bold text-[#6c5ce7] text-sm">
              {title || <span className="text-gray-300 font-normal">제목 없음</span>}
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
      )}

      <button
        onClick={async () => {
          if (!canSubmit) return;
          setGenerating(true);
          try {
            let totalCreated = 0;
            for (const childId of childIds) {
              const { data: existing } = await supabase
                .from("vocab_list_meta")
                .select("id")
                .eq("user_id", childId)
                .eq("name", title)
                .maybeSingle();

              let listId: string;
              if (existing?.id) {
                listId = existing.id;
              } else {
                const { ok, listId: newId } = await createList(childId, title);
                if (!ok || !newId) continue;
                listId = newId;
              }

              const baseTime = Date.now();
              const rows = words.map((w, i) => ({
                user_id: childId,
                list_id: listId,
                word: w.word,
                meaning: w.meaning,
                created_at: new Date(baseTime + i).toISOString(),
              }));
              const { error } = await supabase.from("vocab_entries").insert(rows);
              if (error) throw error;
              totalCreated += words.length;
            }

            const names = childIds.map((id) => USERS.find((u) => u.id === id)?.name).join(", ");
            showToast(`${names}에게 "${title}" ${totalCreated}개 단어 추가!`);
            setRawText("");
          } catch {
            showToast("생성 실패");
          } finally {
            setGenerating(false);
          }
        }}
        disabled={!canSubmit || generating}
        className="w-full bg-[#6c5ce7] text-white py-3 rounded-xl font-bold text-base disabled:opacity-40"
      >
        {generating ? "생성 중..." : "단어장 만들기"}
      </button>
    </section>
  );
}
