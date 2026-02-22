import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { evaluateBadges } from "@/lib/badges/engine";
import type { DayTaskSummary } from "@/lib/badges/types";

const CHILD_IDS = ["sihyun", "misong"];

export async function POST(request: Request) {
  const supabase = createServerSupabase();

  let targetChildren = CHILD_IDS;
  try {
    const body = await request.json();
    if (body.childId && CHILD_IDS.includes(body.childId)) {
      targetChildren = CHILD_IDS; // 항상 전체 재계산 (sibling 연동 때문)
    }
  } catch {
    // body 없으면 전체
  }

  // 모든 아이의 task 데이터 로드
  const taskDataMap = new Map<string, DayTaskSummary[]>();

  for (const id of CHILD_IDS) {
    const { data } = await supabase
      .from("tasks")
      .select("date, completed, completed_at")
      .eq("child_id", id)
      .order("date");

    const dayMap = new Map<string, DayTaskSummary>();
    for (const task of data || []) {
      let day = dayMap.get(task.date);
      if (!day) {
        day = { date: task.date, total: 0, completed: 0, tasks: [] };
        dayMap.set(task.date, day);
      }
      day.total++;
      if (task.completed) day.completed++;
      day.tasks.push({
        completed: task.completed,
        completedAt: task.completed_at,
      });
    }
    taskDataMap.set(id, [...dayMap.values()]);
  }

  // 뱃지 재계산 및 저장
  const allRecords: {
    id: string;
    badge_id: string;
    child_id: string;
    earned_at: string;
    earned_date: string;
  }[] = [];

  for (const childId of targetChildren) {
    const siblingId = CHILD_IDS.find((id) => id !== childId) ?? "";
    const childDays = taskDataMap.get(childId) ?? [];
    const siblingDays = taskDataMap.get(siblingId) ?? [];

    const badges = evaluateBadges(childId, childDays, siblingDays);

    for (const badge of badges) {
      allRecords.push({
        id: badge.id,
        badge_id: badge.badgeId,
        child_id: badge.childId,
        earned_at: badge.earnedAt,
        earned_date: badge.earnedDate,
      });
    }
  }

  // 기존 레코드 삭제 후 새로 삽입
  for (const childId of targetChildren) {
    await supabase.from("badge_records").delete().eq("child_id", childId);
  }

  if (allRecords.length > 0) {
    await supabase.from("badge_records").upsert(allRecords);
  }

  return NextResponse.json({
    ok: true,
    count: allRecords.length,
    recalculatedAt: new Date().toISOString(),
  });
}
