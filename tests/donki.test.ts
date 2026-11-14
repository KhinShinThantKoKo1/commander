import { describe, expect, it } from "vitest";
import { buildSpaceWeatherChallenge } from "../src/lib/server/donki";

const currentEvents = [
  {
    flrID: "2026-11-05T18:21:00-FLR-001",
    peakTime: "2026-11-05T18:33Z",
    classType: "M3.5",
    activeRegionNum: 14566,
    link: "https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/49391/-1"
  },
  {
    flrID: "2026-11-11T21:06:00-FLR-001",
    peakTime: "2026-11-11T21:21Z",
    classType: "M1.7",
    activeRegionNum: 14566,
    link: "https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/49504/-1"
  }
];

describe("NASA DONKI space-weather challenge", () => {
  it("uses the newest real event and creates exactly five options with one best response", () => {
    const challenge = buildSpaceWeatherChallenge(currentEvents, new Date("2026-11-14T14:00:00.000Z"));

    expect(challenge?.event.classType).toBe("M1.7");
    expect(challenge?.event.peakTime).toBe("2026-11-11T21:21Z");
    expect(challenge?.question).toContain("M1.7");
    expect(challenge?.options).toHaveLength(5);
    expect(challenge?.options.map((option) => option.id)).toEqual(["A", "B", "C", "D", "E"]);
    expect(challenge?.options.filter((option) => option.id === challenge.correctOptionId)).toHaveLength(1);
    expect(challenge?.options.find((option) => option.id === challenge.correctOptionId)?.text).toContain("dosimeter");
    expect(challenge?.explanation).toContain("not an absorbed-dose measurement");
  });

  it("rejects malformed or empty DONKI responses instead of inventing an event", () => {
    expect(buildSpaceWeatherChallenge([])).toBeNull();
    expect(buildSpaceWeatherChallenge([{ classType: "M1.7", peakTime: "not-a-date" }])).toBeNull();
  });

  it("does not link a malformed event to an untrusted host", () => {
    const challenge = buildSpaceWeatherChallenge([{
      ...currentEvents[1],
      link: "https://example.com/fake-flare"
    }]);

    expect(challenge?.event.url).toBe("https://ccmc.gsfc.nasa.gov/DONKI/");
  });
});
