import type { SpaceWeatherChallenge } from "@/lib/simulation/types";

interface FlareEvent {
  id: string;
  peakTime: string;
  classType: string;
  activeRegionNum: number | null;
  url: string;
}

const DONKI_ORIGIN = "https://ccmc.gsfc.nasa.gov";
const CLASS_PATTERN = /^[ABCMX]\d+(?:\.\d+)?$/;
const DISTRACTORS = [
  "Treat the flare’s class as the crew’s absorbed dose and shelter based on that number alone.",
  "Use the active-region number to estimate the radiation dose inside the habitat.",
  "Ignore radiation monitoring because solar flares cannot affect spacecraft crews.",
  "Assume the flare class alone predicts the crew’s exposure and continue without checking alerts."
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeEventUrl(value: unknown): string {
  if (typeof value === "string") {
    try {
      const url = new URL(value);
      if (url.origin === DONKI_ORIGIN && url.pathname.startsWith("/DONKI/view/FLR/")) return url.toString();
    } catch {
      return `${DONKI_ORIGIN}/DONKI/`;
    }
  }
  return `${DONKI_ORIGIN}/DONKI/`;
}

function parseFlare(value: unknown): FlareEvent | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.flrID !== "string" ||
    typeof value.peakTime !== "string" ||
    !Number.isFinite(Date.parse(value.peakTime)) ||
    typeof value.classType !== "string" ||
    !CLASS_PATTERN.test(value.classType)
  ) return null;

  return {
    id: value.flrID,
    peakTime: value.peakTime,
    classType: value.classType,
    activeRegionNum: typeof value.activeRegionNum === "number" ? value.activeRegionNum : null,
    url: safeEventUrl(value.link)
  };
}

export function buildSpaceWeatherChallenge(payload: unknown, retrievedAt = new Date()): SpaceWeatherChallenge | null {
  if (!Array.isArray(payload)) return null;
  const event = payload.map(parseFlare).filter((flare): flare is FlareEvent => flare !== null)
    .sort((a, b) => Date.parse(b.peakTime) - Date.parse(a.peakTime))[0];
  if (!event) return null;

  const correctText = "Check current radiation dosimeter readings and authoritative space-weather alerts, then follow the mission’s approved radiation-response procedure.";
  const answerIndex = Array.from(event.id).reduce((sum, character) => sum + character.charCodeAt(0), 0) % (DISTRACTORS.length + 1);
  let distractorIndex = 0;
  const options = Array.from({ length: 5 }, (_, index) => ({
    id: String.fromCharCode(65 + index),
    text: index === answerIndex ? correctText : DISTRACTORS[distractorIndex++]
  }));
  const correctOptionId = options[answerIndex].id;

  return {
    event,
    question: `NASA DONKI’s latest recorded event in this 30-day window was a ${event.classType} solar flare peaking at ${event.peakTime} UTC; this is not itself an active crew alert. In a real mission, what is the best evidence-based step before deciding whether the crew needs a radiation response?`,
    options,
    correctOptionId,
    explanation: "A flare class describes the Sun’s X-ray output; it is not an absorbed-dose measurement at the crew. Check radiation instrumentation and authoritative space-weather alerts, then use the mission’s approved procedures. DONKI is a research/prototyping data source, and RadLab is a reference dataset—not live crew telemetry.",
    references: [
      { label: "NASA DONKI event", url: event.url },
      { label: "NASA solar-flare classes", url: "https://science.nasa.gov/sun/solar-storms-and-flares/" },
      { label: "NOAA Space Weather Prediction Center", url: "https://www.swpc.noaa.gov/" },
      { label: "NASA OSDR RadLab", url: "https://visualization.osdr.nasa.gov/radlab/gui/data-api/" },
      { label: "DONKI data limitations", url: "https://ccmc.gsfc.nasa.gov/tools/DONKI/" }
    ],
    retrievedAt: retrievedAt.toISOString()
  };
}
