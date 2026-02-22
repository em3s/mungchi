"use client";

import type { BadgeInfo } from "@/lib/types";
import { GRADE_LABELS } from "@/lib/constants";

interface BadgeCardProps {
  badge: BadgeInfo;
  onClick: () => void;
}

const gradeBorderColors: Record<string, string> = {
  rare: "border-[#74b9ff]",
  epic: "border-[#a29bfe]",
  legendary: "border-[#ffeaa7]",
};

const gradeBgColors: Record<string, string> = {
  common: "bg-gray-200 text-gray-500",
  rare: "bg-[#74b9ff] text-white",
  epic: "bg-[#a29bfe] text-white",
  legendary: "bg-[#fdcb6e] text-[#d68910]",
};

export function BadgeCard({ badge, onClick }: BadgeCardProps) {
  const isEarned = badge.earned;

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl py-3.5 px-1.5 text-center shadow-[0_1px_4px_rgba(0,0,0,0.04)] relative transition-transform active:scale-95 cursor-pointer md:py-[18px] md:px-2 md:rounded-[18px] ${
        isEarned
          ? `border-2 ${gradeBorderColors[badge.grade] || "border-transparent"}`
          : "bg-gray-100 opacity-50 border-2 border-transparent"
      }`}
    >
      <div className="text-3xl md:text-4xl">
        {isEarned ? badge.emoji : "🔒"}
      </div>
      <div
        className={`text-xs font-semibold mt-1 whitespace-nowrap overflow-hidden text-ellipsis md:text-sm ${
          !isEarned ? "text-gray-400" : ""
        }`}
      >
        {isEarned ? badge.name : "???"}
      </div>
      <span
        className={`text-[0.6rem] mt-1 px-2 py-0.5 rounded-full inline-block md:text-[0.7rem] ${
          isEarned
            ? gradeBgColors[badge.grade]
            : "bg-gray-200 text-gray-400"
        }`}
      >
        {GRADE_LABELS[badge.grade]}
      </span>
      {isEarned && badge.repeatable && (
        <span className="absolute top-1.5 right-1.5 text-[0.6rem] font-bold text-white bg-[#e17055] rounded-full px-1.5 py-0.5 md:text-[0.7rem]">
          ×{badge.earnedCount}
        </span>
      )}
      {badge.hidden && isEarned && (
        <span className="absolute top-1.5 left-1.5 text-[0.5rem] font-extrabold text-white bg-gradient-to-br from-[#6c5ce7] to-[#e17055] rounded px-1 py-0.5 tracking-wider">
          SECRET
        </span>
      )}
    </div>
  );
}
