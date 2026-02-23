import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

/** GET /api/templates — 템플릿 목록 */
export async function GET() {
  const { data, error } = await supabase
    .from("task_templates")
    .select("*")
    .order("created_at");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/** POST /api/templates — 템플릿 생성 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, tasks } = body;

  if (!name || !tasks) {
    return NextResponse.json(
      { error: "name and tasks required" },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("task_templates")
    .insert({ name, tasks });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
