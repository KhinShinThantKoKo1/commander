import { describe, expect, it } from "vitest";
import { advanceMinutes, applyCommand, createMission } from "../src/lib/simulation/engine";
import { EQUIPMENT_CATALOG } from "../src/lib/simulation/equipment";
import type { CreateMissionInput } from "../src/lib/simulation/types";

const input: CreateMissionInput = {
  planet: "MOON",
  playerName: "Test Cadet",
  playerCharacterId: "user-magenta",
  supportCrewIds: ["sofia", "christopher", "jewel"]
};
const createdAt = "2026-11-14T00:00:00.000Z";

function mission() {
  return createMission("00000000-0000-4000-8000-000000000001", input, createdAt);
}

describe("Launch Lab simulation", () => {
  it("starts with four crew and separate oxygen and CO2 inventories", () => {
    const state = mission();
    expect(state.crew).toHaveLength(4);
    expect(state.resources.oxygenKg).toBeGreaterThan(0);
    expect(state.resources.co2Kg).toBeGreaterThan(0);
    expect(state.resources.oxygenPartialPressureKpa).toBeGreaterThan(0);
    expect(state.resources.co2PartialPressureKpa).toBeGreaterThan(0);
  });

  it("replays the same starting state and commands deterministically", () => {
    const a = advanceMinutes(mission(), 10);
    const b = advanceMinutes(mission(), 10);
    expect(a).toEqual(b);
  });

  it("uses a fixed one-minute time step and pause advances zero minutes", () => {
    const started = mission();
    const paused = applyCommand(started, { type: "SET_SPEED", speed: 0 });
    expect(paused.elapsedMinutes).toBe(0);
    expect(paused.speed).toBe(0);
    const afterOneTick = advanceMinutes(started, 1);
    expect(afterOneTick.elapsedMinutes).toBe(1);
    expect(afterOneTick.day).toBe(1);
  });

  it("balances battery energy using power times one minute", () => {
    const start = mission();
    const next = advanceMinutes(start, 1);
    const delta = next.resources.batteryKwh - start.resources.batteryKwh;
    const expected = (next.resources.solarGenerationKw - next.resources.electricalDemandKw) / 60;
    expect(delta).toBeCloseTo(expected, 6);
  });

  it("turning off life support lets oxygen fall and CO2 rise independently", () => {
    const start = applyCommand(mission(), { type: "TOGGLE_SYSTEM", systemId: "life-support", enabled: false });
    const next = advanceMinutes(start, 15);
    expect(next.resources.oxygenKg).toBeLessThan(start.resources.oxygenKg);
    expect(next.resources.co2Kg).toBeGreaterThan(start.resources.co2Kg);
  });

  it("does not exceed the seven-day mission horizon", () => {
    const start = mission();
    const next = advanceMinutes(start, 10_080);
    expect(next.elapsedMinutes).toBeLessThanOrEqual(10_080);
    expect(next.day).toBeLessThanOrEqual(7);
  });


  it("raises the scheduled Mars dust training incident on Day 1", () => {
    const mars = createMission("00000000-0000-4000-8000-000000000002", {
      ...input,
      planet: "MARS"
    }, createdAt);
    const afterThirtyMinutes = advanceMinutes(mars, 30);
    expect(afterThirtyMinutes.activeIncident?.kind).toBe("MARS_DUST");
    expect(afterThirtyMinutes.activeIncident?.choices).toHaveLength(5);
    expect(afterThirtyMinutes.eventFlags).toContain("mars-dust-training-event");
  });

  it("defines fifteen explorable equipment objects with timed actions and failure conditions", () => {
    expect(EQUIPMENT_CATALOG).toHaveLength(15);
    for (const item of EQUIPMENT_CATALOG) {
      expect(item.actions.length).toBeGreaterThan(0);
      for (const action of item.actions) {
        expect(action.durationMinutes).toBeGreaterThanOrEqual(0);
        expect(action.requirements.length).toBeGreaterThan(0);
        expect(action.failureConditions.length).toBeGreaterThan(0);
      }
    }
  });
});
