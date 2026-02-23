/**
 * 데이터 마이그레이션 스크립트
 * cache.json → tasks 테이블
 * badges.json → badge_records 테이블
 *
 * 실행: npx tsx scripts/migrate-data.ts
 *
 * 환경변수 필요:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (Supabase 대시보드에서 직접 복사)
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "node:fs";
import * as path from "node:path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 기존 데이터 파일 경로 (프로젝트 루트의 data/)
const DATA_DIR = path.resolve(__dirname, "../../data");
const CACHE_PATH = path.join(DATA_DIR, "cache.json");
const BADGES_PATH = path.join(DATA_DIR, "badges.json");

interface OldTask {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: string;
  dueDate?: string;
  priority: number;
  notes?: string;
}

interface OldDayData {
  date: string;
  tasks: OldTask[];
  syncedAt: string;
}

interface CacheData {
  [childId: string]: {
    [date: string]: OldDayData;
  };
}

interface OldBadgeRecord {
  id: string;
  badgeId: string;
  childId: string;
  earnedAt: string;
  context?: Record<string, unknown>;
}

async function migrateTasks() {
  console.log("📋 할일 마이그레이션 시작...");

  if (!fs.existsSync(CACHE_PATH)) {
    console.log("⚠️ cache.json 없음, 스킵");
    return;
  }

  const cache: CacheData = JSON.parse(fs.readFileSync(CACHE_PATH, "utf-8"));
  let totalCount = 0;

  for (const [childId, days] of Object.entries(cache)) {
    const tasks: {
      child_id: string;
      title: string;
      date: string;
      completed: boolean;
      completed_at: string | null;
      priority: number;
      notes: string | null;
    }[] = [];

    for (const [date, dayData] of Object.entries(days)) {
      for (const task of dayData.tasks) {
        tasks.push({
          child_id: childId,
          title: task.title,
          date,
          completed: task.completed,
          completed_at: task.completedAt || null,
          priority: task.priority,
          notes: task.notes || null,
        });
      }
    }

    // 배치 삽입 (500개씩)
    for (let i = 0; i < tasks.length; i += 500) {
      const batch = tasks.slice(i, i + 500);
      const { error } = await supabase.from("tasks").insert(batch);
      if (error) {
        console.error(`❌ ${childId} 할일 삽입 오류:`, error.message);
      }
    }

    console.log(`  ✅ ${childId}: ${tasks.length}개 할일 마이그레이션 완료`);
    totalCount += tasks.length;
  }

  console.log(`📋 총 ${totalCount}개 할일 마이그레이션 완료\n`);
}

async function migrateBadges() {
  console.log("🏅 뱃지 마이그레이션 시작...");

  if (!fs.existsSync(BADGES_PATH)) {
    console.log("⚠️ badges.json 없음, 스킵");
    return;
  }

  const data: { badges: OldBadgeRecord[] } = JSON.parse(
    fs.readFileSync(BADGES_PATH, "utf-8")
  );

  const records = data.badges.map((b) => {
    // earnedAt에서 KST 날짜 추출
    const earnedDate = new Date(
      new Date(b.earnedAt).getTime() + 9 * 60 * 60 * 1000
    )
      .toISOString()
      .slice(0, 10);

    return {
      id: b.id,
      badge_id: b.badgeId,
      child_id: b.childId,
      earned_at: b.earnedAt,
      earned_date: earnedDate,
      context: b.context || null,
    };
  });

  // 배치 삽입
  for (let i = 0; i < records.length; i += 500) {
    const batch = records.slice(i, i + 500);
    const { error } = await supabase.from("badge_records").upsert(batch);
    if (error) {
      console.error(`❌ 뱃지 삽입 오류:`, error.message);
    }
  }

  console.log(`🏅 총 ${records.length}개 뱃지 레코드 마이그레이션 완료\n`);
}

async function verify() {
  console.log("🔍 검증 중...");

  const { count: taskCount } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true });

  const { count: badgeCount } = await supabase
    .from("badge_records")
    .select("*", { count: "exact", head: true });

  console.log(`  tasks 테이블: ${taskCount}개`);
  console.log(`  badge_records 테이블: ${badgeCount}개`);

  // 아이별 통계
  for (const childId of ["sihyun", "misong"]) {
    const { count: cTaskCount } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("child_id", childId);

    const { count: cCompletedCount } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("child_id", childId)
      .eq("completed", true);

    const { count: cBadgeCount } = await supabase
      .from("badge_records")
      .select("*", { count: "exact", head: true })
      .eq("child_id", childId);

    console.log(
      `  ${childId}: 할일 ${cTaskCount}개 (완료 ${cCompletedCount}개), 뱃지 ${cBadgeCount}개`
    );
  }
}

async function main() {
  console.log("🚀 mungchi 데이터 마이그레이션 시작\n");

  await migrateTasks();
  await migrateBadges();
  await verify();

  console.log("\n✨ 마이그레이션 완료!");
}

main().catch(console.error);
