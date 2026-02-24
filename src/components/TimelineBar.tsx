"use client";

import type { CalendarEvent } from "@/lib/types";

const COLORS = [
  { bg: "bg-blue-50", text: "text-blue-700", accent: "border-blue-300" },
  { bg: "bg-amber-50", text: "text-amber-700", accent: "border-amber-300" },
  { bg: "bg-green-50", text: "text-green-700", accent: "border-green-300" },
  { bg: "bg-purple-50", text: "text-purple-700", accent: "border-purple-300" },
  { bg: "bg-rose-50", text: "text-rose-700", accent: "border-rose-300" },
  { bg: "bg-cyan-50", text: "text-cyan-700", accent: "border-cyan-300" },
];

const DAY_START = 9 * 60;
const DAY_END = 18 * 60;
const DAY_SPAN = DAY_END - DAY_START;

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h < 12 ? "오전" : "오후";
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${suffix} ${hour}시` : `${suffix} ${hour}:${String(m).padStart(2, "0")}`;
}

interface Block {
  event: CalendarEvent;
  topPct: number;
  heightPct: number;
  colorIdx: number;
}

function buildBlocks(events: CalendarEvent[]) {
  const morning: CalendarEvent[] = [];
  const evening: CalendarEvent[] = [];
  const allDay: CalendarEvent[] = [];
  const blocks: Block[] = [];

  const timed = events.filter((ev) => {
    if (ev.isAllDay) { allDay.push(ev); return false; }
    if (!ev.startTime) return false;
    return true;
  });

  timed.forEach((ev, idx) => {
    const start = toMinutes(ev.startTime!);
    const end = ev.endTime ? toMinutes(ev.endTime) : start + 60;

    if (end <= DAY_START) { morning.push(ev); return; }
    if (start >= DAY_END) { evening.push(ev); return; }

    if (start < DAY_START) morning.push(ev);
    if (end > DAY_END) evening.push(ev);

    const clampStart = Math.max(start, DAY_START);
    const clampEnd = Math.min(end, DAY_END);
    const topPct = ((clampStart - DAY_START) / DAY_SPAN) * 100;
    const heightPct = ((clampEnd - clampStart) / DAY_SPAN) * 100;

    blocks.push({ event: ev, topPct, heightPct, colorIdx: idx % COLORS.length });
  });

  return { morning, evening, blocks, allDay };
}

const TICKS = [9, 12, 15, 18];

function Cap({
  emoji,
  label,
  events,
}: {
  emoji: string;
  label: string;
  events: CalendarEvent[];
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl md:rounded-[14px]">
      <span className="text-base">{emoji}</span>
      <div className="min-w-0">
        <span className="text-xs text-gray-400 font-medium">{label}</span>
        {events.length > 0 && (
          <div className="text-[11px] md:text-xs text-gray-500 truncate">
            {events.map((e) => e.summary).join(", ")}
          </div>
        )}
      </div>
    </div>
  );
}

export function TimelineBar({ events }: { events: CalendarEvent[] }) {
  const { morning, evening, blocks, allDay } = buildBlocks(events);

  if (events.length === 0) return null;

  // 빈 구간 계산
  const gaps: { topPct: number; heightPct: number }[] = [];
  const sorted = [...blocks].sort((a, b) => a.topPct - b.topPct);
  let cursor = 0;
  for (const b of sorted) {
    if (b.topPct > cursor + 0.5) {
      gaps.push({ topPct: cursor, heightPct: b.topPct - cursor });
    }
    cursor = b.topPct + b.heightPct;
  }
  if (cursor < 99.5) {
    gaps.push({ topPct: cursor, heightPct: 100 - cursor });
  }

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

      {/* 아침 */}
      <Cap emoji="🌅" label="아침" events={morning} />

      {/* 메인 타임라인 */}
      <div className="flex my-1">
        {/* 시간 눈금 (왼쪽) */}
        <div className="relative w-11 md:w-13 shrink-0">
          {TICKS.map((hour, i) => (
            <div
              key={hour}
              className="absolute right-0 pr-2 text-[10px] md:text-xs text-gray-400 leading-none -translate-y-1/2"
              style={{ top: `${(i / (TICKS.length - 1)) * 100}%` }}
            >
              {hour > 12 ? `${hour - 12}pm` : hour === 12 ? "12pm" : `${hour}am`}
            </div>
          ))}
        </div>

        {/* 타임라인 본체 */}
        <div className="flex-1 relative bg-white rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden md:rounded-[14px]"
          style={{ minHeight: "540px" }}
        >
          {/* 눈금선 */}
          {TICKS.map((hour, i) => (
            <div
              key={hour}
              className="absolute left-0 right-0 border-t border-dashed border-gray-100"
              style={{ top: `${(i / (TICKS.length - 1)) * 100}%` }}
            />
          ))}

          {/* 빈 구간 라벨 */}
          {gaps.map((gap, i) => (
            gap.heightPct > 4 && (
              <div
                key={`gap-${i}`}
                className="absolute left-0 right-0 flex items-center justify-center"
                style={{ top: `${gap.topPct}%`, height: `${gap.heightPct}%` }}
              >
                <span className="text-[10px] md:text-xs text-gray-300">자유시간</span>
              </div>
            )
          ))}

          {/* 이벤트 블록 */}
          {blocks.map((block) => {
            const color = COLORS[block.colorIdx];
            return (
              <div
                key={block.event.uid}
                className={`absolute left-1.5 right-1.5 ${color.bg} border-l-[3px] ${color.accent} rounded-lg flex flex-col justify-center px-3 py-1 overflow-hidden`}
                style={{
                  top: `${block.topPct}%`,
                  height: `${block.heightPct}%`,
                  minHeight: "36px",
                }}
              >
                <span className={`text-xs md:text-sm font-semibold ${color.text} truncate leading-tight`}>
                  {block.event.summary}
                </span>
                {block.heightPct > 5 && block.event.startTime && (
                  <span className={`text-[10px] md:text-xs ${color.text} opacity-60 leading-tight`}>
                    {formatTime(block.event.startTime)}
                    {block.event.endTime ? ` – ${formatTime(block.event.endTime)}` : ""}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 저녁 */}
      <Cap emoji="🌙" label="저녁" events={evening} />
    </div>
  );
}
