import { describe, expect, it } from "vitest";
import { advanceMinutes, applyCommand, createMission, ensureDailyObjectives, getEducationalHint } from "../src/lib/simulation/engine";
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
    expect(state.difficulty).toBe("STANDARD");
    expect(state.resources.batteryKwh).toBe(58);
  });

  it("applies harder starting reserves, panel output, and wear without changing reference consumption", () => {
    const standard = mission();
    const challenging = createMission("challenging", { ...input, difficulty: "CHALLENGING" }, createdAt);
    const expert = createMission("expert", { ...input, difficulty: "EXPERT" }, createdAt);

    expect(challenging.resources.batteryKwh).toBeLessThan(standard.resources.batteryKwh);
    expect(expert.resources.oxygenKg).toBeLessThan(challenging.resources.oxygenKg);
    expect(expert.resources.potableWaterKg).toBeLessThan(challenging.resources.potableWaterKg);
    expect(expert.resources.panelCondition).toBeLessThan(challenging.resources.panelCondition);
    expect(expert.resources.spareParts).toBeLessThan(challenging.resources.spareParts);
    expect(expert.resources.oxygenPartialPressureKpa).toBeGreaterThan(16);
    expect(advanceMinutes(expert, 1).resources.solarGenerationKw).toBeLessThan(advanceMinutes(challenging, 1).resources.solarGenerationKw);

    const standardNext = advanceMinutes(standard, 1);
    const expertNext = advanceMinutes(expert, 1);
    expect(standard.resources.oxygenKg - standardNext.resources.oxygenKg).toBeCloseTo(expert.resources.oxygenKg - expertNext.resources.oxygenKg, 6);
    const expertForWearTest = { ...expert, resolvedIncidentIds: ["power-reserve-day-1", "life-support-fault-day-1"] };
    expect(advanceMinutes(expertForWearTest, 180).systems[0].condition).toBeLessThan(expert.systems[0].condition);
    expect(advanceMinutes(standard, 180).systems[0].condition).toBe(standard.systems[0].condition);
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

  it("reaches Day 2 after 1440 simulated minutes when no incident interrupts progression", () => {
    const started = mission();
    const stable = {
      ...started,
      objectives: started.objectives.map((objective) => ({ ...objective, complete: true })),
      resources: { ...started.resources, batteryKwh: started.resources.batteryCapacityKwh },
      systems: started.systems.map((system) => ["greenhouse", "rover", "science-lab"].includes(system.id)
        ? { ...system, status: "OFF" as const }
        : system)
    };

    const dayTwo = advanceMinutes(stable, 1440);
    expect(dayTwo.elapsedMinutes).toBe(1440);
    expect(dayTwo.day).toBe(2);
    expect(dayTwo.activeIncident).toBeNull();
    expect(dayTwo.telemetry.find((entry) => entry.title === "Mission day 2")?.detail).toContain("Check the analyzer before testing a lunar water batch");
  });

  it("holds the simulation at day end until all three daily objectives are complete", () => {
    const started = mission();
    const nearDayEnd = {
      ...started,
      elapsedMinutes: 1438,
      resources: { ...started.resources, batteryKwh: started.resources.batteryCapacityKwh },
      systems: started.systems.map((system) => ["greenhouse", "rover", "science-lab"].includes(system.id)
        ? { ...system, status: "OFF" as const }
        : system)
    };

    const held = advanceMinutes(nearDayEnd, 10);
    expect(held.elapsedMinutes).toBe(1439);
    expect(held.day).toBe(1);
    expect(held.lastMessage).toContain("Complete all three daily objectives");

    const completedToday = {
      ...nearDayEnd,
      objectives: nearDayEnd.objectives.map((objective) => ({ ...objective, complete: objective.day === 1 || objective.complete }))
    };
    const advanced = advanceMinutes(completedToday, 2);
    expect(advanced.elapsedMinutes).toBe(1440);
    expect(advanced.day).toBe(2);
  });

  it("creates three source-linked objectives per day with different lunar and Mars schedules", () => {
    const lunar = mission();
    const mars = createMission("mars", { ...input, planet: "MARS" }, createdAt);
    for (const state of [lunar, mars]) {
      expect(state.objectives).toHaveLength(21);
      expect(new Set(state.objectives.map((objective) => objective.id)).size).toBe(21);
      for (let day = 1; day <= 7; day += 1) {
        expect(state.objectives.filter((objective) => objective.day === day)).toHaveLength(3);
      }
    }

    for (let day = 1; day <= 7; day += 1) {
      const lunarTitles = lunar.objectives.filter((objective) => objective.day === day).map((objective) => objective.title);
      const marsTitles = mars.objectives.filter((objective) => objective.day === day).map((objective) => objective.title);
      expect(lunarTitles).not.toEqual(marsTitles);
      expect(lunarTitles.every((title, index) => title !== marsTitles[index])).toBe(true);
    }
    expect(mars.objectives.find((objective) => objective.id === "day-1-oxygen-inspection")?.reference?.note).toContain("122 g");
    expect(lunar.objectives.find((objective) => objective.id === "day-3-rover-survey")?.reference?.url).toContain("lro/nasa-moon-camera");
    expect(mars.objectives.find((objective) => objective.id === "day-4-power-audit")?.reference?.note).toContain("425 to 275");
  });

  it("completes planet-specific daily actions against the selected schedule", () => {
    const moon = { ...mission(), day: 3, elapsedMinutes: 2 * 1440 };
    const lunarArrayInspection = applyCommand(moon, {
      type: "OPERATE",
      equipmentId: "solar-array",
      actionId: "inspect"
    });
    expect(lunarArrayInspection.objectives.find((objective) => objective.id === "day-3-array-inspection")?.complete).toBe(true);

    const mars = { ...createMission("mars-actions", { ...input, planet: "MARS" }, createdAt), day: 5, elapsedMinutes: 4 * 1440 };
    const martianArrayInspection = applyCommand(mars, {
      type: "OPERATE",
      equipmentId: "solar-array",
      actionId: "inspect"
    });
    expect(martianArrayInspection.objectives.find((objective) => objective.id === "mars-day-5-array-inspection")?.complete).toBe(true);

    const marsMaintenance = { ...createMission("mars-maintenance", { ...input, planet: "MARS" }, createdAt), day: 3, elapsedMinutes: 2 * 1440 };
    const inspectedMaintenance = applyCommand(marsMaintenance, {
      type: "OPERATE",
      equipmentId: "maintenance-bench",
      actionId: "inspect"
    });
    expect(inspectedMaintenance.objectives.find((objective) => objective.id === "mars-day-3-maintenance-inspection")?.complete).toBe(true);

    const marsAirlock = { ...createMission("mars-airlock", { ...input, planet: "MARS" }, createdAt), day: 6, elapsedMinutes: 5 * 1440 };
    const inspectedAirlock = applyCommand(marsAirlock, {
      type: "OPERATE",
      equipmentId: "airlock-panel",
      actionId: "inspect"
    });
    expect(inspectedAirlock.objectives.find((objective) => objective.id === "mars-day-6-airlock-inspection")?.complete).toBe(true);
  });

  it("does not credit a future daily objective until its mission day arrives", () => {
    const earlyInspection = applyCommand(mission(), {
      type: "OPERATE",
      equipmentId: "water-processor",
      actionId: "inspect"
    });
    expect(earlyInspection.objectives.find((objective) => objective.id === "day-2-water-processor-inspection")?.complete).toBe(false);

    const dayTwo = { ...mission(), day: 2, elapsedMinutes: 1440 };
    const completedInspection = applyCommand(dayTwo, {
      type: "OPERATE",
      equipmentId: "water-processor",
      actionId: "inspect"
    });
    expect(completedInspection.objectives.find((objective) => objective.id === "day-2-water-processor-inspection")?.complete).toBe(true);
  });

  it("migrates completed objectives from saved missions to the new daily schedule", () => {
    const oldMission = {
      ...mission(),
      objectives: [
        { id: "life-support-inspection", title: "Inspect life support", complete: true },
        { id: "water-quality", title: "Verify water", complete: false },
        { id: "rover-survey", title: "Inspect rover", complete: true }
      ]
    };
    const migrated = ensureDailyObjectives(oldMission);
    expect(migrated.objectives).toHaveLength(21);
    expect(migrated.objectives.find((objective) => objective.id === "day-1-oxygen-inspection")?.complete).toBe(true);
    expect(migrated.objectives.find((objective) => objective.id === "day-3-rover-inspection")?.complete).toBe(true);

    const currentSchedule = mission();
    const previousDailySchedule = {
      ...currentSchedule,
      objectives: currentSchedule.objectives.map((objective) => objective.id === "day-2-water-analyzer-inspection"
        ? { ...objective, id: "day-2-water-recovery-cycle", title: "Run a wastewater recovery cycle" }
        : objective)
    };
    expect(ensureDailyObjectives(previousDailySchedule).objectives.some((objective) => objective.id === "day-2-water-analyzer-inspection")).toBe(true);
  });

  it("records useful live readings when equipment is inspected", () => {
    const clicked = applyCommand(mission(), { type: "INTERACT", equipmentId: "oxygen-generator" });
    expect(clicked.telemetry.at(-1)?.title).toBe("Inspection — oxygen generator");
    expect(clicked.telemetry.at(-1)?.detail).toContain("O₂");
    expect(clicked.telemetry.at(-1)?.detail).toContain("CO₂");
    expect(clicked.lastMessage).toContain("Inspection — oxygen generator");

    const inspected = applyCommand(mission(), { type: "OPERATE", equipmentId: "oxygen-generator", actionId: "inspect" });
    const entry = inspected.telemetry.find((item) => item.title === "Oxygen generation unit — Inspect");
    expect(entry?.detail).toContain("life support");
    expect(entry?.detail).toContain("O₂");
    expect(entry?.detail).toContain("CO₂");

    const assignedInspection = applyCommand(mission(), { type: "INTERACT", equipmentId: "oxygen-generator", crewId: "crew-1" });
    expect(assignedInspection.telemetry.at(-1)?.title).toBe("Sofia — Inspection — oxygen generator");
    expect(assignedInspection.crew[1].currentTask).toBe("Inspecting Oxygen generation unit");
    expect(assignedInspection.crew[1].currentTaskEquipmentId).toBe("oxygen-generator");
  });

  it("runs an existing equipment job with the selected support crew member", () => {
    const assigned = applyCommand(mission(), {
      type: "OPERATE",
      equipmentId: "battery-bank",
      actionId: "battery-audit",
      crewId: "crew-1"
    });

    expect(assigned.crew[0].currentTask).toBe("On standby");
    expect(assigned.crew[1].currentTask).toBe("Audit battery balance");
    expect(assigned.crew[1].currentTaskEquipmentId).toBe("battery-bank");
    expect(assigned.telemetry.find((entry) => entry.title.includes("Sofia — Battery storage bank"))?.detail).toContain("Generation");
  });

  it("does not run an assigned job when the selected crew member is unavailable", () => {
    const started = mission();
    const unavailableCrew = {
      ...started,
      crew: started.crew.map((member) => member.id === "crew-1" ? { ...member, available: false } : member)
    };

    const result = applyCommand(unavailableCrew, {
      type: "OPERATE",
      equipmentId: "battery-bank",
      actionId: "battery-audit",
      crewId: "crew-1"
    });

    expect(result.lastMessage).toContain("selected crew member is unavailable");
    expect(result.elapsedMinutes).toBe(started.elapsedMinutes);
    expect(result.crew[0].currentTask).toBe("On standby");
  });

  it("answers MIRA questions using mission readings and guides unsupported questions", () => {
    const current = advanceMinutes(mission(), 1);
    const powerAnswer = getEducationalHint(current, "How is power doing?");
    expect(powerAnswer).toContain(`${current.resources.solarGenerationKw.toFixed(2)} kW`);
    expect(powerAnswer).toContain(`${current.resources.batteryKwh.toFixed(1)} kWh`);

    const waterAnswer = getEducationalHint(current, "Can we use the water?");
    expect(waterAnswer).toContain(`${current.resources.potableWaterKg.toFixed(1)} kg potable`);

    expect(getEducationalHint(current, "Tell me about something else")).toContain("power, battery, oxygen");
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

  it("fails if oxygen or water falls below the NASA reference one-day emergency reserve", () => {
    const base = mission();
    const oxygenCritical = {
      ...base,
      resources: { ...base.resources, oxygenKg: base.crew.length * 0.90 * 0.5, potableWaterKg: base.crew.length * 4.48 * 2 }
    };
    const oxygenResult = advanceMinutes(oxygenCritical, 1);
    expect(oxygenResult.status).toBe("FAILED");
    expect(oxygenResult.lastMessage).toContain("Oxygen reserve fell below");

    const waterCritical = {
      ...base,
      resources: { ...base.resources, oxygenKg: base.crew.length * 0.90 * 1.5, potableWaterKg: base.crew.length * 4.48 * 0.5 }
    };
    const waterResult = advanceMinutes(waterCritical, 1);
    expect(waterResult.status).toBe("FAILED");
    expect(waterResult.lastMessage).toContain("potable-water reserves fell below");
  });

  it("wins only when all objectives and emergency reserve thresholds are met by day 7", () => {
    const start = mission();
    const daySevenState = {
      ...start,
      elapsedMinutes: 7 * 1440 - 1,
      day: 7,
      objectives: start.objectives.map((objective) => ({ ...objective, complete: true })),
      resources: {
        ...start.resources,
        oxygenKg: 85,
        potableWaterKg: 180,
        foodKg: 80,
        oxygenPartialPressureKpa: 21,
        co2PartialPressureKpa: 0.1
      }
    };
    const result = advanceMinutes(daySevenState, 1);
    expect(result.status).toBe("SUCCESS");
    expect(result.lastMessage).toContain("NASA reference reserves");
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
