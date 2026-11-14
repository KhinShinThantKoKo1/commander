/**
 * Versioned teaching references. NASA-derived quantities are kept separate from
 * the deliberately simplified starting inventory, equipment ratings and safety
 * boundaries used by this playable training scenario.
 */
export const SCIENCE_DATA_VERSION = "2026-11-14-launch-lab-baseline-1";

export const SCIENCE_REFERENCES = {
  bvad: {
    title: "NASA Baseline Values and Assumptions Document (BVAD), Revision 2",
    url: "https://ntrs.nasa.gov/citations/20210024855",
    classification: "NASA_DESIGN_BASELINE",
    referenceCrewMassKg: 82,
    oxygenConsumptionKgPerCrewDay: 0.90,
    co2GenerationKgPerCrewDay: 1.08,
    earlyPlanetaryBaseWaterKgPerCrewDay: 4.48,
    maturePlanetaryBaseWaterKgPerCrewDay: 9.12,
    notes: "Design reference values. Not universal lunar/Martian operating limits."
  },
  eclss: {
    title: "NASA Environmental Control and Life Support Systems",
    url: "https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/",
    classification: "NASA_SYSTEM_DESCRIPTION",
    notes: "ISS system descriptions do not establish future planetary-base performance."
  },
  issWater2023: {
    title: "NASA 2023 ISS water recovery achievement",
    url: "https://www.nasa.gov/missions/station/iss-research/nasas-2023-space-station-achievements/",
    classification: "NASA_DEMONSTRATED_RESULT",
    recoveryFraction: 0.98,
    notes: "98% total recovery result associated with the ISS brine-processing configuration; not a lunar/Mars guarantee."
  },
  marsCommunications: {
    title: "NASA Space Communications: 7 Things You Need to Know",
    url: "https://www.nasa.gov/missions/tech-demonstration/space-communications-7-things-you-need-to-know/",
    classification: "NASA_ARCHITECTURE_CONTEXT",
    oneWayDelayMinutes: { low: 4, high: 24 },
    notes: "Range depends on Earth-Mars geometry; this prototype does not yet simulate ephemeris."
  }
} as const;

export const GAMEPLAY_ASSUMPTIONS = {
  cabinVolumeM3: 300,
  cabinTemperatureK: 295,
  batteryCapacityKwh: 120,
  initialBatteryKwh: 58,
  initialOxygenKg: 85,
  initialCo2Kg: 2,
  initialPotableWaterKg: 180,
  initialFoodKg: 210,
  solarArrayRatedKw: { MOON: 8.4, MARS: 7.6 },
  systemLoadsKw: {
    lifeSupport: 2.1,
    waterRecovery: 0.8,
    habitat: 1.0,
    communications: 0.5,
    greenhouse: 1.4,
    rover: 0.8,
    scienceLab: 0.5
  },
  foodUseKgPerCrewDay: 0.6,
  wastewaterFraction: 0.8,
  waterRecoveryEfficiencyForTraining: 0.9,
  oxygenGenerationKgPerMinute: 0.0025,
  co2RemovalKgPerMinute: 0.0030,
  maxBatteryDischargeKw: 5,
  warningBatteryKwh: 42,
  warningWaterKg: 35,
  warningOxygenPartialPressureKpa: 19,
  warningCo2PartialPressureKpa: 0.4,
  /** These are game-over boundaries for this training prototype, not NASA safety limits. */
  gameOnlyFailureBoundaries: {
    oxygenPartialPressureKpa: 16,
    co2PartialPressureKpa: 0.55,
    potableWaterKg: 8,
    foodKg: 5,
    batteryKwh: 0.5
  },
  note: "Starting inventories, equipment loads, simplified recovery, environment factors, warning and failure thresholds are training-game assumptions unless separately tagged with a NASA reference."
} as const;
