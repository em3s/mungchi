"use client";

import { useState } from "react";

interface TaskFormProps {
  onSubmit: (title: string) => void;
  onCancel: () => void;
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
    <form
      onSubmit={handleSubmit}
      className="flex gap-2 bg-white rounded-[14px] px-4 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)] md:px-5 md:py-4"
    >
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
  );
}
