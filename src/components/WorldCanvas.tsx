"use client";

import { Canvas, ThreeEvent, useFrame } from "@react-three/fiber";
import { Html, OrbitControls, Stars } from "@react-three/drei";
import { Suspense, useRef, useState } from "react";
import * as THREE from "three";
import { EQUIPMENT_CATALOG, EquipmentSpec } from "@/lib/simulation/equipment";
import type { CrewMember, MissionState, Planet } from "@/lib/simulation/types";

type SupportCrewVisual = {
  member: CrewMember;
  accentColor: string;
  characterImage: string;
};

type Props = {
  planet: Planet;
  mission: MissionState;
  onSelectEquipment: (equipmentId: string) => void;
  selectedEquipmentId: string | null;
  accentColor: string;
  characterImage: string;
  characterName: string;
  supportCrew: SupportCrewVisual[];
  selectedCrewId: string | null;
  onSelectCrew: (crewId: string) => void;
  onMove: (x: number, z: number) => void;
};

type EnvironmentProfile = {
  sky: string;
  ground: string;
  surface: string;
  horizon: string;
  keyLight: string;
  fillLight: string;
  ambientIntensity: number;
  keyLightIntensity: number;
};

const DAILY_ENVIRONMENTS: Record<Planet, EnvironmentProfile[]> = {
  MOON: [
    { sky: "#0b1421", ground: "#8c929a", surface: "#a8abb0", horizon: "#555b64", keyLight: "#fff1ce", fillLight: "#a7c9ec", ambientIntensity: 0.8, keyLightIntensity: 2.6 },
    { sky: "#121a2c", ground: "#9295a0", surface: "#afb0b8", horizon: "#5b5c6b", keyLight: "#ffe0b0", fillLight: "#9db4df", ambientIntensity: 0.76, keyLightIntensity: 2.45 },
    { sky: "#101522", ground: "#858c99", surface: "#a4a9b2", horizon: "#4e5665", keyLight: "#d9e7ff", fillLight: "#9dbde5", ambientIntensity: 0.72, keyLightIntensity: 2.35 },
    { sky: "#171827", ground: "#92909a", surface: "#b1aeb5", horizon: "#5d5662", keyLight: "#ffe1c1", fillLight: "#c5aee4", ambientIntensity: 0.78, keyLightIntensity: 2.5 },
    { sky: "#101b28", ground: "#858d96", surface: "#a6afb4", horizon: "#505b64", keyLight: "#d3eaff", fillLight: "#91c0de", ambientIntensity: 0.74, keyLightIntensity: 2.4 },
    { sky: "#191a27", ground: "#97939a", surface: "#b2adb0", horizon: "#615760", keyLight: "#ffdbab", fillLight: "#d2a7d1", ambientIntensity: 0.82, keyLightIntensity: 2.55 },
    { sky: "#0c1724", ground: "#89909a", surface: "#aeb2b8", horizon: "#535a67", keyLight: "#fff0d3", fillLight: "#a6c1e3", ambientIntensity: 0.8, keyLightIntensity: 2.6 }
  ],
  MARS: [
    { sky: "#21191b", ground: "#9b5942", surface: "#b66e4d", horizon: "#714333", keyLight: "#ffd1a0", fillLight: "#ffb58a", ambientIntensity: 1.0, keyLightIntensity: 2.6 },
    { sky: "#2b1d1b", ground: "#a25d44", surface: "#c27652", horizon: "#784936", keyLight: "#ffc28c", fillLight: "#f4a17e", ambientIntensity: 0.94, keyLightIntensity: 2.45 },
    { sky: "#251b20", ground: "#96553f", surface: "#af684d", horizon: "#6c4035", keyLight: "#f4c0a3", fillLight: "#e49ab0", ambientIntensity: 0.9, keyLightIntensity: 2.35 },
    { sky: "#30201d", ground: "#aa6247", surface: "#c87a55", horizon: "#7d4935", keyLight: "#ffd19b", fillLight: "#ffbd91", ambientIntensity: 1.02, keyLightIntensity: 2.5 },
    { sky: "#211a20", ground: "#94513e", surface: "#b36b55", horizon: "#6c3e36", keyLight: "#eeb7a4", fillLight: "#c793b1", ambientIntensity: 0.92, keyLightIntensity: 2.4 },
    { sky: "#34221d", ground: "#ad6244", surface: "#ca7950", horizon: "#804a33", keyLight: "#ffd39c", fillLight: "#ffae85", ambientIntensity: 1.04, keyLightIntensity: 2.55 },
    { sky: "#261b1c", ground: "#995740", surface: "#b96e4b", horizon: "#714231", keyLight: "#ffd3ad", fillLight: "#f5a68d", ambientIntensity: 1.0, keyLightIntensity: 2.6 }
  ]
};

