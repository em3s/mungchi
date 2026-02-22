"use client";

import type { BadgeInfo } from "@/lib/types";
import { GRADE_LABELS } from "@/lib/constants";

interface BadgeModalProps {
  badge: BadgeInfo;
  onClose: () => void;
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

export function BadgeModal({ badge, onClose }: BadgeModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[999] animate-fade-in"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-3xl p-8 text-center w-[280px] max-w-[85vw] animate-pop-in border-[3px] md:w-[360px] md:p-10 ${
          badge.earned
            ? gradeBorderColors[badge.grade] || "border-gray-200"
            : "border-gray-200"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-6xl mb-2 md:text-7xl">
          {badge.earned ? badge.emoji : "🔒"}
        </div>
        <div className="text-xl font-extrabold mb-1.5 md:text-2xl">
          {badge.earned ? badge.name : "???"}
        </div>
        <span
          className={`text-xs px-2.5 py-0.5 rounded-full inline-block md:text-sm ${
            badge.earned
              ? gradeBgColors[badge.grade]
              : "bg-gray-200 text-gray-400"
          }`}
        >
          {GRADE_LABELS[badge.grade]}
        </span>
        <div
          className={`text-sm mt-4 leading-relaxed break-keep md:text-base ${
            badge.earned
              ? "text-gray-500"
              : "text-[#e17055] font-semibold"
          }`}
        >
          {badge.earned ? badge.description : badge.hint}
        </div>
        {badge.hidden && badge.earned && (
          <div className="text-sm text-[#6c5ce7] font-bold mt-3">
            🤫 히든 뱃지 발견!
          </div>
        )}
        <div className="text-xs text-gray-400 mt-3">
          {badge.repeatable
            ? `🔄 반복 획득 가능${badge.earned ? ` · ${badge.earnedCount}회 달성` : ""}`
            : `🏅 1회 한정 뱃지${badge.earned ? " · 획득 완료!" : ""}`}
        </div>
        <button
          className="mt-5 px-8 py-2.5 bg-gray-100 rounded-xl text-sm font-semibold text-gray-500 active:bg-gray-200 md:text-base md:px-10 md:py-3"
          onClick={onClose}
        >
          닫기
        </button>
      </div>
    </div>
  );
}
