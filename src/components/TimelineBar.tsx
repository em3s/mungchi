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

const EMOJI_RE = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)\s*/u;

function leadingEmoji(text: string): string | null {
  const m = text.match(EMOJI_RE);
  return m ? m[1] : null;
}

function stripLeadingEmoji(text: string): string {
  return text.replace(EMOJI_RE, "");
}

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

const TICKS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

/** 기존 스타일 리스트 아이템 */
function EventListItem({ ev }: { ev: CalendarEvent }) {
  return (
    <li className="bg-blue-50 rounded-xl px-4 py-3 text-blue-900 md:rounded-[14px]">
      <div className="font-semibold text-sm md:text-base">{ev.summary}</div>
      {!ev.isAllDay && ev.startTime && (
        <div className="text-xs text-blue-500 mt-0.5">
          {ev.startTime}
          {ev.endTime ? ` ~ ${ev.endTime}` : ""}
        </div>
      )}
      {ev.isAllDay && (
        <div className="text-xs text-blue-400 mt-0.5">하루종일</div>
      )}
    </li>
  );
}

export function TimelineBar({ events }: { events: CalendarEvent[] }) {
  const { morning, evening, blocks, allDay } = buildBlocks(events);

  return (
    <div className="mt-6 mb-3">
      <div className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-2 md:text-sm">
        📅 일정{events.length > 0 ? ` (${events.length})` : ""}
      </div>

      {/* 종일 이벤트 */}
      {allDay.length > 0 && (
        <ul className="flex flex-col gap-2 mb-2">
          {allDay.map((ev) => <EventListItem key={ev.uid} ev={ev} />)}
        </ul>
      )}

      {/* 9시 이전 — 리스트 */}
      {morning.length > 0 && (
        <ul className="flex flex-col gap-2 mb-2">
          {morning.map((ev) => <EventListItem key={ev.uid} ev={ev} />)}
        </ul>
      )}

      {/* 9시~6시 메인 타임라인 — 항상 표시 */}
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
          <div
            className="flex-1 relative bg-white rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-visible md:rounded-[14px]"
            style={{ minHeight: "540px" }}
          >
            {/* 이벤트 블록 */}
            {blocks.map((block) => {
              const color = COLORS[block.colorIdx];
              const bottomEdge = block.topPct + block.heightPct;
              const hasAdjacentBelow = blocks.some(
                (b) => b !== block && Math.abs(b.topPct - bottomEdge) < 0.5
              );
              return (
                <div
                  key={block.event.uid}
                  className={`absolute left-0 right-0 ${color.bg} flex items-center gap-2 px-3 py-1 overflow-visible`}
                  style={{
                    top: `${block.topPct}%`,
                    height: `${block.heightPct}%`,
                    minHeight: "36px",
                  }}
                >
                  {/* 구분선 — 시간 눈금 영역까지 확장, 연속 시 하단 생략 */}
                  <div className="absolute top-0 -left-14 right-0 border-t border-gray-400/50 pointer-events-none" />
                  {!hasAdjacentBelow && (
                    <div className="absolute bottom-0 -left-14 right-0 border-t border-gray-400/50 pointer-events-none" />
                  )}
                  {leadingEmoji(block.event.summary) && (
                    <span className="text-xl md:text-2xl shrink-0 leading-none">
                      {leadingEmoji(block.event.summary)}
                    </span>
                  )}
                  <div className="min-w-0 flex flex-col justify-center">
                  <span className={`text-xs md:text-sm font-semibold ${color.text} truncate leading-tight`}>
                    {stripLeadingEmoji(block.event.summary)}
                  </span>
                  {block.heightPct > 5 && block.event.startTime && (
                    <span className={`text-[10px] md:text-xs ${color.text} opacity-60 leading-tight`}>
                      {formatTime(block.event.startTime)}
                      {block.event.endTime ? ` – ${formatTime(block.event.endTime)}` : ""}
                    </span>
                  )}
                  </div>
                </div>
              );
            })}

            {/* 정시 눈금선 + 30분 점선 (이벤트 위에 표시) */}
            {TICKS.map((hour, i) => {
              const topPct = (i / (TICKS.length - 1)) * 100;
              return (
                <div key={hour} className="pointer-events-none">
                  <div
                    className="absolute left-0 right-0 border-t border-gray-300/60 z-10"
                    style={{ top: `${topPct}%` }}
                  />
                  {i < TICKS.length - 1 && (
                    <div
                      className="absolute left-0 right-0 border-t border-dashed border-gray-200/60 z-10"
                      style={{ top: `${topPct + (1 / (TICKS.length - 1)) * 50}%` }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

      {/* 6시 이후 — 리스트 */}
      {evening.length > 0 && (
        <ul className="flex flex-col gap-2 mt-2">
          {evening.map((ev) => <EventListItem key={ev.uid} ev={ev} />)}
        </ul>
      )}
    </div>
  );
}
