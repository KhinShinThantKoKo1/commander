import { SCIENCE_REFERENCES } from "./science";
import type { Planet } from "./types";

export interface DailyChallengeOption {
  id: string;
  text: string;
}

export interface DailyMissionChallenge {
  day: number;
  title: string;
  scenario: string;
  question: string;
  options: DailyChallengeOption[];
  correctOptionId: string;
  explanation: string;
  reference: {
    title: string;
    url: string;
    note?: string;
    notes?: string;
  };
}

const radiationReferences = {
  title: "NASA OSDR RadLab radiation dosimetry",
  url: "https://visualization.osdr.nasa.gov/radlab/gui/data-api/",
  note: "DONKI reports space-weather events; RadLab archives ISS dosimetry data. Neither is live dose telemetry for this simulated crew."
};

const csaFoodReference = {
  title: "CSA Food production on the Moon and in remote areas",
  url: "https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/",
  note: "An educational resource about food production and astronaut nutrition; it does not prescribe a flight menu or guarantee crop yield."
};

const options = (a: string, b: string, c: string, d: string, e: string): DailyChallengeOption[] => [
  { id: "A", text: a },
  { id: "B", text: b },
  { id: "C", text: c },
  { id: "D", text: d },
  { id: "E", text: e }
];

export const DAILY_CHALLENGES: Record<Planet, DailyMissionChallenge[]> = {
  MOON: [
    {
      day: 1,
      title: "Cabin life-support alarm",
      scenario: "The habitat reports a rising CO₂ trend before a planned surface task.",
      question: "What is the safest first response in this training scenario?",
      options: options(
        "Open the airlock to vent the cabin quickly.",
        "Check independent readings and life-support status, then follow the habitat checklist.",
        "Switch off CO₂ removal so the oxygen generator can work harder.",
        "Ignore the trend until the next scheduled report.",
        "Move the crew outside while the system resets."
      ),
      correctOptionId: "B",
      explanation: "Verify the readings and assess the life-support system before taking action. A lunar exterior is a vacuum, not a safe place to vent cabin air.",
      reference: SCIENCE_REFERENCES.eclss
    },
    {
      day: 2,
      title: "Water quality hold",
      scenario: "A recycled-water batch has completed processing and is waiting in quality hold.",
      question: "When can the batch be returned to the potable-water inventory?",
      options: options(
        "After the approved quality check passes and the batch is released.",
        "As soon as processing ends; recovered water is always potable.",
        "Only after mixing it with untreated lunar soil.",
        "Immediately if the crew is low on water, without testing.",
        "Never test it because ISS recovery results guarantee every future system."
      ),
      correctOptionId: "A",
      explanation: "The game models a quality gate: processed water stays quarantined until verification. ISS recovery results are evidence of a specific system, not a guarantee for lunar ice or another design.",
      reference: SCIENCE_REFERENCES.issWater2023
    },
    {
      day: 3,
      title: "South-pole traverse planning",
      scenario: "The rover route crosses sharply different lighting near a permanently shadowed region.",
      question: "Which planning choice best reflects the available lunar data?",
      options: options(
        "Treat every shadowed area as a confirmed, accessible water source.",
        "Drive the shortest route without checking terrain or lighting.",
        "Use LROC and ShadowCam imagery to assess terrain and lighting; treat volatiles as prospecting targets.",
        "Assume sunlight and communications are constant across the route.",
        "Use Mars terrain products because lunar images are unavailable."
      ),
      correctOptionId: "C",
      explanation: "LROC and ShadowCam provide complementary views of lunar terrain and illumination. A possible volatile deposit is not automatically a confirmed, accessible resource.",
      reference: SCIENCE_REFERENCES.lunarPolarSurvey
    },
    {
      day: 4,
      title: "Low-light power plan",
      scenario: "The lunar site is entering a lower-illumination interval and battery energy is falling.",
      question: "What is the best power response while protecting the crew?",
      options: options(
        "Turn off life support first to keep the rover charged.",
        "Use current telemetry, shed optional loads, and preserve essential habitat systems.",
        "Assume a solar array works at full output in every shadow.",
        "Spend all stored energy on science before checking reserves.",
        "Disconnect the battery from the habitat."
      ),
      correctOptionId: "B",
      explanation: "Lunar polar illumination varies with terrain. Monitor actual system readings and prioritize essential loads; the game’s power values are training assumptions.",
      reference: SCIENCE_REFERENCES.lunarPolarSurvey
    },
    {
      day: 5,
      title: "Radiation watch",
      scenario: "A space-weather report notes a solar event while the crew is outside the habitat.",
      question: "Which information should guide the crew’s response?",
      options: options(
        "The event’s flare class alone, treated as the crew’s absorbed dose.",
        "A social-media post saying the event has passed.",
        "A guessed dose based only on the event’s color in an image.",
        "Relevant radiation measurements and approved mission procedures, including shelter guidance.",
        "A historical ISS dose value used as the current lunar crew’s reading."
      ),
      correctOptionId: "D",
      explanation: "An event classification is not a measurement of an astronaut’s dose. Use appropriate monitoring and mission procedures; this prototype does not calculate dose or shelter effectiveness.",
      reference: radiationReferences
    },
    {
      day: 6,
      title: "Food-system planning",
      scenario: "The crew is reviewing stored food and a small experimental crop system.",
      question: "What is a responsible way to account for the crop system?",
      options: options(
        "Count all planted crops as ready-to-eat food today.",
        "Replace the planned food supply with unharvested plants.",
        "Track stored food and treat crop work as a monitored supplement, not guaranteed near-term supply.",
        "Ignore nutrition because growing food removes the need for a menu.",
        "Assume the CSA toolkit validates this habitat’s crop yield."
      ),
      correctOptionId: "C",
      explanation: "Food production can support astronaut health and may benefit Earth, but a training crop display is not a validated yield or flight nutrition plan.",
      reference: csaFoodReference
    },
    {
      day: 7,
      title: "Dust-safe return",
      scenario: "After a lunar surface activity, the crew is preparing to re-enter the habitat with dusty equipment.",
      question: "Which action best addresses the known lunar-dust concern?",
      options: options(
        "Carry all dust inside so the habitat filters can remove it later.",
        "Use the mission’s dust-control and airlock procedures to limit regolith entering the cabin.",
        "Blow dust off toward another crew member.",
        "Assume lunar dust cannot adhere to hardware.",
        "Disable cabin filtration during re-entry."
      ),
      correctOptionId: "B",
      explanation: "NASA describes fine lunar dust as a hardware and operations concern. This scenario emphasizes controlled dust management, not an invented cleaning procedure.",
      reference: SCIENCE_REFERENCES.lunarDust
    }
  ],
  MARS: [
    {
      day: 1,
      title: "MOXIE is not crew life support",
      scenario: "A briefing cites the oxygen produced by the Mars MOXIE technology demonstration.",
      question: "How should the crew interpret that result for habitat planning?",
      options: options(
        "Treat MOXIE’s total demonstration output as a ready reserve for the crew.",
        "Assume Mars air can be breathed without processing.",
        "Use the result as proof that any habitat can make oxygen at the same rate.",
        "Keep crew oxygen planning tied to the habitat life-support system; MOXIE was a technology demonstration.",
        "Turn off oxygen monitoring because MOXIE operated on Perseverance."
      ),
      correctOptionId: "D",
      explanation: "MOXIE demonstrated oxygen production from Martian CO₂, but its reported output was a technology demonstration, not a crew-scale life-support supply.",
      reference: SCIENCE_REFERENCES.marsMoxie
    },
    {
      day: 2,
      title: "Recycled-water release",
      scenario: "A processed water batch is ready for its quality check; no Mars resource-extraction system is modeled.",
      question: "What is the safest choice before using this batch?",
      options: options(
        "Release it as potable because water recovery is always complete.",
        "Mix in untreated surface material to increase the volume.",
        "Keep it quarantined until the quality check passes; do not assume local ice is available.",
        "Skip the check if the crew is thirsty.",
        "Use a historic ISS recovery percentage as a test result for this batch."
      ),
      correctOptionId: "C",
      explanation: "Recycling performance depends on system configuration, and this prototype does not model Martian water extraction. Verify the batch before release.",
      reference: SCIENCE_REFERENCES.issWater2023
    },
    {
      day: 3,
      title: "Rover route assessment",
      scenario: "The rover is assigned to cross unfamiliar terrain during a Mars surface traverse.",
      question: "What is the best preparation before committing to the route?",
      options: options(
        "Review terrain imagery and rover condition, then preserve the required energy margin.",
        "Assume the rover can cross any slope shown on a map.",
        "Ignore wheel and power status because Mars gravity is lower.",
        "Drive until the battery is empty, then request real-time help from Earth.",
        "Treat a 3D training map as a surveyed route."
      ),
      correctOptionId: "A",
      explanation: "Mars Trek provides terrain and imagery context, but this prototype does not load its map tiles or compute a validated route. Check the modeled rover state and energy before a traverse.",
      reference: SCIENCE_REFERENCES.marsTrek
    },
    {
      day: 4,
      title: "Dust-storm power response",
      scenario: "A dust scenario reduces modeled solar generation while the habitat continues to need power.",
      question: "What is the most responsible response?",
      options: options(
        "Use InSight’s historical power numbers as a direct forecast for this habitat.",
        "Turn off every system, including life support.",
        "Keep all optional loads running and wait for sunlight to return.",
        "Increase demand so the battery can be tested faster.",
        "Check current telemetry, shed optional loads, and protect essential systems."
      ),
      correctOptionId: "E",
      explanation: "InSight documented a power decline during one particular dust storm, but it is not a forecast for a crewed habitat. Respond to actual system telemetry and prioritize essentials.",
      reference: SCIENCE_REFERENCES.marsDustStorm
    },
    {
      day: 5,
      title: "Radiation monitoring",
      scenario: "A solar-event notification arrives while the crew is planning outdoor work on Mars.",
      question: "What should determine whether the crew changes its plan?",
      options: options(
        "The flare class alone, converted directly into crew dose.",
        "A viral estimate without sensor or forecast context.",
        "The event timestamp only, regardless of particle measurements.",
        "Relevant radiation measurements and forecasts interpreted under approved mission procedures.",
        "A past ISS dosimeter record used as this crew’s live reading."
      ),
      correctOptionId: "D",
      explanation: "DONKI event notifications and archived RadLab measurements are useful context, not live dose telemetry for this simulated Mars crew. This prototype does not calculate dose.",
      reference: radiationReferences
    },
    {
      day: 6,
      title: "Long-duration food planning",
      scenario: "A resupply plan is being reviewed alongside a crop-growth experiment.",
      question: "Which inventory decision is safest?",
      options: options(
        "Count projected harvest as guaranteed food before it is grown and tested.",
        "Maintain a verified food inventory and treat crop production as a planned, monitored contribution.",
        "Stop checking stored food once seeds have been planted.",
        "Assume every crop produces the same nutrition in space as on Earth.",
        "Use a classroom toolkit as proof of this habitat’s yield."
      ),
      correctOptionId: "B",
      explanation: "Food production is relevant to long-duration exploration, but a crop experiment does not guarantee harvest, nutrition, or resupply replacement.",
      reference: csaFoodReference
    },
    {
      day: 7,
      title: "Earth-Mars communication delay",
      scenario: "A non-urgent equipment anomaly occurs and the crew cannot expect an immediate reply from Earth.",
      question: "What is the best operational approach?",
      options: options(
        "Wait for a live voice response before taking any safe action.",
        "Repeat the transmission until Earth replies in real time.",
        "Follow the preplanned local procedure, protect the crew, and queue a status report.",
        "Assume the communications delay is always zero.",
        "Disable the communications system to save power without checking priorities."
      ),
      correctOptionId: "C",
      explanation: "Earth–Mars one-way communication delay varies with geometry. Crewed missions need preplanned procedures and local decision authority; this prototype does not calculate live ephemeris.",
      reference: SCIENCE_REFERENCES.marsCommunications
    }
  ]
};

export function getDailyChallenge(planet: Planet, day: number): DailyMissionChallenge | undefined {
  return DAILY_CHALLENGES[planet].find((challenge) => challenge.day === day);
}
