import { describe, expect, it } from "vitest";
import { getBriefingImageQuery, MISSION_BRIEFING_LESSONS, PUBLIC_DOMAIN_CREW_PHOTO } from "../src/lib/simulation/missionBriefing";

describe("pre-mission briefing", () => {
  it("provides complete, uniquely identified knowledge checks for every lesson", () => {
    const ids = MISSION_BRIEFING_LESSONS.map((lesson) => lesson.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(12);
    expect(new Set(MISSION_BRIEFING_LESSONS.map((lesson) => lesson.correctChoiceId)).size).toBe(3);

    for (const lesson of MISSION_BRIEFING_LESSONS) {
      const choiceIds = lesson.choices.map((choice) => choice.id);
      const choiceTexts = lesson.choices.map((choice) => choice.text);
      expect(choiceIds).toHaveLength(3);
      expect(new Set(choiceIds).size).toBe(choiceIds.length);
      expect(new Set(choiceTexts).size).toBe(choiceTexts.length);
      expect(choiceIds).toContain(lesson.correctChoiceId);
      expect(lesson.imageQueries.MOON).not.toBe("");
      expect(lesson.imageQueries.MARS).not.toBe("");
    }
  });

  it("uses destination-specific NASA image searches for surface lessons", () => {
    expect(getBriefingImageQuery("terrain", "MOON")).toContain("lunar");
    expect(getBriefingImageQuery("terrain", "MARS")).toContain("Mars");
    expect(getBriefingImageQuery("unknown-topic", "MOON")).toBeNull();
  });

  it("uses specific NASA rover and four-person crew photographs", () => {
    expect(getBriefingImageQuery("rover", "MOON")).toBe("as17-137-20979");
    expect(getBriefingImageQuery("rover", "MARS")).toBe("PIA24334");
    expect(PUBLIC_DOMAIN_CREW_PHOTO).toMatchObject({
      url: "/assets/briefing/artemis-ii-crew.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Artemis_2_Crew_Portrait.jpg",
      license: "Public domain"
    });
  });
});
