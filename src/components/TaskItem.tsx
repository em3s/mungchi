"use client";

import { useState, useCallback } from "react";
import type { Task } from "@/lib/types";

interface TaskItemProps {
  task: Task;
  onToggle?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  checkOnly?: boolean;
}

export function TaskItem({ task, onToggle, onDelete, checkOnly }: TaskItemProps) {
  const [popping, setPopping] = useState(false);

  const handleToggle = useCallback(() => {
    if (!onToggle) return;
    setPopping(true);
    onToggle(task);
  }, [onToggle, task]);

  return (
    <li
      className={`flex items-center gap-3 bg-white rounded-[14px] px-4 py-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-opacity md:px-5 md:py-[18px] md:gap-4 md:rounded-2xl ${
        task.completed && !checkOnly ? "opacity-55" : ""
      }`}
    >
      {onToggle && (
        <button
          onClick={handleToggle}
          onAnimationEnd={() => setPopping(false)}
          className={`w-7 h-7 rounded-full border-[2.5px] flex items-center justify-center shrink-0 transition-all text-sm md:w-[34px] md:h-[34px] md:text-base ${
            popping ? "animate-check-pop" : ""
          } ${
            task.completed
              ? "bg-[var(--accent,#6c5ce7)] border-[var(--accent,#6c5ce7)] text-white"
              : "bg-white border-[var(--accent,#6c5ce7)]"
          }`}
        >
          {task.completed ? "✓" : ""}
        </button>
      )}
      <span
        className={`flex-1 text-base md:text-lg ${
          task.completed && !checkOnly ? "line-through" : ""
        }`}
      >
        {task.title}
      </span>
      {onDelete && (
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
