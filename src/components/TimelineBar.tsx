"use client";

import type { CalendarEvent } from "@/lib/types";

const COLORS = [
  { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
  { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200" },
  { bg: "bg-green-100", text: "text-green-700", border: "border-green-200" },
  { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200" },
  { bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-200" },
  { bg: "bg-cyan-100", text: "text-cyan-700", border: "border-cyan-200" },
];

const DAY_START = 9 * 60; // 09:00 = 540분
const DAY_END = 18 * 60; // 18:00 = 1080분
const DAY_SPAN = DAY_END - DAY_START; // 540분

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function formatHour(hour: number): string {
  if (hour === 12) return "12";
  return hour > 12 ? `${hour - 12}` : `${hour}`;
}

interface Block {
  event: CalendarEvent;
  startPct: number;
  widthPct: number;
  colorIdx: number;
}

function buildBlocks(events: CalendarEvent[]): {
  morning: CalendarEvent[];
  evening: CalendarEvent[];
  blocks: Block[];
  allDay: CalendarEvent[];
} {
  const morning: CalendarEvent[] = [];
  const evening: CalendarEvent[] = [];
  const allDay: CalendarEvent[] = [];
  const blocks: Block[] = [];

  const timed = events.filter((ev) => {
    if (ev.isAllDay) {
      allDay.push(ev);
      return false;
    }
    if (!ev.startTime) return false;
    return true;
  });

  timed.forEach((ev, idx) => {
    const start = toMinutes(ev.startTime!);
    const end = ev.endTime ? toMinutes(ev.endTime) : start + 60;

    // 완전히 9시 이전
    if (end <= DAY_START) {
      morning.push(ev);
      return;
    }
    // 완전히 6시 이후
    if (start >= DAY_END) {
      evening.push(ev);
      return;
    }

    // 9시 전에 걸치면 아침에도 표시
    if (start < DAY_START) morning.push(ev);
    // 6시 후에 걸치면 저녁에도 표시
    if (end > DAY_END) evening.push(ev);

    // 가운데 영역 클리핑
    const clampStart = Math.max(start, DAY_START);
    const clampEnd = Math.min(end, DAY_END);
    const startPct = ((clampStart - DAY_START) / DAY_SPAN) * 100;
    const widthPct = ((clampEnd - clampStart) / DAY_SPAN) * 100;

    blocks.push({ event: ev, startPct, widthPct, colorIdx: idx % COLORS.length });
  });

  return { morning, evening, blocks, allDay };
}

const TICKS = [9, 12, 15, 18];

export function TimelineBar({ events }: { events: CalendarEvent[] }) {
  const { morning, evening, blocks, allDay } = buildBlocks(events);

  if (events.length === 0) return null;

  return (
    <div className="mt-6 mb-3">
      <div className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-2 md:text-sm">
        📅 일정 ({events.length})
      </div>

      {/* 종일 이벤트 */}
      {allDay.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {allDay.map((ev) => (
            <span
              key={ev.uid}
              className="text-[11px] md:text-xs bg-blue-50 text-blue-600 rounded-full px-2.5 py-0.5 font-medium"
            >
              {ev.summary}
            </span>
          ))}
        </div>
      )}

      {/* 타임라인 바 */}
      <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden md:rounded-[14px]">
        {/* 시간 눈금 */}
        <div className="relative h-5 border-b border-gray-100">
          <div className="absolute inset-0 flex" style={{ marginLeft: "15%", marginRight: "15%" }}>
            {TICKS.map((hour, i) => (
              <div
                key={hour}
                className="absolute text-[10px] text-gray-400 -translate-x-1/2"
                style={{ left: `${(i / (TICKS.length - 1)) * 100}%` }}
              >
                {formatHour(hour)}
              </div>
            ))}
          </div>
        </div>

        {/* 바 본체 */}
        <div className="flex h-11 md:h-13">
          {/* 아침 */}
          <div className="w-[15%] bg-gray-50 flex items-center justify-center border-r border-gray-100 shrink-0">
            <span className="text-[11px] md:text-xs text-gray-400 font-medium">
              {morning.length > 0 ? (
                <span className="text-blue-400" title={morning.map((e) => e.summary).join(", ")}>
                  🌅 {morning.length > 1 ? morning.length : morning[0].summary.slice(0, 3)}
                </span>
              ) : (
                "🌅 아침"
              )}
            </span>
          </div>

          {/* 가운데 비례 영역 */}
          <div className="flex-1 relative bg-gray-50">
            {/* 빈 시간 배경 */}
            {blocks.map((block) => {
              const color = COLORS[block.colorIdx];
              return (
                <div
                  key={block.event.uid}
                  className={`absolute top-0 bottom-0 ${color.bg} border-x ${color.border} flex items-center justify-center overflow-hidden`}
                  style={{
                    left: `${block.startPct}%`,
                    width: `${block.widthPct}%`,
                  }}
                >
                  <span
                    className={`text-[10px] md:text-xs font-medium ${color.text} truncate px-1`}
                  >
                    {block.widthPct > 15
                      ? block.event.summary
                      : block.widthPct > 8
                        ? block.event.summary.slice(0, 3)
                        : ""}
                  </span>
                </div>
              );
            })}

            {/* 12시 점선 */}
            <div
              className="absolute top-0 bottom-0 w-px border-l border-dashed border-gray-200"
              style={{ left: `${((12 * 60 - DAY_START) / DAY_SPAN) * 100}%` }}
            />
          </div>

          {/* 저녁 */}
          <div className="w-[15%] bg-gray-50 flex items-center justify-center border-l border-gray-100 shrink-0">
            <span className="text-[11px] md:text-xs text-gray-400 font-medium">
              {evening.length > 0 ? (
                <span className="text-indigo-400" title={evening.map((e) => e.summary).join(", ")}>
                  🌙 {evening.length > 1 ? evening.length : evening[0].summary.slice(0, 3)}
                </span>
              ) : (
                "🌙 저녁"
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
