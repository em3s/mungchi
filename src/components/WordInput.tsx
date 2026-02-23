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
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<DictionaryEntry[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customMeaning, setCustomMeaning] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const meaningRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (customMode) meaningRef.current?.focus();
  }, [customMode]);

  function handleChange(value: string) {
    setQuery(value);
    setCustomMode(false);
    setCustomMeaning("");

    if (value.trim().length < 1) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const results = searchDictionary(value.trim(), 8);
    const filtered = results.filter((r) => !excludeWords.includes(r.word));
    setSuggestions(filtered);
    setShowDropdown(filtered.length > 0);
  }

  function handleSelect(entry: DictionaryEntry) {
    onSelect(entry);
    setQuery("");
    setSuggestions([]);
    setShowDropdown(false);
    setCustomMode(false);
    setCustomMeaning("");
    inputRef.current?.focus();
  }

  function handleCustomMode() {
    setShowDropdown(false);
    setCustomMode(true);
  }

  function handleCustomSubmit() {
    const word = query.trim();
    const meaning = customMeaning.trim();
    if (!word || !meaning) return;
    onCustom(word, meaning);
    setQuery("");
    setCustomMeaning("");
    setCustomMode(false);
    setSuggestions([]);
    inputRef.current?.focus();
  }

  const trimmed = query.trim();
  const showCustomButton = trimmed.length >= 1 && !customMode;

  return (
    <div className="relative">
      <div className="flex gap-2 bg-white rounded-[14px] px-4 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)] md:px-5 md:py-4">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="영어 단어를 입력하세요"
          className="flex-1 text-base outline-none bg-transparent md:text-lg"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-xl text-sm font-semibold text-gray-500 bg-gray-100 active:bg-gray-200"
        >
          취소
        </button>
      </div>

      {/* 직접 입력 모드: 뜻 입력 */}
      {customMode && (
        <div className="flex gap-2 mt-2 bg-white rounded-[14px] px-4 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
          <input
            ref={meaningRef}
            type="text"
            value={customMeaning}
            onChange={(e) => setCustomMeaning(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCustomSubmit()}
            placeholder="뜻을 입력하세요"
            className="flex-1 text-base outline-none bg-transparent"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={handleCustomSubmit}
            disabled={!customMeaning.trim()}
            className="px-3 py-1.5 rounded-xl text-sm font-semibold text-white bg-[var(--accent,#6c5ce7)] disabled:opacity-40 active:opacity-80"
          >
            추가
          </button>
        </div>
      )}

      {/* 자동완성 드롭다운 */}
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 z-30 max-h-64 overflow-y-auto">
          {suggestions.map((entry) => (
            <button
              key={entry.id}
              onClick={() => handleSelect(entry)}
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

      {/* 직접 입력 버튼 */}
      {showCustomButton && (
        <button
          onClick={handleCustomMode}
          className="w-full mt-1 text-left px-4 py-2.5 text-sm text-gray-400 active:text-gray-600"
        >
          &quot;{trimmed}&quot; 직접 입력하기 →
        </button>
      )}
    </div>
  );
}
