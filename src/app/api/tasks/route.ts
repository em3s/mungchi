import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

/** GET /api/tasks?childId=X&date=Y */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const childId = searchParams.get("childId");
  const date = searchParams.get("date");

  if (!childId || !date) {
    return NextResponse.json(
      { error: "childId and date required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("child_id", childId)
    .eq("date", date)
    .order("priority", { ascending: false })
    .order("created_at");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/** POST /api/tasks — 단건 생성 (returns created row) */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { child_id, title, date, priority = 0 } = body;

  if (!child_id || !title || !date) {
    return NextResponse.json(
      { error: "child_id, title, date required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert({ child_id, title, date, priority })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
