"use client";

import { Canvas, ThreeEvent, useFrame } from "@react-three/fiber";
import { Html, OrbitControls, Stars } from "@react-three/drei";
import { Suspense, useRef, useState } from "react";
import * as THREE from "three";
import { EQUIPMENT_CATALOG, EquipmentSpec } from "@/lib/simulation/equipment";
import type { MissionState, Planet } from "@/lib/simulation/types";

type Props = {
  planet: Planet;
  mission: MissionState;
  onSelectEquipment: (equipmentId: string) => void;
  selectedEquipmentId: string | null;
  accentColor: string;
  onMove: (x: number, z: number) => void;
};

function PlanetGround({ planet, onMove }: { planet: Planet; onMove: (x: number, z: number) => void }) {
  const groundColor = planet === "MOON" ? "#8c929a" : "#9b5942";
  const onGroundClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onMove(THREE.MathUtils.clamp(event.point.x, -13, 13), THREE.MathUtils.clamp(event.point.z, -10, 11));
  };
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, 0]} receiveShadow onPointerDown={onGroundClick}>
        <planeGeometry args={[32, 28, 1, 1]} />
        <meshStandardMaterial color={groundColor} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.10, 0]} onPointerDown={onGroundClick}>
        <planeGeometry args={[26, 22, 1, 1]} />
        <meshStandardMaterial color={planet === "MOON" ? "#a8abb0" : "#b66e4d"} roughness={1} />
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
        <meshStandardMaterial color={planet === "MOON" ? "#555b64" : "#714333"} />
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

function Astronaut({ target, accentColor }: { target: [number, number, number]; accentColor: string }) {
  const ref = useRef<THREE.Group>(null);
  const direction = useRef(new THREE.Vector3(0, 0, 1));
  useFrame((_, delta) => {
    if (!ref.current) return;
    const group = ref.current;
    const destination = new THREE.Vector3(target[0], 0, target[2]);
    const current = group.position;
    const deltaVector = destination.clone().sub(current);
    const distance = deltaVector.length();
    if (distance > 0.04) {
      deltaVector.normalize();
      direction.current.lerp(deltaVector, Math.min(1, delta * 4)).normalize();
      group.rotation.y = Math.atan2(direction.current.x, direction.current.z);
      current.addScaledVector(direction.current, Math.min(distance, delta * 2.4));
      group.position.y = 0.08 + Math.sin(performance.now() / 110) * 0.035;
    } else {
      group.position.y = THREE.MathUtils.lerp(group.position.y, 0.02, delta * 5);
    }
  });
  return (
    <group ref={ref} position={[0, 0.02, 1.5]}>
      <group>
        <mesh position={[0, 0.86, 0]} castShadow><capsuleGeometry args={[0.34, 0.78, 5, 10]} /><meshStandardMaterial color="#f1f3f4" roughness={0.62} /></mesh>
        <mesh position={[0, 1.03, 0.32]}><boxGeometry args={[0.4, 0.18, 0.06]} /><meshStandardMaterial color={accentColor} metalness={0.35} /></mesh>
        <mesh position={[0, 1.84, 0]} castShadow><sphereGeometry args={[0.36, 18, 14]} /><meshStandardMaterial color="#f2b99a" roughness={0.72} /></mesh>
        <mesh position={[0, 2.06, -0.08]} castShadow><sphereGeometry args={[0.39, 16, 10]} /><meshStandardMaterial color="#4a2f2b" roughness={0.95} /></mesh>
        <mesh position={[0, 1.82, 0.33]}><sphereGeometry args={[0.035, 8, 8]} /><meshStandardMaterial color="#25212a" /></mesh>
        <mesh position={[0.11, 1.82, 0.33]}><sphereGeometry args={[0.035, 8, 8]} /><meshStandardMaterial color="#25212a" /></mesh>
        <mesh position={[-0.43, 0.92, 0]} rotation={[0, 0, -0.35]}><capsuleGeometry args={[0.13, 0.55, 4, 8]} /><meshStandardMaterial color="#e7edf0" /></mesh>
        <mesh position={[0.43, 0.92, 0]} rotation={[0, 0, 0.35]}><capsuleGeometry args={[0.13, 0.55, 4, 8]} /><meshStandardMaterial color="#e7edf0" /></mesh>
        <mesh position={[-0.18, 0.26, 0.03]}><capsuleGeometry args={[0.14, 0.48, 4, 8]} /><meshStandardMaterial color="#f1f3f4" /></mesh>
        <mesh position={[0.18, 0.26, 0.03]}><capsuleGeometry args={[0.14, 0.48, 4, 8]} /><meshStandardMaterial color="#f1f3f4" /></mesh>
        <mesh position={[0, 0.89, -0.34]}><boxGeometry args={[0.76, 0.75, 0.3]} /><meshStandardMaterial color="#dce2e5" roughness={0.55} /></mesh>
        <mesh position={[0, 0.4, 0.1]}><boxGeometry args={[0.65, 0.11, 0.42]} /><meshStandardMaterial color={accentColor} /></mesh>
      </group>
    </group>
  );
}


