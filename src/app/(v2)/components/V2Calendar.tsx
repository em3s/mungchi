"use client";

import { Card, Button, Chip } from "konsta/react";
import { WEEKDAYS, getDaysInMonth, getFirstDayOfWeek } from "@/lib/date";
import type { MonthDays } from "@/lib/types";

interface V2CalendarProps {
  year: number;
  month: number;
  monthData: MonthDays | null;
  today: string;
  selectedDate: string | null;
  eventDates?: Set<string>;
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

function getDateTextClass(
  isSelected: boolean,
  isToday: boolean,
  hasData: boolean,
  isSun: boolean,
  isSat: boolean,
): string {
  if (isSelected) return "!text-white font-bold";
  if (isToday) return "!text-[var(--accent,#6c5ce7)] font-bold";
  if (hasData) {
    const color = isSun ? "text-[#e17055]" : isSat ? "text-[#0984e3]" : "text-gray-800";
    return `font-semibold ${color}`;
  }
  if (isSun) return "text-[#fab1a0]";
  if (isSat) return "text-[#74b9ff]";
  return "text-gray-400";
}

export function V2Calendar({
  year,
  month,
  monthData,
  today,
  selectedDate,
  eventDates,
  onDateClick,
  onPrevMonth,
  onNextMonth,
  onGoToday,
}: V2CalendarProps) {
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
    <Card raised className="!mx-0 !mb-4" contentWrap={false}>
      {/* Month navigation */}
      <div className="flex items-center justify-center gap-3 px-4 pt-3 pb-2">
        <Button clear small onClick={onPrevMonth} className="!px-3">
          <span className="text-lg font-bold">←</span>
        </Button>
        <span className="text-lg font-bold">
          {year}년 {month + 1}월
        </span>
        <Button clear small onClick={onNextMonth} className="!px-3">
          <span className="text-lg font-bold">→</span>
        </Button>
        <Chip onClick={onGoToday} className="!ml-1 !cursor-pointer">
          오늘
        </Chip>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 px-3">
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
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1 px-3 pb-3">
        {cells.map((cell, i) => {
          if (!cell)
            return <div key={`empty-${i}`} className="min-h-[48px] md:min-h-[60px]" />;

          const isToday = cell.date === today;
          const isSelected = cell.date === selectedDate;
          const hasData = cell.data != null;
          const hasEvent = eventDates?.has(cell.date) ?? false;
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
                className={`text-sm font-medium md:text-base ${getDateTextClass(isSelected, isToday, hasData, isSun, isSat)}`}
              >
                {cell.day}
              </span>
              <div className="flex gap-[3px] items-center min-h-[8px] md:min-h-[10px]">
                {hasData && (
                  <span
                    className={`w-2 h-2 rounded-full md:w-2.5 md:h-2.5 ${
                      isSelected ? "!border-white" : getRateClass(cell.data!.rate)
                    }`}
                  />
                )}
                {hasEvent && (
                  <span
                    className={`w-2 h-2 rounded-full md:w-2.5 md:h-2.5 ${
                      isSelected ? "bg-white/70" : "bg-blue-400"
                    }`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
