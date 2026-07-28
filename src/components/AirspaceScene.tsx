import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";

// Airspace classes rendered as concentric cylinders / wedding-cake tiers.
// Simplified illustrative model — not to real-world scale.
function ClassBWedding({ highlight }: { highlight: boolean }) {
  const color = "#3b82f6";
  const op = highlight ? 0.55 : 0.18;
  return (
    <group>
      {/* Surface tier — 5 nm radius, 0–10k */}
      <mesh position={[0, 5, 0]}>
        <cylinderGeometry args={[3, 3, 10, 48, 1, true]} />
        <meshStandardMaterial color={color} transparent opacity={op} side={2} />
      </mesh>
      {/* Middle tier — 10 nm radius, 3k–10k */}
      <mesh position={[0, 6.5, 0]}>
        <cylinderGeometry args={[6, 6, 7, 48, 1, true]} />
        <meshStandardMaterial color={color} transparent opacity={op * 0.85} side={2} />
      </mesh>
      {/* Outer tier — 15 nm radius, 5k–10k */}
      <mesh position={[0, 7.5, 0]}>
        <cylinderGeometry args={[10, 10, 5, 48, 1, true]} />
        <meshStandardMaterial color={color} transparent opacity={op * 0.7} side={2} />
      </mesh>
    </group>
  );
}

function ClassCTiers({ highlight }: { highlight: boolean }) {
  const color = "#a855f7";
  const op = highlight ? 0.55 : 0.18;
  return (
    <group>
      <mesh position={[0, 2, 0]}>
        <cylinderGeometry args={[2.5, 2.5, 4, 48, 1, true]} />
        <meshStandardMaterial color={color} transparent opacity={op} side={2} />
      </mesh>
      <mesh position={[0, 3, 0]}>
        <cylinderGeometry args={[5, 5, 2.5, 48, 1, true]} />
        <meshStandardMaterial color={color} transparent opacity={op * 0.75} side={2} />
      </mesh>
    </group>
  );
}

function ClassDCylinder({ highlight }: { highlight: boolean }) {
  const color = "#ef4444";
  const op = highlight ? 0.55 : 0.18;
  return (
    <mesh position={[0, 1.25, 0]}>
      <cylinderGeometry args={[2, 2, 2.5, 48, 1, true]} />
      <meshStandardMaterial color={color} transparent opacity={op} side={2} />
    </mesh>
  );
}

function ClassEDome({ highlight }: { highlight: boolean }) {
  const color = "#22c55e";
  const op = highlight ? 0.4 : 0.1;
  return (
    <mesh position={[0, 0.7, 0]}>
      <cylinderGeometry args={[14, 14, 0.6, 64, 1, true]} />
      <meshStandardMaterial color={color} transparent opacity={op} side={2} />
    </mesh>
  );
}

export default function AirspaceScene({ highlight }: { highlight: string }) {
  return (
    <Canvas camera={{ position: [18, 12, 20], fov: 45 }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} />
      {/* Ground */}
      <Grid args={[30, 30]} cellColor="#334155" sectionColor="#475569" fadeDistance={50} infiniteGrid={false} position={[0, 0, 0]} />
      {/* Airport marker */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.4, 0.4, 0.2, 24]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>
      <ClassEDome highlight={highlight === "E"} />
      <ClassBWedding highlight={highlight === "B"} />
      <ClassCTiers highlight={highlight === "C"} />
      <ClassDCylinder highlight={highlight === "D"} />
      <OrbitControls enablePan={false} minDistance={8} maxDistance={40} />
    </Canvas>
  );
}
