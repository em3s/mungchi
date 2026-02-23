import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

/** GET /api/tasks/badges?childId=X — 뱃지 평가용 */
export async function GET(request: NextRequest) {
  const childId = request.nextUrl.searchParams.get("childId");

  if (!childId) {
    return NextResponse.json(
      { error: "childId required" },
      { status: 400 },
    );
  }

  const { data } = await supabase
    .from("tasks")
    .select("date, completed, completed_at")
    .eq("child_id", childId)
    .order("date");

  return NextResponse.json(data);
}