const CREW_PATROLS: [number, number][][] = [
  [[-5.2, -2.2], [-2.7, 0.8], [-0.5, 3.2], [-3.6, 5.2]],
  [[2.3, -1.5], [5.2, 1.1], [3.2, 4.1], [0.2, 5.8]],
  [[7.2, 2.8], [5.1, 5.5], [1.8, 7.3], [-1.6, 5.2]]
];

function environmentForDay(planet: Planet, day: number): EnvironmentProfile {
  return DAILY_ENVIRONMENTS[planet][THREE.MathUtils.clamp(day, 1, 7) - 1];
}

function PlanetGround({ planet, day, onMove }: { planet: Planet; day: number; onMove: (x: number, z: number) => void }) {
  const environment = environmentForDay(planet, day);
  const onGroundClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onMove(THREE.MathUtils.clamp(event.point.x, -13, 13), THREE.MathUtils.clamp(event.point.z, -10, 11));
  };
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, 0]} receiveShadow onPointerDown={onGroundClick}>
        <planeGeometry args={[32, 28, 1, 1]} />
        <meshStandardMaterial color={environment.ground} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.10, 0]} onPointerDown={onGroundClick}>
        <planeGeometry args={[26, 22, 1, 1]} />
        <meshStandardMaterial color={environment.surface} roughness={1} />
      </mesh>
      {Array.from({ length: 34 }, (_, i) => {
        const x = Math.sin(i * 12.9898) * 12.5;
        const z = Math.cos(i * 4.123) * 10.5;
        const radius = 0.12 + ((i * 7) % 5) * 0.07;
        return (
          <mesh key={i} position={[x, -0.02 + radius * 0.35, z]} rotation={[0.3 + i * 0.11, i * 0.5, 0.2]} castShadow receiveShadow>
            <dodecahedronGeometry args={[radius, 0]} />
            <meshStandardMaterial color={planet === "MOON" ? (i % 2 ? "#777d85" : "#c0c3c7") : (i % 2 ? "#804b3b" : "#c27652")} roughness={1} />
          </mesh>
        );
      })}
      <mesh position={[0, -0.3, -13]} receiveShadow>
        <boxGeometry args={[36, 0.5, 4]} />
        <meshStandardMaterial color={environment.horizon} />
      </mesh>
    </group>
  );
}

function Building({ position, title, color, size = [4, 1.6, 3], onClick }: {
  position: [number, number, number]; title: string; color: string; size?: [number, number, number]; onClick: () => void;
}) {
  return (
    <group position={position}>
      <mesh position={[0, size[1] / 2, 0]} castShadow receiveShadow onClick={(e) => { e.stopPropagation(); onClick(); }}>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} roughness={0.72} metalness={0.15} />
      </mesh>
      <mesh position={[0, size[1] + 0.12, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <boxGeometry args={[size[0] * 0.72, 0.22, size[2] * 0.72]} />
        <meshStandardMaterial color="#d6e0e5" metalness={0.25} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.65, size[2] / 2 + 0.015]}>
        <boxGeometry args={[0.75, 1.15, 0.08]} />
        <meshStandardMaterial color="#27394b" emissive="#23445d" emissiveIntensity={0.5} />
      </mesh>
      <Html position={[0, size[1] + 0.6, 0]} center distanceFactor={15}>
        <div className="world-label">{title}</div>
      </Html>
    </group>
  );
}

