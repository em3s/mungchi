"use client";

import type { Milestone } from "@/lib/types";

interface MapNodeProps {
  milestone: Milestone;
  isLast: boolean;
}

export function MapNode({ milestone, isLast }: MapNodeProps) {
  return (
    <>
      <div
        className={`flex items-center gap-3 py-3 px-5 w-full relative md:gap-4 md:py-4 md:px-6`}
      >
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl shrink-0 border-[3px] transition-all md:w-14 md:h-14 md:text-3xl ${
            milestone.current
              ? "bg-[var(--accent,#6c5ce7)] border-[var(--accent,#6c5ce7)] shadow-[0_0_12px_rgba(108,92,231,0.4)] animate-pulse-glow"
              : milestone.unlocked
                ? "bg-white border-[var(--accent,#6c5ce7)]"
                : "bg-gray-200 text-gray-400 border-gray-200"
          }`}
        >
          {milestone.emoji}
        </div>
        <div>
          <div
            className={`font-semibold text-sm md:text-base ${
              milestone.unlocked ? "text-gray-800" : "text-gray-400"
            }`}
          >
            {milestone.label}
          </div>
          <div className="text-xs text-gray-400 md:text-sm">
            {milestone.required}개 필요
          </div>
        </div>
      </div>
      {!isLast && (
        <div
          className={`w-[3px] h-5 mx-auto md:h-6 ${
            milestone.unlocked
              ? "bg-[var(--accent,#6c5ce7)]"
              : "bg-gray-200"
          }`}
        />
      )}
    </>
  );
}
