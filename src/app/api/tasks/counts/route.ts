import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { cached } from "@/lib/cache";

/** GET /api/tasks/counts — 맵 완료 카운트 (1분 캐시) */
export async function GET() {
  const counts = await cached("map_counts", 60_000, async () => {
    const [total, sihyun, misong] = await Promise.all([
      supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("completed", true),
      supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("child_id", "sihyun")
        .eq("completed", true),
      supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("child_id", "misong")
        .eq("completed", true),
    ]);
    return {
      total: total.count ?? 0,
      sihyun: sihyun.count ?? 0,
      misong: misong.count ?? 0,
    };
  });

  return NextResponse.json(counts);
}
