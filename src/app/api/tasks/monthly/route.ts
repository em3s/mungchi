import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

/** GET /api/tasks/monthly?childId=X&from=Y&to=Z */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const childId = searchParams.get("childId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!childId || !from || !to) {
    return NextResponse.json(
      { error: "childId, from, to required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("tasks")
    .select("date, completed")
    .eq("child_id", childId)
    .gte("date", from)
    .lte("date", to);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
