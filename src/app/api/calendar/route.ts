import { NextRequest, NextResponse } from "next/server";
import { getEventsForMonth } from "@/lib/calendar";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const year = parseInt(searchParams.get("year") ?? "");
  const month = parseInt(searchParams.get("month") ?? "");

  if (isNaN(year) || isNaN(month) || month < 0 || month > 11) {
    return NextResponse.json(
      { error: "year and month (0-11) required" },
      { status: 400 },
    );
  }

  try {
    const events = await getEventsForMonth(year, month);
    return NextResponse.json(events, {
      headers: { "Cache-Control": "public, max-age=30" },
    });
  } catch {
    return NextResponse.json([], {
      headers: { "Cache-Control": "public, max-age=60" },
    });
  }
}