function EquipmentObject({ spec, selected, onSelect }: { spec: EquipmentSpec; selected: boolean; onSelect: () => void }) {
  const pos = spec.position;
  const isSolar = spec.id === "solar-array";
  const isRover = spec.id === "rover";
  const isShelter = spec.id === "radiation-shelter";
  const isGreenhouse = spec.id === "greenhouse-rack";
  return (
    <group position={pos}>
      {isSolar ? (
        <group rotation={[-0.3, 0, 0]}>
          <mesh position={[0, 0.75, 0]} castShadow>
            <boxGeometry args={[2.8, 0.12, 1.5]} />
            <meshStandardMaterial color="#163f69" metalness={0.8} roughness={0.25} />
          </mesh>
          {[-1, -0.5, 0, 0.5, 1].map((x) => <mesh key={x} position={[x, 0.82, 0.01]}><boxGeometry args={[0.035, 0.03, 1.48]} /><meshStandardMaterial color="#76c3eb" /></mesh>)}
          <mesh position={[0, 0.32, 0]}><cylinderGeometry args={[0.06, 0.08, 0.7, 8]} /><meshStandardMaterial color="#555e68" /></mesh>
        </group>
      ) : isRover ? (
        <group>
          <mesh position={[0, 0.65, 0]} castShadow><boxGeometry args={[1.8, 0.65, 1.15]} /><meshStandardMaterial color="#d9dedf" metalness={0.28} roughness={0.48} /></mesh>
          {[-0.68, 0.68].map((x) => [-0.46, 0.46].map((z) => <mesh key={`${x}-${z}`} position={[x, 0.32, z]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.28, 0.28, 0.18, 16]} /><meshStandardMaterial color="#202a35" roughness={0.95} /></mesh>))}
          <mesh position={[0.2, 1.1, 0]}><boxGeometry args={[0.8, 0.1, 0.55]} /><meshStandardMaterial color="#173e67" /></mesh>
          <mesh position={[-0.5, 1.05, 0]}><cylinderGeometry args={[0.22, 0.22, 0.65, 10]} /><meshStandardMaterial color="#bbc6ca" /></mesh>
        </group>
      ) : isShelter ? (
        <mesh position={[0, 0.55, 0]} castShadow><cylinderGeometry args={[1.15, 1.45, 1.2, 8]} /><meshStandardMaterial color="#65708c" roughness={0.9} /></mesh>
      ) : isGreenhouse ? (
        <group>
          <mesh position={[0, 0.45, 0]}><boxGeometry args={[1.45, 0.75, 0.85]} /><meshStandardMaterial color="#223a3b" transparent opacity={0.7} /></mesh>
          {[-0.45, -0.15, 0.15, 0.45].map((x) => <group key={x} position={[x, 0.55, 0]}><mesh position={[0, 0.18, 0]}><cylinderGeometry args={[0.035, 0.045, 0.45, 6]} /><meshStandardMaterial color="#3c7d4a" /></mesh><mesh position={[0.12, 0.27, 0]} rotation={[0, 0, 0.7]}><sphereGeometry args={[0.13, 8, 6]} /><meshStandardMaterial color="#82ba61" /></mesh></group>)}
        </group>
      ) : (
        <group>
          <mesh position={[0, 0.45, 0]} castShadow>
            <cylinderGeometry args={[0.42, 0.55, 0.9, 12]} />
            <meshStandardMaterial color={spec.color} roughness={0.35} metalness={0.25} />
          </mesh>
          <mesh position={[0, 0.98, 0]}>
            <sphereGeometry args={[0.24, 14, 10]} />
            <meshStandardMaterial color="#dbe7eb" emissive={spec.color} emissiveIntensity={0.12} />
          </mesh>
        </group>
      )}
      <mesh position={[0, 0.04, 0]} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
        <cylinderGeometry args={[1.0, 1.0, 0.08, 24]} />
        <meshStandardMaterial color={selected ? "#f0c36b" : "#1b2b3c"} emissive={selected ? "#d4953d" : "#0b1420"} emissiveIntensity={selected ? 0.5 : 0.1} transparent opacity={0.85} />
      </mesh>
      <mesh position={[0, 0.04, 0]} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
        <cylinderGeometry args={[1.08, 1.08, 0.14, 24]} />
        <meshBasicMaterial color={selected ? "#ffd68d" : "#b4c0cc"} wireframe transparent opacity={selected ? 0.95 : 0.4} />
      </mesh>
      <Html position={[0, isRover ? 1.75 : 1.5, 0]} center distanceFactor={13}>
        <button className={`world-object-label ${selected ? "selected" : ""}`} onClick={(event) => { event.stopPropagation(); onSelect(); }}>
          <span>{spec.icon}</span><span>{spec.name}</span>
        </button>
      </Html>
    </group>
  );
}

