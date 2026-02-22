"use client";

import { WEEKDAYS, getDaysInMonth, getFirstDayOfWeek } from "@/lib/date";
import type { MonthDays } from "@/lib/types";

interface CalendarProps {
  year: number;
  month: number;
  monthData: MonthDays | null;
  today: string;
  selectedDate: string | null;
  onDateClick: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onGoToday: () => void;
}

function getRateClass(rate: number): string {
  if (rate >= 1) return "bg-[var(--accent,#6c5ce7)]";
  if (rate >= 0.5) return "bg-[var(--accent-light,#a29bfe)]";
  if (rate > 0) return "bg-[var(--accent-light,#a29bfe)] opacity-50";
  return "bg-gray-200";
}

export function Calendar({
  year,
  month,
  monthData,
  today,
  selectedDate,
  onDateClick,
  onPrevMonth,
  onNextMonth,
  onGoToday,
}: CalendarProps) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const days = monthData ?? {};

  const cells: ({ day: number; date: string; data: { rate: number } | null } | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dayInfo = days[dateStr];
    cells.push({ day: d, date: dateStr, data: dayInfo || null });
  }

  return (
    <div>
      {/* Nav */}
      <div className="flex items-center justify-center gap-4 my-2 mb-4 md:gap-5 md:my-3 md:mb-5">
        <button
          className="text-xl px-3 py-2 rounded-xl text-[var(--accent,#6c5ce7)] font-bold active:bg-black/5 md:text-2xl md:px-4 md:py-2.5"
          onClick={onPrevMonth}
        >
          ←
        </button>
        <span className="text-lg font-bold md:text-xl">
          {year}년 {month + 1}월
        </span>
        <button
          className="text-xl px-3 py-2 rounded-xl text-[var(--accent,#6c5ce7)] font-bold active:bg-black/5 md:text-2xl md:px-4 md:py-2.5"
          onClick={onNextMonth}
        >
          →
        </button>
        <button
          className="text-xs font-bold px-3 py-1 rounded-[14px] text-white bg-[var(--accent,#6c5ce7)] active:opacity-80 ml-1 md:text-sm md:px-4 md:py-1.5"
          onClick={onGoToday}
        >
          오늘
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className={`text-center text-xs font-semibold py-1 md:text-sm md:py-1.5 ${
              w === "일"
                ? "text-[#e17055]"
                : w === "토"
                  ? "text-[#0984e3]"
                  : "text-gray-500"
            }`}
          >
            {w}
          </div>
        ))}
        {cells.map((cell, i) => {
          if (!cell)
            return <div key={`empty-${i}`} className="min-h-[48px] md:min-h-[60px]" />;

          const isToday = cell.date === today;
          const isSelected = cell.date === selectedDate;
          const hasData = cell.data != null;
          const dayOfWeek = new Date(cell.date + "T00:00:00").getDay();
          const isSun = dayOfWeek === 0;
          const isSat = dayOfWeek === 6;

          return (
            <div
              key={cell.date}
              onClick={() => onDateClick(cell.date)}
              className={`flex flex-col items-center justify-center gap-[3px] py-2 rounded-xl cursor-pointer min-h-[48px] transition-colors relative md:min-h-[60px] md:gap-1 md:py-2.5 md:rounded-[14px] ${
                isSelected
                  ? "bg-[var(--accent,#6c5ce7)]"
                  : isToday
                    ? "bg-[rgba(108,92,231,0.12)] border-2 border-[var(--accent,#6c5ce7)]"
                    : "active:bg-black/5"
              }`}
            >
              <span
                className={`text-sm font-medium md:text-base ${
                  isSelected
                    ? "!text-white font-bold"
                    : isToday
                      ? "!text-[var(--accent,#6c5ce7)] font-bold"
                      : hasData
                        ? `font-semibold ${isSun ? "text-[#e17055]" : isSat ? "text-[#0984e3]" : "text-gray-800"}`
                        : isSun
                          ? "text-[#fab1a0]"
                          : isSat
                            ? "text-[#74b9ff]"
                            : "text-gray-400"
                }`}
              >
                {cell.day}
              </span>
              {hasData && (
                <span
                  className={`w-2 h-2 rounded-full md:w-2.5 md:h-2.5 ${
                    isSelected ? "!border-white" : getRateClass(cell.data!.rate)
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
