import type { CalendarEvent } from "./types";

// 인메모리 캐시 (10분 TTL)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cache: { data: any; fetchedAt: number } | null = null;
const CACHE_TTL = 10 * 60 * 1000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSummaryText(summary: any): string {
  return typeof summary === "string" ? summary : summary.val;
}

/** KST 기준 날짜 (YYYY-MM-DD) */
function toKSTDateStr(date: Date): string {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

/** KST 기준 시간 (HH:mm) */
function toKSTTimeStr(date: Date): string {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(11, 16);
}

/** node-ical 동적 import (URL 설정 시에만 로드) */
async function loadIcal() {
  return await import("node-ical");
}

async function fetchICS() {
  const url = process.env.CALENDAR_ICS_URL;
  if (!url) return null;

  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL) {
    return cache.data;
  }

  const ical = await loadIcal();
  const data = await ical.async.fromURL(url);
  cache = { data, fetchedAt: now };
  return data;
}

/** 월별 이벤트 조회 (month: 0-indexed) */
export async function getEventsForMonth(
  year: number,
  month: number,
): Promise<CalendarEvent[]> {
  const data = await fetchICS();
  if (!data) return [];

  const ical = await loadIcal();
  const events: CalendarEvent[] = [];

  // 월 범위 (KST 기준이므로 UTC로 변환하여 여유 있게 조회)
  const from = new Date(Date.UTC(year, month, 1) - 9 * 60 * 60 * 1000);
  const to = new Date(Date.UTC(year, month + 1, 1) - 9 * 60 * 60 * 1000);
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;

  for (const component of Object.values(data)) {
    if (!component || (component as { type?: string }).type !== "VEVENT") continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vevent = component as any;

    if (vevent.rrule) {
      // 반복 이벤트 확장
      const instances = ical.expandRecurringEvent(vevent, { from, to });
      for (const inst of instances) {
        const dateStr = inst.isFullDay
          ? inst.start.toISOString().slice(0, 10)
          : toKSTDateStr(inst.start);

        if (!dateStr.startsWith(monthStr)) continue;

        events.push({
          uid: vevent.uid + "_" + dateStr,
          summary: getSummaryText(inst.summary),
          date: dateStr,
          startTime: inst.isFullDay ? null : toKSTTimeStr(inst.start),
          endTime:
            inst.isFullDay || !inst.end ? null : toKSTTimeStr(inst.end),
          isAllDay: inst.isFullDay,
        });
      }
    } else {
      // 단일 이벤트
      const isAllDay = vevent.datetype === "date";
      const dateStr = isAllDay
        ? vevent.start.toISOString().slice(0, 10)
        : toKSTDateStr(vevent.start);

      if (!dateStr.startsWith(monthStr)) continue;

      events.push({
        uid: vevent.uid,
        summary: getSummaryText(vevent.summary),
        date: dateStr,
        startTime: isAllDay ? null : toKSTTimeStr(vevent.start),
        endTime:
          isAllDay || !vevent.end ? null : toKSTTimeStr(vevent.end),
        isAllDay,
      });
    }
  }

  // 날짜 → 시간순 정렬
  events.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.isAllDay !== b.isAllDay) return a.isAllDay ? -1 : 1;
    return (a.startTime ?? "").localeCompare(b.startTime ?? "");
  });

  return events;
}
