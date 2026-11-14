import { NextResponse } from "next/server";
import { loadMission } from "@/lib/server/db";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const mission = await loadMission(id);
    if (!mission) return NextResponse.json({ error: "Mission not found" }, { status: 404 });
    return NextResponse.json({ mission });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load mission";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
