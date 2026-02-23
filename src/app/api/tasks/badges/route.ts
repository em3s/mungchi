import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { cached } from "@/lib/cache";

/** GET /api/tasks/badges?childId=X — 뱃지 평가용 (1분 캐시) */
export async function GET(request: NextRequest) {
  const childId = request.nextUrl.searchParams.get("childId");

  if (!childId) {
    return NextResponse.json(
      { error: "childId required" },
      { status: 400 },
    );
  }

  const data = await cached(`badge_tasks:${childId}`, 60_000, async () => {
    const { data } = await supabase
      .from("tasks")
      .select("date, completed, completed_at")
      .eq("child_id", childId)
      .order("date");
    return data;
  });

  return NextResponse.json(data);
}
