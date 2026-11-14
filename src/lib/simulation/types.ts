export type Planet = "MOON" | "MARS";
export type MissionStatus = "ACTIVE" | "SUCCESS" | "FAILED";
export type EquipmentStatus = "OFF" | "RUNNING" | "DEGRADED" | "FAULTED" | "MAINTENANCE";
export type IncidentKind = "POWER_RESERVE" | "CO2_RISING" | "WATER_QUALITY" | "LIFE_SUPPORT_FAULT" | "SOLAR_CHANGE" | "MARS_DUST";

export interface CrewMember {
  id: string;
  name: string;
  role: string;
  characterId: string;
  fatigue: number;
  available: boolean;
  currentTask: string;
}

export interface EquipmentSystem {
  id: string;
  name: string;
  room: string;
  status: EquipmentStatus;
  powerKw: number;
  priority: number;
  condition: number;
  description: string;
  sourceClass: "GAMEPLAY_ASSUMPTION" | "NASA_DESIGN_CONTEXT";
}

export interface MissionResources {
  solarGenerationKw: number;
  electricalDemandKw: number;
  batteryKwh: number;
  batteryCapacityKwh: number;
  oxygenKg: number;
  co2Kg: number;
  potableWaterKg: number;
  wastewaterKg: number;
  quarantinedWaterKg: number;
  foodKg: number;
  cabinVolumeM3: number;
  cabinTemperatureK: number;
  oxygenPartialPressureKpa: number;
  co2PartialPressureKpa: number;
  powerUnmetKw: number;
  solarFactor: number;
  panelCondition: number;
  spareParts: number;
  shelterReady: boolean;
}

export interface ChoiceCost {
  minutes?: number;
  batteryKwh?: number;
  potableWaterKg?: number;
  spareParts?: number;
}

export interface IncidentChoice {
  id: string;
  title: string;
  detail: string;
  cost: ChoiceCost;
}

export interface MissionIncident {
  id: string;
  kind: IncidentKind;
  title: string;
  description: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  triggeredAtMinute: number;
  evidence: string[];
  choices: IncidentChoice[];
  sourceClass: "NASA_DESIGN_CONTEXT" | "GAMEPLAY_ASSUMPTION";
}

export interface MissionLogEntry {
  id: string;
  minute: number;
  type: "SYSTEM" | "PLAYER" | "WARNING" | "RESULT";
  title: string;
  detail: string;
}

export interface MissionObjective {
  id: string;
  title: string;
  complete: boolean;
}

export interface MissionState {
  id: string;
  version: 1;
  scienceDataVersion: string;
  planet: Planet;
  missionName: string;
  playerName: string;
  playerCharacterId: string;
  status: MissionStatus;
  elapsedMinutes: number;
  day: number;
  speed: 0 | 1 | 3;
  rngSeed: number;
  resources: MissionResources;
  systems: EquipmentSystem[];
  crew: CrewMember[];
  activeIncident: MissionIncident | null;
  resolvedIncidentIds: string[];
  objectives: MissionObjective[];
  eventFlags: string[];
  telemetry: MissionLogEntry[];
  lastMessage: string;
  createdAt: string;
  updatedAt: string;
}

export type MissionCommand =
  | { type: "ADVANCE"; minutes: number }
  | { type: "SET_SPEED"; speed: 0 | 1 | 3 }
  | { type: "TOGGLE_SYSTEM"; systemId: string; enabled: boolean }
  | { type: "DECIDE"; incidentId: string; choiceId: string }
  | { type: "INTERACT"; equipmentId: string }
  | { type: "OPERATE"; equipmentId: string; actionId: string };

export interface CreateMissionInput {
  planet: Planet;
  playerName: string;
  playerCharacterId: string;
  supportCrewIds: string[];
}
