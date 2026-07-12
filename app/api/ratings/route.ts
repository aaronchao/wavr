import { NextResponse } from "next/server";

// M6: RatingsProvider fallback ladder (Douban/Xiaoyuzhou), 7d cache.
export function GET() {
  return NextResponse.json({ error: "not_implemented" }, { status: 501 });
}
