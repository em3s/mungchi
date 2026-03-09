"use client";

import { useState } from "react";

interface TaskFormProps {
  onSubmit: (title: string) => void;
  onSubmitMultiple?: (titles: string[]) => void;
  onCancel: () => void;
  presets?: string[];
}

// 텍스트 해시 기반 고정 chip 색상
const CHIP_COLORS = [
  "bg-violet-100 text-violet-700 active:bg-violet-200",
  "bg-blue-100 text-blue-700 active:bg-blue-200",
  "bg-emerald-100 text-emerald-700 active:bg-emerald-200",
  "bg-amber-100 text-amber-700 active:bg-amber-200",
  "bg-rose-100 text-rose-700 active:bg-rose-200",
  "bg-cyan-100 text-cyan-700 active:bg-cyan-200",
  "bg-orange-100 text-orange-700 active:bg-orange-200",
  "bg-pink-100 text-pink-700 active:bg-pink-200",
  "bg-teal-100 text-teal-700 active:bg-teal-200",
  "bg-indigo-100 text-indigo-700 active:bg-indigo-200",
];

function chipColor(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CHIP_COLORS[Math.abs(hash) % CHIP_COLORS.length];
}

export function TaskForm({ onSubmit, onSubmitMultiple, onCancel, presets }: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [multiMode, setMultiMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setTitle("");
  }

  function toggleSelect(preset: string) {
    setSelected((prev) =>
      prev.includes(preset) ? prev.filter((p) => p !== preset) : [...prev, preset]
    );
  }

  function handleMultiSubmit() {
    if (selected.length === 0) return;
    onSubmitMultiple?.(selected);
    setSelected([]);
    setMultiMode(false);
  }

  function exitMultiMode() {
    setMultiMode(false);
    setSelected([]);
  }

  return (
    <div className="bg-white rounded-[14px] px-4 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)] md:px-5 md:py-4">
      {/* 프리셋 chips */}
      {presets && presets.length > 0 && (
        <>
          <div className="flex gap-2 overflow-x-auto pb-2 mb-2 -mx-1 px-1 scrollbar-hide">
            {presets.map((preset) => {
              const base = chipColor(preset);
              const isSelected = selected.includes(preset);
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => multiMode ? toggleSelect(preset) : onSubmit(preset)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    multiMode
                      ? isSelected
                        ? "ring-2 ring-offset-1 ring-gray-400 scale-95 " + base
                        : base + " opacity-60"
                      : base
                  }`}
                >
                  {multiMode && isSelected && <span className="mr-1">✓</span>}
                  {preset}
                </button>
              );
            })}
          </div>

          {/* 멀티 모드 액션 */}
          {multiMode ? (
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={handleMultiSubmit}
                disabled={selected.length === 0}
                className="flex-1 py-1.5 rounded-xl text-sm font-semibold text-white bg-[var(--accent,#6c5ce7)] disabled:opacity-40 active:opacity-80"
              >
                {selected.length > 0 ? `${selected.length}개 추가` : "선택하세요"}
              </button>
              <button
                type="button"
                onClick={exitMultiMode}
                className="px-4 py-1.5 rounded-xl text-sm font-semibold text-gray-500 bg-gray-100 active:bg-gray-200"
              >
                취소
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setMultiMode(true)}
              className="w-full mb-2 py-1.5 rounded-xl text-xs font-semibold text-gray-400 bg-gray-50 active:bg-gray-100"
            >
              한번에 추가
            </button>
          )}
        </>
      )}

      {/* 입력 폼 */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="할일을 입력하세요"
          className="flex-1 text-base outline-none bg-transparent md:text-lg"
          autoFocus
        />
        <button
          type="submit"
          disabled={!title.trim()}
          className="px-4 py-1.5 rounded-xl text-sm font-semibold text-white bg-[var(--accent,#6c5ce7)] disabled:opacity-40 active:opacity-80 transition-opacity"
        >
          추가
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-xl text-sm font-semibold text-gray-500 bg-gray-100 active:bg-gray-200"
        >
          취소
        </button>
      </form>
    </div>
  );
}