function CrewFigure({ position, accent, phase = 0 }: { position: [number, number, number]; accent: string; phase?: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = 0.02 + Math.sin(clock.elapsedTime * 1.5 + phase) * 0.025;
  });
  return (
    <group ref={ref} position={position}>
      <mesh position={[0, 0.72, 0]} castShadow><capsuleGeometry args={[0.27, 0.58, 4, 8]} /><meshStandardMaterial color="#e7ecef" /></mesh>
      <mesh position={[0, 1.47, 0]} castShadow><sphereGeometry args={[0.28, 14, 10]} /><meshStandardMaterial color="#e7b294" /></mesh>
      <mesh position={[0, 1.63, -0.045]}><sphereGeometry args={[0.29, 12, 8]} /><meshStandardMaterial color="#4b312b" /></mesh>
      <mesh position={[0, 0.87, 0.26]}><boxGeometry args={[0.27, 0.13, 0.035]} /><meshStandardMaterial color={accent} /></mesh>
      <mesh position={[0, 0.72, -0.29]}><boxGeometry args={[0.52, 0.5, 0.18]} /><meshStandardMaterial color="#bfcbd0" /></mesh>
      <mesh position={[-0.31, 0.35, 0]}><capsuleGeometry args={[0.10, 0.42, 4, 6]} /><meshStandardMaterial color="#e7ecef" /></mesh>
      <mesh position={[0.31, 0.35, 0]}><capsuleGeometry args={[0.10, 0.42, 4, 6]} /><meshStandardMaterial color="#e7ecef" /></mesh>
      <mesh position={[-0.13, 0.18, 0]}><boxGeometry args={[0.19, 0.30, 0.22]} /><meshStandardMaterial color="#e7ecef" /></mesh>
      <mesh position={[0.13, 0.18, 0]}><boxGeometry args={[0.19, 0.30, 0.22]} /><meshStandardMaterial color="#e7ecef" /></mesh>
    </group>
  );
}

function Scene({ planet, mission, onSelectEquipment, selectedEquipmentId, accentColor, onMove }: Props) {
  const targetRef = useRef<[number, number, number]>([0, 0.02, 1.5]);
  const [, forceRender] = useState(0);
  const setTargetInner = (x: number, z: number) => {
    targetRef.current = [x, 0.02, z];
    forceRender((value) => value + 1);
    onMove(x, z);
  };
  const selection = (id: string) => { onSelectEquipment(id); };
  return (
    <>
      <color attach="background" args={[planet === "MOON" ? "#0b1421" : "#21191b"]} />
      <fog attach="fog" args={[planet === "MOON" ? "#0b1421" : "#4b302b", 18, 38]} />
      <ambientLight intensity={planet === "MOON" ? 0.8 : 1.0} />
      <directionalLight position={[-8, 15, -10]} intensity={2.6} castShadow shadow-mapSize={[2048, 2048]} />
      <pointLight position={[10, 8, 8]} intensity={1.2} color={planet === "MOON" ? "#a7c9ec" : "#ffb58a"} />
      <Stars radius={90} depth={45} count={1400} factor={3} saturation={0} fade speed={0.15} />
      <PlanetGround planet={planet} onMove={(x, z) => setTargetInner(x, z)} />
      <Building position={[-8, 0, -1]} title="HABITAT" color="#c4d1d6" size={[4.7, 1.8, 3.6]} onClick={() => selection("habitat-control")} />
      <Building position={[-3, 0, -5]} title="COMMAND" color="#40556a" size={[4.2, 1.8, 3.2]} onClick={() => selection("power-board")} />
      <Building position={[4, 0, -5]} title="AIR & WATER" color="#3d6f7a" size={[5.4, 1.7, 3.3]} onClick={() => selection("oxygen-generator")} />
      <Building position={[9, 0, -1]} title="GREENHOUSE" color="#54785b" size={[3.6, 1.5, 4]} onClick={() => selection("greenhouse-rack")} />
      <Building position={[-5, 0, 5]} title="AIRLOCK" color="#89979d" size={[3.4, 1.5, 2.8]} onClick={() => selection("airlock-panel")} />
      {EQUIPMENT_CATALOG.map((item) => <EquipmentObject key={item.id} spec={item} selected={selectedEquipmentId === item.id} onSelect={() => selection(item.id)} />)}
      <Astronaut target={targetRef.current} accentColor={accentColor} />
      <CrewFigure position={[-4.7, 0.02, -1.9]} accent="#d5a340" phase={0.4} />
      <CrewFigure position={[2.5, 0.02, -1.3]} accent="#c94b43" phase={1.2} />
      <CrewFigure position={[6.7, 0.02, 2.8]} accent="#df5e9e" phase={2.1} />
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
      <div className="world-tip">CLICK THE GROUND TO WALK · CLICK AN OBJECT TO INTERACT · DRAG TO LOOK AROUND</div>
    </div>
  );
}
