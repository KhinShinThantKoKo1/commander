import { GAMEPLAY_ASSUMPTIONS, SCIENCE_DATA_VERSION, SCIENCE_REFERENCES } from "./science";
import { EQUIPMENT_CATALOG as equipmentCatalog } from "./equipment";
import type {
  CreateMissionInput, Difficulty, EquipmentSystem, IncidentChoice, IncidentKind, MissionCommand,
  MissionIncident, MissionLogEntry, MissionObjective, MissionState, Planet
} from "./types";

const R = 8.314462618;
const MOLAR_MASS_O2_KG = 0.031998;
const MOLAR_MASS_CO2_KG = 0.04401;
const MINUTES_PER_DAY = 1440;
type ObjectiveSource = NonNullable<MissionObjective["reference"]>;
type ScienceSource = { title: string; url: string; notes: string };

function objective(
  id: string,
  day: number,
  title: string,
  source?: ScienceSource
): Omit<MissionObjective, "complete"> {
  return {
    id,
    day,
    title,
    ...(source ? { reference: { title: source.title, url: source.url, note: source.notes } satisfies ObjectiveSource } : {})
  };
}

const DAILY_OBJECTIVES: Record<Planet, Omit<MissionObjective, "complete">[]> = {
  MOON: [
    objective("day-1-oxygen-inspection", 1, "Check oxygen-generation status for the lunar habitat", SCIENCE_REFERENCES.eclss),
    objective("day-1-co2-inspection", 1, "Review CO₂ removal before planning surface activity", SCIENCE_REFERENCES.eclss),
    objective("day-1-habitat-inspection", 1, "Inspect habitat pressure and thermal controls", SCIENCE_REFERENCES.eclss),
    objective("day-2-water-processor-inspection", 2, "Inspect water recovery; do not assume polar ice is accessible", SCIENCE_REFERENCES.lunarPolarSurvey),
    objective("day-2-water-analyzer-inspection", 2, "Check the analyzer before testing a lunar water batch", SCIENCE_REFERENCES.issWater2023),
    objective("day-2-water-quality-check", 2, "Verify recovered water; local polar ice is not assumed", SCIENCE_REFERENCES.lunarPolarSurvey),
    objective("day-3-rover-inspection", 3, "Inspect the rover before a lunar south-pole traverse", SCIENCE_REFERENCES.lunarPolarSurvey),
    objective("day-3-rover-survey", 3, "Survey a route between sunlit terrain and shadowed craters", SCIENCE_REFERENCES.lunarPolarSurvey),
    objective("day-3-array-inspection", 3, "Inspect solar-array condition against local light and shadow", SCIENCE_REFERENCES.lunarPolarSurvey),
    objective("day-4-power-audit", 4, "Audit stored energy for changing polar illumination", SCIENCE_REFERENCES.lunarPolarSurvey),
    objective("day-4-load-shedding", 4, "Shed optional loads to protect essentials during low-light periods", SCIENCE_REFERENCES.lunarPolarSurvey),
    objective("day-4-communications-inspection", 4, "Inspect the relay link before remote surface work", SCIENCE_REFERENCES.spaceCommunications),
    objective("day-5-shelter-preparation", 5, "Prepare the shelter for lunar surface operations"),
    objective("day-5-shelter-inspection", 5, "Confirm the lunar crew shelter is ready"),
    objective("day-5-airlock-inspection", 5, "Inspect the airlock for fine regolith carry-in", SCIENCE_REFERENCES.lunarDust),
    objective("day-6-food-inventory", 6, "Audit food stores for the lunar crew", SCIENCE_REFERENCES.bvad),
    objective("day-6-maintenance-inspection", 6, "Inspect tools and equipment for lunar-dust contamination", SCIENCE_REFERENCES.lunarDust),
    objective("day-6-airlock-cycle", 6, "Complete an airlock cycle after surface operations", SCIENCE_REFERENCES.lunarDust),
    objective("day-7-status-report", 7, "Send the final lunar surface status report", SCIENCE_REFERENCES.spaceCommunications),
    objective("day-7-battery-inspection", 7, "Inspect stored energy after the polar lighting cycle", SCIENCE_REFERENCES.lunarPolarSurvey),
    objective("day-7-food-inspection", 7, "Review food stores before the next lunar operation", SCIENCE_REFERENCES.bvad)
  ],
  MARS: [
    objective("day-1-oxygen-inspection", 1, "Review MOXIE's demonstrated oxygen output—not a crew supply", SCIENCE_REFERENCES.marsMoxie),
    objective("day-1-co2-inspection", 1, "Inspect CO₂ removal for the sealed Mars habitat", SCIENCE_REFERENCES.eclss),
    objective("day-1-habitat-inspection", 1, "Check habitat pressure controls against the thin Martian exterior", SCIENCE_REFERENCES.marsMoxie),
    objective("day-2-water-processor-inspection", 2, "Inspect water recovery; no Martian extraction is modeled", SCIENCE_REFERENCES.issWater2023),
    objective("day-2-water-analyzer-inspection", 2, "Check the analyzer for habitat-recycled water", SCIENCE_REFERENCES.issWater2023),
    objective("day-2-water-quality-check", 2, "Release only a verified recycled-water batch", SCIENCE_REFERENCES.eclss),
    objective("day-3-rover-inspection", 3, "Inspect the rover before a Mars surface traverse", SCIENCE_REFERENCES.marsTrek),
    objective("day-3-rover-survey", 3, "Survey terrain using Mars imagery as a planning reference", SCIENCE_REFERENCES.marsTrek),
    objective("mars-day-3-maintenance-inspection", 3, "Inspect rover-support equipment for dust-related wear", SCIENCE_REFERENCES.marsDustStorm),
    objective("day-4-power-audit", 4, "Compare power reserves with InSight's documented dust-storm decline", SCIENCE_REFERENCES.marsDustStorm),
    objective("day-4-load-shedding", 4, "Shed optional loads if dust reduces solar input", SCIENCE_REFERENCES.marsDustStorm),
    objective("day-4-communications-inspection", 4, "Review Mars relay operations and one-way communication delay", SCIENCE_REFERENCES.marsCommunications),
    objective("day-5-shelter-preparation", 5, "Prepare the shelter for Mars surface operations"),
    objective("day-5-shelter-inspection", 5, "Confirm the Mars crew shelter is ready"),
    objective("mars-day-5-array-inspection", 5, "Inspect panels for dust-related power loss", SCIENCE_REFERENCES.marsDustStorm),
    objective("day-6-food-inventory", 6, "Audit food stores for the Mars crew", SCIENCE_REFERENCES.bvad),
    objective("mars-day-6-airlock-inspection", 6, "Inspect airlock sealing surfaces after dust-exposed operations", SCIENCE_REFERENCES.marsDustStorm),
    objective("day-6-airlock-cycle", 6, "Complete an airlock cycle after Mars surface operations"),
    objective("day-7-status-report", 7, "Queue the final Mars report with relay delay in mind", SCIENCE_REFERENCES.marsCommunications),
    objective("day-7-battery-inspection", 7, "Inspect stored energy after dust-risk operations", SCIENCE_REFERENCES.marsDustStorm),
    objective("day-7-food-inspection", 7, "Review food stores before the next Mars operating cycle", SCIENCE_REFERENCES.bvad)
  ]
};

