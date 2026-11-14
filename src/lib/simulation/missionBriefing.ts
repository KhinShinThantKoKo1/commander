import type { Planet } from "./types";

export type BriefingChoice = {
  id: string;
  text: string;
};

export type MissionBriefingLesson = {
  id: string;
  title: string;
  room: string;
  icon: string;
  explanation: string;
  fieldNote: string;
  imageQueries: Record<Planet, string>;
  question: string;
  choices: BriefingChoice[];
  correctChoiceId: string;
  answerExplanation: string;
};

export const PUBLIC_DOMAIN_CREW_PHOTO = {
  url: "/assets/briefing/artemis-ii-crew.jpg",
  title: "Artemis II official crew portrait",
  credit: "NASA / Josh Valcarcel",
  sourceUrl: "https://commons.wikimedia.org/wiki/File:Artemis_2_Crew_Portrait.jpg",
  license: "Public domain"
} as const;

export const MISSION_BRIEFING_LESSONS: MissionBriefingLesson[] = [
  {
    id: "habitat",
    title: "Habitat interior",
    room: "HOME BASE",
    icon: "⌂",
    explanation: "The habitat is a protected, pressurized place to live and work. An ISS interior is a useful analog for organized spacecraft living, but a Moon or Mars habitat also needs its own shielding and surface-operation plans.",
    fieldNote: "Think of the habitat as the crew's safe volume: pressure, air, power, and fire response depend on connected systems.",
    imageQueries: { MOON: "ISS crew Cupola interior", MARS: "ISS crew Cupola interior" },
    question: "What is the habitat's most important role?",
    choices: [
      { id: "A", text: "Maintain a protected environment for the crew." },
      { id: "B", text: "Expose the cabin directly to the outside atmosphere." },
      { id: "C", text: "Replace the need to monitor life-support equipment." }
    ],
    correctChoiceId: "A",
    answerExplanation: "Correct. The habitat is a protected volume, and its supporting systems still need monitoring."
  },
  {
    id: "command",
    title: "Command and monitoring room",
    room: "FLIGHT DECK",
    icon: "⌘",
    explanation: "Mission control compares telemetry, system status, and crew reports before acting. A single number rarely explains the whole situation; trends and dependencies matter.",
    fieldNote: "Power is measured in kW; stored battery energy is measured in kWh. Keep the units and the whole system picture in view.",
    imageQueries: { MOON: "Mission Control Center", MARS: "Mission Control Center" },
    question: "A power warning appears. What is the best first step?",
    choices: [
      { id: "A", text: "Ignore it unless a crew member reports discomfort." },
      { id: "B", text: "Compare generation, demand, battery reserve, and the affected systems." },
      { id: "C", text: "Treat battery energy and power as the same measurement." }
    ],
    correctChoiceId: "B",
    answerExplanation: "Correct. Check the linked readings and system priorities before choosing a response."
  },
  {
    id: "air-water-room",
    title: "Air and water equipment room",
    room: "LIFE-SUPPORT BAY",
    icon: "◉",
    explanation: "Environmental control and life-support equipment handles several different jobs, including air circulation, water recovery, and waste management. The equipment is interconnected, but each function has its own status and checks.",
    fieldNote: "If one component is unavailable, inspect the related system state instead of assuming every life-support function stopped or recovered together.",
    imageQueries: { MOON: "ISS Environmental Control Life Support System hardware", MARS: "ISS Environmental Control Life Support System hardware" },
    question: "How should the crew respond to an unfamiliar life-support fault?",
    choices: [
      { id: "A", text: "Assume one device controls every air and water function." },
      { id: "B", text: "Bypass all checks and restart every system at once." },
      { id: "C", text: "Identify the affected component and check its linked telemetry." }
    ],
    correctChoiceId: "C",
    answerExplanation: "Correct. Separate components and monitored flows help the crew narrow down a fault."
  },
  {
    id: "greenhouse",
    title: "Greenhouse",
    room: "GROW LAB",
    icon: "✿",
    explanation: "Plant-growth experiments can support fresh-food research and crew well-being. They do not instantly replace stored food, and their lighting, water, and power needs must be managed.",
    fieldNote: "NASA's Veggie and plant-growth work is research; this training greenhouse is a simplified game system, not a validated crop-production model.",
    imageQueries: { MOON: "Veggie ISS plants NASA", MARS: "Veggie ISS plants NASA" },
    question: "How should the greenhouse fit into a survival plan?",
    choices: [
      { id: "A", text: "Treat it as a useful supplement, while tracking its resource needs." },
      { id: "B", text: "Assume it can replace all stored food immediately." },
      { id: "C", text: "Run it without considering power or water." }
    ],
    correctChoiceId: "A",
    answerExplanation: "Correct. Crop research can help, but dependable food stores and resource planning remain important."
  },
  {
    id: "airlock",
    title: "Airlock",
    room: "SUIT-UP BAY",
    icon: "⇄",
    explanation: "An airlock separates a pressurized cabin from the outside environment. Suit checks, seal checks, and dust-control steps help protect the habitat during surface operations.",
    fieldNote: "Lunar dust and Martian dust are different environments, but both make careful surface-to-habitat procedures important.",
    imageQueries: { MOON: "Quest Airlock astronaut ISS", MARS: "Quest Airlock astronaut ISS" },
    question: "Before an exterior task, which approach is safest?",
    choices: [
      { id: "A", text: "Open both hatches together to save time." },
      { id: "B", text: "Follow the approved suit, seal, and airlock checklist." },
      { id: "C", text: "Skip dust-control steps because the habitat is sealed." }
    ],
    correctChoiceId: "B",
    answerExplanation: "Correct. This game teaches checklist discipline; actual crews follow their mission-approved procedures."
  },
  {
    id: "terrain",
    title: "Exterior terrain",
    room: "SURFACE FIELD",
    icon: "◌",
    explanation: "Terrain changes the risks of surface work. For the Moon, LROC and ShadowCam imagery show different lighting conditions; for Mars, NASA's Mars Trek provides maps and terrain products. Imagery helps planning but is not a validated route.",
    fieldNote: "A shadowed lunar region is a prospecting target, not proof of an accessible water supply. A 3D training scene is not a surveyed landing site.",
    imageQueries: { MOON: "Apollo lunar surface", MARS: "Perseverance Mars landscape" },
    question: "How should NASA terrain imagery be used?",
    choices: [
      { id: "A", text: "Assume the game map is a flight-certified survey." },
      { id: "B", text: "Treat every shadowed area as confirmed accessible water." },
      { id: "C", text: "Use it as context, then verify the route and operating conditions." }
    ],
    correctChoiceId: "C",
    answerExplanation: "Correct. Remote imagery informs planning, but does not certify a safe route or prove usable resources."
  },
  {
    id: "power",
    title: "Solar array and battery",
    room: "POWER FIELD",
    icon: "⚡",
    explanation: "Solar arrays generate electrical power when illuminated; batteries store energy for later use. The power-distribution system directs that electricity to prioritized loads. Compare generation and demand with stored energy, especially when lighting or dust changes.",
    fieldNote: "kW describes a rate of power. kWh describes stored energy. They are related, but not interchangeable.",
    imageQueries: { MOON: "ISS solar array spacewalk", MARS: "ISS solar array spacewalk" },
    question: "What should the crew compare during a low-power warning?",
    choices: [
      { id: "A", text: "Generation, demand, and battery reserve together." },
      { id: "B", text: "Battery percentage alone, without checking active loads." },
      { id: "C", text: "Assume sunlight will stay constant for the whole mission." }
    ],
    correctChoiceId: "A",
    answerExplanation: "Correct. Looking at both the power rate and stored energy helps prioritize essential loads."
  },
  {
    id: "communications",
    title: "Communications equipment",
    room: "RELAY STATION",
    icon: "⌁",
    explanation: "Spacecraft use antennas and relay networks to exchange information with other vehicles and Earth. Mars communications have significant one-way delay that changes with geometry; the Moon also requires suitable link coverage.",
    fieldNote: "A message being queued is not the same as receiving an immediate response. Follow the mission communication plan.",
    imageQueries: { MOON: "NASA Deep Space Network antenna", MARS: "NASA Deep Space Network antenna" },
    question: "How should a crew plan around communication delay or gaps?",
    choices: [
      { id: "A", text: "Assume every message is delivered immediately." },
      { id: "B", text: "Use the mission plan and avoid assuming an immediate reply." },
      { id: "C", text: "Disable the relay to save power without checking the plan." }
    ],
    correctChoiceId: "B",
    answerExplanation: "Correct. Communication plans account for signal availability and delay; crews train to act within approved procedures."
  },
  {
    id: "rover",
    title: "Rover",
    room: "MOBILE EXPLORATION",
    icon: "🚙",
    explanation: "A rover extends surface exploration, but it still has limits: condition, energy, terrain, and route information all matter. The outpost rover is a training model, not a validated driving simulator.",
    fieldNote: "The lunar photo shows the Apollo 17 rover; today's rover concepts and operating conditions can differ. Do not treat a rendered route as surveyed terrain.",
    imageQueries: { MOON: "as17-137-20979", MARS: "PIA24334" },
    question: "What should be checked before a rover traverse?",
    choices: [
      { id: "A", text: "Only the shortest line visible on a screen." },
      { id: "B", text: "Nothing if the rover appears powered on." },
      { id: "C", text: "Vehicle status, available energy, and route information." }
    ],
    correctChoiceId: "C",
    answerExplanation: "Correct. Vehicle condition, energy, and terrain all affect a responsible traverse plan."
  },
  {
    id: "crew",
    title: "Four-person crew",
    room: "CREW OPERATIONS",
    icon: "♧",
    explanation: "NASA's Artemis II crew includes a commander, pilot, and mission specialists, illustrating distinct roles in a four-person team. Clear task assignment, check-ins, and attention to fatigue help crews coordinate and speak up when something seems wrong.",
    fieldNote: "The NASA image shows the Artemis II crew; the four selected characters below are the game's crew portraits. The fatigue indicator is a training mechanic, not a clinical measurement or medical limit.",
    imageQueries: { MOON: "jsc2023e018458", MARS: "jsc2023e018458" },
    question: "What helps a small crew work safely as a team?",
    choices: [
      { id: "A", text: "Share tasks clearly and encourage crew members to report concerns." },
      { id: "B", text: "Assign every job to one person and avoid check-ins." },
      { id: "C", text: "Ignore workload and fatigue when planning the day." }
    ],
    correctChoiceId: "A",
    answerExplanation: "Correct. Good coordination makes it easier to notice problems and distribute work."
  },
  {
    id: "oxygen-air",
    title: "Oxygen and air revitalization",
    room: "ATMOSPHERE SYSTEMS",
    icon: "O₂",
    explanation: "Oxygen generation and carbon-dioxide removal are distinct life-support functions. Crews monitor system status and cabin measurements together rather than assuming one device controls the whole atmosphere.",
    fieldNote: "This simulation simplifies the real engineering. Its resource values are for training, not human-health decisions.",
    imageQueries: { MOON: "ISS Oxygen Generation System", MARS: "ISS Oxygen Generation System" },
    question: "Which statement about air revitalization is correct?",
    choices: [
      { id: "A", text: "An oxygen generator automatically removes all cabin CO₂." },
      { id: "B", text: "Oxygen generation and CO₂ removal are different functions to monitor." },
      { id: "C", text: "Oxygen inventory alone describes the full cabin atmosphere." }
    ],
    correctChoiceId: "B",
    answerExplanation: "Correct. Separate functions and measurements provide a more complete picture of cabin air."
  },
  {
    id: "water-processing",
    title: "Water processing",
    room: "WATER RECOVERY",
    icon: "H₂O",
    explanation: "Water recovery converts wastewater into a candidate for reuse, but recovered water still needs quality checks. In the game, processed water stays quarantined until its simplified test passes.",
    fieldNote: "The training test is not a real chemical or microbial analyzer. Follow actual mission procedures for any real water-quality decision.",
    imageQueries: { MOON: "ISS Water Processor Assembly", MARS: "ISS Water Processor Assembly" },
    question: "When can a processed batch be counted as potable in this training model?",
    choices: [
      { id: "A", text: "As soon as a recovery cycle starts." },
      { id: "B", text: "Whenever the crew needs more water." },
      { id: "C", text: "After its required quality check passes." }
    ],
    correctChoiceId: "C",
    answerExplanation: "Correct. Recovery and quality verification are separate steps."
  }
];

export function getBriefingImageQuery(lessonId: string, planet: Planet): string | null {
  return MISSION_BRIEFING_LESSONS.find((lesson) => lesson.id === lessonId)?.imageQueries[planet] ?? null;
}
