"use client";

import { useState, useEffect } from "react";
import { fetchWeather, type DailyWeather } from "@/lib/weather";
import { WEEKDAYS } from "@/lib/date";

interface WeatherWidgetProps {
  today: string; // YYYY-MM-DD (KST)
}

export function WeatherWidget({ today }: WeatherWidgetProps) {
  const [forecast, setForecast] = useState<DailyWeather[] | null>(null);

  useEffect(() => {
    fetchWeather()
      .then(setForecast)
      .catch(() => {});
  }, []);

  if (!forecast) return null;

  return (
    <div className="mb-4">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 md:text-sm">
        🌤️ 날씨
      </div>
      <div className="flex gap-2 overflow-x-auto py-1 -mx-1 px-1 scrollbar-hide">
        {forecast.map((day) => (
          <WeatherCard key={day.date} day={day} isToday={day.date === today} />
        ))}
      </div>
    </div>
  );
}

function WeatherCard({
  day,
  isToday,
}: {
  day: DailyWeather;
  isToday: boolean;
}) {
  const d = new Date(day.date + "T00:00:00");
  const weekday = WEEKDAYS[d.getDay()];
  const month = d.getMonth() + 1;
  const date = d.getDate();
  const isSun = d.getDay() === 0;
  const isSat = d.getDay() === 6;

  return (
    <div
      className={`flex-shrink-0 w-[100px] bg-white rounded-[14px] px-3 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)] text-center md:w-[110px] ${
        isToday ? "ring-2 ring-[var(--accent,#6c5ce7)]" : ""
      }`}
    >
      {/* 날짜 */}
      <div
        className={`text-xs font-semibold mb-1 ${
          isToday
            ? "text-[var(--accent,#6c5ce7)]"
            : isSun
              ? "text-[#e17055]"
              : isSat
                ? "text-[#0984e3]"
                : "text-gray-500"
        }`}
      >
        {isToday ? "오늘" : `${month}/${date}`}
        <span className="ml-0.5">({weekday})</span>
      </div>

      {/* 날씨 이모지 */}
      <div className="text-2xl my-1 md:text-3xl">{day.weatherEmoji}</div>

      {/* 날씨 설명 */}
      <div className="text-[0.65rem] text-gray-500 mb-1 truncate">
        {day.weatherLabel}
      </div>

      {/* 온도 */}
      <div className="text-sm font-bold text-gray-800">
        <span className="text-red-400">{day.tempMax}°</span>
        <span className="text-gray-300 mx-0.5">/</span>
        <span className="text-blue-400">{day.tempMin}°</span>
      </div>

      {/* 체감온도 */}
      <div className="text-[0.6rem] text-gray-400 mt-0.5">
        체감 {day.apparentMax}°/{day.apparentMin}°
      </div>

      {/* 경고 */}
      {day.isExtreme && day.alertMessage && (
        <div className="mt-1.5 text-[0.6rem] font-semibold text-red-500 bg-red-50 rounded-lg px-1.5 py-0.5 truncate">
          {day.alertMessage}
        </div>
      )}
    </div>
  );
}
