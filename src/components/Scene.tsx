// export default Scene;
"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import {
  Bvh,
  Environment,
  OrbitControls,
  PerspectiveCamera,
  Stats,
  useGLTF,
} from "@react-three/drei";
import { Leva, useControls } from "leva";
import * as THREE from "three";
// import { PerfMonitor } from "@/libs";

// import { Perf } from "r3f-perf";
import { PerfMonitor } from "r3f-monitor";

// ---------- Instanced Boxes ----------
const Model = () => {
  const { scene } = useGLTF("https://xhmanga.site/modelgirl.glb");

  return (
    <Bvh>
      <primitive object={scene} scale={1} position={[0, 0, 0]} />
    </Bvh>
  );
};

function BoxesInstanced() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dataRef = useRef<{
    positions: Float32Array;
    scales: Float32Array;
    count: number;
  } | null>(null);

  const { count, spread, size, randomScale, color } = useControls("Boxes", {
    count: { value: 3000, min: 1, max: 50000, step: 1 },
    spread: { value: 120, min: 1, max: 500, step: 1 },
    size: { value: 0.8, min: 0.05, max: 5, step: 0.05 },
    randomScale: { value: 0.6, min: 0, max: 2, step: 0.01 },
    color: "#8ff0ff",
  });

  // 👉 Tạo random data *ngoài render*
  useEffect(() => {
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * spread;
      positions[i3 + 1] = (Math.random() - 0.5) * spread * 0.6;
      positions[i3 + 2] = (Math.random() - 0.5) * spread;

      const s = size * (1 + (Math.random() - 0.5) * 2 * randomScale);
      scales[i] = Math.max(0.01, s);
    }

    dataRef.current = { positions, scales, count };
  }, [count, spread, size, randomScale]);

  // 👉 Áp matrix cho instanced mesh
  useEffect(() => {
    if (!ref.current || !dataRef.current) return;

    const { positions, scales } = dataRef.current;
    const dummy = new THREE.Object3D();

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      dummy.position.set(positions[i3], positions[i3 + 1], positions[i3 + 2]);
      const s = scales[i];
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    }

    ref.current.instanceMatrix.needsUpdate = true;
  }, [count]);

  return (
    <instancedMesh ref={ref} args={[undefined as any, undefined as any, count]}>
      <boxGeometry />
      <meshStandardMaterial color={color} />
    </instancedMesh>
  );
}

// ---------- Optional: non-instanced for CPU stress ---------

type Item = {
  key: number;
  pos: [number, number, number];
  rot: [number, number, number];
};

// PRNG deterministic (pure) - mulberry32
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function BoxesNonInstanced() {
  const { enabled, count, spread, size, seed } = useControls(
    "CPU Stress (non-instanced)",
    {
      enabled: { value: false },
      count: { value: 300, min: 1, max: 5000, step: 1 },
      spread: { value: 60, min: 1, max: 300, step: 1 },
      size: { value: 0.8, min: 0.05, max: 5, step: 0.05 },
      // seed để bạn bấm đổi layout "random" mà vẫn pure
      seed: { value: 12345, min: 1, max: 999999, step: 1 },
    },
  );

  const items = useMemo<Item[]>(() => {
    if (!enabled) return [];
    const rand = mulberry32(seed);

    const next: Item[] = new Array(count);
    for (let i = 0; i < count; i++) {
      const rx = rand();
      const ry = rand();
      const rz = rand();
      const r1 = rand();
      const r2 = rand();

      next[i] = {
        key: i,
        pos: [
          (rx - 0.5) * spread,
          (ry - 0.5) * spread * 0.6,
          (rz - 0.5) * spread,
        ],
        rot: [r1 * Math.PI, r2 * Math.PI, 0],
      };
    }
    return next;
  }, [enabled, count, spread, seed]);

  if (!enabled) return null;

  return (
    <>
      {items.map((it) => (
        <mesh key={it.key} position={it.pos} rotation={it.rot}>
          <boxGeometry args={[size, size, size]} />
          <meshStandardMaterial />
        </mesh>
      ))}
    </>
  );
}

// ---------- Scene ----------
export default function Scene() {
  const { background, envPreset, showGrid, shadows } = useControls("Scene", {
    background: "#ffffff",
    envPreset: {
      value: "city",
      options: [
        "city",
        "sunset",
        "dawn",
        "night",
        "warehouse",
        "forest",
        "apartment",
        "studio",
        "park",
        "lobby",
      ],
    },
    showGrid: { value: true },
    shadows: { value: false },
  });

  return (
    <>
      <Leva collapsed={false} />
      <Canvas
        style={{ width: "100vw", height: "100vh" }}
        shadows={shadows}
        gl={{ antialias: true }}
        onCreated={({ scene }) => {
          scene.background = new THREE.Color(background);
        }}
      >
        {/* <Stats /> */}
        <PerfMonitor position="top-left" deepAnalyze />
        <Model />
        <PerspectiveCamera
          makeDefault
          position={[
            -23.66048018671896, 160.62939543540753, 294.62638097574813,
          ]}
        />
        <OrbitControls
          makeDefault
          target={[-17.80215700555211, 55.75636672802748, -19.074812079798466]}
        />

        <ambientLight intensity={0.35} />
        <directionalLight
          position={[20, 40, 10]}
          intensity={1.2}
          castShadow={shadows}
        />

        <Environment preset={envPreset as any} />

        {showGrid && <gridHelper args={[300, 60]} />}

        <Suspense fallback={null}>
          <BoxesInstanced />
          <BoxesNonInstanced />
        </Suspense>
      </Canvas>
    </>
  );
}
