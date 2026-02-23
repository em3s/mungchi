import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

/** POST /api/tasks/bulk — 벌크 생성 (admin 벌크추가 + 복제) */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { tasks } = body;

  if (!Array.isArray(tasks) || tasks.length === 0) {
    return NextResponse.json(
      { error: "tasks array required" },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("tasks").insert(tasks);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: tasks.length }, { status: 201 });
}
