"use client";

import { useState } from "react";

interface TaskFormProps {
  onSubmit: (title: string) => void;
  onCancel: () => void;
}

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

export function chipColor(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CHIP_COLORS[Math.abs(hash) % CHIP_COLORS.length];
}

export function TaskForm({ onSubmit, onCancel }: TaskFormProps) {
  const [title, setTitle] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setTitle("");
  }

  return (
    <div className="bg-white rounded-[14px] px-4 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)] md:px-5 md:py-4">
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