function Astronaut({ target, accentColor, characterImage, characterName, celebrating }: {
  target: [number, number, number];
  accentColor: string;
  characterImage: string;
  characterName: string;
  celebrating: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (!ref.current) return;
    const group = ref.current;
    if (celebrating) {
      group.position.y = 0.02 + Math.max(0, Math.sin(performance.now() / 210)) * 0.75;
      group.rotation.y += delta * 1.6;
      return;
    }
    const dx = target[0] - group.position.x;
    const dz = target[2] - group.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance <= 0.04) {
      group.position.set(target[0], 0.02, target[2]);
      return;
    }

    const heading = Math.atan2(dx, dz);
    const angleDelta = THREE.MathUtils.euclideanModulo(heading - group.rotation.y + Math.PI, Math.PI * 2) - Math.PI;
    group.rotation.y += angleDelta * Math.min(1, delta * 8);

    const step = Math.min(distance, delta * 2.4);
    if (step === distance) {
      group.position.set(target[0], 0.02, target[2]);
      group.rotation.y = heading;
    } else {
      group.position.x += (dx / distance) * step;
      group.position.z += (dz / distance) * step;
      group.position.y = 0.08 + Math.sin(performance.now() / 110) * 0.035;
    }
  });
  return (
    <group ref={ref} position={[0, 0.02, 1.5]}>
      <group>
        <mesh position={[0, 0.86, 0]} castShadow><capsuleGeometry args={[0.34, 0.78, 5, 10]} /><meshStandardMaterial color="#f1f3f4" roughness={0.62} /></mesh>
        <mesh position={[0, 1.03, 0.32]}><boxGeometry args={[0.4, 0.18, 0.06]} /><meshStandardMaterial color={accentColor} metalness={0.35} /></mesh>
        <Html position={[0, 1.92, 0.12]} center distanceFactor={15}>
          <div className="player-head-marker" style={{ borderColor: accentColor }} title={`${characterName} - selected astronaut`}>
            <img src={characterImage} alt={`${characterName}, selected astronaut`} draggable={false} />
          </div>
        </Html>
        <mesh position={[-0.43, 0.92, 0]} rotation={[0, 0, -0.35]}><capsuleGeometry args={[0.13, 0.55, 4, 8]} /><meshStandardMaterial color="#e7edf0" /></mesh>
        <mesh position={[0.43, 0.92, 0]} rotation={[0, 0, 0.35]}><capsuleGeometry args={[0.13, 0.55, 4, 8]} /><meshStandardMaterial color="#e7edf0" /></mesh>
        <mesh position={[-0.18, 0.26, 0.03]}><capsuleGeometry args={[0.14, 0.48, 4, 8]} /><meshStandardMaterial color="#f1f3f4" /></mesh>
        <mesh position={[0.18, 0.26, 0.03]}><capsuleGeometry args={[0.14, 0.48, 4, 8]} /><meshStandardMaterial color="#f1f3f4" /></mesh>
        <mesh position={[0, 0.89, -0.34]}><boxGeometry args={[0.76, 0.75, 0.3]} /><meshStandardMaterial color="#dce2e5" roughness={0.55} /></mesh>
      </group>
    </group>
  );
}


