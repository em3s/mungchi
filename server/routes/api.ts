import { Hono } from "hono";
import { CHILDREN, getChild } from "../config.js";
import { readCache } from "../sync/cache.js";
import { syncAll } from "../sync/reminders.js";
import { recalculateAllBadges, getBadgesForChild, buildContext } from "../badges/engine.js";
import { todayKST } from "../lib/date.js";

const api = new Hono();

// 아이 목록
api.get("/children", (c) => {
  return c.json(
    CHILDREN.map((ch) => ({
      id: ch.id,
      name: ch.name,
      theme: ch.theme,
      emoji: ch.emoji,
    })),
  );
});

// 오늘 할일 + 통계
api.get("/children/:id/today", (c) => {
  const child = getChild(c.req.param("id"));
  if (!child) return c.json({ error: "Child not found" }, 404);

  const cache = readCache();
  const today = todayKST();
  const dayData = cache[child.id]?.[today];

  const tasks = dayData?.tasks ?? [];
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;

  return c.json({
    child: { id: child.id, name: child.name, emoji: child.emoji, theme: child.theme },
    date: today,
    tasks,
    stats: {
      total,
      completed,
      rate: total > 0 ? completed / total : 0,
    },
    syncedAt: dayData?.syncedAt ?? null,
  });
});

// 특정 날짜 할일 + 통계
api.get("/children/:id/date/:date", (c) => {
  const child = getChild(c.req.param("id"));
  if (!child) return c.json({ error: "Child not found" }, 404);

  const date = c.req.param("date");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return c.json({ error: "Invalid date format. Use YYYY-MM-DD" }, 400);
  }

  const cache = readCache();
  const dayData = cache[child.id]?.[date];

  const tasks = dayData?.tasks ?? [];
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;

  return c.json({
    child: { id: child.id, name: child.name, emoji: child.emoji, theme: child.theme },
    date,
    tasks,
    stats: {
      total,
      completed,
      rate: total > 0 ? completed / total : 0,
    },
    syncedAt: dayData?.syncedAt ?? null,
  });
});

// 월간 달성률 요약 (달력용)
api.get("/children/:id/month/:month", (c) => {
  const child = getChild(c.req.param("id"));
  if (!child) return c.json({ error: "Child not found" }, 404);

  const month = c.req.param("month"); // YYYY-MM
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return c.json({ error: "Invalid month format. Use YYYY-MM" }, 400);
  }

  const cache = readCache();
  const childData = cache[child.id] ?? {};

  const days: Record<string, { total: number; completed: number; rate: number }> = {};
  for (const [date, dayData] of Object.entries(childData)) {
    if (date.startsWith(month)) {
      const total = dayData.tasks.length;
      const completed = dayData.tasks.filter((t) => t.completed).length;
      days[date] = { total, completed, rate: total > 0 ? completed / total : 0 };
    }
  }

  return c.json({ childId: child.id, month, days });
});

// 뱃지 목록
api.get("/children/:id/badges", (c) => {
  const child = getChild(c.req.param("id"));
  if (!child) return c.json({ error: "Child not found" }, 404);

  const badges = getBadgesForChild(child.id);
  return c.json({ childId: child.id, badges });
});

// 달성률 통계
api.get("/children/:id/stats", (c) => {
  const child = getChild(c.req.param("id"));
  if (!child) return c.json({ error: "Child not found" }, 404);

  const range = c.req.query("range") ?? "week";
  const cache = readCache();
  const today = todayKST();
  const days = range === "month" ? 30 : 7;

  const stats: { date: string; total: number; completed: number; rate: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today + "T00:00:00+09:00");
    d.setDate(d.getDate() - i);
    const date = d.toISOString().slice(0, 10);
    const dayData = cache[child.id]?.[date];
    const total = dayData?.tasks.length ?? 0;
    const completed = dayData?.tasks.filter((t) => t.completed).length ?? 0;
    stats.push({ date, total, completed, rate: total > 0 ? completed / total : 0 });
  }

  return c.json({ childId: child.id, range, stats });
});

// 달성 맵 데이터
api.get("/children/:id/map", (c) => {
  const child = getChild(c.req.param("id"));
  if (!child) return c.json({ error: "Child not found" }, 404);

  const cache = readCache();
  const siblingId = CHILDREN.find((ch) => ch.id !== child.id)?.id ?? "";
  const ctx = buildContext(cache, child.id, siblingId);

  // 3월~12월 (9개월, 하루 ~10개, 총 ~2700개 기준)
  const milestones = [
    { node: 1, label: "출발!", required: 0, emoji: "🚀" },
    { node: 2, label: "첫 걸음", required: 10, emoji: "👣" },
    { node: 3, label: "힘을 내요", required: 30, emoji: "💪" },
    { node: 4, label: "잘하고 있어!", required: 60, emoji: "🌱" },
    { node: 5, label: "쑥쑥 성장", required: 100, emoji: "🌿" },
    { node: 6, label: "달리기 시작!", required: 150, emoji: "🏃" },
    { node: 7, label: "대단해!", required: 200, emoji: "🌈" },
    { node: 8, label: "습관의 힘", required: 300, emoji: "⭐" },
    { node: 9, label: "반쯤 왔다!", required: 400, emoji: "🎯" },
    { node: 10, label: "슈퍼스타", required: 500, emoji: "🌟" },
    { node: 11, label: "멈출 수 없어!", required: 650, emoji: "🔥" },
    { node: 12, label: "전설의 시작", required: 800, emoji: "🏆" },
    { node: 13, label: "마스터", required: 1000, emoji: "👑" },
    { node: 14, label: "초월자", required: 1300, emoji: "⚡" },
    { node: 15, label: "레전드", required: 1600, emoji: "🐉" },
    { node: 16, label: "신화", required: 2000, emoji: "🦄" },
    { node: 17, label: "우주 정복!", required: 2500, emoji: "🪐" },
  ];

  const currentNode = milestones.reduce(
    (acc, m) => (ctx.totalCompleted >= m.required ? m.node : acc),
    0,
  );

  return c.json({
    childId: child.id,
    theme: child.theme,
    totalCompleted: ctx.totalCompleted,
    currentNode,
    milestones: milestones.map((m) => ({
      ...m,
      unlocked: ctx.totalCompleted >= m.required,
      current: m.node === currentNode,
    })),
  });
});

// 수동 싱크
api.post("/sync", async (c) => {
  await syncAll();
  // 싱크 후 뱃지 전체 재계산
  recalculateAllBadges();
  return c.json({ ok: true, syncedAt: new Date().toISOString() });
});

export default api;
