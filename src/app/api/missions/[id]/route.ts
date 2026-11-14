import { NextResponse } from "next/server";
import { ensureDailyObjectives } from "@/lib/simulation/engine";
import { loadMission, saveMission } from "@/lib/server/db";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const savedMission = await loadMission(id);
    if (!savedMission) return NextResponse.json({ error: "Mission not found" }, { status: 404 });
    const mission = ensureDailyObjectives(savedMission);
    if (mission !== savedMission) await saveMission(mission);
    return NextResponse.json({ mission });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load mission";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
