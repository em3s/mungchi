import { CHILDREN } from "../config.js";
import { readCache, readBadges, writeBadges, type CacheData, type BadgeRecord } from "../sync/cache.js";
import { BADGE_DEFINITIONS, type BadgeContext } from "./definitions.js";

function todayKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

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

function computeStreak(cache: CacheData, childId: string, today: string): number {
  let streak = 0;
  let date = today;
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

function computeTotals(cache: CacheData, childId: string) {
  const days = cache[childId] ?? {};
  let totalCompleted = 0;
  let totalPerfectDays = 0;
  for (const day of Object.values(days)) {
    const completed = day.tasks.filter((t) => t.completed).length;
    totalCompleted += completed;
    if (day.tasks.length > 0 && completed === day.tasks.length) {
      totalPerfectDays++;
    }
  }
  return { totalCompleted, totalPerfectDays };
}

function computeWeekRate(cache: CacheData, childId: string, today: string): number {
  let total = 0;
  let completed = 0;
  for (let i = 0; i < 7; i++) {
    const date = dateOffset(today, -i);
    const day = cache[childId]?.[date];
    if (day) {
      total += day.tasks.length;
      completed += day.tasks.filter((t) => t.completed).length;
    }
  }
  return total > 0 ? completed / total : 0;
}

export function buildContext(
  cache: CacheData,
  childId: string,
  siblingId: string
): BadgeContext {
  const today = todayKST();
  const todayData = cache[childId]?.[today];
  const todayTotal = todayData?.tasks.length ?? 0;
  const todayCompleted = todayData?.tasks.filter((t) => t.completed).length ?? 0;
  const { totalCompleted, totalPerfectDays } = computeTotals(cache, childId);

  return {
    todayTotal,
    todayCompleted,
    todayRate: todayTotal > 0 ? todayCompleted / todayTotal : 0,
    streak: computeStreak(cache, childId, today),
    totalCompleted,
    totalPerfectDays,
    weekRate: computeWeekRate(cache, childId, today),
    siblingTodayRate: getDayRate(cache, siblingId, today),
    yesterdayRate: getDayRate(cache, childId, dateOffset(today, -1)),
  };
}

export function evaluateBadges(childId: string): BadgeRecord[] {
  const cache = readCache();
  const badgesData = readBadges();
  const today = todayKST();

  const siblingId = CHILDREN.find((c) => c.id !== childId)?.id ?? "";
  const ctx = buildContext(cache, childId, siblingId);

  const newBadges: BadgeRecord[] = [];

  for (const def of BADGE_DEFINITIONS) {
    // 비반복 뱃지: 이미 획득했으면 스킵
    if (!def.repeatable) {
      const alreadyEarned = badgesData.badges.some(
        (b) => b.badgeId === def.id && b.childId === childId
      );
      if (alreadyEarned) continue;
    }

    // 반복 뱃지: 오늘 이미 획득했으면 스킵
    if (def.repeatable) {
      const earnedToday = badgesData.badges.some(
        (b) =>
          b.badgeId === def.id &&
          b.childId === childId &&
          b.earnedAt.startsWith(today)
      );
      if (earnedToday) continue;
    }

    if (def.condition(ctx)) {
      const record: BadgeRecord = {
        id: `${def.id}-${childId}-${today}`,
        badgeId: def.id,
        childId,
        earnedAt: new Date().toISOString(),
      };
      newBadges.push(record);
      badgesData.badges.push(record);
    }
  }

  if (newBadges.length > 0) {
    writeBadges(badgesData);
    console.log(
      `[badges] ${childId}: earned ${newBadges.length} new badge(s)`
    );
  }

  return newBadges;
}

export function getBadgesForChild(childId: string) {
  const badgesData = readBadges();
  const earned = badgesData.badges.filter((b) => b.childId === childId);

  return earned.map((record) => {
    const def = BADGE_DEFINITIONS.find((d) => d.id === record.badgeId);
    return {
      ...record,
      name: def?.name ?? record.badgeId,
      description: def?.description ?? "",
      emoji: def?.emoji ?? "🏅",
      grade: def?.grade ?? "common",
      category: def?.category ?? "daily",
    };
  });
}
