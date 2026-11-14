import { NextRequest, NextResponse } from "next/server";
import { createMission } from "@/lib/simulation/engine";
import type { CreateMissionInput, Planet } from "@/lib/simulation/types";
import { saveMission } from "@/lib/server/db";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Partial<CreateMissionInput>;
    if (body.planet !== "MOON" && body.planet !== "MARS") return NextResponse.json({ error: "Choose MOON or MARS." }, { status: 400 });
    if (typeof body.playerName !== "string" || body.playerName.trim().length < 1) return NextResponse.json({ error: "Astronaut name is required." }, { status: 400 });
    if (typeof body.playerCharacterId !== "string") return NextResponse.json({ error: "Choose an astronaut." }, { status: 400 });
    const input: CreateMissionInput = {
      planet: body.planet as Planet,
      playerName: body.playerName.trim().slice(0, 32),
      playerCharacterId: body.playerCharacterId,
      supportCrewIds: Array.isArray(body.supportCrewIds) ? body.supportCrewIds.filter((x): x is string => typeof x === "string").slice(0, 3) : []
    };
    const mission = createMission(crypto.randomUUID(), input);
    await saveMission(mission);
    return NextResponse.json({ mission }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create mission";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
