import { CHILDREN } from "../config.js";
import {
  readCache,
  writeBadges,
  type CacheData,
  type BadgeRecord,
} from "../sync/cache.js";
import { BADGE_DEFINITIONS, type BadgeContext } from "./definitions.js";
import { todayKST } from "../lib/date.js";

function dateOffset(base: string, days: number): string {
  const d = new Date(base + "T00:00:00+09:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function getDayRate(cache: CacheData, childId: string, date: string): number {
  const day = cache[childId]?.[date];
  if (!day || day.tasks.length === 0) return 0;
  return day.tasks.filter((t) => t.completed).length / day.tasks.length;
}

function computeStreak(cache: CacheData, childId: string, asOfDate: string): number {
  let streak = 0;
  let date = asOfDate;
  while (true) {
    const rate = getDayRate(cache, childId, date);
    if (rate === 1 && (cache[childId]?.[date]?.tasks.length ?? 0) > 0) {
      streak++;
      date = dateOffset(date, -1);
    } else {
      break;
    }
  }
  return streak;
}

function computeTotals(cache: CacheData, childId: string, upToDate: string) {
  const days = cache[childId] ?? {};
  let totalCompleted = 0;
  let totalPerfectDays = 0;
  let totalActiveDays = 0;
  for (const [date, day] of Object.entries(days)) {
    if (date > upToDate) continue;
    if (day.tasks.length > 0) totalActiveDays++;
    const completed = day.tasks.filter((t) => t.completed).length;
    totalCompleted += completed;
    if (day.tasks.length > 0 && completed === day.tasks.length) {
      totalPerfectDays++;
    }
  }
  return { totalCompleted, totalPerfectDays, totalActiveDays };
}

function computeLastWeekRate(cache: CacheData, childId: string, asOfDate: string): number {
  const d = new Date(asOfDate + "T00:00:00+09:00");
  const dow = d.getDay();
  const daysSinceMonday = dow === 0 ? 6 : dow - 1;
  const lastSunday = dateOffset(asOfDate, -(daysSinceMonday + 1));

  let total = 0;
  let completed = 0;
  for (let i = 0; i < 7; i++) {
    const date = dateOffset(lastSunday, -i);
    const day = cache[childId]?.[date];
    if (day) {
      total += day.tasks.length;
      completed += day.tasks.filter((t) => t.completed).length;
    }
  }
  return total > 0 ? completed / total : 0;
}

function buildContextForDate(
  cache: CacheData,
  childId: string,
  siblingId: string,
  date: string,
  isToday: boolean,
): BadgeContext {
  const dayData = cache[childId]?.[date];
  const todayTotal = dayData?.tasks.length ?? 0;
  const todayCompleted = dayData?.tasks.filter((t) => t.completed).length ?? 0;
  const { totalCompleted, totalPerfectDays, totalActiveDays } = computeTotals(
    cache,
    childId,
    date,
  );
  const d = new Date(date + "T00:00:00+09:00");

  return {
    todayTotal,
    todayCompleted,
    todayRate: todayTotal > 0 ? todayCompleted / todayTotal : 0,
    streak: computeStreak(cache, childId, date),
    totalCompleted,
    totalPerfectDays,
    totalActiveDays,
    weekRate: computeLastWeekRate(cache, childId, date),
    siblingTodayRate: getDayRate(cache, siblingId, date),
    yesterdayRate: getDayRate(cache, childId, dateOffset(date, -1)),
    todayDayOfWeek: d.getDay(),
    currentHourKST: isToday ? (new Date().getUTCHours() + 9) % 24 : 99,
  };
}

/** 전체 뱃지를 처음부터 재계산 */
export function evaluateBadges(childId: string): BadgeRecord[] {
  const cache = readCache();
  const today = todayKST();
  const siblingId = CHILDREN.find((c) => c.id !== childId)?.id ?? "";

  // 캐시의 모든 날짜를 정렬
  const dates = Object.keys(cache[childId] ?? {}).sort();

  const allBadges: BadgeRecord[] = [];
  const earnedSet = new Set<string>(); // "badgeId" for non-repeatable
  const earnedDaySet = new Set<string>(); // "badgeId:date" for repeatable

  for (const date of dates) {
    const isToday = date === today;
    const ctx = buildContextForDate(cache, childId, siblingId, date, isToday);

    for (const def of BADGE_DEFINITIONS) {
      // 비반복: 이미 획득했으면 스킵
      if (!def.repeatable && earnedSet.has(def.id)) continue;

      // 반복: 이 날짜에 이미 획득했으면 스킵
      const dayKey = `${def.id}:${date}`;
      if (def.repeatable && earnedDaySet.has(dayKey)) continue;

      if (def.condition(ctx)) {
        const record: BadgeRecord = {
          id: `${def.id}-${childId}-${date}`,
          badgeId: def.id,
          childId,
          earnedAt: new Date(date + "T00:00:00+09:00").toISOString(),
        };
        allBadges.push(record);
        earnedSet.add(def.id);
        earnedDaySet.add(dayKey);
      }
    }
  }

  return allBadges;
}

/** 모든 아이의 뱃지를 재계산하고 저장 */
export function recalculateAllBadges(): void {
  const allBadges: BadgeRecord[] = [];
  for (const child of CHILDREN) {
    const badges = evaluateBadges(child.id);
    allBadges.push(...badges);
  }
  writeBadges({ badges: allBadges });
  console.log(`[badges] 전체 재계산 완료: ${allBadges.length}개`);
}

export { buildContextForDate as buildContext };

export function getBadgesForChild(childId: string) {
  const cache = readCache();
  const today = todayKST();
  const siblingId = CHILDREN.find((c) => c.id !== childId)?.id ?? "";

  // 매번 재계산
  const earned = evaluateBadges(childId);

  return BADGE_DEFINITIONS.filter(
    (def) => !def.hidden || earned.some((b) => b.badgeId === def.id),
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
