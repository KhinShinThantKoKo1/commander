import { NextRequest, NextResponse } from "next/server";
import { applyCommand } from "@/lib/simulation/engine";
import type { MissionCommand } from "@/lib/simulation/types";
import { loadMission, saveMission } from "@/lib/server/db";

export const runtime = "nodejs";

const isCommand = (value: unknown): value is MissionCommand => {
  if (!value || typeof value !== "object" || !("type" in value)) return false;
  const command = value as Record<string, unknown>;
  if (command.type === "ADVANCE") return Number.isInteger(command.minutes) && Number(command.minutes) >= 0 && Number(command.minutes) <= 10080;
  if (command.type === "SET_SPEED") return command.speed === 0 || command.speed === 1 || command.speed === 3;
  if (command.type === "TOGGLE_SYSTEM") return typeof command.systemId === "string" && typeof command.enabled === "boolean";
  if (command.type === "DECIDE") return typeof command.incidentId === "string" && typeof command.choiceId === "string";
  if (command.type === "INTERACT") return typeof command.equipmentId === "string";
  if (command.type === "OPERATE") return typeof command.equipmentId === "string" && typeof command.actionId === "string";
  return false;
};

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json() as { command?: unknown };
    if (!isCommand(body.command)) return NextResponse.json({ error: "Invalid mission command" }, { status: 400 });
    const mission = await loadMission(id);
    if (!mission) return NextResponse.json({ error: "Mission not found" }, { status: 404 });
    const next = applyCommand(mission, body.command);
    await saveMission(next);
    return NextResponse.json({ mission: next });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not apply mission command";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
