"use client";

import { useState, useRef, useEffect } from "react";
import type { Task } from "@/lib/types";

interface TaskItemProps {
  task: Task;
  onToggle?: (task: Task) => void;
  onEdit?: (task: Task, newTitle: string) => void;
  onDelete?: (task: Task) => void;
}

export function TaskItem({ task, onToggle, onEdit, onDelete }: TaskItemProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commit() {
    const trimmed = value.trim();
    if (trimmed && trimmed !== task.title && onEdit) {
      onEdit(task, trimmed);
    } else {
      setValue(task.title);
    }
    setEditing(false);
  }

  return (
    <li
      className={`flex items-center gap-3 bg-white rounded-[14px] px-4 py-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-opacity md:px-5 md:py-[18px] md:gap-4 md:rounded-2xl ${
        task.completed ? "opacity-55" : ""
      }`}
    >
      {onToggle && (
        <button
          onClick={() => onToggle(task)}
          className={`w-7 h-7 rounded-full border-[2.5px] flex items-center justify-center shrink-0 transition-all text-sm md:w-[34px] md:h-[34px] md:text-base ${
            task.completed
              ? "bg-[var(--accent,#6c5ce7)] border-[var(--accent,#6c5ce7)] text-white"
              : "bg-white border-[var(--accent,#6c5ce7)]"
          }`}
        >
          {task.completed ? "✓" : ""}
        </button>
      )}
      {editing ? (
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
          }}
          className="flex-1 text-base md:text-lg bg-transparent border-b-2 border-[var(--accent,#6c5ce7)] outline-none py-0"
        />
      ) : (
        <span
          onClick={() => {
            setValue(task.title);
            setEditing(true);
          }}
          className={`flex-1 text-base md:text-lg ${
            task.completed ? "line-through" : ""
          }`}
        >
          {task.title}
        </span>
      )}
      {onDelete && !editing && (
        <button
          onClick={() => onDelete(task)}
          className="text-gray-400 text-sm px-1 active:text-red-500 transition-colors"
        >
          ✕
        </button>
      )}
    </li>
  );
}
