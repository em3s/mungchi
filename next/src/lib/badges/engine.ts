import { BADGE_DEFINITIONS } from "./definitions";
import type { BadgeContext, DayTaskSummary } from "./types";
import { dateOffset, todayKST } from "../date";

interface EvaluatedBadge {
  id: string;
  badgeId: string;
  childId: string;
  earnedAt: string;
  earnedDate: string;
}

function getDayRate(days: Map<string, DayTaskSummary>, date: string): number {
  const day = days.get(date);
  if (!day || day.total === 0) return 0;
  return day.completed / day.total;
}

function computeStreak(
  days: Map<string, DayTaskSummary>,
  asOfDate: string
): number {
  let streak = 0;
  let date = asOfDate;
  while (true) {
    const day = days.get(date);
    if (day && day.total > 0 && day.completed === day.total) {
      streak++;
      date = dateOffset(date, -1);
    } else {
      break;
    }
  }
  return streak;
}

function computeTotals(
  days: Map<string, DayTaskSummary>,
  upToDate: string
): {
  totalCompleted: number;
  totalPerfectDays: number;
  totalActiveDays: number;
} {
  let totalCompleted = 0;
  let totalPerfectDays = 0;
  let totalActiveDays = 0;
  for (const [date, day] of days) {
    if (date > upToDate) continue;
    if (day.total > 0) totalActiveDays++;
    totalCompleted += day.completed;
    if (day.total > 0 && day.completed === day.total) {
      totalPerfectDays++;
    }
  }
  return { totalCompleted, totalPerfectDays, totalActiveDays };
}

function computeLastWeekRate(
  days: Map<string, DayTaskSummary>,
  asOfDate: string
): number {
  const d = new Date(asOfDate + "T00:00:00+09:00");
  const dow = d.getDay();
  const daysSinceMonday = dow === 0 ? 6 : dow - 1;
  const lastSunday = dateOffset(asOfDate, -(daysSinceMonday + 1));

  let total = 0;
  let completed = 0;
  for (let i = 0; i < 7; i++) {
    const date = dateOffset(lastSunday, -i);
    const day = days.get(date);
    if (day) {
      total += day.total;
      completed += day.completed;
    }
  }
  return total > 0 ? completed / total : 0;
}

export function buildContextForDate(
  childDays: Map<string, DayTaskSummary>,
  siblingDays: Map<string, DayTaskSummary>,
  date: string,
  isToday: boolean
): BadgeContext {
  const dayData = childDays.get(date);
  const todayTotal = dayData?.total ?? 0;
  const todayCompleted = dayData?.completed ?? 0;
  const { totalCompleted, totalPerfectDays, totalActiveDays } = computeTotals(
    childDays,
    date
  );
  const d = new Date(date + "T00:00:00+09:00");

  return {
    todayTotal,
    todayCompleted,
    todayRate: todayTotal > 0 ? todayCompleted / todayTotal : 0,
    streak: computeStreak(childDays, date),
    totalCompleted,
    totalPerfectDays,
    totalActiveDays,
    weekRate: computeLastWeekRate(childDays, date),
    siblingTodayRate: getDayRate(siblingDays, date),
    yesterdayRate: getDayRate(childDays, dateOffset(date, -1)),
    todayDayOfWeek: d.getDay(),
    currentHourKST: isToday ? (new Date().getUTCHours() + 9) % 24 : 99,
  };
}

/** 전체 뱃지를 처음부터 재계산 */
export function evaluateBadges(
  childId: string,
  childDays: DayTaskSummary[],
  siblingDays: DayTaskSummary[]
): EvaluatedBadge[] {
  const today = todayKST();

  const childMap = new Map<string, DayTaskSummary>();
  for (const day of childDays) childMap.set(day.date, day);

  const siblingMap = new Map<string, DayTaskSummary>();
  for (const day of siblingDays) siblingMap.set(day.date, day);

  // 날짜 정렬
  const dates = [...childMap.keys()].sort();

  const allBadges: EvaluatedBadge[] = [];
  const earnedSet = new Set<string>();
  const earnedDaySet = new Set<string>();

  for (const date of dates) {
    const isToday = date === today;
    const ctx = buildContextForDate(childMap, siblingMap, date, isToday);

    for (const def of BADGE_DEFINITIONS) {
      if (!def.repeatable && earnedSet.has(def.id)) continue;

      const dayKey = `${def.id}:${date}`;
      if (def.repeatable && earnedDaySet.has(dayKey)) continue;

      if (def.condition(ctx)) {
        allBadges.push({
          id: `${def.id}-${childId}-${date}`,
          badgeId: def.id,
          childId,
          earnedAt: new Date(date + "T00:00:00+09:00").toISOString(),
          earnedDate: date,
        });
        earnedSet.add(def.id);
        earnedDaySet.add(dayKey);
      }
    }
  }

  return allBadges;
}

/** 뱃지 목록을 프론트엔드용으로 가공 */
export function getBadgesForDisplay(
  earned: EvaluatedBadge[]
) {
  return BADGE_DEFINITIONS.filter(
    (def) => !def.hidden || earned.some((b) => b.badgeId === def.id)
  ).map((def) => {
    const records = earned.filter((b) => b.badgeId === def.id);
    const isEarned = records.length > 0;
    return {
      badgeId: def.id,
      name: def.name,
      description: def.description,
      hint: def.hint,
      emoji: def.emoji,
      grade: def.grade,
      category: def.category,
      repeatable: def.repeatable,
      hidden: def.hidden ?? false,
      earned: isEarned,
      earnedCount: records.length,
      earnedAt: isEarned ? records[records.length - 1].earnedAt : null,
    };
  });
}
