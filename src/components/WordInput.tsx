"use client";

import { useState, useRef, useEffect } from "react";
import { searchDictionary } from "@/lib/vocab";
import type { DictionaryEntry } from "@/lib/types";

interface WordInputProps {
  onSelect: (entry: DictionaryEntry) => void;
  onCancel: () => void;
  excludeWords: string[];
}

export function WordInput({ onSelect, onCancel, excludeWords }: WordInputProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<DictionaryEntry[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 1) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const results = await searchDictionary(value.trim(), 8);
      const filtered = results.filter((r) => !excludeWords.includes(r.word));
      setSuggestions(filtered);
      setShowDropdown(filtered.length > 0);
      setLoading(false);
    }, 250);
  }

  function handleSelect(entry: DictionaryEntry) {
    onSelect(entry);
    setQuery("");
    setSuggestions([]);
    setShowDropdown(false);
    inputRef.current?.focus();
  }

  return (
    <div className="relative">
      <div className="flex gap-2 bg-white rounded-[14px] px-4 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="영어 단어를 입력하세요"
          className="flex-1 text-base outline-none bg-transparent"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-xl text-sm font-semibold text-gray-500 bg-gray-100"
        >
          닫기
        </button>
      </div>

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

      {loading && query.trim().length > 0 && !showDropdown && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 z-30 px-4 py-3 text-sm text-gray-400">
          검색 중...
        </div>
      )}
    </div>
  );
}