const ROSTER: Record<string, { name: string; role: string; image: string }> = {
  sofia: { name: "Sofia", role: "Commander", image: "sofia" },
  pilot: { name: "Pilot Andrews", role: "Pilot", image: "pilot-andrews" },
  alexander: { name: "Alexander", role: "Navigation Officer", image: "alexander" },
  christopher: { name: "Christopher", role: "Engineer", image: "christopher" },
  llian: { name: "Llian", role: "Ecologist", image: "llian" },
  jewel: { name: "Jewel", role: "Medic", image: "jewel" },
  "user-magenta": { name: "New Astronaut", role: "Amateur Astronaut", image: "user-magenta" },
  "user-black": { name: "New Astronaut", role: "Amateur Astronaut", image: "user-black" }
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function simulatedTimestamp(state: MissionState): string {
  const start = Date.parse(state.createdAt);
  if (!Number.isFinite(start)) return state.createdAt;
  return new Date(start + state.elapsedMinutes * 60_000).toISOString();
}

function seededRandom(seed: number): number {
  // Mulberry32: deterministic and isolated from Math.random().
  let t = (seed + 0x6D2B79F5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function logEntry(state: MissionState, type: MissionLogEntry["type"], title: string, detail: string): MissionLogEntry {
  return {
    id: `${state.id}-${state.elapsedMinutes}-${state.telemetry.length}`,
    minute: state.elapsedMinutes,
    type,
    title,
    detail
  };
}

function makeSystems(condition = 100): EquipmentSystem[] {
  const A = GAMEPLAY_ASSUMPTIONS.systemLoadsKw;
  return [
    { id: "life-support", name: "O₂ / CO₂ life support", room: "Air & Water Systems", status: "RUNNING", powerKw: A.lifeSupport, priority: 1, condition, description: "Oxygen generation and carbon-dioxide removal. Both flows are simplified training-model rates.", sourceClass: "NASA_DESIGN_CONTEXT" },
    { id: "water-recovery", name: "Water recovery", room: "Air & Water Systems", status: "RUNNING", powerKw: A.waterRecovery, priority: 2, condition, description: "Processes wastewater and holds output for quality verification.", sourceClass: "NASA_DESIGN_CONTEXT" },
    { id: "habitat", name: "Habitat essentials", room: "Habitat", status: "RUNNING", powerKw: A.habitat, priority: 3, condition, description: "Lighting, thermal and essential habitat services; simplified aggregate load.", sourceClass: "GAMEPLAY_ASSUMPTION" },
    { id: "communications", name: "Communications", room: "Command Center", status: "RUNNING", powerKw: A.communications, priority: 4, condition, description: "Local base communications. Mars Earth link delay is a separate model.", sourceClass: "GAMEPLAY_ASSUMPTION" },
    { id: "greenhouse", name: "Greenhouse lights & pumps", room: "Greenhouse", status: "RUNNING", powerKw: A.greenhouse, priority: 5, condition, description: "Training load for controlled crop-environment equipment; crop yield is not validated.", sourceClass: "GAMEPLAY_ASSUMPTION" },
    { id: "rover", name: "Rover charging", room: "Rover Garage", status: "RUNNING", powerKw: A.rover, priority: 6, condition, description: "Charging and standby draw; vehicle propulsion is not included in this starter model.", sourceClass: "GAMEPLAY_ASSUMPTION" },
    { id: "science-lab", name: "Science laboratory", room: "Command Center", status: "RUNNING", powerKw: A.scienceLab, priority: 7, condition, description: "Deferrable science equipment load.", sourceClass: "GAMEPLAY_ASSUMPTION" }
  ];
}

function pressureKpa(massKg: number, molarMassKg: number, temperatureK: number, volumeM3: number): number {
  const moles = massKg / molarMassKg;
  return (moles * R * temperatureK / volumeM3) / 1000;
}

function updateGasPressures(state: MissionState): MissionState {
  const resources = { ...state.resources };
  resources.oxygenPartialPressureKpa = pressureKpa(resources.oxygenKg, MOLAR_MASS_O2_KG, resources.cabinTemperatureK, resources.cabinVolumeM3);
  resources.co2PartialPressureKpa = pressureKpa(resources.co2Kg, MOLAR_MASS_CO2_KG, resources.cabinTemperatureK, resources.cabinVolumeM3);
  return { ...state, resources };
}

function crewFromId(id: string, index: number, playerName: string, playerCharacterId: string) {
  if (index === 0) {
    const player = ROSTER[playerCharacterId] ?? ROSTER["user-magenta"];
    return { id: `crew-${index}`, name: playerName, role: player.role, characterId: playerCharacterId, fatigue: 8, available: true, currentTask: "On standby" };
  }
  const member = ROSTER[id] ?? ROSTER.sofia;
  return { id: `crew-${index}`, name: member.name, role: member.role, characterId: id, fatigue: 5, available: true, currentTask: "On standby" };
}

export function createMission(id: string, input: CreateMissionInput, now = new Date().toISOString()): MissionState {
  const difficulty: Difficulty = input.difficulty ?? "STANDARD";
  const difficultyProfile = GAMEPLAY_ASSUMPTIONS.difficulties[difficulty];
  const support = input.supportCrewIds.filter((crewId) => crewId !== input.playerCharacterId).slice(0, 3);
  const defaults = ["sofia", "christopher", "jewel", "alexander", "llian", "pilot"]
    .filter((crewId) => crewId !== input.playerCharacterId);
  while (support.length < 3) support.push(defaults.find((crewId) => !support.includes(crewId)) ?? "sofia");
  const resources = {
    solarGenerationKw: 0,
    electricalDemandKw: 0,
    batteryKwh: difficultyProfile.batteryKwh,
    batteryCapacityKwh: GAMEPLAY_ASSUMPTIONS.batteryCapacityKwh,
    oxygenKg: difficultyProfile.oxygenKg,
    co2Kg: GAMEPLAY_ASSUMPTIONS.initialCo2Kg,
    potableWaterKg: difficultyProfile.potableWaterKg,
    wastewaterKg: 0,
    quarantinedWaterKg: 0,
    foodKg: difficultyProfile.foodKg,
    cabinVolumeM3: GAMEPLAY_ASSUMPTIONS.cabinVolumeM3,
    cabinTemperatureK: GAMEPLAY_ASSUMPTIONS.cabinTemperatureK,
    oxygenPartialPressureKpa: 0,
    co2PartialPressureKpa: 0,
    powerUnmetKw: 0,
    solarFactor: 0,
    panelCondition: difficultyProfile.panelCondition,
    spareParts: difficultyProfile.spareParts,
    shelterReady: false
  };
  const base: MissionState = {
    id,
    version: 1,
    scienceDataVersion: SCIENCE_DATA_VERSION,
    planet: input.planet,
    difficulty,
    missionName: `${input.planet === "MOON" ? "Lunar" : "Mars"} Outpost — Day 1`,
    playerName: input.playerName.trim().slice(0, 32) || "Commander",
    playerCharacterId: input.playerCharacterId,
    status: "ACTIVE",
    elapsedMinutes: 0,
    day: 1,
    speed: 1,
    rngSeed: 260114,
    resources,
    systems: makeSystems(difficultyProfile.equipmentCondition),
    crew: [crewFromId(input.playerCharacterId, 0, input.playerName, input.playerCharacterId), ...support.map((crewId, i) => crewFromId(crewId, i + 1, input.playerName, input.playerCharacterId))],
    activeIncident: null,
    resolvedIncidentIds: [],
    objectives: DAILY_OBJECTIVES[input.planet].map((objective) => ({ ...objective, complete: false })),
    eventFlags: [],
    telemetry: [],
    lastMessage: "Mission initialized. Inspect the base and keep essential systems running.",
    createdAt: now,
    updatedAt: now
  };
  const initialized = updateGasPressures(base);
  return {
    ...initialized,
    telemetry: [logEntry(initialized, "SYSTEM", "Mission initialized", `Four-person ${input.planet.toLowerCase()} training mission. Starting equipment ratings and inventories are gameplay assumptions.`)]
  };
}

export function ensureDailyObjectives(state: MissionState): MissionState {
  const dailyObjectives = DAILY_OBJECTIVES[state.planet];
  const expectedById = new Map(dailyObjectives.map((objective) => [objective.id, objective]));
  const expectedIds = new Set(expectedById.keys());
  const actualIds = new Set(state.objectives.map((objective) => objective.id));
  const isCompleteSchedule = state.objectives.length === dailyObjectives.length &&
    actualIds.size === expectedIds.size &&
    state.objectives.every((objective) => {
      const expected = expectedById.get(objective.id);
      return expected !== undefined &&
        Number.isInteger(objective.day) &&
        objective.day === expected.day &&
        objective.title === expected.title &&
        objective.reference?.url === expected.reference?.url;
    });
  if (isCompleteSchedule) return state;

  const completedIds = new Set(state.objectives.filter((objective) => objective.complete).map((objective) => objective.id));
  const legacyToDaily: Record<string, string> = {
    "life-support-inspection": "day-1-oxygen-inspection",
    "water-quality": "day-2-water-quality-check",
    "rover-survey": "day-3-rover-inspection"
  };
  for (const [legacyId, dailyId] of Object.entries(legacyToDaily)) {
    if (completedIds.has(legacyId)) completedIds.add(dailyId);
  }
  return {
    ...state,
    objectives: dailyObjectives.map((objective) => ({
      ...objective,
      complete: completedIds.has(objective.id)
    }))
  };
}

export function areDailyObjectivesComplete(state: MissionState, day = state.day): boolean {
  const objectives = state.objectives.filter((objective) => (objective.day ?? 1) === day);
  return objectives.length === 3 && objectives.every((objective) => objective.complete);
}

function getSystem(state: MissionState, id: string): EquipmentSystem | undefined {
  return state.systems.find((system) => system.id === id);
}

function updateSystem(state: MissionState, id: string, patch: Partial<EquipmentSystem>): MissionState {
  return { ...state, systems: state.systems.map((system) => system.id === id ? { ...system, ...patch } : system) };
}

function environmentFactor(state: MissionState): number {
  // Simplified repeating illumination / dust profile for training only.
  // It is not a Moon Trek site-specific ephemeris or a live Mars weather feed.
  const phase = (state.elapsedMinutes % (4 * MINUTES_PER_DAY)) / (4 * MINUTES_PER_DAY);
  const wave = 0.5 + 0.5 * Math.sin((phase * Math.PI * 2) - Math.PI / 2);
  const base = state.planet === "MOON" ? 0.48 + 0.42 * wave : 0.42 + 0.35 * wave;
  const dustPenalty = state.planet === "MARS" && state.eventFlags.includes("mars-dust-training-event") && !state.eventFlags.includes("mars-dust-cleaned") ? 0.38 : 1;
  return clamp(base * dustPenalty * (state.resources.panelCondition / 100), 0.05, 1);
}

function createIncident(kind: IncidentKind, state: MissionState): MissionIncident {
  const day = state.day;
  const base = { triggeredAtMinute: state.elapsedMinutes, severity: "WARNING" as const, sourceClass: "GAMEPLAY_ASSUMPTION" as const };
  const minutes = (n: number) => ({ minutes: n });
  const battery = state.resources.batteryKwh.toFixed(1);
  const co2 = state.resources.co2PartialPressureKpa.toFixed(3);
  const water = state.resources.potableWaterKg.toFixed(1);
  const make = (id: string, title: string, description: string, evidence: string[], choices: IncidentChoice[]): MissionIncident => ({
    id,
    kind, title, description, evidence, choices, ...base
  });
  if (kind === "POWER_RESERVE") return make(
    `power-reserve-day-${day}`, "Power reserve falling", `Battery reserve is ${battery} kWh. Check the power board and choose what to defer.`,
    [`Battery ${battery} kWh`, `Solar generation ${state.resources.solarGenerationKw.toFixed(2)} kW`, `Electrical demand ${state.resources.electricalDemandKw.toFixed(2)} kW`],
    [
      { id: "dim-greenhouse", title: "Pause greenhouse lighting", detail: "Save 1.4 kW; crop progress pauses in this training model.", cost: minutes(5) },
      { id: "park-rover", title: "Stop rover charging", detail: "Save 0.8 kW; rover deployment is delayed.", cost: minutes(3) },
      { id: "defer-lab", title: "Defer science lab work", detail: "Save 0.5 kW without interrupting life support.", cost: minutes(2) },
      { id: "inspect-panels", title: "Send engineer to inspect panels", detail: "Spend 20 minutes; improve panel condition by 8 points if crew is available.", cost: minutes(20) },
      { id: "essential-mode", title: "Switch to essential-load mode", detail: "Pause greenhouse, rover charging and science lab; keep life support, water and habitat prioritized.", cost: minutes(4) }
    ]
  );
  if (kind === "CO2_RISING") return make(
    `co2-rising-day-${day}`, "CO₂ level rising", `The modeled CO₂ partial pressure is ${co2} kPa. Investigate air revitalization before it reaches the training boundary.`,
    [`CO₂ partial pressure ${co2} kPa`, `Life-support condition ${getSystem(state, "life-support")?.condition ?? 0}%`],
    [
      { id: "boost-scrubber", title: "Prioritize the air loop", detail: "Keep life support at the highest electrical priority; pause optional loads if needed.", cost: minutes(5) },
      { id: "engineer-check", title: "Ask engineer to inspect scrubber", detail: "Spend 25 minutes and one spare part; restore scrubber condition.", cost: { minutes: 25, spareParts: 1 } },
      { id: "pause-rover", title: "Pause rover and lab work", detail: "Reduce nonessential crew activity and electrical demand.", cost: minutes(5) },
      { id: "check-sensor", title: "Cross-check cabin sensor", detail: "Spend 10 minutes validating the reading before changing settings.", cost: minutes(10) },
      { id: "ignore-co2", title: "Ignore the warning", detail: "No immediate repair; modeled CO₂ continues accumulating.", cost: minutes(1) }
    ]
  );
  if (kind === "WATER_QUALITY") return make(
    `water-quality-day-${day}`, "Water batch needs verification", `A processed-water batch is on hold. Potable reserve is ${water} kg. Do not count quarantined water as drinkable.`,
    [`Potable reserve ${water} kg`, `Water recovery condition ${getSystem(state, "water-recovery")?.condition ?? 0}%`],
    [
      { id: "quarantine-batch", title: "Keep batch quarantined", detail: "Protect potable inventory; use only verified stored water.", cost: minutes(2) },
      { id: "reprocess-batch", title: "Reprocess and retest", detail: "Use 0.8 kWh and 30 minutes; release only after the game quality check passes.", cost: { minutes: 30, batteryKwh: 0.8 } },
      { id: "inspect-filter", title: "Inspect processing filter", detail: "Use one spare part and 20 minutes to restore water-system condition.", cost: { minutes: 20, spareParts: 1 } },
      { id: "use-reserve", title: "Use stored potable reserve", detail: "Consume 8 kg from verified potable inventory while the batch remains isolated.", cost: { minutes: 2, potableWaterKg: 8 } },
      { id: "release-untested", title: "Release without testing", detail: "Unsafe in this training scenario: the batch remains marked unverified and mission objective is not credited.", cost: minutes(1) }
    ]
  );
  if (kind === "LIFE_SUPPORT_FAULT") return make(
    `life-support-fault-day-${day}`, "Air loop performance degraded", "The life-support unit is no longer operating at its modeled reference condition.",
    [`Life-support condition ${getSystem(state, "life-support")?.condition ?? 0}%`, `O₂ partial pressure ${state.resources.oxygenPartialPressureKpa.toFixed(2)} kPa`],
    [
      { id: "switch-backup", title: "Switch to backup mode", detail: "Restore the training model's air-loop availability at reduced efficiency.", cost: minutes(8) },
      { id: "engineer-repair", title: "Assign engineer to repair", detail: "Spend 35 minutes and one spare part; restore equipment condition.", cost: { minutes: 35, spareParts: 1 } },
      { id: "shed-loads", title: "Shed nonessential loads", detail: "Pause greenhouse, rover and lab to protect life-support power priority.", cost: minutes(4) },
      { id: "inspect-air-sample", title: "Inspect cabin readings", detail: "Spend 12 minutes checking oxygen and CO₂ inventory trends.", cost: minutes(12) },
      { id: "defer-repair", title: "Defer maintenance", detail: "No repair now; resource imbalance may continue.", cost: minutes(1) }
    ]
  );
  if (kind === "MARS_DUST") return make(
    `mars-dust-day-${day}`, "Dust is reducing array output", "A deterministic Mars training scenario has introduced atmospheric dust and panel contamination. The reduction factor is illustrative, not live weather data.",
    [`Solar factor ${state.resources.solarFactor.toFixed(2)}`, `Panel condition ${state.resources.panelCondition.toFixed(0)}%`, `Battery ${battery} kWh`],
    [
      { id: "clean-mars-panels", title: "Inspect and clean panels", detail: "Spend 25 minutes and one spare kit; clear the training dust penalty and improve panel condition.", cost: { minutes: 25, spareParts: 1 } },
      { id: "mars-essential-mode", title: "Switch to essential-load mode", detail: "Pause greenhouse, rover and lab to protect the crew's essential services.", cost: minutes(4) },
      { id: "mars-stop-rover", title: "Stop rover charging", detail: "Save 0.8 kW while preserving life support and water processing.", cost: minutes(3) },
      { id: "mars-defer-lab", title: "Defer science laboratory work", detail: "Save 0.5 kW and revisit the experiment when generation improves.", cost: minutes(2) },
      { id: "mars-ignore-dust", title: "Continue without intervention", detail: "Keep the reduced training solar factor; battery reserve may fall faster.", cost: minutes(1) }
    ]
  );
  return make(
    `solar-change-day-${day}`, "Environmental power conditions changed", "The training environment profile has reduced expected solar generation. Review available loads and battery reserve.",
    [`Solar factor ${state.resources.solarFactor.toFixed(2)}`, `Battery ${battery} kWh`],
    [
      { id: "reduce-greenhouse", title: "Reduce greenhouse power", detail: "Pause full lighting cycle; save electrical demand.", cost: minutes(5) },
      { id: "clean-array", title: "Inspect and clean array", detail: "Spend 25 minutes; improve panel condition by 10 points. Exterior access is a gameplay abstraction.", cost: minutes(25) },
      { id: "park-rover-solar", title: "Park rover and stop charging", detail: "Reduce nonessential electrical demand.", cost: minutes(3) },
      { id: "essential-mode-solar", title: "Prioritize essential systems", detail: "Pause greenhouse, rover and lab while keeping life support.", cost: minutes(4) },
      { id: "continue-solar", title: "Continue normal operation", detail: "No immediate change; battery may continue to discharge.", cost: minutes(1) }
    ]
  );
}

function maybeRaiseIncident(state: MissionState): MissionState {
  if (state.activeIncident || state.status !== "ACTIVE") return state;
  const has = (prefix: string) => state.resolvedIncidentIds.some((id) => id.startsWith(prefix));
  const set = (kind: IncidentKind) => ({ ...state, activeIncident: createIncident(kind, state) });
  if (state.planet === "MARS" && state.elapsedMinutes >= 30 && !state.eventFlags.includes("mars-dust-training-event")) {
    // The starter curriculum guarantees one Mars dust lesson on Day 1.
    // This is a scheduled training scenario, not a forecast or live weather event.
    return { ...set("MARS_DUST"), eventFlags: [...state.eventFlags, "mars-dust-training-event"] };
  }
  if (state.resources.oxygenPartialPressureKpa < GAMEPLAY_ASSUMPTIONS.warningOxygenPartialPressureKpa && !has("life-support-fault")) return set("LIFE_SUPPORT_FAULT");
  if (state.resources.co2PartialPressureKpa > GAMEPLAY_ASSUMPTIONS.warningCo2PartialPressureKpa && !has("co2-rising")) return set("CO2_RISING");
  if (state.resources.batteryKwh < GAMEPLAY_ASSUMPTIONS.warningBatteryKwh && !has("power-reserve")) return set("POWER_RESERVE");
  if (state.resources.potableWaterKg < GAMEPLAY_ASSUMPTIONS.warningWaterKg && !has("water-quality")) return set("WATER_QUALITY");
  if (state.day >= 4 && !has("water-quality") && !state.eventFlags.includes("water-batch-flagged")) {
    const roll = seededRandom(state.rngSeed + state.day * 31);
    if (roll > 0.25) return { ...set("WATER_QUALITY"), eventFlags: [...state.eventFlags, "water-batch-flagged"] };
  }
  if (state.day >= 5 && state.systems.some((s) => s.condition < 72) && !has("life-support-fault")) return set("LIFE_SUPPORT_FAULT");
  if (state.day >= 6 && !has("solar-change")) return set("SOLAR_CHANGE");
  return state;
}

function tickOneMinute(original: MissionState): MissionState {
  if (original.status !== "ACTIVE") return original;
  let state: MissionState = { ...original, elapsedMinutes: original.elapsedMinutes + 1, day: Math.min(7, Math.floor((original.elapsedMinutes + 1) / MINUTES_PER_DAY) + 1) };
  const crewCount = state.crew.length;
  const dtHours = 1 / 60;
  const solarFactor = environmentFactor(state);
  const rated = GAMEPLAY_ASSUMPTIONS.solarArrayRatedKw[state.planet];
  const difficultyProfile = GAMEPLAY_ASSUMPTIONS.difficulties[state.difficulty ?? "STANDARD"];
  const solarGenerationKw = rated * solarFactor * difficultyProfile.solarOutputMultiplier;
  let availableKw = solarGenerationKw + Math.min(GAMEPLAY_ASSUMPTIONS.maxBatteryDischargeKw, state.resources.batteryKwh * 60);
  const systems = [...state.systems].sort((a, b) => a.priority - b.priority);
  const runningIds = new Set<string>();
  let electricalDemandKw = 0;
  let usedKw = 0;
  for (const system of systems) {
    if (system.status === "OFF" || system.status === "FAULTED" || system.status === "MAINTENANCE") continue;
    electricalDemandKw += system.powerKw;
    if (availableKw + 1e-9 >= system.powerKw) {
      availableKw -= system.powerKw;
      usedKw += system.powerKw;
      runningIds.add(system.id);
    }
  }
  const powerUnmetKw = Math.max(0, electricalDemandKw - usedKw);
  const batteryKwh = clamp(state.resources.batteryKwh + (solarGenerationKw - usedKw) * dtHours, 0, state.resources.batteryCapacityKwh);
  let oxygenKg = state.resources.oxygenKg;
  let co2Kg = state.resources.co2Kg;
  let potableWaterKg = state.resources.potableWaterKg;
  let wastewaterKg = state.resources.wastewaterKg;
  let foodKg = state.resources.foodKg;

  const crewOxygenUse = (SCIENCE_REFERENCES.bvad.oxygenConsumptionKgPerCrewDay * crewCount) / MINUTES_PER_DAY;
  const crewCo2Generation = (SCIENCE_REFERENCES.bvad.co2GenerationKgPerCrewDay * crewCount) / MINUTES_PER_DAY;
  oxygenKg = Math.max(0, oxygenKg - crewOxygenUse);
  co2Kg += crewCo2Generation;
  if (runningIds.has("life-support")) {
    oxygenKg += GAMEPLAY_ASSUMPTIONS.oxygenGenerationKgPerMinute;
    co2Kg = Math.max(0, co2Kg - GAMEPLAY_ASSUMPTIONS.co2RemovalKgPerMinute);
  }

  // Early planetary base total water use: 4.48 kg/crew-day from BVAD.
  const waterUse = (SCIENCE_REFERENCES.bvad.earlyPlanetaryBaseWaterKgPerCrewDay * crewCount) / MINUTES_PER_DAY;
  potableWaterKg = Math.max(0, potableWaterKg - waterUse);
  wastewaterKg += waterUse * GAMEPLAY_ASSUMPTIONS.wastewaterFraction;
  if (runningIds.has("water-recovery")) {
    // Recovery efficiency and throughput are game assumptions, not a NASA planetary-base guarantee.
    const processed = Math.min(wastewaterKg, waterUse * GAMEPLAY_ASSUMPTIONS.waterRecoveryEfficiencyForTraining);
    wastewaterKg -= processed;
    // Processing creates a quarantined batch. It is never potable until a separate quality check passes.
    state = { ...state, resources: { ...state.resources, quarantinedWaterKg: state.resources.quarantinedWaterKg + processed } };
  }
  const foodUse = (GAMEPLAY_ASSUMPTIONS.foodUseKgPerCrewDay * crewCount) / MINUTES_PER_DAY;
  foodKg = Math.max(0, foodKg - foodUse);

  let updatedSystems = state.systems.map((system) => {
    let condition = system.condition;
    if (runningIds.has(system.id) && (system.id === "life-support" || system.id === "water-recovery")) {
      if (state.elapsedMinutes % difficultyProfile.wearIntervalMinutes === 0) condition = Math.max(50, condition - 1);
    }
    return { ...system, condition, status: system.status === "RUNNING" && !runningIds.has(system.id) ? "DEGRADED" : system.status };
  });
  const panelCondition = state.resources.panelCondition;
  const resources = {
    ...state.resources,
    solarGenerationKw,
    electricalDemandKw,
    batteryKwh,
    oxygenKg,
    co2Kg,
    potableWaterKg,
    wastewaterKg,
    foodKg,
    powerUnmetKw,
    solarFactor,
    panelCondition
  };
  state = { ...state, resources, systems: updatedSystems };
  state = updateGasPressures(state);
  state = {
    ...state,
    crew: state.crew.map((member) => ({ ...member, fatigue: clamp(member.fatigue + 0.00025, 0, 100) }))
  };

  const failed = GAMEPLAY_ASSUMPTIONS.gameOnlyFailureBoundaries;
  const crewReserveOxygenKg = state.crew.length * SCIENCE_REFERENCES.bvad.oxygenConsumptionKgPerCrewDay;
  const crewReserveWaterKg = state.crew.length * SCIENCE_REFERENCES.bvad.earlyPlanetaryBaseWaterKgPerCrewDay;
  const crewReserveFoodKg = Math.max(2, state.crew.length * GAMEPLAY_ASSUMPTIONS.foodUseKgPerCrewDay * 0.5);
  let failureReason = "";
  if (state.resources.oxygenKg < crewReserveOxygenKg) failureReason = `Oxygen reserve fell below the NASA reference one-day emergency buffer for ${state.crew.length} crew (${crewReserveOxygenKg.toFixed(2)} kg).`;
  else if (state.resources.potableWaterKg < crewReserveWaterKg) failureReason = `Verified potable-water reserves fell below the NASA reference one-day emergency buffer for ${state.crew.length} crew (${crewReserveWaterKg.toFixed(2)} kg).`;
  else if (state.resources.foodKg < crewReserveFoodKg) failureReason = "Stored food fell below the emergency reserve required to sustain the crew through the next operating cycle.";
  else if (state.resources.oxygenPartialPressureKpa < failed.oxygenPartialPressureKpa) failureReason = "The training scenario's oxygen partial-pressure boundary was crossed.";
  else if (state.resources.co2PartialPressureKpa > failed.co2PartialPressureKpa) failureReason = "The training scenario's CO₂ partial-pressure boundary was crossed.";
  else if (state.resources.batteryKwh < failed.batteryKwh && !runningIds.has("life-support")) failureReason = "Battery reserve is exhausted and the essential life-support load cannot run.";
  if (failureReason) {
    state = { ...state, status: "FAILED", lastMessage: failureReason, telemetry: [...state.telemetry, logEntry(state, "RESULT", "Mission ended", failureReason)] };
    return state;
  }

  if (state.elapsedMinutes >= 7 * MINUTES_PER_DAY) {
    const allObjectives = state.objectives.every((objective) => objective.complete);
    const essentialsStable = state.resources.oxygenKg >= crewReserveOxygenKg && state.resources.potableWaterKg >= crewReserveWaterKg && state.resources.foodKg >= crewReserveFoodKg && state.resources.oxygenPartialPressureKpa >= failed.oxygenPartialPressureKpa && state.resources.co2PartialPressureKpa <= failed.co2PartialPressureKpa;
    const status = allObjectives && essentialsStable ? "SUCCESS" : "FAILED";
    const message = status === "SUCCESS" ? "Seven days completed, all 21 daily objectives were verified, and NASA reference reserves were maintained." : "Seven days completed, but one or more daily objectives or emergency reserve thresholds were not met.";
    state = { ...state, status, lastMessage: message, telemetry: [...state.telemetry, logEntry(state, "RESULT", status === "SUCCESS" ? "Mission complete" : "Mission incomplete", message)] };
  }

  if (state.elapsedMinutes === 1) state = { ...state, telemetry: [...state.telemetry, logEntry(state, "SYSTEM", "Simulation started", "One tick represents one simulated minute. Rendering frame rate does not affect resource calculations.")] };
  if (state.day > original.day) {
    const todaysObjectives = state.objectives.filter((objective) => objective.day === state.day).map((objective) => objective.title);
    state = {
      ...state,
      telemetry: [...state.telemetry, logEntry(state, "SYSTEM", `Mission day ${state.day}`, `New operational day. Today's three objectives: ${todaysObjectives.join("; ")}`)]
    };
  }
  if (state.resources.powerUnmetKw > 0.01 && !state.eventFlags.includes("unmet-power-warning")) {
    state = { ...state, eventFlags: [...state.eventFlags, "unmet-power-warning"], telemetry: [...state.telemetry, logEntry(state, "WARNING", "Electrical demand not fully met", `${state.resources.powerUnmetKw.toFixed(2)} kW of requested load could not be supplied. Lower-priority equipment may degrade.`)] };
  }
  state = maybeRaiseIncident(state);
  return state;
}

export function advanceMinutes(state: MissionState, minutes: number): MissionState {
  state = ensureDailyObjectives(state);
  const count = Math.max(0, Math.min(10_080, Math.floor(minutes)));
  let next = state;
  let blockedByObjectives = false;
  for (let i = 0; i < count && next.status === "ACTIVE" && !next.activeIncident; i += 1) {
    if (next.elapsedMinutes >= next.day * MINUTES_PER_DAY - 1 && !areDailyObjectivesComplete(next)) {
      blockedByObjectives = true;
      break;
    }
    next = tickOneMinute(next);
  }
  if (blockedByObjectives) {
    const message = `Day ${next.day} is paused at its end. Complete all three daily objectives before advancing.`;
    next = {
      ...next,
      lastMessage: message,
      telemetry: [...next.telemetry, logEntry(next, "SYSTEM", "Daily objectives required", message)]
    };
  }
  return { ...next, updatedAt: simulatedTimestamp(next) };
}

function markObjective(state: MissionState, id: string): MissionState {
  const target = state.objectives.find((objective) => objective.id === id);
  if (!target || target.complete || (target.day ?? 1) > state.day) return state;
  return { ...state, objectives: state.objectives.map((objective) => objective.id === id ? { ...objective, complete: true } : objective) };
}

function applyChoice(state: MissionState, choiceId: string): MissionState {
  let next = state;
  const incident = state.activeIncident;
  if (!incident) return state;
  const allNonessential = (s: MissionState) => s.systems.map((system) => ({ ...system, status: ["greenhouse", "rover", "science-lab"].includes(system.id) ? "OFF" as const : system.status }));
  switch (choiceId) {
    case "dim-greenhouse":
    case "reduce-greenhouse": next = updateSystem(next, "greenhouse", { status: "OFF" }); break;
    case "park-rover":
    case "pause-rover":
    case "park-rover-solar": next = updateSystem(next, "rover", { status: "OFF" }); break;
    case "defer-lab": next = updateSystem(next, "science-lab", { status: "OFF" }); break;
    case "inspect-panels":
    case "clean-array": next = { ...next, resources: { ...next.resources, panelCondition: clamp(next.resources.panelCondition + 8, 0, 100) }, crew: next.crew.map((c) => c.role === "Engineer" ? { ...c, currentTask: "Inspecting solar array", fatigue: clamp(c.fatigue + 3, 0, 100) } : c) }; break;
    case "essential-mode":
    case "essential-mode-solar":
    case "mars-essential-mode": next = { ...next, systems: allNonessential(next) }; break;
    case "clean-mars-panels":
      next = { ...next, resources: { ...next.resources, panelCondition: clamp(next.resources.panelCondition + 12, 0, 100), spareParts: Math.max(0, next.resources.spareParts - 1) }, eventFlags: [...next.eventFlags, "mars-dust-cleaned"] };
      break;
    case "mars-stop-rover": next = updateSystem(next, "rover", { status: "OFF" }); break;
    case "mars-defer-lab": next = updateSystem(next, "science-lab", { status: "OFF" }); break;
    case "mars-ignore-dust": break;
    case "boost-scrubber": next = updateSystem(next, "life-support", { status: "RUNNING", condition: Math.max(70, getSystem(next, "life-support")?.condition ?? 70) }); break;
    case "engineer-check":
    case "engineer-repair":
      next = updateSystem(next, "life-support", { status: "RUNNING", condition: 92 });
      next = { ...next, crew: next.crew.map((c) => c.role === "Engineer" ? { ...c, currentTask: "Repairing air loop", fatigue: clamp(c.fatigue + 6, 0, 100) } : c) };
      break;
    case "check-sensor": next = markObjective(next, "day-1-co2-inspection"); break;
    case "inspect-air-sample": next = markObjective(next, "day-1-oxygen-inspection"); break;
    case "shed-loads": next = { ...next, systems: allNonessential(next) }; break;
    case "quarantine-batch": next = { ...next, resources: { ...next.resources, quarantinedWaterKg: next.resources.quarantinedWaterKg + 6 } }; break;
    case "reprocess-batch":
      next = { ...next, resources: { ...next.resources, batteryKwh: Math.max(0, next.resources.batteryKwh - 0.8), quarantinedWaterKg: Math.max(0, next.resources.quarantinedWaterKg - 6), potableWaterKg: next.resources.potableWaterKg + 4 } };
      next = markObjective(next, "day-2-water-quality-check");
      break;
    case "inspect-filter":
      next = updateSystem(next, "water-recovery", { status: "RUNNING", condition: 95 });
      next = markObjective(next, "day-2-water-processor-inspection");
      break;
    case "use-reserve": break;
    case "release-untested": next = { ...next, resources: { ...next.resources, quarantinedWaterKg: next.resources.quarantinedWaterKg + 6 }, lastMessage: "Untested water remains quarantined; the system does not count it as potable." }; break;
    case "switch-backup": next = updateSystem(next, "life-support", { status: "RUNNING", condition: Math.max(75, getSystem(next, "life-support")?.condition ?? 75) }); break;
    case "continue-solar": break;
    default: break;
  }
  const choice = incident.choices.find((item) => item.id === choiceId);
  const cost = choice?.cost ?? {};
  if (cost.potableWaterKg) next = { ...next, resources: { ...next.resources, potableWaterKg: Math.max(0, next.resources.potableWaterKg - cost.potableWaterKg) } };
  if (cost.batteryKwh) next = { ...next, resources: { ...next.resources, batteryKwh: Math.max(0, next.resources.batteryKwh - cost.batteryKwh) } };
  if (cost.spareParts) next = { ...next, resources: { ...next.resources, spareParts: Math.max(0, next.resources.spareParts - cost.spareParts) } };
  next = {
    ...next,
    activeIncident: null,
    resolvedIncidentIds: [...next.resolvedIncidentIds, incident.id],
    lastMessage: choice ? `${choice.title} selected. ${choice.detail}` : "Incident response recorded.",
    telemetry: [...next.telemetry, logEntry(next, "PLAYER", incident.title, `Selected: ${choice?.title ?? choiceId}. ${choice?.detail ?? ""}`)]
  };
  return next;
}

function operateEquipment(state: MissionState, equipmentId: string, actionId: string, crewId?: string): MissionState {
  const equipment = equipmentCatalog.find((item) => item.id === equipmentId);
  const action = equipment?.actions.find((item) => item.id === actionId);
  if (!equipment || !action) return { ...state, lastMessage: "That equipment action is not available." };
  const operator = crewId
    ? state.crew.find((member) => member.id === crewId)
    : state.crew.find((member) => member.id === "crew-0") ?? state.crew.find((member) => member.available);
  if (!operator?.available) return { ...state, lastMessage: "The selected crew member is unavailable for this task." };
  let next = state;
  const res = { ...state.resources };
  let result = action.description;
  switch (actionId) {
    case "inspect":
      result = inspectionReport(state, equipmentId);
      if (equipmentId === "oxygen-generator") next = markObjective(next, "day-1-oxygen-inspection");
      if (equipmentId === "co2-scrubber") next = markObjective(next, "day-1-co2-inspection");
      if (equipmentId === "habitat-control") next = markObjective(next, "day-1-habitat-inspection");
      if (equipmentId === "water-processor") next = markObjective(next, "day-2-water-processor-inspection");
      if (equipmentId === "water-test") next = markObjective(next, "day-2-water-analyzer-inspection");
      if (equipmentId === "rover") next = markObjective(next, "day-3-rover-inspection");
      if (equipmentId === "solar-array") next = markObjective(next, state.planet === "MARS" ? "mars-day-5-array-inspection" : "day-3-array-inspection");
      if (equipmentId === "communications-mast") next = markObjective(next, "day-4-communications-inspection");
      if (equipmentId === "radiation-shelter") next = markObjective(next, "day-5-shelter-inspection");
      if (equipmentId === "airlock-panel") next = markObjective(next, state.planet === "MARS" ? "mars-day-6-airlock-inspection" : "day-5-airlock-inspection");
      if (equipmentId === "maintenance-bench") next = markObjective(next, state.planet === "MARS" ? "mars-day-3-maintenance-inspection" : "day-6-maintenance-inspection");
      if (equipmentId === "battery-bank") next = markObjective(next, "day-7-battery-inspection");
      if (equipmentId === "food-store") next = markObjective(next, "day-7-food-inspection");
      break;
    case "enable-habitat":
      next = updateSystem(next, "habitat", { status: "RUNNING" });
      break;
    case "essential-mode":
      next = { ...next, systems: next.systems.map((system) => ["greenhouse", "rover", "science-lab"].includes(system.id) ? { ...system, status: "OFF" } : system) };
      next = markObjective(next, "day-4-load-shedding");
      break;
    case "restart-air":
    case "boost-scrubber":
      next = updateSystem(next, "life-support", { status: "RUNNING", condition: Math.max(82, getSystem(next, "life-support")?.condition ?? 82) });
      break;
    case "process-water": {
      if (!getSystem(next, "water-recovery") || getSystem(next, "water-recovery")?.status === "OFF") return { ...next, lastMessage: "Water recovery is off. Restore power before running a cycle." };
      if (res.wastewaterKg < 0.01 || res.batteryKwh < 0.8) return { ...next, lastMessage: "Not enough wastewater or battery reserve for this processing cycle." };
      const recovered = Math.min(5, res.wastewaterKg);
      res.wastewaterKg -= recovered;
      res.quarantinedWaterKg += recovered;
      res.batteryKwh -= 0.8;
      next = { ...next, resources: res };
      result = `${recovered.toFixed(1)} kg moved to the quality-hold inventory. It is not potable until the test passes.`;
      break;
    }
    case "verify-water": {
      if (res.quarantinedWaterKg <= 0) return { ...next, lastMessage: "There is no processed batch waiting for a quality check." };
      const pass = seededRandom(next.rngSeed + next.elapsedMinutes + 1907) > 0.18;
      if (pass) {
        res.potableWaterKg += res.quarantinedWaterKg;
        res.quarantinedWaterKg = 0;
        next = { ...next, resources: res };
        next = markObjective(next, "day-2-water-quality-check");
        result = "Training quality gate passed. The held batch has been released into the potable inventory. This simplified pass/fail check is not a real water assay.";
      } else {
        result = "Training quality gate failed. The batch remains quarantined; inspect the processing filter and retest.";
      }
      break;
    }
    case "pause-greenhouse":
      next = updateSystem(next, "greenhouse", { status: "OFF" });
      break;
    case "cycle-airlock":
      if (getSystem(next, "habitat")?.status !== "RUNNING") return { ...next, lastMessage: "Airlock sequence blocked: habitat services are not available." };
      res.batteryKwh = Math.max(0, res.batteryKwh - 0.15);
      next = { ...next, resources: res };
      next = markObjective(next, "day-6-airlock-cycle");
      break;
    case "clean-array":
      if (res.spareParts < 1 || res.batteryKwh < 0.2) return { ...next, lastMessage: "Cleaning kit or electrical reserve unavailable." };
      res.spareParts -= 1;
      res.batteryKwh -= 0.2;
      res.panelCondition = clamp(res.panelCondition + 10, 0, 100);
      next = { ...next, resources: res };
      break;
    case "battery-audit":
      result = `Generation ${res.solarGenerationKw.toFixed(2)} kW; demand ${res.electricalDemandKw.toFixed(2)} kW; stored energy ${res.batteryKwh.toFixed(1)} kWh. kW is power; kWh is stored energy.`;
      next = markObjective(next, "day-4-power-audit");
      break;
    case "send-status":
      result = next.planet === "MARS"
        ? `Status report queued. NASA's communication reference spans about ${SOURCE_REFERENCES.marsCommunications.oneWayDelayMinutes.low}–${SOURCE_REFERENCES.marsCommunications.oneWayDelayMinutes.high} minutes one way depending on geometry; this app does not calculate live ephemeris.`
        : "Status report queued to the lunar relay. No live link budget is calculated in this prototype.";
      next = markObjective(next, "day-7-status-report");
      break;
    case "rover-survey":
      if (getSystem(next, "rover")?.status === "OFF" || res.batteryKwh < 2) return { ...next, lastMessage: "Rover survey unavailable. Restore rover service and battery reserve first." };
      res.batteryKwh -= 2;
      next = { ...next, resources: res };
      next = markObjective(next, "day-3-rover-survey");
      break;
    case "secure-shelter":
      res.shelterReady = true;
      next = { ...next, resources: res };
      next = markObjective(next, "day-5-shelter-preparation");
      break;
    case "food-inventory":
      result = `Food reserve: ${res.foodKg.toFixed(1)} kg. Food energy and crop harvest are not calculated in this starter build; its food-use rate is a gameplay assumption.`;
      next = markObjective(next, "day-6-food-inventory");
      break;
    case "repair-water":
      if (res.spareParts < 1) return { ...next, lastMessage: "No spare parts remain. Repairs are limited." };
      res.spareParts -= 1;
      next = { ...next, resources: res };
      next = updateSystem(next, "water-recovery", { status: "RUNNING", condition: 95 });
      break;
    default:
      return { ...next, lastMessage: "That action is not implemented." };
  }
  next = {
    ...next,
    lastMessage: operator.id === "crew-0" ? `${action.label}: ${result}` : `${operator.name} assigned: ${action.label}: ${result}`,
    telemetry: [...next.telemetry, logEntry(next, "PLAYER", `${operator.id === "crew-0" ? "" : `${operator.name} — `}${equipment.name} — ${action.label}`, result)],
    crew: next.crew.map((member) => member.id === operator.id
      ? { ...member, currentTask: action.label, currentTaskEquipmentId: equipment.id, fatigue: clamp(member.fatigue + Math.min(8, action.durationMinutes / 5), 0, 100) }
      : member),
    updatedAt: simulatedTimestamp(next)
  };
  return action.durationMinutes > 0 ? advanceMinutes(next, action.durationMinutes) : next;
}

function inspectionReport(state: MissionState, equipmentId: string): string {
  const equipment = equipmentCatalog.find((item) => item.id === equipmentId);
  const system = equipment?.systemId ? getSystem(state, equipment.systemId) : undefined;
  const systemSummary = system
    ? `${system.name}: ${system.status}, ${system.condition}% condition, ${system.powerKw.toFixed(1)} kW load.`
    : "";
  const r = state.resources;
  switch (equipmentId) {
    case "oxygen-generator":
    case "co2-scrubber":
      return `${systemSummary} O₂ ${r.oxygenKg.toFixed(1)} kg (${r.oxygenPartialPressureKpa.toFixed(2)} kPa); CO₂ ${r.co2Kg.toFixed(1)} kg (${r.co2PartialPressureKpa.toFixed(3)} kPa).`;
    case "water-processor":
    case "water-test":
      return `${systemSummary} Potable ${r.potableWaterKg.toFixed(1)} kg; wastewater ${r.wastewaterKg.toFixed(1)} kg; quarantined batch ${r.quarantinedWaterKg.toFixed(1)} kg.`;
    case "power-board":
      return `Solar generation ${r.solarGenerationKw.toFixed(2)} kW; demand ${r.electricalDemandKw.toFixed(2)} kW; unmet load ${r.powerUnmetKw.toFixed(2)} kW; battery ${r.batteryKwh.toFixed(1)} kWh.`;
    case "solar-array":
      return `Array output ${r.solarGenerationKw.toFixed(2)} kW; training solar factor ${r.solarFactor.toFixed(2)}; panel condition ${r.panelCondition.toFixed(0)}%.`;
    case "battery-bank":
      return `Stored energy ${r.batteryKwh.toFixed(1)} of ${r.batteryCapacityKwh.toFixed(1)} kWh; generation ${r.solarGenerationKw.toFixed(2)} kW versus demand ${r.electricalDemandKw.toFixed(2)} kW.`;
    case "food-store":
      return `Food reserve ${r.foodKg.toFixed(1)} kg for ${state.crew.length} crew. Food use is a gameplay assumption in this training model.`;
    case "rover":
      return `${systemSummary} Battery reserve ${r.batteryKwh.toFixed(1)} kWh.`;
    case "radiation-shelter":
      return `Shelter readiness: ${r.shelterReady ? "ready" : "not prepared"}. This training model does not calculate radiation dose reduction.`;
    default:
      return systemSummary || `${equipment?.name ?? "Equipment"} inspection recorded. Check the equipment state and related resources shown in the mission dashboard.`;
  }
}


export function applyCommand(state: MissionState, command: MissionCommand): MissionState {
  state = ensureDailyObjectives(state);
  if (state.status !== "ACTIVE" && command.type !== "SET_SPEED") return state;
  if (command.type === "ADVANCE") return advanceMinutes(state, command.minutes);
  if (command.type === "SET_SPEED") return { ...state, speed: command.speed, updatedAt: simulatedTimestamp(state) };
  if (command.type === "TOGGLE_SYSTEM") {
    const system = getSystem(state, command.systemId);
    if (!system) return state;
    if (command.enabled && system.status === "FAULTED") return { ...state, lastMessage: `${system.name} is faulted and needs maintenance before it can restart.` };
    const next = updateSystem(state, command.systemId, { status: command.enabled ? "RUNNING" : "OFF" });
    return { ...next, lastMessage: `${system.name} ${command.enabled ? "enabled" : "disabled"}.`, telemetry: [...next.telemetry, logEntry(next, "PLAYER", "Equipment setting changed", `${system.name}: ${command.enabled ? "ON" : "OFF"}`)], updatedAt: simulatedTimestamp(next) };
  }
  if (command.type === "DECIDE") {
    if (!state.activeIncident || state.activeIncident.id !== command.incidentId) return { ...state, lastMessage: "That incident is no longer active. Refresh the mission state." };
    const incident = state.activeIncident;
    const choice = incident.choices.find((item) => item.id === command.choiceId);
    if (!choice) return state;
    if (choice.cost.spareParts && state.resources.spareParts < choice.cost.spareParts) return { ...state, lastMessage: "Not enough spare parts for that action. Choose a recovery option that does not require a repair kit." };
    const resolved = applyChoice(state, command.choiceId);
    return advanceMinutes(resolved, choice.cost.minutes ?? 1);
  }
  if (command.type === "OPERATE") return operateEquipment(state, command.equipmentId, command.actionId, command.crewId);
  if (command.type === "INTERACT") {
    const next = state;
    const operator = command.crewId ? state.crew.find((member) => member.id === command.crewId) : undefined;
    if (command.crewId && !operator?.available) return { ...state, lastMessage: "The selected crew member is unavailable for this inspection." };
    const title = command.equipmentId.replaceAll("-", " ");
    const equipment = equipmentCatalog.find((item) => item.id === command.equipmentId);
    const report = equipment
      ? inspectionReport(next, command.equipmentId)
      : `Inspected ${title}. Review the equipment state and connected resources.`;
    const operatorPrefix = operator ? `${operator.name} — ` : "";
    return {
      ...next,
      lastMessage: `${operator ? `${operator.name}: ` : ""}Inspection — ${title}: ${report}`,
      telemetry: [...next.telemetry, logEntry(next, "PLAYER", `${operatorPrefix}Inspection — ${title}`, report)],
      crew: operator
        ? next.crew.map((member) => member.id === operator.id
          ? { ...member, currentTask: `Inspecting ${equipment?.name ?? title}`, currentTaskEquipmentId: command.equipmentId }
          : member)
        : next.crew,
      updatedAt: simulatedTimestamp(next)
    };
  }
  return state;
}

export function getEducationalHint(state: MissionState, question = "hint"): string {
  const q = question.toLowerCase().replaceAll("₂", "2");
  const r = state.resources;
  if (q.includes("power") || q.includes("battery") || q.includes("energy") || (q === "hint" && r.batteryKwh < GAMEPLAY_ASSUMPTIONS.warningBatteryKwh)) {
    const optionalLoads = state.systems.filter((system) => ["greenhouse", "rover", "science-lab"].includes(system.id) && system.status === "RUNNING").map((system) => system.name);
    return `Power check: solar ${r.solarGenerationKw.toFixed(2)} kW, demand ${r.electricalDemandKw.toFixed(2)} kW, battery ${r.batteryKwh.toFixed(1)} kWh. Life support has priority; ${optionalLoads.length ? `optional loads currently running: ${optionalLoads.join(", ")}` : "no optional loads are currently running"}. Which load could you defer if the reserve keeps falling?`;
  }
  if (q.includes("co2") || q.includes("carbon") || q.includes("scrubber") || (q === "hint" && r.co2PartialPressureKpa > GAMEPLAY_ASSUMPTIONS.warningCo2PartialPressureKpa)) {
    const airLoop = getSystem(state, "life-support");
    return `CO₂ is ${r.co2Kg.toFixed(1)} kg (${r.co2PartialPressureKpa.toFixed(3)} kPa partial pressure). The air loop is ${airLoop?.status.toLowerCase() ?? "unavailable"} at ${airLoop?.condition ?? 0}% condition. What could you check before changing the system settings?`;
  }
  if (q.includes("water") || q.includes("drink") || (q === "hint" && r.potableWaterKg < GAMEPLAY_ASSUMPTIONS.warningWaterKg)) {
    return `Water check: ${r.potableWaterKg.toFixed(1)} kg potable, ${r.wastewaterKg.toFixed(1)} kg wastewater, and ${r.quarantinedWaterKg.toFixed(1)} kg held for testing. A quarantined batch is not potable. What verified supply can the crew use now?`;
  }
  if (q.includes("oxygen") || q.includes("o2") || q.includes("air")) {
    const airLoop = getSystem(state, "life-support");
    return `Oxygen check: ${r.oxygenKg.toFixed(1)} kg in the modeled inventory and ${r.oxygenPartialPressureKpa.toFixed(2)} kPa partial pressure. Life support is ${airLoop?.status.toLowerCase() ?? "unavailable"}. What do the system status and trend tell you?`;
  }
  if (q.includes("food") || q.includes("meal")) {
    return `The current food inventory is ${r.foodKg.toFixed(1)} kg for ${state.crew.length} crew. Food-use rate is a gameplay assumption, not a validated nutrition plan. How does this reserve compare with the remaining mission?`;
  }
  if (q.includes("solar") || q.includes("panel") || q.includes("sun") || (q === "hint" && state.planet === "MOON")) {
    return `Array check: output ${r.solarGenerationKw.toFixed(2)} kW, training solar factor ${r.solarFactor.toFixed(2)}, panel condition ${r.panelCondition.toFixed(0)}%. Compare generation with demand (${r.electricalDemandKw.toFixed(2)} kW). Is there enough power for every active load?`;
  }
  if (q.includes("objective") || q.includes("goal") || q.includes("task") || q.includes("next")) {
    const todaysObjectives = state.objectives.filter((objective) => (objective.day ?? 1) === state.day);
    const pendingToday = todaysObjectives.filter((objective) => !objective.complete);
    const completedCount = state.objectives.filter((objective) => objective.complete).length;
    return pendingToday.length
      ? `Day ${state.day} has ${pendingToday.length} of 3 objectives remaining: ${pendingToday.map((objective) => objective.title).join("; ")}. Overall progress is ${completedCount}/${state.objectives.length}. Which task will you tackle first?`
      : completedCount === state.objectives.length
        ? "All 21 daily objectives are complete. Keep the essential systems and emergency reserves stable through Day 7."
        : `You have completed all three objectives for Day ${state.day}. Overall progress is ${completedCount}/${state.objectives.length}. What would you like to review next?`;
  }
  if (q.includes("alert") || q.includes("incident") || q.includes("warning")) {
    return state.activeIncident
      ? `Current alert: ${state.activeIncident.title}. Evidence: ${state.activeIncident.evidence.join("; ")}. Which response protects essential services while addressing the cause?`
      : "There is no active alert. Keep an eye on battery, oxygen, CO₂, and potable-water indicators; what would you like to inspect?";
  }
  if (q.includes("day") || q.includes("time") || q.includes("how long")) {
    const hours = Math.floor((state.elapsedMinutes % MINUTES_PER_DAY) / 60);
    const minutes = state.elapsedMinutes % 60;
    return `It is Day ${state.day} of 7, ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} mission time. The next objective is to complete the remaining checks and keep reserves above their training limits. What would you like to check first?`;
  }
  if (q.includes("crew")) {
    const available = state.crew.filter((member) => member.available).length;
    return `${available} of ${state.crew.length} crew members are available. Current tasks: ${state.crew.map((member) => `${member.name} — ${member.currentTask}`).join("; ")}. Who is free to handle the next inspection?`;
  }
  if (q === "hint" && state.planet === "MARS") {
    return "This is the Mars training site. Dust and communication delay are scenario references, not live feeds. Check the local power and equipment readings: what can the crew verify and act on without waiting for Mission Control?";
  }
  return "I can help with power, battery, oxygen, CO₂, water, food, solar panels, crew, alerts, objectives, or mission time. Ask about one of those and I’ll use the current mission readings. What would you like to check?";
}

export const CHARACTER_ROSTER = ROSTER;
export const SOURCE_REFERENCES = SCIENCE_REFERENCES;
export const TRAINING_ASSUMPTIONS = GAMEPLAY_ASSUMPTIONS;
