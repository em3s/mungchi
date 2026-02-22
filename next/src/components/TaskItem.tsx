"use client";

import type { Task } from "@/lib/types";

interface TaskItemProps {
  task: Task;
  onToggle: (task: Task) => void;
  onDelete?: (task: Task) => void;
}

export function TaskItem({ task, onToggle, onDelete }: TaskItemProps) {
  return (
    <li
      className={`flex items-center gap-3 bg-white rounded-[14px] px-4 py-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-opacity md:px-5 md:py-[18px] md:gap-4 md:rounded-2xl ${
        task.completed ? "opacity-55" : ""
      }`}
    >
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
      <span
        className={`flex-1 text-base md:text-lg ${
          task.completed ? "line-through" : ""
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