function CrewFigure({ crew, routeIndex, selected, onSelect }: {
  crew: SupportCrewVisual;
  routeIndex: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const waypointIndex = useRef(1);
  const waitUntil = useRef(0);
  const route = CREW_PATROLS[routeIndex % CREW_PATROLS.length];
  const assignedEquipment = EQUIPMENT_CATALOG.find((item) => item.id === crew.member.currentTaskEquipmentId);
  useFrame(({ clock }, delta) => {
    if (!ref.current) return;
    const group = ref.current;
    if (clock.elapsedTime < waitUntil.current) return;
    const destination: [number, number] = assignedEquipment
      ? [assignedEquipment.position[0] + 1.2, assignedEquipment.position[2] + 1.2]
      : route[waypointIndex.current];
    const dx = destination[0] - group.position.x;
    const dz = destination[1] - group.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance <= 0.12) {
      group.position.y = 0.02;
      if (leftArmRef.current) leftArmRef.current.rotation.x = 0;
      if (rightArmRef.current) rightArmRef.current.rotation.x = 0;
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0;
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0;
      if (!assignedEquipment) {
        waypointIndex.current = (waypointIndex.current + 1) % route.length;
        waitUntil.current = clock.elapsedTime + 0.8;
      }
      return;
    }

    const heading = Math.atan2(dx, dz);
    const angleDelta = THREE.MathUtils.euclideanModulo(heading - group.rotation.y + Math.PI, Math.PI * 2) - Math.PI;
    group.rotation.y += angleDelta * Math.min(1, delta * 6);
    const step = Math.min(distance, delta * 1.15);
    group.position.x += (dx / distance) * step;
    group.position.z += (dz / distance) * step;
    group.position.y = 0.02 + Math.sin(clock.elapsedTime * 12) * 0.035;
    const gait = Math.sin(clock.elapsedTime * 10 + routeIndex) * 0.32;
    if (leftArmRef.current) leftArmRef.current.rotation.x = -gait;
    if (rightArmRef.current) rightArmRef.current.rotation.x = gait;
    if (leftLegRef.current) leftLegRef.current.rotation.x = gait;
    if (rightLegRef.current) rightLegRef.current.rotation.x = -gait;
  });
  return (
    <group
      ref={ref}
      position={[route[0][0], 0.02, route[0][1]]}
      onClick={(event) => { event.stopPropagation(); onSelect(); }}
    >
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.42, 0.5, 24]} />
        <meshBasicMaterial color={crew.accentColor} transparent opacity={selected ? 0.95 : 0.35} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.72, 0]} castShadow><capsuleGeometry args={[0.27, 0.58, 4, 8]} /><meshStandardMaterial color="#e7ecef" /></mesh>
      <mesh position={[0, 1.47, 0]} castShadow><sphereGeometry args={[0.28, 14, 10]} /><meshStandardMaterial color="#e7b294" /></mesh>
      <mesh position={[0, 1.63, -0.045]}><sphereGeometry args={[0.29, 12, 8]} /><meshStandardMaterial color="#4b312b" /></mesh>
      <mesh position={[0, 0.87, 0.26]}><boxGeometry args={[0.27, 0.13, 0.035]} /><meshStandardMaterial color={crew.accentColor} /></mesh>
      <mesh position={[0, 0.72, -0.29]}><boxGeometry args={[0.52, 0.5, 0.18]} /><meshStandardMaterial color="#bfcbd0" /></mesh>
      <mesh ref={leftArmRef} position={[-0.31, 0.35, 0]}><capsuleGeometry args={[0.10, 0.42, 4, 6]} /><meshStandardMaterial color="#e7ecef" /></mesh>
      <mesh ref={rightArmRef} position={[0.31, 0.35, 0]}><capsuleGeometry args={[0.10, 0.42, 4, 6]} /><meshStandardMaterial color="#e7ecef" /></mesh>
      <mesh ref={leftLegRef} position={[-0.13, 0.18, 0]}><boxGeometry args={[0.19, 0.30, 0.22]} /><meshStandardMaterial color="#e7ecef" /></mesh>
      <mesh ref={rightLegRef} position={[0.13, 0.18, 0]}><boxGeometry args={[0.19, 0.30, 0.22]} /><meshStandardMaterial color="#e7ecef" /></mesh>
      <Html position={[0, 1.55, 0.1]} center distanceFactor={17}>
        <button
          type="button"
          className={`crew-head-marker ${selected ? "selected" : ""}`}
          style={{ borderColor: crew.accentColor }}
          aria-label={`Select ${crew.member.name} to assign a job`}
          title={`${crew.member.name} - ${crew.member.currentTask}`}
          onClick={(event) => { event.stopPropagation(); onSelect(); }}
        >
          <img src={crew.characterImage} alt="" draggable={false} />
        </button>
      </Html>
    </group>
  );
}

