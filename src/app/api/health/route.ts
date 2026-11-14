import { NextResponse } from "next/server";
import { databaseHealth } from "@/lib/server/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const database = await databaseHealth();
    return NextResponse.json({ status: "ok", app: "Launch Lab", timestamp: new Date().toISOString(), database });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown health-check error";
    return NextResponse.json({ status: "error", message }, { status: 503 });
  }
}
