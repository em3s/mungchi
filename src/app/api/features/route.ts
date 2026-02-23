import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

type FlagMap = Record<string, Record<string, boolean>>;

/** GET /api/features — 전체 피쳐플래그 */
export async function GET() {
  const { data } = await supabase.from("feature_flags").select("*");
  const map: FlagMap = {};
  if (data) {
    for (const row of data) {
      if (!map[row.child_id]) map[row.child_id] = {};
      map[row.child_id][row.feature] = row.enabled;
    }
  }

  return NextResponse.json(map);
}

/** PUT /api/features — 피쳐플래그 토글 */
export async function PUT(request: NextRequest) {
  const { child_id, feature, enabled } = await request.json();

  if (!child_id || !feature || typeof enabled !== "boolean") {
    return NextResponse.json(
      { error: "child_id, feature, enabled required" },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("feature_flags")
    .upsert({ child_id, feature, enabled });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
