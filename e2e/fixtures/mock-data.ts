import { randomUUID } from "crypto";

/** KST 기준 오늘 날짜 (YYYY-MM-DD) — todayKST 로직 복제 */
export function todayKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

/* ---------- Feature Flags ---------- */

type Feature = "map" | "star" | "coins" | "vocab" | "game";

export function mockFeatureFlags(
  userId: string,
  overrides: Partial<Record<Feature, boolean>> = {},
) {
  const defaults: Record<Feature, boolean> = {
    map: true,
    star: true,
    coins: true,
    vocab: true,
    game: true,
  };
  const merged = { ...defaults, ...overrides };
  return Object.entries(merged).map(([feature, enabled]) => ({
    user_id: userId,
    feature,
    enabled,
  }));
}

/* ---------- Tasks ---------- */

interface TaskOverrides {
  id?: string;
  user_id?: string;
  title?: string;
  date?: string;
  completed?: boolean;
  completed_at?: string | null;
  priority?: number;
  notes?: string | null;
}

export function mockTask(overrides: TaskOverrides = {}) {
  const id = overrides.id ?? randomUUID();
  return {
    id,
    user_id: overrides.user_id ?? "sihyun",
    title: overrides.title ?? "테스트 할일",
    date: overrides.date ?? todayKST(),
    completed: overrides.completed ?? false,
    completed_at: overrides.completed_at ?? null,
    priority: overrides.priority ?? 0,
    notes: overrides.notes ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function mockTasks(
  userId: string,
  date?: string,
  items?: TaskOverrides[],
) {
  const d = date ?? todayKST();
  if (items) {
    return items.map((item, i) =>
      mockTask({ user_id: userId, date: d, priority: i, ...item }),
    );
  }
  // Default: 2 incomplete + 1 complete
  return [
    mockTask({ user_id: userId, date: d, title: "수학 공부", priority: 0 }),
    mockTask({ user_id: userId, date: d, title: "영어 읽기", priority: 1 }),
    mockTask({
      user_id: userId,
      date: d,
      title: "일기 쓰기",
      priority: 2,
      completed: true,
      completed_at: new Date().toISOString(),
    }),
  ];
}

/* ---------- Coins ---------- */

export function mockCoinBalance(userId: string, balance: number) {
  return {
    user_id: userId,
    balance,
    updated_at: new Date().toISOString(),
  };
}

export function mockCoinTransactions(
  userId: string,
  items?: Array<{
    amount: number;
    type: string;
    reason?: string;
  }>,
) {
  const defaults = items ?? [
    { amount: 1, type: "task_complete", reason: "수학 공부" },
    { amount: 1, type: "task_complete", reason: "영어 읽기" },
    { amount: 3, type: "allclear_bonus", reason: "올클리어 보너스" },
  ];
  return defaults.map((item, i) => ({
    id: randomUUID(),
    user_id: userId,
    amount: item.amount,
    type: item.type,
    reason: item.reason ?? null,
    ref_id: null,
    created_at: new Date(Date.now() - i * 60_000).toISOString(),
  }));
}

/* ---------- Month Stats (calendar) ---------- */

export function mockMonthTasks(userId: string, date: string) {
  return [
    { date, completed: true },
    { date, completed: true },
    { date, completed: false },
  ];
}
