"use client";

import dynamic from "next/dynamic";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CHARACTER_ROSTER, getEducationalHint, TRAINING_ASSUMPTIONS } from "@/lib/simulation/engine";
import { EQUIPMENT_CATALOG } from "@/lib/simulation/equipment";
import { SCIENCE_REFERENCES, SCIENCE_DATA_VERSION } from "@/lib/simulation/science";
import type { CreateMissionInput, MissionCommand, MissionState, Planet } from "@/lib/simulation/types";

const WorldCanvas = dynamic(() => import("@/components/WorldCanvas"), { ssr: false, loading: () => <div className="world-loading">BUILDING THE OUTPOST…</div> });

type CharacterInfo = { id: string; name: string; role: string; image: string; accent: string; custom?: boolean; opaque?: boolean };
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
function timeLabel(minutes: number) {
  const day = Math.floor(minutes / 1440) + 1;
  const inDay = minutes % 1440;
  return `DAY ${day} · ${String(Math.floor(inDay / 60)).padStart(2, "0")}:${String(inDay % 60).padStart(2, "0")}`;
}

export default function GameApp() {
  const [selectedCharacter, setSelectedCharacter] = useState("user-magenta");
  const [playerName, setPlayerName] = useState("Cadet");
  const [planet, setPlanet] = useState<Planet>("MOON");
  const [supportCrew, setSupportCrew] = useState<string[]>(["sofia", "christopher", "jewel"]);
  const [mission, setMission] = useState<MissionState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);
  const [miraOpen, setMiraOpen] = useState(false);
  const [miraQuestion, setMiraQuestion] = useState("");
  const [miraReply, setMiraReply] = useState("Hi! I'm MIRA. I can help you think through the equipment and resource clues without choosing for you.");
  const [playerPosition, setPlayerPosition] = useState<[number, number]>([0, 1.5]);
  const [showScience, setShowScience] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const busyRef = useRef(false);
  const missionRef = useRef<MissionState | null>(null);
  const commandRef = useRef<(command: MissionCommand) => Promise<void>>(async () => undefined);

  useEffect(() => { missionRef.current = mission; }, [mission]);

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
      setMission(payload.mission);
      missionRef.current = payload.mission;
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
      void commandRef.current({ type: "ADVANCE", minutes: current.speed });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [mission?.id, mission?.speed, mission?.activeIncident?.id, mission?.status]);

  async function launchMission() {
    setBusy(true);
    setError("");
    try {
      const payload: CreateMissionInput = { planet, playerName, playerCharacterId: selectedCharacter, supportCrewIds: supportCrew.filter((id) => id !== selectedCharacter).slice(0, 3) };
      const response = await fetch("/api/missions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json() as { mission?: MissionState; error?: string };
      if (!response.ok || !data.mission) throw new Error(data.error ?? "Mission launch failed.");
      setMission(data.mission);
      missionRef.current = data.mission;
      window.localStorage.setItem("launchlab:lastMissionId", data.mission.id);
      setSelectedEquipmentId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not launch mission.");
    } finally {
      setBusy(false);
    }
  }

  function chooseCharacter(id: string) {
    setSelectedCharacter(id);
    const character = CHARACTERS.find((item) => item.id === id);
    if (character?.custom && playerName === "Cadet") setPlayerName("");
    setSupportCrew((current) => current.filter((member) => member !== id).slice(0, 3));
  }

  function toggleCrew(id: string) {
    setSupportCrew((current) => {
      if (id === selectedCharacter) return current;
      if (current.includes(id)) return current.filter((value) => value !== id);
      return [...current, id].slice(-3);
    });
  }

  function selectEquipment(id: string) {
    setSelectedEquipmentId(id);
    void dispatch({ type: "INTERACT", equipmentId: id });
  }

  function askMira(event: FormEvent) {
    event.preventDefault();
    if (!mission) return;
    const question = miraQuestion.trim();
    setMiraReply(getEducationalHint(mission, question || "hint"));
    setMiraQuestion("");
  }

  const onPlanet = planet === "MOON" ? "LUNAR SOUTH POLE TRAINING SITE" : "MARS SURFACE TRAINING SITE";

  if (!mission && restoring) return <main className="restore-screen"><div className="mira-orb">M</div><p>CHECKING YOUR SAVED MISSION…</p></main>;

  if (!mission) {
    return (
      <main className="launch-shell">
        <div className="launch-glow launch-glow-one" /><div className="launch-glow launch-glow-two" />
        <header className="brand-header">
          <div className="brand-mark"><img src="/assets/launch-lab-logo.png" alt="Launch Lab" /></div>
          <div className="brand-meta"><span>ASTRONAUT TRAINER</span><span className="live-dot">MISSION PREPARATION</span></div>
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
              <button type="button" className={`planet-card moon ${planet === "MOON" ? "chosen" : ""}`} onClick={() => setPlanet("MOON")}>
                <span className="planet-art moon-art"><span className="moon-disc" /><span className="crater crater-a" /><span className="crater crater-b" /></span>
                <strong>THE MOON</strong><small>South Pole · Variable illumination · Vacuum</small><span className="planet-select">{planet === "MOON" ? "SELECTED" : "SELECT DESTINATION"}</span>
              </button>
              <button type="button" className={`planet-card mars ${planet === "MARS" ? "chosen" : ""}`} onClick={() => setPlanet("MARS")}>
                <span className="planet-art mars-art"><span className="mars-disc" /><span className="mars-shadow" /></span>
                <strong>MARS</strong><small>Thin CO₂ atmosphere · Dust · Delayed communications</small><span className="planet-select">{planet === "MARS" ? "SELECTED" : "SELECT DESTINATION"}</span>
              </button>
            </div>
            <div className="scope-grid">
              <div><span>SCOPE</span><strong>7-day survival training</strong><small>Life support, power, water, food and mission operations.</small></div>
              <div><span>LOCATION</span><strong>{onPlanet}</strong><small>Simulated site; not a surveyed landing coordinate.</small></div>
              <div><span>ASSUMPTIONS</span><strong>Versioned science registry</strong><small>NASA references plus labeled training-only parameters.</small></div>
            </div>
            {error && <div className="error-banner">{error}</div>}
            <button type="button" className="primary-launch" disabled={busy || playerName.trim().length === 0 || supportCrew.length !== 3} onClick={launchMission}>{busy ? "PREPARING LAUNCH…" : `LAUNCH ${planet === "MOON" ? "LUNAR" : "MARS"} MISSION`} <span>↗</span></button>
            <p className="form-note">A saved mission is created on the server. Use the Docker deployment for persistent PostgreSQL saves.</p>
          </div>
          <aside className="setup-aside">
            <div className="aside-card"><span className="eyebrow">THE MISSION</span><div className="aside-big-number">07<span>DAYS</span></div><p>Keep your four-person crew safe while completing three base-operation objectives.</p><div className="aside-divider" /><div className="aside-check"><span>01</span> Inspect life support</div><div className="aside-check"><span>02</span> Verify potable water</div><div className="aside-check"><span>03</span> Inspect the rover</div></div>
            <div className="aside-note"><span>✦</span><div><strong>Learn by doing</strong><p>MIRA gives hints, not answers. Your choices change the simulation state.</p></div></div>
            <button type="button" className="science-toggle" onClick={() => setShowScience(!showScience)}>{showScience ? "Hide" : "View"} science references ↗</button>
            {showScience && <div className="science-small"><a href={SCIENCE_REFERENCES.bvad.url} target="_blank" rel="noreferrer">NASA BVAD Rev. 2</a><a href={SCIENCE_REFERENCES.eclss.url} target="_blank" rel="noreferrer">NASA ECLSS</a><a href="https://trek.nasa.gov/moon/" target="_blank" rel="noreferrer">NASA Moon Trek</a></div>}
          </aside>
        </section>
        <footer className="launch-footer"><span>LAUNCH LAB / SPACEAPP</span><span>SCIENCE DATA {SCIENCE_DATA_VERSION}</span><span>SIMULATED TRAINING ENVIRONMENT</span></footer>
      </main>
    );
  }

  return (
    <main className="game-shell">
      <header className="game-header">
        <div className="game-brand"><img src="/assets/launch-lab-logo.png" alt="Launch Lab" /><span>OUTPOST OPERATIONS</span></div>
        <div className="mission-clock"><span className="pulse-dot" />{timeLabel(mission.elapsedMinutes)}<small>{mission.planet === "MOON" ? "LUNAR BASE" : "MARS BASE"}</small></div>
        <div className="header-controls"><button type="button" onClick={() => void dispatch({ type: "SET_SPEED", speed: 0 })} className={mission.speed === 0 ? "speed-active" : ""}>Ⅱ PAUSE</button><button type="button" onClick={() => void dispatch({ type: "SET_SPEED", speed: 1 })} className={mission.speed === 1 ? "speed-active" : ""}>1×</button><button type="button" onClick={() => void dispatch({ type: "SET_SPEED", speed: 3 })} className={mission.speed === 3 ? "speed-active" : ""}>3×</button><button type="button" className="exit-button" onClick={() => { setMission(null); missionRef.current = null; }}>EXIT</button></div>
      </header>
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
      {mission.status !== "ACTIVE" && <section className={`mission-end ${mission.status.toLowerCase()}`}><div className="end-symbol">{mission.status === "SUCCESS" ? "✦" : "!"}</div><div><span>MISSION {mission.status === "SUCCESS" ? "COMPLETE" : "ENDED"}</span><strong>{mission.lastMessage}</strong><p>Review the operational log to see how your decisions affected the crew and equipment.</p></div><button type="button" onClick={() => { setMission(null); missionRef.current = null; }}>NEW MISSION</button></section>}
      <section className="game-layout">
        <aside className="game-sidebar left-sidebar">
          <div className="sidebar-section"><div className="sidebar-title">CREW <span>04 / 04</span></div>{mission.crew.map((member) => {
            const character = CHARACTERS.find((item) => item.id === member.characterId);
            return <div className="crew-member" key={member.id}><span className="crew-avatar" style={{ borderColor: character?.accent ?? "#758ca0" }}>{character ? <img src={character.image} alt="" className={character.opaque ? "opaque-image" : ""} /> : "👩‍🚀"}</span><span><strong>{member.name}</strong><small>{member.role}</small><small className="crew-task">{member.currentTask}</small></span><i className={member.fatigue > 65 ? "fatigue-high" : ""} title={`Game fatigue indicator ${Math.round(member.fatigue)}%`}>{Math.round(member.fatigue)}%</i></div>;
          })}</div>
          <div className="sidebar-section"><div className="sidebar-title">MISSION OBJECTIVES</div>{mission.objectives.map((objective) => <div className={`objective-row ${objective.complete ? "complete" : ""}`} key={objective.id}><span>{objective.complete ? "✓" : "○"}</span>{objective.title}</div>)}</div>
          <div className="sidebar-section compact-note"><div className="sidebar-title">MISSION MODEL</div><p>{mission.planet === "MOON" ? "South Pole training profile · local illumination is simplified and not linked to a live Moon Trek ephemeris." : "Mars training profile · dust and solar factors are scenario assumptions, not live weather."}</p></div>
        </aside>
        <section className="world-column">
          <div className="world-topline"><span><i /> LIVE 3D OUTPOST</span><span>{mission.planet === "MOON" ? "LUNAR REGOLITH" : "MARTIAN TERRAIN"} · CLICK-TO-WALK</span></div>
          <WorldCanvas planet={mission.planet} mission={mission} accentColor={(CHARACTERS.find((item) => item.id === mission.playerCharacterId) ?? CHARACTERS[6]).accent} selectedEquipmentId={selectedEquipmentId} onSelectEquipment={selectEquipment} onMove={(x, z) => setPlayerPosition([x, z])} />
          <div className="world-bottomline"><span>POSITION {fmt(playerPosition[0], 1)}, {fmt(playerPosition[1], 1)}</span><span>RENDER FPS DOES NOT DRIVE SCIENCE CALCULATIONS</span></div>
          {equipment && <div className="equipment-panel">
            <button className="close-equipment" onClick={() => setSelectedEquipmentId(null)}>×</button>
            <div className="equipment-panel-head"><span className="equipment-icon">{equipment.icon}</span><div><span>{equipment.room}</span><strong>{equipment.name}</strong></div></div>
            <p>{equipment.description}</p>
            {selectedSystem && <div className="equipment-state"><span>STATE <b className={`state-${selectedSystem.status.toLowerCase()}`}>{selectedSystem.status}</b></span><span>POWER <b>{fmt(selectedSystem.powerKw)} kW</b></span><span>CONDITION <b>{selectedSystem.condition}%</b></span></div>}
            <div className="equipment-actions">{equipment.actions.map((action) => <button type="button" key={action.id} disabled={busy || mission.status !== "ACTIVE"} onClick={() => void dispatch({ type: "OPERATE", equipmentId: equipment.id, actionId: action.id })}><strong>{action.label}</strong><small>{action.durationMinutes} min · {action.requirements.join(" · ")}</small></button>)}</div>
            <span className="equipment-model-note">Actions consume simulated time and may use resources. Requirements and failure conditions are defined in the equipment registry.</span>
          </div>}
        </section>
        <aside className="game-sidebar right-sidebar">
          {mission.activeIncident ? <div className="decision-card"><div className="sidebar-title">CHOOSE YOUR RESPONSE <span>05 OPTIONS</span></div><p className="decision-intro">Read the evidence. Consider the system dependencies before committing the crew.</p>{mission.activeIncident.evidence.map((line) => <div className="evidence-row" key={line}><span>↳</span>{line}</div>)}<div className="choice-list">{mission.activeIncident.choices.map((choice, index) => <button type="button" key={choice.id} disabled={busy || (choice.cost.spareParts ?? 0) > mission.resources.spareParts} onClick={() => void dispatch({ type: "DECIDE", incidentId: mission.activeIncident!.id, choiceId: choice.id })}><span>{index + 1}</span><div><strong>{choice.title}</strong><small>{choice.detail}</small><em>{choice.cost.minutes ?? 1} min{choice.cost.batteryKwh ? ` · ${choice.cost.batteryKwh} kWh` : ""}{choice.cost.spareParts ? ` · ${choice.cost.spareParts} spare part` : ""}</em></div></button>)}</div><small className="training-tag">SCENARIO RESPONSE · NOT A REAL FLIGHT PROCEDURE</small></div> : <div className="mira-card"><div className="mira-heading"><span className="mira-orb">M</span><div><strong>MIRA</strong><small>ONBOARD TRAINING ASSISTANT</small></div><span className="mira-online">●</span></div><p>{miraReply}</p><button className="mira-hint" onClick={() => { setMiraReply(getEducationalHint(mission)); setMiraOpen(true); }}>GIVE ME A HINT ↗</button><button className="mira-text-toggle" onClick={() => setMiraOpen(!miraOpen)}>{miraOpen ? "Close question" : "Ask MIRA a question"}</button>{miraOpen && <form className="mira-form" onSubmit={askMira}><input value={miraQuestion} onChange={(event) => setMiraQuestion(event.target.value)} placeholder="Why is power dropping?"/><button type="submit">ASK</button></form>}<span className="mira-disclaimer">State-aware rule hints · no external AI or voice service configured.</span></div>}
          <div className="resource-mini"><div className="sidebar-title">SYSTEM STATUS</div>{mission.systems.map((system) => <div className="system-row" key={system.id}><span className={`system-light ${system.status.toLowerCase()}`} /><span>{system.name}</span><b>{system.status}</b><button aria-label={`Toggle ${system.name}`} disabled={busy || mission.status !== "ACTIVE" || system.status === "FAULTED"} onClick={() => void dispatch({ type: "TOGGLE_SYSTEM", systemId: system.id, enabled: system.status === "OFF" })}>{system.status === "OFF" ? "ON" : "OFF"}</button></div>)}</div>
          <div className="resource-mini"><div className="sidebar-title">STORES <span>{mission.resources.spareParts} SPARES</span></div><div className="store-bar"><span>WASTEWATER</span><strong>{fmt(mission.resources.wastewaterKg)} kg</strong></div><div className="store-bar"><span>QUARANTINED WATER</span><strong>{fmt(mission.resources.quarantinedWaterKg)} kg</strong></div><div className="store-bar"><span>FOOD STORED</span><strong>{fmt(mission.resources.foodKg)} kg</strong></div><div className="store-bar"><span>SPARE PARTS</span><strong>{mission.resources.spareParts}</strong></div></div>
        </aside>
      </section>
      <footer className="game-footer"><span>SCIENCE DATA {mission.scienceDataVersion}</span><button type="button" onClick={() => setShowScience(!showScience)}>DATA SOURCES & MODEL LIMITATIONS</button><span>MISSION SAVE · {mission.id.slice(0, 8)}</span></footer>
      {showScience && <div className="science-overlay"><div className="science-overlay-card"><button onClick={() => setShowScience(false)}>×</button><h3>Science data & model boundary</h3><p><b>NASA baseline:</b> Oxygen and CO₂ metabolic reference rates and early planetary-base water use are sourced from NASA BVAD Revision 2.</p><p><b>Gameplay assumptions:</b> Starting resource inventories, equipment power ratings, water recovery throughput, illumination/dust profiles, warning thresholds, failure boundaries, crop model, task durations and repairs are simplified game values.</p><p><b>Important:</b> This starter does not calculate medical safety, full cabin pressure, dose exposure, live Moon Trek illumination, DONKI-driven dose, or validated Mars weather. It is an educational prototype, not mission-planning software.</p><a href={SCIENCE_REFERENCES.bvad.url} target="_blank" rel="noreferrer">Open NASA BVAD ↗</a></div></div>}
    </main>
  );
}

function Metric({ label, icon, value, detail, warn }: { label: string; icon: string; value: string; detail: string; warn?: boolean }) {
  return <div className={`metric-card ${warn ? "warn" : ""}`}><div className="metric-label"><span>{icon}</span>{label}</div><strong>{value}</strong><small>{detail}</small></div>;
}
