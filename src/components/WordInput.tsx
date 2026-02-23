"use client";

import { useState, useRef, useEffect } from "react";
import { searchDictionary } from "@/lib/vocab";
import type { DictionaryEntry } from "@/lib/types";

interface WordInputProps {
  onSelect: (entry: DictionaryEntry) => void;
  onCustom: (word: string, meaning: string) => void;
  onCancel: () => void;
  excludeWords: string[];
}

export function WordInput({ onSelect, onCustom, onCancel, excludeWords }: WordInputProps) {
  const [word, setWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [suggestions, setSuggestions] = useState<DictionaryEntry[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [matched, setMatched] = useState<DictionaryEntry | null>(null);
  const wordRef = useRef<HTMLInputElement>(null);
  const meaningRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    wordRef.current?.focus();
  }, []);

  function handleWordChange(value: string) {
    setWord(value);
    setMatched(null);

    if (value.trim().length < 1) {
      setSuggestions([]);
      setShowDropdown(false);
      setMeaning("");
      return;
    }

    const results = searchDictionary(value.trim(), 8);
    const filtered = results.filter((r) => !excludeWords.includes(r.word));
    setSuggestions(filtered);
    setShowDropdown(filtered.length > 0);

    // 정확히 일치하는 단어가 있으면 뜻 자동 채우기
    const exact = filtered.find((r) => r.word === value.trim().toLowerCase());
    if (exact) {
      setMeaning(exact.meaning);
      setMatched(exact);
    } else {
      setMeaning("");
    }
  }

  function handleSelectSuggestion(entry: DictionaryEntry) {
    setWord(entry.word);
    setMeaning(entry.meaning);
    setMatched(entry);
    setSuggestions([]);
    setShowDropdown(false);
    meaningRef.current?.focus();
  }

  function handleSubmit() {
    const w = word.trim();
    const m = meaning.trim();
    if (!w || !m) return;

    if (matched && matched.word === w) {
      // 사전 단어 (뜻이 수정됐을 수 있음)
      if (m === matched.meaning) {
        onSelect(matched);
      } else {
        onCustom(w, m);
      }
    } else {
      onCustom(w, m);
    }

    setWord("");
    setMeaning("");
    setMatched(null);
    setSuggestions([]);
    setShowDropdown(false);
    wordRef.current?.focus();
  }

  return (
    <div className="relative">
      <div className="bg-white rounded-[14px] px-4 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)] md:px-5 md:py-4">
        <div className="flex gap-2 items-center">
          <input
            ref={wordRef}
            type="text"
            value={word}
            onChange={(e) => handleWordChange(e.target.value)}
            placeholder="영어 단어"
            className="flex-1 text-base outline-none bg-transparent font-semibold md:text-lg"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-xl text-sm font-semibold text-gray-500 bg-gray-100 active:bg-gray-200 shrink-0"
          >
            취소
          </button>
        </div>
        <div className="flex gap-2 items-center mt-2 pt-2 border-t border-gray-100">
          <input
            ref={meaningRef}
            type="text"
            value={meaning}
            onChange={(e) => { setMeaning(e.target.value); setMatched(null); }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="뜻"
            className="flex-1 text-sm outline-none bg-transparent text-gray-600"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!word.trim() || !meaning.trim()}
            className="px-3 py-1.5 rounded-xl text-sm font-semibold text-white bg-[var(--accent,#6c5ce7)] disabled:opacity-40 active:opacity-80 shrink-0"
          >
            추가
          </button>
        </div>
      </div>

      {/* 자동완성 드롭다운 */}
      {showDropdown && (
        <div className="absolute left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 z-30 max-h-64 overflow-y-auto">
          {suggestions.map((entry) => (
            <button
              key={entry.id}
              onClick={() => handleSelectSuggestion(entry)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 active:bg-gray-100 border-b border-gray-50 last:border-0"
            >
              <div className="font-semibold text-sm text-gray-800">
                {entry.word}
              </div>
              <div className="text-xs text-gray-500">{entry.meaning}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
