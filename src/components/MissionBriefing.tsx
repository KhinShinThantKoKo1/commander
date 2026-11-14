"use client";

import { useEffect, useState } from "react";
import SoundToggle from "@/components/SoundToggle";
import { MISSION_BRIEFING_LESSONS } from "@/lib/simulation/missionBriefing";
import { playSoundEffect } from "@/lib/soundEffects";
import type { Difficulty, Planet } from "@/lib/simulation/types";

type CrewVisual = {
  id: string;
  name: string;
  role: string;
  image: string;
};

type BriefingImage = {
  url: string;
  title: string;
  credit: string;
  sourceUrl: string;
  license?: string;
};

type PhotoError = {
  message: string;
  searchUrl?: string;
};

type Props = {
  playerName: string;
  crew: CrewVisual[];
  planet: Planet;
  difficulty: Difficulty;
  difficultyLabel: string;
  launchError: string;
  onBack: () => void;
  onLaunch: () => Promise<boolean>;
};

export default function MissionBriefing({
  playerName,
  crew,
  planet,
  difficulty,
  difficultyLabel,
  launchError,
  onBack,
  onLaunch
}: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<Record<string, BriefingImage>>({});
  const [photoErrors, setPhotoErrors] = useState<Record<string, PhotoError>>({});
  const [photoFailures, setPhotoFailures] = useState<Record<string, boolean>>({});
  const [loadingPhotoId, setLoadingPhotoId] = useState<string | null>(null);
  const [photoRetry, setPhotoRetry] = useState(0);
  const [launching, setLaunching] = useState(false);
  const lesson = MISSION_BRIEFING_LESSONS[step];
  const readinessStep = step === MISSION_BRIEFING_LESSONS.length;
  const answeredCorrectly = lesson ? answers[lesson.id] === lesson.correctChoiceId : false;
  const completedLessons = MISSION_BRIEFING_LESSONS.filter((item) => answers[item.id] === item.correctChoiceId).length;
  const targetName = planet === "MOON" ? "LUNAR OUTPOST" : "MARS OUTPOST";

  useEffect(() => {
    if (!lesson || photos[lesson.id]) return;
    const controller = new AbortController();
    setLoadingPhotoId(lesson.id);
    setPhotoErrors((current) => {
      if (!current[lesson.id]) return current;
      const next = { ...current };
      delete next[lesson.id];
      return next;
    });

    void fetch(`/api/nasa-images?lesson=${encodeURIComponent(lesson.id)}&planet=${planet}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json() as { image?: BriefingImage; error?: string; searchUrl?: string };
        if (!response.ok || !payload.image) {
          setPhotoErrors((current) => ({
            ...current,
            [lesson.id]: {
              message: payload.error ?? "NASA's image library could not find a photo for this topic.",
              searchUrl: payload.searchUrl
            }
          }));
          return;
        }
        setPhotos((current) => ({ ...current, [lesson.id]: payload.image! }));
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setPhotoErrors((current) => ({
            ...current,
            [lesson.id]: { message: "NASA's image library could not be reached. Retry the photo or continue the lesson." }
          }));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingPhotoId((current) => current === lesson.id ? null : current);
      });

    return () => controller.abort();
  }, [lesson, photos, planet, photoRetry]);

  function chooseAnswer(lessonId: string, choiceId: string) {
    const selectedLesson = MISSION_BRIEFING_LESSONS.find((item) => item.id === lessonId);
    if (!selectedLesson || answers[lessonId] === choiceId) return;
    playSoundEffect(choiceId === selectedLesson.correctChoiceId ? "correct" : "incorrect");
    setAnswers((current) => ({ ...current, [lessonId]: choiceId }));
  }

  async function beginLaunch() {
    if (launching) return;
    playSoundEffect("launch");
    setLaunching(true);
    await new Promise((resolve) => window.setTimeout(resolve, 2200));
    const started = await onLaunch();
    if (!started) setLaunching(false);
  }

  function retryPhoto(lessonId: string) {
    setPhotos((current) => {
      const next = { ...current };
      delete next[lessonId];
      return next;
    });
    setPhotoErrors((current) => {
      const next = { ...current };
      delete next[lessonId];
      return next;
    });
    setPhotoFailures((current) => {
      const next = { ...current };
      delete next[lessonId];
      return next;
    });
    setPhotoRetry((current) => current + 1);
  }

  return (
    <main className="briefing-shell">
      <header className="briefing-topbar">
        <button type="button" className="briefing-back-link" onClick={onBack} disabled={launching}>← SETUP</button>
        <div><strong>LAUNCH LAB</strong><span>PRE-FLIGHT FIELD GUIDE</span></div>
        <div className="briefing-topbar-actions">
          <SoundToggle />
          <span className="briefing-destination">{targetName} · {difficultyLabel.toUpperCase()}</span>
        </div>
      </header>

      <section className="briefing-main">
        <div className="briefing-heading">
          <p className="eyebrow">{readinessStep ? "FINAL SYSTEMS CHECK" : `OUTPOST ORIENTATION · STOP ${String(step + 1).padStart(2, "0")}`}</p>
          <h1>{readinessStep ? "Your crew is ready." : "Know your outpost."}</h1>
          <p>{readinessStep
            ? "You have explored the habitat, life-support systems, surface equipment, and crew roles. Review your flight team, then launch when ready."
            : "Explore 12 short field-guide stops, learn from NASA imagery, and answer each quick check. Missed answers cost no campaign lives."}</p>
        </div>

        <div className="briefing-progress" aria-label={`${completedLessons} of ${MISSION_BRIEFING_LESSONS.length} lessons completed`}>
          <div><span>FIELD GUIDE PROGRESS</span><strong>{completedLessons}/{MISSION_BRIEFING_LESSONS.length}</strong></div>
          <div className="briefing-progress-track"><span style={{ width: `${(completedLessons / MISSION_BRIEFING_LESSONS.length) * 100}%` }} /></div>
        </div>

        <nav className="briefing-stops" aria-label="Outpost lesson navigation">
          {MISSION_BRIEFING_LESSONS.map((item, index) => {
            const completed = answers[item.id] === item.correctChoiceId;
            const unlocked = index <= step;
            return <button
              key={item.id}
              type="button"
              className={`${index === step ? "active" : ""} ${completed ? "done" : ""}`}
              disabled={!unlocked || launching}
              aria-current={index === step ? "step" : undefined}
              aria-label={`Stop ${index + 1}: ${item.title}${completed ? ", completed" : ""}`}
              onClick={() => { playSoundEffect("select"); setStep(index); }}
            >
              <span>{completed ? "✓" : item.icon}</span><small>{String(index + 1).padStart(2, "0")}</small>
            </button>;
          })}
          {readinessStep && <span className="briefing-ready-marker" aria-label="Ready for launch">✓</span>}
        </nav>

        {lesson ? (
          <section className="briefing-lesson" aria-labelledby="briefing-lesson-title">
            <div className="briefing-photo-card">
              {photos[lesson.id] && !photoFailures[lesson.id]
                ? <img
                    className="briefing-photo"
                    data-portrait={lesson.id === "crew" ? "true" : undefined}
                    src={photos[lesson.id].url}
                    alt={photos[lesson.id].title}
                    onError={() => setPhotoFailures((current) => ({ ...current, [lesson.id]: true }))}
                  />
                : <div className={`briefing-photo-placeholder ${loadingPhotoId === lesson.id ? "loading" : ""}`}>
                    <span>{loadingPhotoId === lesson.id ? "FETCHING NASA IMAGE…" : photoFailures[lesson.id] ? "NASA PHOTO PREVIEW DID NOT LOAD" : "NASA PHOTO UNAVAILABLE"}</span>
                    <strong>{lesson.icon}</strong>
                    {photoErrors[lesson.id] && <small>{photoErrors[lesson.id].message}</small>}
                    {loadingPhotoId !== lesson.id && <button type="button" onClick={() => retryPhoto(lesson.id)}>RETRY NASA PHOTO</button>}
                  </div>}
              <div className="briefing-photo-caption">
                <span>{photos[lesson.id]?.title ?? "NASA Image and Video Library"}</span>
                {photos[lesson.id] && <small>Photo credit: {photos[lesson.id].credit}</small>}
                {photos[lesson.id]?.license && <small>License: {photos[lesson.id].license}</small>}
                {photos[lesson.id] && <a href={photos[lesson.id].sourceUrl} target="_blank" rel="noreferrer">{photos[lesson.id].license ? "OPEN SOURCE & LICENSE ↗" : "OPEN NASA PHOTO ↗"}</a>}
                {!photos[lesson.id] && photoErrors[lesson.id]?.searchUrl && <a href={photoErrors[lesson.id].searchUrl} target="_blank" rel="noreferrer">SEARCH NASA IMAGES ↗</a>}
                {photoFailures[lesson.id] && photos[lesson.id] && <a href={photos[lesson.id].sourceUrl} target="_blank" rel="noreferrer">OPEN NASA PHOTO ↗</a>}
              </div>
            </div>

            <div className="briefing-lesson-copy">
              <div className="briefing-room-tag"><span>{lesson.icon}</span>{lesson.room}</div>
              <h2 id="briefing-lesson-title">{lesson.title}</h2>
              <p>{lesson.explanation}</p>
              <div className="briefing-field-note"><strong>FIELD NOTE</strong><span>{lesson.fieldNote}</span></div>

              <fieldset className="briefing-quiz" disabled={launching}>
                <legend>{lesson.question}</legend>
                <div className="briefing-choices">
                  {lesson.choices.map((choice) => {
                    const selected = answers[lesson.id] === choice.id;
                    const correct = selected && choice.id === lesson.correctChoiceId;
                    const incorrect = selected && !correct;
                    return <button
                      type="button"
                      key={choice.id}
                      className={`${correct ? "correct" : ""} ${incorrect ? "incorrect" : ""}`}
                      aria-pressed={selected}
                      onClick={() => chooseAnswer(lesson.id, choice.id)}
                    >
                      <b>{choice.id}</b><span>{choice.text}</span>
                    </button>;
                  })}
                </div>
                {answers[lesson.id] && <p className={`briefing-feedback ${answeredCorrectly ? "success" : "try-again"}`} role="status">
                  {answeredCorrectly ? lesson.answerExplanation : "Not quite. Review the field note and try another answer. This practice check does not use a mission life."}
                </p>}
              </fieldset>
            </div>
          </section>
        ) : (
          <section className="briefing-readiness" aria-labelledby="briefing-readiness-title">
            <div className="readiness-copy">
              <span className="readiness-check">✓</span>
              <div><p className="eyebrow">CREW &amp; OUTPOST CHECK</p><h2 id="briefing-readiness-title">All systems go, {playerName}.</h2></div>
            </div>
            <div className="readiness-crew">
              {crew.map((member, index) => <div className="readiness-crew-member" key={`${member.id}-${index}`}>
                <img src={member.image} alt={`${member.name} ${member.role} character portrait`} />
                <span><strong>{member.name}</strong><small>{member.role}</small></span>
                <b>READY</b>
              </div>)}
            </div>
            <div className="readiness-summary">
              <div><span>DESTINATION</span><strong>{planet === "MOON" ? "LUNAR SOUTH POLE" : "MARS SURFACE"}</strong></div>
              <div><span>DIFFICULTY</span><strong>{difficultyLabel.toUpperCase()}</strong></div>
              <div><span>FIELD GUIDE</span><strong>{completedLessons} / {MISSION_BRIEFING_LESSONS.length} CHECKS PASSED</strong></div>
            </div>
            <p className="readiness-disclaimer">NASA photos and mission references are educational examples. This prototype is not a flight procedure or a real mission-readiness system.</p>
            {completedLessons < MISSION_BRIEFING_LESSONS.length && <p className="briefing-launch-error" role="status">Complete all {MISSION_BRIEFING_LESSONS.length} field checks before launching.</p>}
            {launchError && <p className="briefing-launch-error" role="alert">{launchError}</p>}
            <div className="briefing-actions">
              <button type="button" className="briefing-secondary-button" onClick={() => { playSoundEffect("select"); setStep(MISSION_BRIEFING_LESSONS.length - 1); }} disabled={launching}>REVIEW LAST STOP</button>
              <button type="button" className="briefing-launch-button" onClick={() => void beginLaunch()} disabled={launching || completedLessons !== MISSION_BRIEFING_LESSONS.length}>
                {launching ? "COUNTDOWN IN PROGRESS…" : completedLessons === MISSION_BRIEFING_LESSONS.length ? `BEGIN ${planet === "MOON" ? "LUNAR" : "MARS"} LAUNCH` : "COMPLETE FIELD CHECKS"} <span>↗</span>
              </button>
            </div>
          </section>
        )}

        {lesson && <div className="briefing-actions">
          <button type="button" className="briefing-secondary-button" onClick={() => { playSoundEffect("select"); step === 0 ? onBack() : setStep(step - 1); }} disabled={launching}>
            {step === 0 ? "BACK TO SETUP" : "← PREVIOUS STOP"}
          </button>
          <button type="button" className="briefing-launch-button" onClick={() => { playSoundEffect("select"); setStep(step + 1); }} disabled={!answeredCorrectly || launching}>
            {step === MISSION_BRIEFING_LESSONS.length - 1 ? "CREW READINESS CHECK" : "NEXT FIELD STOP"} <span>→</span>
          </button>
        </div>}
      </section>

      {launching && <div className="launch-transition" role="status" aria-live="polite">
        <div className="launch-transition-stars" />
        <span className="launch-rocket" aria-hidden="true">🚀</span>
        <p className="eyebrow">CREW SECURED · FLIGHT PATH LOCKED</p>
        <h2>LAUNCHING TO {planet === "MOON" ? "THE MOON" : "MARS"}</h2>
        <div className="launch-transition-track"><span /></div>
        <small>3 · 2 · 1 · LIFTOFF</small>
      </div>}
    </main>
  );
}
