import { NextResponse } from "next/server";

// M1: show lookup via iTunes -> Podcast Index, cached in `shows`.
export function GET() {
  return NextResponse.json({ error: "not_implemented" }, { status: 501 });
}
