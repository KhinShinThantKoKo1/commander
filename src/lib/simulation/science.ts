import type { Difficulty } from "./types";

/**
 * Versioned teaching references. NASA-derived quantities are kept separate from
 * the deliberately simplified starting inventory, equipment ratings and safety
 * boundaries used by this playable training scenario.
 */
export const SCIENCE_DATA_VERSION = "2026-11-14-launch-lab-planet-objectives-1";

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
  lunarPolarSurvey: {
    title: "NASA Moon Camera Mosaic Sheds Light on Lunar South Pole",
    url: "https://www.nasa.gov/missions/lro/nasa-moon-camera-mosaic-sheds-light-on-lunar-south-pole/",
    classification: "NASA_MISSION_DATA",
    notes: "LROC imagery covers sunlit terrain while ShadowCam reveals permanently shadowed regions; possible ice/volatiles are a prospecting target, not a confirmed usable water reserve."
  },
  lunarDust: {
    title: "NASA Device to Solve Lunar Dust Challenges",
    url: "https://www.nasa.gov/centers-and-facilities/johnson/young-engineers-design-nasa-device-to-solve-lunar-dust-challenges/",
    classification: "NASA_ENGINEERING_CONTEXT",
    notes: "NASA reports fine, static lunar dust can adhere to surfaces, impair hardware, affect heat transfer, and reduce solar-array efficiency."
  },
  marsDustStorm: {
    title: "NASA’s InSight Waits Out Dust Storm",
    url: "https://www.nasa.gov/missions/insight/nasas-insight-waits-out-dust-storm/",
    classification: "NASA_MISSION_DATA",
    insightPowerBeforeWhPerSol: 425,
    insightPowerDuringWhPerSol: 275,
    notes: "In this specific 2022 storm, InSight’s power fell from 425 to 275 watt-hours per sol. It is a historical example, not a forecast or expected habitat output."
  },
  marsMoxie: {
    title: "NASA’s Oxygen-Generating Experiment MOXIE Completes Mars Mission",
    url: "https://www.nasa.gov/missions/mars-2020-perseverance/perseverance-rover/nasas-oxygen-generating-experiment-moxie-completes-mars-mission/",
    classification: "NASA_DEMONSTRATED_RESULT",
    totalOxygenGrams: 122,
    numberOfRuns: 16,
    bestRateGramsPerHour: 12,
    bestPurityPercent: 98,
    notes: "MOXIE demonstrated oxygen production from Mars CO₂; its 122 g total is a technology demonstration, not a crew life-support supply."
  },
  marsTrek: {
    title: "NASA Mars Trek",
    url: "https://trek.nasa.gov/mars/",
    classification: "NASA_DATA_PORTAL",
    notes: "NASA terrain and imagery portal for Mars; this prototype does not load its map tiles or compute a route from them."
  },
  spaceCommunications: {
    title: "NASA Space Communications: 7 Things You Need to Know",
    url: "https://www.nasa.gov/missions/tech-demonstration/space-communications-7-things-you-need-to-know/",
    classification: "NASA_ARCHITECTURE_CONTEXT",
    notes: "NASA missions use direct and relay links; this prototype does not model live relay availability."
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
  difficulties: {
    STANDARD: {
      label: "Standard",
      description: "Current starting supplies and system balance.",
      batteryKwh: 58,
      oxygenKg: 85,
      potableWaterKg: 180,
      foodKg: 210,
      panelCondition: 100,
      spareParts: 4,
      equipmentCondition: 100,
      solarOutputMultiplier: 1,
      wearIntervalMinutes: 360
    },
    CHALLENGING: {
      label: "Challenging",
      description: "Tighter stores, reduced solar output, and faster equipment wear.",
      batteryKwh: 45,
      oxygenKg: 72,
      potableWaterKg: 150,
      foodKg: 175,
      panelCondition: 90,
      spareParts: 3,
      equipmentCondition: 94,
      solarOutputMultiplier: 0.9,
      wearIntervalMinutes: 240
    },
    EXPERT: {
      label: "Expert",
      description: "Lean reserves, weaker arrays, and frequent maintenance pressure.",
      batteryKwh: 34,
      oxygenKg: 68,
      potableWaterKg: 125,
      foodKg: 150,
      panelCondition: 80,
      spareParts: 2,
      equipmentCondition: 85,
      solarOutputMultiplier: 0.8,
      wearIntervalMinutes: 180
    }
  } satisfies Record<Difficulty, {
    label: string;
    description: string;
    batteryKwh: number;
    oxygenKg: number;
    potableWaterKg: number;
    foodKg: number;
    panelCondition: number;
    spareParts: number;
    equipmentCondition: number;
    solarOutputMultiplier: number;
    wearIntervalMinutes: number;
  }>,
  cabinVolumeM3: 300,
  cabinTemperatureK: 295,
  batteryCapacityKwh: 120,
  initialCo2Kg: 2,
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
