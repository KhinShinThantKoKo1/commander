"use client";

import dynamic from "next/dynamic";
import { FormEvent, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import MissionBriefing from "@/components/MissionBriefing";
import SoundToggle from "@/components/SoundToggle";
import { areDailyObjectivesComplete, areDailyRequirementsComplete, CHARACTER_ROSTER, getEducationalHint, isDailyChallengeComplete, TRAINING_ASSUMPTIONS } from "@/lib/simulation/engine";
import { EQUIPMENT_CATALOG } from "@/lib/simulation/equipment";
import { getDailyChallenge } from "@/lib/simulation/dailyChallenges";
import { GAMEPLAY_ASSUMPTIONS, SCIENCE_REFERENCES, SCIENCE_DATA_VERSION } from "@/lib/simulation/science";
import { playSoundEffect } from "@/lib/soundEffects";
import type { CreateMissionInput, Difficulty, MissionCommand, MissionState, Planet, SpaceWeatherChallenge } from "@/lib/simulation/types";

const WorldCanvas = dynamic(() => import("@/components/WorldCanvas"), { ssr: false, loading: () => <div className="world-loading">BUILDING THE OUTPOST…</div> });

const MINUTES_PER_DAY = 1440;
const SIMULATION_MINUTES_PER_REAL_SECOND = 5;
type CharacterInfo = { id: string; name: string; role: string; image: string; accent: string; custom?: boolean; opaque?: boolean };
type MiraPosition = { left: number; top: number };
type MiraDrag = { pointerId: number; offsetX: number; offsetY: number; startX: number; startY: number; isLauncher: boolean; didMove: boolean };
const DIFFICULTIES: Difficulty[] = ["STANDARD", "CHALLENGING", "EXPERT"];
const CHARACTERS: CharacterInfo[] = [
  { id: "sofia", name: "Sofia", role: "Commander", image: "/assets/characters/sofia.png", accent: "#d9a52f" },
  { id: "pilot", name: "Pilot Andrews", role: "Pilot", image: "/assets/characters/pilot-andrews.png", accent: "#7845aa" },
  { id: "alexander", name: "Alexander", role: "Navigation Officer", image: "/assets/characters/alexander.png", accent: "#2674d9"},
  { id: "christopher", name: "Christopher", role: "Engineer", image: "/assets/characters/christopher.png", accent: "#c9433c" },
  { id: "llian", name: "Llian", role: "Ecologist", image: "/assets/characters/llian.png", accent: "#6a9a38" },
  { id: "jewel", name: "Jewel", role: "Medic", image: "/assets/characters/jewel.png", accent: "#df4e91" },
  { id: "user-magenta", name: "Create astronaut", role: "Player template A", image: "/assets/characters/user-magenta.png", accent: "#d83285", custom: true, opaque: true },
  { id: "user-black", name: "Create astronaut", role: "Player template B", image: "/assets/characters/user-black.png", accent: "#242a36", custom: true }
];

function fmt(value: number, digits = 1) { return Number.isFinite(value) ? value.toFixed(digits) : "—"; }
function timeLabel(minutes: number, missionDay: number, status: MissionState["status"]) {
  if (minutes >= 7 * MINUTES_PER_DAY) return `DAY ${missionDay} · ${status === "SUCCESS" ? "COMPLETE" : "ENDED"}`;
  const inDay = minutes % MINUTES_PER_DAY;
  return `DAY ${missionDay} · ${String(Math.floor(inDay / 60)).padStart(2, "0")}:${String(inDay % 60).padStart(2, "0")}`;
}
function logTimeLabel(minutes: number) {
  const day = Math.floor(minutes / MINUTES_PER_DAY) + 1;
  const inDay = minutes % MINUTES_PER_DAY;
  return `Day ${day} · ${String(Math.floor(inDay / 60)).padStart(2, "0")}:${String(inDay % 60).padStart(2, "0")}`;
}

export default function GameApp() {
  const [selectedCharacter, setSelectedCharacter] = useState("user-magenta");
  const [playerName, setPlayerName] = useState("Cadet");
  const [planet, setPlanet] = useState<Planet>("MOON");
  const [difficulty, setDifficulty] = useState<Difficulty>("STANDARD");
  const [supportCrew, setSupportCrew] = useState<string[]>(["sofia", "christopher", "jewel"]);
  const [mission, setMission] = useState<MissionState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);
  const [selectedCrewId, setSelectedCrewId] = useState<string | null>(null);
  const [miraOpen, setMiraOpen] = useState(false);
  const [miraWidgetOpen, setMiraWidgetOpen] = useState(false);
  const [miraPosition, setMiraPosition] = useState<MiraPosition | null>(null);
  const [miraQuestion, setMiraQuestion] = useState("");
  const [miraReply, setMiraReply] = useState("Hi! I'm MIRA. I can help you think through the equipment and resource clues without choosing for you.");
  const [playerPosition, setPlayerPosition] = useState<[number, number]>([0, 1.5]);
  const [showScience, setShowScience] = useState(false);
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [spaceWeatherChallenge, setSpaceWeatherChallenge] = useState<SpaceWeatherChallenge | null>(null);
  const [spaceWeatherAnswer, setSpaceWeatherAnswer] = useState<string | null>(null);
  const [spaceWeatherLoading, setSpaceWeatherLoading] = useState(false);
  const [spaceWeatherError, setSpaceWeatherError] = useState("");
  const busyRef = useRef(false);
  const missionRef = useRef<MissionState | null>(null);
  const miraDragRef = useRef<MiraDrag | null>(null);
  const suppressMiraClickRef = useRef(false);
  const commandRef = useRef<(command: MissionCommand) => Promise<void>>(async () => undefined);

  useEffect(() => { missionRef.current = mission; }, [mission]);

  useEffect(() => {
    if (!miraPosition) return;
    const clampMiraToViewport = () => {
      const target = document.querySelector<HTMLElement>(miraWidgetOpen ? ".mira-widget" : ".mira-launcher");
      if (!target) return;
      const left = Math.max(8, Math.min(miraPosition.left, window.innerWidth - target.offsetWidth - 8));
      const top = Math.max(8, Math.min(miraPosition.top, window.innerHeight - target.offsetHeight - 8));
      if (left !== miraPosition.left || top !== miraPosition.top) setMiraPosition({ left, top });
    };
    clampMiraToViewport();
    window.addEventListener("resize", clampMiraToViewport);
    return () => window.removeEventListener("resize", clampMiraToViewport);
  }, [miraPosition, miraWidgetOpen, mission?.id]);

  useEffect(() => {
    let cancelled = false;
    async function restoreSavedMission() {
      try {
        const savedId = window.localStorage.getItem("launchlab:lastMissionId");
        if (!savedId) return;
        const response = await fetch(`/api/missions/${encodeURIComponent(savedId)}`);
        if (!response.ok) {
          window.localStorage.removeItem("launchlab:lastMissionId");
          return;
        }
        const data = await response.json() as { mission?: MissionState };
        if (!cancelled && data.mission) {
          setMission(data.mission);
          missionRef.current = data.mission;
        }
      } catch {
        // A saved mission can still be opened from the database once the server is available.
      } finally {
        if (!cancelled) setRestoring(false);
      }
    }
    void restoreSavedMission();
    return () => { cancelled = true; };
  }, []);

  const equipment = useMemo(() => EQUIPMENT_CATALOG.find((item) => item.id === selectedEquipmentId) ?? null, [selectedEquipmentId]);
  const selectedSystem = equipment?.systemId ? mission?.systems.find((item) => item.id === equipment.systemId) : null;
  const playerCharacter = CHARACTERS.find((item) => item.id === mission?.playerCharacterId) ?? CHARACTERS[6];
  const selectedOperator = selectedCrewId
    ? mission?.crew.find((member) => member.id === selectedCrewId)
    : mission?.crew[0];
  const supportCrewVisuals = mission?.crew.slice(1).map((member) => {
    const character = CHARACTERS.find((item) => item.id === member.characterId);
    return {
      member,
      accentColor: character?.accent ?? "#758ca0",
      characterImage: character?.image ?? ""
    };
  }) ?? [];

  const loadSpaceWeatherChallenge = useCallback(async () => {
    setSpaceWeatherLoading(true);
    setSpaceWeatherError("");
    try {
      const response = await fetch("/api/challenges/space-weather");
      const payload = await response.json() as { challenge?: SpaceWeatherChallenge; error?: string };
      if (!response.ok || !payload.challenge) throw new Error(payload.error ?? "Could not load a NASA space-weather challenge.");
      setSpaceWeatherChallenge(payload.challenge);
      setSpaceWeatherAnswer(null);
    } catch (err) {
      setSpaceWeatherError(err instanceof Error ? err.message : "Could not load NASA space-weather data.");
    } finally {
      setSpaceWeatherLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mission) void loadSpaceWeatherChallenge();
  }, [mission?.id, loadSpaceWeatherChallenge]);

  const dispatch = useCallback(async (command: MissionCommand) => {
    const current = missionRef.current;
    if (!current || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/missions/${current.id}/command`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ command })
      });
      const payload = await response.json() as { mission?: MissionState; error?: string };
      if (!response.ok || !payload.mission) throw new Error(payload.error ?? "The mission command could not be saved.");
      const nextMission = payload.mission;
      if (current.status === "ACTIVE" && nextMission.status === "SUCCESS") {
        playSoundEffect("victory");
      } else if (current.status === "ACTIVE" && nextMission.status !== "ACTIVE") {
        playSoundEffect("defeat");
      } else if (!current.activeIncident && nextMission.activeIncident) {
        playSoundEffect("alert");
      } else if (command.type === "ANSWER_DAILY_CHALLENGE") {
        if (nextMission.challengeLives < current.challengeLives) playSoundEffect("incorrect");
        else if (!isDailyChallengeComplete(current) && isDailyChallengeComplete(nextMission)) playSoundEffect("correct");
      } else if (command.type === "ADVANCE" && nextMission.day > current.day) {
        playSoundEffect("dayComplete");
      } else if (nextMission.objectives.some((objective) =>
        objective.complete && !current.objectives.some((previous) => previous.id === objective.id && previous.complete)
      )) {
        playSoundEffect("objective");
      }
      setMission(nextMission);
      missionRef.current = nextMission;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected mission error.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, []);
  commandRef.current = dispatch;

  useEffect(() => {
    if (!mission || mission.status !== "ACTIVE" || mission.speed === 0 || mission.activeIncident) return;
    const timer = window.setInterval(() => {
      const current = missionRef.current;
      if (!current || current.status !== "ACTIVE" || current.speed === 0 || current.activeIncident) return;
      if (current.elapsedMinutes >= current.day * MINUTES_PER_DAY - 1 && !areDailyRequirementsComplete(current)) return;
      void commandRef.current({ type: "ADVANCE", minutes: current.speed * SIMULATION_MINUTES_PER_REAL_SECOND });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [mission?.id, mission?.speed, mission?.activeIncident?.id, mission?.status]);

  async function launchMission(): Promise<boolean> {
    setBusy(true);
    setError("");
    try {
      const payload: CreateMissionInput = { planet, difficulty, playerName, playerCharacterId: selectedCharacter, supportCrewIds: supportCrew.filter((id) => id !== selectedCharacter).slice(0, 3) };
      const response = await fetch("/api/missions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json() as { mission?: MissionState; error?: string };
      if (!response.ok || !data.mission) throw new Error(data.error ?? "Mission launch failed.");
      setMission(data.mission);
      missionRef.current = data.mission;
      window.localStorage.setItem("launchlab:lastMissionId", data.mission.id);
      setSelectedEquipmentId(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not launch mission.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function chooseCharacter(id: string) {
    if (id !== selectedCharacter) playSoundEffect("select");
    setSelectedCharacter(id);
    const character = CHARACTERS.find((item) => item.id === id);
    if (character?.custom && playerName === "Cadet") setPlayerName("");
    setSupportCrew((current) => current.filter((member) => member !== id).slice(0, 3));
  }

  function toggleCrew(id: string) {
    if (id !== selectedCharacter && (supportCrew.includes(id) || supportCrew.length < 3)) playSoundEffect("select");
    setSupportCrew((current) => {
      if (id === selectedCharacter) return current;
      if (current.includes(id)) return current.filter((value) => value !== id);
      return [...current, id].slice(-3);
    });
  }

  function selectEquipment(id: string) {
    playSoundEffect("select");
    setSelectedEquipmentId(id);
    void dispatch({ type: "INTERACT", equipmentId: id, crewId: selectedCrewId ?? undefined });
  }

  function selectCrewMember(id: string | null) {
    playSoundEffect("select");
    setSelectedCrewId(id);
  }

  function answerMira(question: string) {
    if (!mission) return;
    setMiraReply(getEducationalHint(mission, question));
    setMiraOpen(true);
    setMiraQuestion("");
  }

  function askMira(event: FormEvent) {
    event.preventDefault();
    answerMira(miraQuestion.trim());
  }

  function startMiraDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    const target = event.currentTarget.closest<HTMLElement>(".mira-widget, .mira-launcher");
    if (!target) return;
    const rect = target.getBoundingClientRect();
    setMiraPosition({ left: rect.left, top: rect.top });
    miraDragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      startX: event.clientX,
      startY: event.clientY,
      isLauncher: Boolean(event.currentTarget.closest(".mira-launcher")),
      didMove: false
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function dragMira(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = miraDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const target = event.currentTarget.closest<HTMLElement>(".mira-widget, .mira-launcher");
    const width = target?.offsetWidth ?? 350;
    const height = target?.offsetHeight ?? 360;
    if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 5) drag.didMove = true;
    setMiraPosition({
      left: Math.max(8, Math.min(window.innerWidth - width - 8, event.clientX - drag.offsetX)),
      top: Math.max(8, Math.min(window.innerHeight - height - 8, event.clientY - drag.offsetY))
    });
  }

  function stopMiraDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = miraDragRef.current;
    if (drag?.pointerId !== event.pointerId) return;
    miraDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (drag.isLauncher && drag.didMove) {
      suppressMiraClickRef.current = true;
      window.requestAnimationFrame(() => { suppressMiraClickRef.current = false; });
    }
  }

  function moveMiraWithKeyboard(event: ReactKeyboardEvent<HTMLButtonElement>) {
    const movement = {
      ArrowLeft: [-32, 0],
      ArrowRight: [32, 0],
      ArrowUp: [0, -32],
      ArrowDown: [0, 32]
    }[event.key];
    if (!movement) return;
    event.preventDefault();
    const target = event.currentTarget.closest<HTMLElement>(".mira-widget, .mira-launcher");
    const rect = target?.getBoundingClientRect();
    const width = target?.offsetWidth ?? 350;
    const height = target?.offsetHeight ?? 360;
    const current = miraPosition ?? { left: rect?.left ?? 8, top: rect?.top ?? 8 };
    setMiraPosition({
      left: Math.max(8, Math.min(window.innerWidth - width - 8, current.left + movement[0])),
      top: Math.max(8, Math.min(window.innerHeight - height - 8, current.top + movement[1]))
    });
  }

  function openMira(event: ReactMouseEvent<HTMLButtonElement>) {
    if (suppressMiraClickRef.current) {
      suppressMiraClickRef.current = false;
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const width = Math.min(360, window.innerWidth - 16);
    const height = Math.min(miraOpen ? 410 : 290, window.innerHeight - 16);
    setMiraPosition({
      left: Math.max(8, Math.min(window.innerWidth - width - 8, rect.right - width)),
      top: Math.max(8, Math.min(window.innerHeight - height - 8, rect.bottom - height))
    });
    setMiraWidgetOpen(true);
  }

  const onPlanet = planet === "MOON" ? "LUNAR SOUTH POLE TRAINING SITE" : "MARS SURFACE TRAINING SITE";

  if (!mission && restoring) return <main className="restore-screen"><div className="mira-orb">M</div><p>CHECKING YOUR SAVED MISSION…</p></main>;

  if (!mission && briefingOpen) {
    const selectedPlayer = CHARACTERS.find((character) => character.id === selectedCharacter) ?? CHARACTERS[6];
    const briefingCrew = [
      selectedPlayer,
      ...supportCrew.map((id) => CHARACTERS.find((character) => character.id === id)).filter((character): character is CharacterInfo => character !== undefined)
    ];
    return <MissionBriefing
      playerName={playerName.trim()}
      crew={briefingCrew}
      planet={planet}
      difficulty={difficulty}
      difficultyLabel={GAMEPLAY_ASSUMPTIONS.difficulties[difficulty].label}
      launchError={error}
      onBack={() => { setError(""); setBriefingOpen(false); }}
      onLaunch={launchMission}
    />;
  }

  if (!mission) {
    return (
      <main className="launch-shell">
        <div className="launch-glow launch-glow-one" /><div className="launch-glow launch-glow-two" />
        <header className="brand-header">
          <div className="brand-mark"><img src="/assets/launch-lab-logo.png" alt="Launch Lab" /></div>
          <div className="brand-meta"><span>ASTRONAUT TRAINER</span><span className="live-dot">MISSION PREPARATION</span></div>
          <SoundToggle />
        </header>
        <section className="intro-row">
          <div>
            <p className="eyebrow">SPACEAPP · TRAINING DIVISION</p>
            <h1>Build your crew.<br /><em>Earn your mission.</em></h1>
            <p className="intro-copy">Explore a living outpost, manage real survival systems, and learn why every astronaut decision matters.</p>
          </div>
          <div className="launch-status-card">
            <span className="status-orbit">✦</span><span className="mini-label">MISSION PROFILE</span>
            <strong>7 DAYS</strong><span>4 ASTRONAUTS · 1 SHARED HABITAT</span>
          </div>
        </section>
        <section className="setup-layout">
          <div className="setup-main panel">
            <div className="section-heading"><span className="step-index">01</span><div><h2>Choose your astronaut</h2><p>Six assigned specialists and two customizable astronaut templates.</p></div></div>
            <div className="character-grid">
              {CHARACTERS.map((character) => (
                <button key={character.id} className={`character-card ${selectedCharacter === character.id ? "chosen" : ""}`} onClick={() => chooseCharacter(character.id)} type="button">
                  <span className="character-image"><img className={character.opaque ? "opaque-image" : ""} src={character.image} alt={`${character.name} character reference`} /></span>
                  <span className="character-card-info"><strong>{character.name}</strong><small>{character.role}</small></span>
                  {selectedCharacter === character.id && <span className="selected-check">✓</span>}
                </button>
              ))}
            </div>
            <div className="name-row"><label htmlFor="astronaut-name">ASTRONAUT NAME</label><input id="astronaut-name" value={playerName} onChange={(event) => setPlayerName(event.target.value)} maxLength={32} placeholder="Enter your call sign" /><span>{playerName.length}/32</span></div>
            <div className="section-heading crew-heading"><span className="step-index">02</span><div><h2>Choose your three crewmates</h2><p>Pick the specialists who will support your mission.</p></div></div>
            <div className="support-row">
              {CHARACTERS.filter((item) => item.id !== selectedCharacter).map((character) => (
                <button type="button" key={character.id} className={`crew-chip ${supportCrew.includes(character.id) ? "active" : ""}`} onClick={() => toggleCrew(character.id)}>
                  <span className="crew-chip-dot" style={{ background: character.accent }} />{character.name}<small>{character.role}</small>
                </button>
              ))}
            </div>
            <div className="section-heading planet-heading"><span className="step-index">03</span><div><h2>Select your destination</h2><p>Different worlds require different survival strategies.</p></div></div>
            <div className="planet-grid">
              <button type="button" className={`planet-card moon ${planet === "MOON" ? "chosen" : ""}`} onClick={() => { if (planet !== "MOON") playSoundEffect("select"); setPlanet("MOON"); }}>
                <span className="planet-art moon-art"><span className="moon-disc" /><span className="crater crater-a" /><span className="crater crater-b" /></span>
                <strong>THE MOON</strong><small>South Pole · Variable illumination · Vacuum</small><span className="planet-select">{planet === "MOON" ? "SELECTED" : "SELECT DESTINATION"}</span>
              </button>
              <button type="button" className={`planet-card mars ${planet === "MARS" ? "chosen" : ""}`} onClick={() => { if (planet !== "MARS") playSoundEffect("select"); setPlanet("MARS"); }}>
                <span className="planet-art mars-art"><span className="mars-disc" /><span className="mars-shadow" /></span>
                <strong>MARS</strong><small>Thin CO₂ atmosphere · Dust · Delayed communications</small><span className="planet-select">{planet === "MARS" ? "SELECTED" : "SELECT DESTINATION"}</span>
              </button>
            </div>
            <div className="section-heading difficulty-heading"><span className="step-index">04</span><div><h2>Choose mission difficulty</h2><p>Harder settings change gameplay assumptions, not NASA reference values.</p></div></div>
            <div className="difficulty-grid">
              {DIFFICULTIES.map((level) => {
                const profile = GAMEPLAY_ASSUMPTIONS.difficulties[level];
                return <button type="button" key={level} aria-pressed={difficulty === level} className={`difficulty-card ${difficulty === level ? "chosen" : ""}`} onClick={() => { if (difficulty !== level) playSoundEffect("select"); setDifficulty(level); }}>
                  <strong>{profile.label}</strong><small>{profile.description}</small><span>{profile.batteryKwh} kWh battery · {profile.spareParts} spare parts</span><em>{difficulty === level ? "SELECTED" : "SELECT DIFFICULTY"}</em>
                </button>;
              })}
            </div>
            <div className="scope-grid">
              <div><span>SCOPE</span><strong>7-day survival training</strong><small>Life support, power, water, food and mission operations.</small></div>
              <div><span>LOCATION</span><strong>{onPlanet}</strong><small>Simulated site; not a surveyed landing coordinate.</small></div>
              <div><span>ASSUMPTIONS</span><strong>Versioned science registry</strong><small>NASA references plus labeled training-only parameters.</small></div>
            </div>
            {error && <div className="error-banner">{error}</div>}
            <button type="button" className="primary-launch" disabled={busy || playerName.trim().length === 0 || supportCrew.length !== 3} onClick={() => { playSoundEffect("select"); setError(""); setBriefingOpen(true); }}>CONTINUE TO FIELD GUIDE <span>↗</span></button>
            <p className="form-note">Complete your outpost orientation and crew readiness check before launch.</p>
          </div>
          <aside className="setup-aside">
            <div className="aside-card"><span className="eyebrow">THE MISSION</span><div className="aside-big-number">07<span>DAYS</span></div><p>Keep your four-person crew safe, complete three 3D objectives, and answer a new astronaut challenge each day.</p><div className="aside-divider" /><div className="aside-check"><span>01</span> 3 actionable objectives each day</div><div className="aside-check"><span>02</span> Planet-specific NASA/CSA scenarios</div><div className="aside-check"><span>03</span> 5 challenge lives for the campaign</div><div className="aside-check"><span>04</span> Survive all 7 days to win</div></div>
            <div className="aside-note"><span>✦</span><div><strong>Learn by doing</strong><p>MIRA gives hints, not answers. Your choices change the simulation state.</p></div></div>
            <button type="button" className="science-toggle" onClick={() => setShowScience(!showScience)}>{showScience ? "Hide" : "View"} science references ↗</button>
            {showScience && <div className="science-small"><a href={SCIENCE_REFERENCES.bvad.url} target="_blank" rel="noreferrer">NASA BVAD Rev. 2</a><a href={SCIENCE_REFERENCES.eclss.url} target="_blank" rel="noreferrer">NASA ECLSS</a><a href="https://trek.nasa.gov/moon/" target="_blank" rel="noreferrer">NASA Moon Trek</a></div>}
          </aside>
        </section>
        <footer className="launch-footer"><span>LAUNCH LAB / SPACEAPP</span><span>SCIENCE DATA {SCIENCE_DATA_VERSION}</span><span>SIMULATED TRAINING ENVIRONMENT</span></footer>
      </main>
    );
  }

  const minutesUntilNextDay = mission.day < 7 ? Math.max(0, mission.day * MINUTES_PER_DAY - mission.elapsedMinutes) : 0;
  const completedDailyObjectives = mission.objectives.filter((objective) => (objective.day ?? 1) === mission.day && objective.complete).length;
  const dailyObjectivesComplete = areDailyObjectivesComplete(mission);
  const elapsedToday = Math.min(MINUTES_PER_DAY, Math.max(0, mission.elapsedMinutes - (mission.day - 1) * MINUTES_PER_DAY));
  const dayProgress = mission.status === "SUCCESS" ? 100 : (elapsedToday / 1440) * 100;
  const hoursUntilNextDay = Math.floor(minutesUntilNextDay / 60);
  const remainderMinutes = minutesUntilNextDay % 60;
  const correctSpaceWeatherOption = spaceWeatherChallenge?.options.find((option) => option.id === spaceWeatherChallenge.correctOptionId);
  const spaceWeatherAnswerIsCorrect = spaceWeatherAnswer !== null && spaceWeatherAnswer === spaceWeatherChallenge?.correctOptionId;
  const dailyChallenge = getDailyChallenge(mission.planet, mission.day);
  const dailyChallengeComplete = isDailyChallengeComplete(mission);
  const dailyChallengeWrongChoices = mission.challengeWrongChoices[String(mission.day)] ?? [];
  const correctDailyChallengeOption = dailyChallenge?.options.find((option) => option.id === dailyChallenge.correctOptionId);
  const dailyRequirementsComplete = dailyObjectivesComplete && dailyChallengeComplete;
  const miraPositionStyle = miraPosition
    ? { left: miraPosition.left, top: miraPosition.top, right: "auto" as const, bottom: "auto" as const }
    : undefined;

  return (
    <main className="game-shell">
      <header className="game-header">
        <div className="game-brand"><img src="/assets/launch-lab-logo.png" alt="Launch Lab" /><span>OUTPOST OPERATIONS</span></div>
        <div className="mission-clock"><span className="pulse-dot" />{timeLabel(mission.elapsedMinutes, mission.day, mission.status)}<small>{mission.planet === "MOON" ? "LUNAR BASE" : "MARS BASE"} · {GAMEPLAY_ASSUMPTIONS.difficulties[mission.difficulty ?? "STANDARD"].label.toUpperCase()}</small></div>
        <div className="header-controls">
          <SoundToggle />
          <div className="challenge-lives" role="img" aria-label={`${mission.challengeLives} of 5 challenge lives remaining`}>
            <span>CHALLENGE LIVES</span>
            <strong aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <i className={index < mission.challengeLives ? "life-live" : "life-lost"} key={index}>♥</i>)}</strong>
          </div>
          <button type="button" aria-label="Pause simulation" aria-pressed={mission.speed === 0} onClick={() => { playSoundEffect("select"); void dispatch({ type: "SET_SPEED", speed: 0 }); }} className={mission.speed === 0 ? "speed-active" : ""}>Ⅱ Pause</button>
          <button type="button" aria-label="Set simulation speed to normal" aria-pressed={mission.speed === 1} onClick={() => { playSoundEffect("select"); void dispatch({ type: "SET_SPEED", speed: 1 }); }} className={mission.speed === 1 ? "speed-active" : ""}>1× Normal</button>
          <button type="button" aria-label="Set simulation speed to fast" aria-pressed={mission.speed === 3} onClick={() => { playSoundEffect("select"); void dispatch({ type: "SET_SPEED", speed: 3 }); }} className={mission.speed === 3 ? "speed-active" : ""}>3× Fast</button>
          <button type="button" className="exit-button" onClick={() => { playSoundEffect("select"); setMission(null); missionRef.current = null; setSelectedCrewId(null); }}>Exit mission</button>
        </div>
      </header>
      <section className="day-progress-panel" aria-label="Mission day progress">
        <div className="day-progress-copy">
          <strong>DAY {mission.day} OF 7</strong>
          <span>{mission.day < 7
            ? dailyRequirementsComplete
              ? `${hoursUntilNextDay}h ${String(remainderMinutes).padStart(2, "0")}m of simulation until Day ${mission.day + 1}`
              : `Objectives: ${completedDailyObjectives}/3 · Challenge: ${dailyChallengeComplete ? "complete" : "pending"}`
            : `Final mission day · ${completedDailyObjectives}/3 objectives · challenge ${dailyChallengeComplete ? "complete" : "pending"}`}</span>
        </div>
        <div className="day-progress-track" role="progressbar" aria-label={`Day ${mission.day} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(dayProgress)}>
          <div className="day-progress-fill" style={{ width: `${dayProgress}%` }} />
        </div>
        <p>Complete all three objectives and the daily astronaut challenge to advance. The simulation pauses at day’s end until both are done. A day takes about 5 minutes at Normal speed or 1 minute 36 seconds at Fast speed.</p>
        {mission.day < 7 && <button
          type="button"
          className="day-advance-button"
          disabled={mission.status !== "ACTIVE" || Boolean(mission.activeIncident) || !dailyRequirementsComplete}
          title={mission.activeIncident ? "Resolve the current alert before advancing." : !dailyObjectivesComplete ? `Complete all three objectives for Day ${mission.day} before advancing (${completedDailyObjectives}/3 complete).` : !dailyChallengeComplete ? "Answer the daily astronaut challenge before advancing." : "Simulate the remaining time until the next day; the simulation will stop if an alert needs your decision."}
          aria-label={`Advance simulation to Day ${mission.day + 1}`}
          onClick={() => { playSoundEffect("select"); void dispatch({ type: "ADVANCE", minutes: minutesUntilNextDay }); }}
        >
          {mission.activeIncident ? "Resolve alert first" : !dailyObjectivesComplete ? "Complete today's objectives" : !dailyChallengeComplete ? "Answer today's challenge" : `Advance to Day ${mission.day + 1}`}
        </button>}
        {mission.day === 7 && <span className="day-final-note">{dailyRequirementsComplete ? "Day 7 objectives and challenge complete. Keep the crew safe through the final hours." : !dailyObjectivesComplete ? `Complete today's objectives (${completedDailyObjectives}/3) to finish the campaign.` : "Answer today's challenge to finish the campaign."}</span>}
      </section>
      <section className="telemetry-strip">
        <Metric label="POWER" icon="⚡" value={`${fmt(mission.resources.solarGenerationKw)} kW`} detail={`${fmt(mission.resources.electricalDemandKw)} kW demand`} warn={mission.resources.powerUnmetKw > 0.01} />
        <Metric label="BATTERY" icon="🔋" value={`${fmt(mission.resources.batteryKwh)} kWh`} detail={`${fmt(mission.resources.batteryKwh / mission.resources.batteryCapacityKwh * 100, 0)}% of ${mission.resources.batteryCapacityKwh} kWh`} warn={mission.resources.batteryKwh < TRAINING_ASSUMPTIONS.warningBatteryKwh} />
        <Metric label="OXYGEN" icon="O₂" value={`${fmt(mission.resources.oxygenKg)} kg`} detail={`${fmt(mission.resources.oxygenPartialPressureKpa, 2)} kPa partial pressure`} warn={mission.resources.oxygenPartialPressureKpa < TRAINING_ASSUMPTIONS.warningOxygenPartialPressureKpa} />
        <Metric label="CO₂" icon="CO₂" value={`${fmt(mission.resources.co2Kg)} kg`} detail={`${fmt(mission.resources.co2PartialPressureKpa, 3)} kPa partial pressure`} warn={mission.resources.co2PartialPressureKpa > TRAINING_ASSUMPTIONS.warningCo2PartialPressureKpa} />
        <Metric label="POTABLE WATER" icon="💧" value={`${fmt(mission.resources.potableWaterKg)} kg`} detail={`${fmt(mission.resources.wastewaterKg)} kg wastewater`} warn={mission.resources.potableWaterKg < TRAINING_ASSUMPTIONS.warningWaterKg} />
        <Metric label="FOOD" icon="🍱" value={`${fmt(mission.resources.foodKg)} kg`} detail={`${mission.crew.length} crew`} warn={mission.resources.foodKg < 30} />
        <Metric label="SHELTER" icon="🛡️" value={mission.resources.shelterReady ? "READY" : "CHECK"} detail="No dose estimate" warn={!mission.resources.shelterReady} />
      </section>
      {error && <div className="game-error">{error}</div>}
      {mission.activeIncident && <section className="incident-banner"><div className="incident-icon">!</div><div><span>{mission.activeIncident.severity} ALERT · {mission.activeIncident.kind.replaceAll("_", " ")}</span><strong>{mission.activeIncident.title}</strong><p>{mission.activeIncident.description}</p></div><span className="incident-paused">SIM PAUSED FOR DECISION</span></section>}
      {mission.status !== "ACTIVE" && <section className={`mission-end ${mission.status.toLowerCase()}`}><div className="end-symbol">{mission.status === "SUCCESS" ? "✦" : "!"}</div><div><span>MISSION {mission.status === "SUCCESS" ? "COMPLETE" : "ENDED"}</span><strong>{mission.lastMessage}</strong><p>Review the operational log to see how your decisions affected the crew and equipment.</p></div><button type="button" onClick={() => {
        playSoundEffect("select");
        if (mission.challengeLives === 0) void dispatch({ type: "RESTART_DAY_ONE" });
        else { setMission(null); missionRef.current = null; setSelectedCrewId(null); }
      }}>      {mission.challengeLives === 0 ? "RESTART DAY 1" : "NEW MISSION"}</button></section>}
      {mission.status === "SUCCESS" && <section className="victory-overlay" role="status" aria-live="polite">
        <div className="celebration-confetti" aria-hidden="true">
          {Array.from({ length: 36 }, (_, index) => <span key={index} style={{
            left: `${(index * 37) % 100}%`,
            animationDelay: `-${(index % 10) * 0.35}s`,
            backgroundColor: ["#71c8d6", "#f2d08d", "#75c69a", "#f07d75", "#d9a5ff"][index % 5]
          }} />)}
        </div>
        <div className="victory-card">
          <img className="victory-character" src={playerCharacter.image} alt={`${playerCharacter.name} celebrating`} />
          <span>MISSION COMPLETE</span>
          <h2>CONGRATULATIONS, {mission.playerName}!</h2>
          <p>Seven days survived with {mission.challengeLives} challenge {mission.challengeLives === 1 ? "life" : "lives"} remaining.</p>
        </div>
      </section>}
      <section className="game-layout">
        <aside className="game-sidebar left-sidebar">
          <div className="sidebar-section">
            <div className="sidebar-title">CREW <span>04 / 04</span></div>
            <p className="crew-assignment-hint">Crew roam while idle. Select Assign or click an astronaut, then choose equipment and an action to send them to work.</p>
            {mission.crew.map((member, index) => {
            const character = CHARACTERS.find((item) => item.id === member.characterId);
            const selected = member.id === selectedCrewId;
            return <div className={`crew-member ${selected ? "selected" : ""}`} key={member.id}>
              <span className="crew-avatar" style={{ borderColor: character?.accent ?? "#758ca0" }}>{character ? <img src={character.image} alt="" className={character.opaque ? "opaque-image" : ""} /> : "👩‍🚀"}</span>
              <span><strong>{member.name}</strong><small>{member.role}</small><small className="crew-task">{member.currentTask}</small></span>
              {index > 0
                ? <button type="button" className="crew-assign-button" aria-pressed={selected} onClick={() => selectCrewMember(selected ? null : member.id)}>{selected ? "SELECTED" : "ASSIGN"}</button>
                : <span className="crew-role-tag">YOU</span>}
              <i className={member.fatigue > 65 ? "fatigue-high" : ""} title={`Game fatigue indicator ${Math.round(member.fatigue)}%`}>{Math.round(member.fatigue)}%</i>
            </div>;
          })}
          </div>
          <div className="sidebar-section">
            <div className="sidebar-title">DAILY OBJECTIVES <span>{mission.objectives.filter((objective) => objective.complete).length}/{mission.objectives.length}</span></div>
            <p className="objective-hint">Complete each day’s three tasks. Open a day to see its checklist; unfinished past tasks remain available.</p>
            {Array.from({ length: 7 }, (_, index) => index + 1).map((objectiveDay) => {
              const dailyObjectives = mission.objectives.filter((objective) => (objective.day ?? 1) === objectiveDay);
              const completedToday = dailyObjectives.filter((objective) => objective.complete).length;
              return <details className={`objective-day ${mission.day === objectiveDay ? "today" : ""}`} key={objectiveDay} open={mission.day === objectiveDay}>
                <summary><span>DAY {objectiveDay}{mission.day === objectiveDay ? " · TODAY" : ""}</span><b>{completedToday}/3</b></summary>
                <div className="objective-day-list">{dailyObjectives.map((objective) => {
                  const status = objective.complete ? "DONE" : objectiveDay === mission.day ? "TODAY" : objectiveDay < mission.day ? "OPEN" : "UP NEXT";
                  return <div className={`objective-row ${objective.complete ? "complete" : ""} ${objectiveDay === mission.day && !objective.complete ? "current" : ""}`} key={objective.id}>
                    <span aria-hidden="true">{objective.complete ? "✓" : objectiveDay < mission.day ? "!" : "○"}</span>
                    <div className="objective-copy">
                      <small>{status}</small>
                      <strong>{objective.title}</strong>
                      {objective.reference && <div className="objective-reference">
                        <a href={objective.reference.url} target="_blank" rel="noreferrer">{objective.reference.title} ↗</a>
                        <small>{objective.reference.note}</small>
                      </div>}
                    </div>
                  </div>;
                })}</div>
              </details>;
            })}
          </div>
          <div className="sidebar-section compact-note"><div className="sidebar-title">MISSION MODEL</div><p>{mission.planet === "MOON" ? "South Pole training profile · local illumination is simplified and not linked to a live Moon Trek ephemeris." : "Mars training profile · dust and solar factors are scenario assumptions, not live weather."}</p></div>
        </aside>
        <section className="world-column">
          <div className="world-topline"><span><i /> LIVE 3D OUTPOST</span><span>DAY {mission.day} ENVIRONMENT · {mission.planet === "MOON" ? "LUNAR REGOLITH" : "MARTIAN TERRAIN"} · CLICK-TO-WALK</span></div>
          <WorldCanvas planet={mission.planet} mission={mission} accentColor={playerCharacter.accent} characterImage={playerCharacter.image} characterName={playerCharacter.name} supportCrew={supportCrewVisuals} selectedCrewId={selectedCrewId} onSelectCrew={selectCrewMember} selectedEquipmentId={selectedEquipmentId} onSelectEquipment={selectEquipment} onMove={(x, z) => setPlayerPosition([x, z])} />
          <div className="world-bottomline"><span>POSITION {fmt(playerPosition[0], 1)}, {fmt(playerPosition[1], 1)}</span><span>RENDER FPS DOES NOT DRIVE SCIENCE CALCULATIONS</span><a className="log-jump" href="#activity-log">INSPECTION FEEDBACK ↓</a></div>
          {equipment && <div className="equipment-panel">
            <button className="close-equipment" onClick={() => { playSoundEffect("select"); setSelectedEquipmentId(null); }}>×</button>
            <div className="equipment-panel-head"><span className="equipment-icon">{equipment.icon}</span><div><span>{equipment.room}</span><strong>{equipment.name}</strong></div></div>
            <p>{equipment.description}</p>
            <div className="crew-operator-line" role="status"><span>OPERATOR</span><strong>{selectedOperator?.name ?? mission.playerName} · {selectedOperator?.role ?? "Commander"}</strong>{selectedCrewId && <button type="button" onClick={() => selectCrewMember(null)}>USE COMMANDER</button>}</div>
            {selectedSystem && <div className="equipment-state"><span>STATE <b className={`state-${selectedSystem.status.toLowerCase()}`}>{selectedSystem.status}</b></span><span>POWER <b>{fmt(selectedSystem.powerKw)} kW</b></span><span>CONDITION <b>{selectedSystem.condition}%</b></span></div>}
            <p className="equipment-feedback" role="status" aria-live="polite">{mission.lastMessage}</p>
            <div className="equipment-actions">{equipment.actions.map((action) => <button type="button" key={action.id} disabled={busy || mission.status !== "ACTIVE"} aria-label={`${action.label}, takes ${action.durationMinutes} simulated minutes`} onClick={() => { playSoundEffect("select"); void dispatch({ type: "OPERATE", equipmentId: equipment.id, actionId: action.id, crewId: selectedCrewId ?? undefined }); }}>
              <strong>{action.label}{busy ? " · Working…" : ""}</strong>
              <small>{action.durationMinutes === 0 ? "No simulated time" : `Takes ${action.durationMinutes} simulated minutes`}</small>
              <small>Needed: {action.requirements.join(" · ")}</small>
              <small className="action-caution">May be blocked: {action.failureConditions.join(" ")}</small>
            </button>)}</div>
            <span className="equipment-model-note">Actions consume simulated time and may use resources. Requirements and failure conditions are defined in the equipment registry.</span>
          </div>}
        </section>
        <aside className="game-sidebar right-sidebar">
          {mission.activeIncident && <div className="decision-card"><div className="sidebar-title">CHOOSE YOUR RESPONSE <span>{String(mission.activeIncident.choices.length).padStart(2, "0")} OPTIONS</span></div><p className="decision-intro">Read the evidence. Consider the system dependencies before committing the crew.</p>{mission.activeIncident.evidence.map((line) => <div className="evidence-row" key={line}><span>↳</span>{line}</div>)}<div className="choice-list">{mission.activeIncident.choices.map((choice, index) => <button type="button" key={choice.id} disabled={busy || (choice.cost.spareParts ?? 0) > mission.resources.spareParts} onClick={() => { playSoundEffect("select"); void dispatch({ type: "DECIDE", incidentId: mission.activeIncident!.id, choiceId: choice.id }); }}><span>{index + 1}</span><div><strong>{choice.title}</strong><small>{choice.detail}</small><em>{choice.cost.minutes ?? 1} min{choice.cost.batteryKwh ? ` · ${choice.cost.batteryKwh} kWh` : ""}{choice.cost.spareParts ? ` · ${choice.cost.spareParts} spare part` : ""}</em></div></button>)}</div><small className="training-tag">SCENARIO RESPONSE · NOT A REAL FLIGHT PROCEDURE</small></div>}
          {dailyChallenge && <section className={`daily-challenge-card ${dailyChallengeComplete ? "complete" : ""}`} aria-labelledby="daily-challenge-title">
            <header><div><span>DAY {mission.day} · ASTRONAUT SCENARIO</span><h2 id="daily-challenge-title">{dailyChallenge.title}</h2></div><b>{dailyChallengeComplete ? "COMPLETE" : `${mission.challengeLives} LIVES`}</b></header>
            <p className="daily-challenge-scenario">{dailyChallenge.scenario}</p>
            <p className="daily-challenge-question">{dailyChallenge.question}</p>
            <div className="daily-challenge-options" role="group" aria-label={`Day ${mission.day} challenge choices`}>
              {dailyChallenge.options.map((option) => {
                const wrong = dailyChallengeWrongChoices.includes(option.id);
                const correct = (dailyChallengeComplete || mission.challengeLives === 0) && option.id === dailyChallenge.correctOptionId;
                return <button
                  type="button"
                  key={option.id}
                  className={correct ? "correct" : wrong ? "incorrect" : ""}
                  disabled={busy || mission.status !== "ACTIVE" || dailyChallengeComplete || wrong}
                  onClick={() => { playSoundEffect("select"); void dispatch({ type: "ANSWER_DAILY_CHALLENGE", day: mission.day, choiceId: option.id }); }}
                >
                  <span>{option.id}</span>{option.text}
                </button>;
              })}
            </div>
            {!dailyChallengeComplete && mission.challengeLives > 0 && <p className="daily-challenge-hint">
              {dailyChallengeWrongChoices.length > 0
                ? "That choice is locked. Consider the evidence and try a different response; each incorrect choice costs one life."
                : "Choose the safest evidence-based response. An incorrect choice costs one life."}
            </p>}
            {(dailyChallengeComplete || mission.challengeLives === 0) && <>
              <div className={`daily-challenge-feedback ${dailyChallengeComplete ? "success" : "retry"}`}>
                <strong>{dailyChallengeComplete ? "Correct response." : `Best response: ${correctDailyChallengeOption?.id ?? ""}`}</strong>
                <p>{dailyChallenge.explanation}</p>
              </div>
            </>}
            <a className="daily-challenge-reference" href={dailyChallenge.reference.url} target="_blank" rel="noreferrer">{dailyChallenge.reference.title} ↗</a>
            {(dailyChallenge.reference.note ?? dailyChallenge.reference.notes) && <small className="daily-challenge-reference-note">{dailyChallenge.reference.note ?? dailyChallenge.reference.notes}</small>}
            <small className="daily-challenge-note">Educational scenario based on real mission challenges; not a flight procedure or live safety system.</small>
          </section>}
          <section className="space-weather-card" aria-labelledby="space-weather-title">
            <header><div><span>OPTIONAL NASA DONKI PRACTICE</span><h2 id="space-weather-title">Space-weather data practice</h2></div><button type="button" onClick={() => { playSoundEffect("select"); void loadSpaceWeatherChallenge(); }} disabled={spaceWeatherLoading}>{spaceWeatherLoading ? "LOADING…" : "REFRESH"}</button></header>
            <small className="space-weather-note">Optional practice; incorrect answers here do not spend daily challenge lives.</small>
            {spaceWeatherLoading && !spaceWeatherChallenge && <p className="space-weather-status">Loading a recent solar-flare event from NASA DONKI…</p>}
            {spaceWeatherError && <p className="space-weather-error" role="alert">{spaceWeatherError}</p>}
            {spaceWeatherChallenge && <>
              <p className="space-weather-event">Latest recorded event in the past 30 days: <strong>{spaceWeatherChallenge.event.classType}</strong> · peak {spaceWeatherChallenge.event.peakTime} UTC{spaceWeatherChallenge.event.activeRegionNum !== null ? ` · active region ${spaceWeatherChallenge.event.activeRegionNum}` : ""}</p>
              <p className="space-weather-data-source"><a href={spaceWeatherChallenge.event.url} target="_blank" rel="noreferrer">Verify this DONKI event ↗</a></p>
              <p className="space-weather-question">{spaceWeatherChallenge.question}</p>
              <div className="space-weather-options" role="group" aria-label="Choose the best evidence-based response">
                {spaceWeatherChallenge.options.map((option) => {
                  const answered = spaceWeatherAnswer !== null;
                  const correct = option.id === spaceWeatherChallenge.correctOptionId;
                  const selected = spaceWeatherAnswer === option.id;
                  const resultClass = answered && correct ? "correct" : selected ? "incorrect" : "";
                  return <button type="button" key={option.id} className={`space-weather-option ${resultClass}`} aria-pressed={selected} disabled={answered} onClick={() => { playSoundEffect(correct ? "correct" : "incorrect"); setSpaceWeatherAnswer(option.id); }}>
                    <span>{option.id}</span>{option.text}
                  </button>;
                })}
              </div>
              {spaceWeatherAnswer !== null && <div className={`space-weather-feedback ${spaceWeatherAnswerIsCorrect ? "success" : "retry"}`} role="status">
                <strong>{spaceWeatherAnswerIsCorrect ? "Correct — evidence before action." : "Not the best response. Review the correct choice."}</strong>
                {!spaceWeatherAnswerIsCorrect && correctSpaceWeatherOption && <p><b>Best answer:</b> {correctSpaceWeatherOption.text}</p>}
                <p>{spaceWeatherChallenge.explanation}</p>
                <div className="space-weather-sources">{spaceWeatherChallenge.references.map((reference) => <a key={reference.url} href={reference.url} target="_blank" rel="noreferrer">{reference.label} ↗</a>)}</div>
              </div>}
              <small className="space-weather-note">Training exercise only—not an active alert, flight procedure, or live crew-dose reading. Refreshed {spaceWeatherChallenge.retrievedAt.replace("T", " ").replace("Z", " UTC")}.</small>
            </>}
          </section>
          <div className="resource-mini"><div className="sidebar-title">SYSTEM STATUS</div>{mission.systems.map((system) => {
            const turnOn = system.status === "OFF";
            return <div className="system-row" key={system.id}><span className={`system-light ${system.status.toLowerCase()}`} /><span>{system.name}</span><b>{system.status}</b><button aria-label={`${turnOn ? "Turn on" : "Turn off"} ${system.name}`} title={`${turnOn ? "Turn on" : "Turn off"} ${system.name}`} aria-pressed={!turnOn} disabled={busy || mission.status !== "ACTIVE" || system.status === "FAULTED"} onClick={() => { playSoundEffect("select"); void dispatch({ type: "TOGGLE_SYSTEM", systemId: system.id, enabled: turnOn }); }}>{turnOn ? "Turn on" : "Turn off"}</button></div>;
          })}</div>
          <div className="resource-mini"><div className="sidebar-title">STORES <span>{mission.resources.spareParts} SPARES</span></div><div className="store-bar"><span>WASTEWATER</span><strong>{fmt(mission.resources.wastewaterKg)} kg</strong></div><div className="store-bar"><span>QUARANTINED WATER</span><strong>{fmt(mission.resources.quarantinedWaterKg)} kg</strong></div><div className="store-bar"><span>FOOD STORED</span><strong>{fmt(mission.resources.foodKg)} kg</strong></div><div className="store-bar"><span>SPARE PARTS</span><strong>{mission.resources.spareParts}</strong></div></div>
        </aside>
      </section>
      <section className="activity-log panel" id="activity-log" aria-labelledby="activity-log-title">
        <div className="activity-log-heading">
          <div><span className="eyebrow">MISSION FEEDBACK</span><h2 id="activity-log-title">Inspection &amp; activity log</h2></div>
          <span>{mission.telemetry.length} {mission.telemetry.length === 1 ? "entry" : "entries"} · newest first</span>
        </div>
        <ol aria-live="polite" aria-relevant="additions text">
          {[...mission.telemetry].reverse().slice(0, 8).map((entry) => (
            <li className={`activity-entry ${entry.type.toLowerCase()}`} key={entry.id}>
              <span className="activity-time">{logTimeLabel(entry.minute)}</span>
              <div><strong>{entry.title}</strong><p>{entry.detail}</p></div>
              <span className="activity-type">{entry.type}</span>
            </li>
          ))}
        </ol>
      </section>
      <footer className="game-footer"><span>SCIENCE DATA {mission.scienceDataVersion}</span><button type="button" onClick={() => setShowScience(!showScience)}>DATA SOURCES & MODEL LIMITATIONS</button><span>MISSION SAVE · {mission.id.slice(0, 8)}</span></footer>
      {showScience && <div className="science-overlay"><div className="science-overlay-card"><button onClick={() => setShowScience(false)}>×</button><h3>Science data & model boundary</h3><p><b>NASA baseline:</b> Oxygen and CO₂ metabolic reference rates and early planetary-base water use are sourced from NASA BVAD Revision 2.</p><p><b>Gameplay assumptions:</b> Starting resource inventories, equipment power ratings, water recovery throughput, illumination/dust profiles, warning thresholds, failure boundaries, crop model, task durations and repairs are simplified game values.</p><p><b>Important:</b> This starter does not calculate medical safety, full cabin pressure, dose exposure, live Moon Trek illumination, DONKI-driven dose, or validated Mars weather. It is an educational prototype, not mission-planning software.</p><a href={SCIENCE_REFERENCES.bvad.url} target="_blank" rel="noreferrer">Open NASA BVAD ↗</a></div></div>}
      {miraWidgetOpen ? (
        <section className="mira-widget" style={miraPositionStyle} aria-label="MIRA mission assistant">
          <header className="mira-popup-header">
            <div className="mira-heading"><img src="/assets/mira-mascot.png" className="mira-header-mascot" alt="" aria-hidden="true" draggable={false} /><div><strong>MIRA</strong><small>AI MASCOT · MISSION GUIDE</small></div><span className="mira-online">●</span></div>
            <button type="button" className="mira-drag-handle" aria-label="Move MIRA with drag or arrow keys" title="Drag to move or use arrow keys" onPointerDown={startMiraDrag} onPointerMove={dragMira} onPointerUp={stopMiraDrag} onPointerCancel={stopMiraDrag} onKeyDown={moveMiraWithKeyboard}>MOVE</button>
            <button type="button" className="mira-minimize" aria-label="Minimize MIRA" onClick={() => setMiraWidgetOpen(false)}>−</button>
          </header>
          <div className="mira-card mira-popup-body">
            <p aria-live="polite">{miraReply}</p>
            <button className="mira-hint" type="button" onClick={() => answerMira("hint")}>GIVE ME A HINT ↗</button>
            <button className="mira-text-toggle" type="button" aria-expanded={miraOpen} onClick={() => setMiraOpen(!miraOpen)}>{miraOpen ? "Close question" : "Ask MIRA a question"}</button>
            {miraOpen && <>
              <div className="mira-prompts" aria-label="Suggested questions"><button type="button" onClick={() => answerMira("power")}>Power</button><button type="button" onClick={() => answerMira("water")}>Water</button><button type="button" onClick={() => answerMira("objectives")}>Objectives</button></div>
              <form className="mira-form" onSubmit={askMira}><input aria-label="Ask MIRA about your mission" value={miraQuestion} onChange={(event) => setMiraQuestion(event.target.value)} placeholder="Ask about power, water, or crew…" maxLength={160} required/><button type="submit">ASK</button></form>
            </>}
            <span className="mira-disclaimer">Answers use this mission’s readings; no external AI service is connected.</span>
          </div>
        </section>
      ) : (
        <button type="button" className="mira-launcher" style={miraPositionStyle} aria-label="Open MIRA mission assistant" title="Click to open MIRA; drag to move" onClick={openMira} onPointerDown={startMiraDrag} onPointerMove={dragMira} onPointerUp={stopMiraDrag} onPointerCancel={stopMiraDrag} onKeyDown={moveMiraWithKeyboard}>
          <img src="/assets/mira-mascot.png" className="mira-launcher-mascot" alt="" aria-hidden="true" draggable={false} />
        </button>
      )}
    </main>
  );
}

function Metric({ label, icon, value, detail, warn }: { label: string; icon: string; value: string; detail: string; warn?: boolean }) {
  return <div className={`metric-card ${warn ? "warn" : ""}`}><div className="metric-label"><span>{icon}</span>{label}</div><strong>{value}</strong><small>{detail}</small></div>;
}