function Scene({ planet, mission, onSelectEquipment, selectedEquipmentId, accentColor, characterImage, characterName, supportCrew, selectedCrewId, onSelectCrew, onMove }: Props) {
  const targetRef = useRef<[number, number, number]>([0, 0.02, 1.5]);
  const [, forceRender] = useState(0);
  const environment = environmentForDay(planet, mission.day);
  const sunAngle = ((mission.day - 1) / 7) * Math.PI * 2;
  const setTargetInner = (x: number, z: number) => {
    targetRef.current = [x, 0.02, z];
    forceRender((value) => value + 1);
    onMove(x, z);
  };
  const selection = (id: string, position: [number, number, number]) => {
    onSelectEquipment(id);
    setTargetInner(
      THREE.MathUtils.clamp(position[0] + 1.2, -13, 13),
      THREE.MathUtils.clamp(position[2] + 1.2, -10, 11)
    );
  };
  return (
    <>
      <color attach="background" args={[environment.sky]} />
      <fog attach="fog" args={[environment.sky, 18, 38]} />
      <ambientLight intensity={environment.ambientIntensity} />
      <directionalLight position={[Math.cos(sunAngle) * 12, 15, Math.sin(sunAngle) * 12]} color={environment.keyLight} intensity={environment.keyLightIntensity} castShadow shadow-mapSize={[2048, 2048]} />
      <pointLight position={[10, 8, 8]} intensity={1.2} color={environment.fillLight} />
      <Stars radius={90} depth={45} count={1400} factor={3} saturation={0} fade speed={0.15} />
      <PlanetGround planet={planet} day={mission.day} onMove={(x, z) => setTargetInner(x, z)} />
      <Building position={[-8, 0, -1]} title="HABITAT" color="#c4d1d6" size={[4.7, 1.8, 3.6]} onClick={() => selection("habitat-control", [-8, 0, -1])} />
      <Building position={[-3, 0, -5]} title="COMMAND" color="#40556a" size={[4.2, 1.8, 3.2]} onClick={() => selection("power-board", [-3, 0, -5])} />
      <Building position={[4, 0, -5]} title="AIR & WATER" color="#3d6f7a" size={[5.4, 1.7, 3.3]} onClick={() => selection("oxygen-generator", [4, 0, -5])} />
      <Building position={[9, 0, -1]} title="GREENHOUSE" color="#54785b" size={[3.6, 1.5, 4]} onClick={() => selection("greenhouse-rack", [9, 0, -1])} />
      <Building position={[-5, 0, 5]} title="AIRLOCK" color="#89979d" size={[3.4, 1.5, 2.8]} onClick={() => selection("airlock-panel", [-5, 0, 5])} />
      {EQUIPMENT_CATALOG.map((item) => <EquipmentObject key={item.id} spec={item} selected={selectedEquipmentId === item.id} onSelect={() => selection(item.id, item.position)} />)}
      <Astronaut target={targetRef.current} accentColor={accentColor} characterImage={characterImage} characterName={characterName} celebrating={mission.status === "SUCCESS"} />
      {supportCrew.map((crew, index) => (
        <CrewFigure
          key={crew.member.id}
          crew={crew}
          routeIndex={index}
          selected={crew.member.id === selectedCrewId}
          onSelect={() => onSelectCrew(crew.member.id)}
        />
      ))}
      <OrbitControls makeDefault target={[0, 0.6, 0]} minDistance={13} maxDistance={30} maxPolarAngle={Math.PI / 2.15} minPolarAngle={0.55} />
    </>
  );
}

export default function WorldCanvas(props: Props) {
  return (
    <div className="world-canvas-wrap">
      <Canvas shadows dpr={[1, 1.7]} camera={{ position: [17, 18, 19], fov: 42 }}>
        <Suspense fallback={null}><Scene {...props} /></Suspense>
      </Canvas>
      <div className="world-tip">CLICK THE GROUND OR AN OBJECT TO WALK THERE · DRAG TO LOOK AROUND</div>
    </div>
  );
}
