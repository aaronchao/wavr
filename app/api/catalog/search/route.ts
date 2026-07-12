import { NextResponse } from "next/server";

// M1: proxy iTunes Search (primary) -> Podcast Index (secondary).
export function GET() {
  return NextResponse.json({ error: "not_implemented" }, { status: 501 });
}
