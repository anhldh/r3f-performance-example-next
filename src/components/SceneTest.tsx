"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import {
  Bvh,
  Environment,
  OrbitControls,
  PerspectiveCamera,
  useGLTF,
} from "@react-three/drei";
import { Leva, useControls } from "leva";
import * as THREE from "three";
import { PerfMonitor } from "@/libs"; // Đảm bảo đường dẫn đúng

// ---------- Instanced Boxes (Giữ nguyên) ----------
const Model = () => {
  const { scene } = useGLTF("/model.glb");
  // Log để biết khi nào Model bị hủy
  useEffect(() => {
    return () => console.log("🗑️ Model component unmounted");
  }, []);

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

// ---------- Non-instanced (Giữ nguyên) ---------
type Item = {
  key: number;
  pos: [number, number, number];
  rot: [number, number, number];
};

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

// ---------- Scene Content (Canvas bên trong) ----------
function SceneContent() {
  const { background, envPreset, showGrid, shadows } = useControls("Scene", {
    background: "#ffffff",
    envPreset: {
      value: "city",
      options: ["city", "sunset", "dawn", "night", "warehouse", "forest"],
    },
    showGrid: { value: true },
    shadows: { value: false },
  });

  const cameraRef = useRef<any>(null);

  const handleWheel = (event: WheelEvent) => {
    if (cameraRef.current) {
      cameraRef.current.fov += event.deltaY * 0.001;
      cameraRef.current.fov = THREE.MathUtils.clamp(
        cameraRef.current.fov,
        10,
        100,
      );
      cameraRef.current.updateProjectionMatrix();
      cameraRef.current.updateMatrixWorld();
    }
  };

  // Check unmount của component cha
  useEffect(() => {
    console.log("✅ Scene Mounted");
    return () => {
      console.log("❌ Scene Unmounted (Cleanup started)");
    };
  }, []);

  return (
    <Canvas
      onWheel={(e) => handleWheel(e.nativeEvent)}
      style={{ width: "100%", height: "100%" }}
      shadows={shadows}
      gl={{ antialias: true }}
      onCreated={({ scene }) => {
        scene.background = new THREE.Color(background);
      }}
    >
      <PerfMonitor position="top-left" />
      <Model />
      <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 40, 140]} />
      <OrbitControls makeDefault target={[0, 0, 0]} />

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
  );
}

// ---------- TEST PAGE (Component chính) ----------
export default function TestPage() {
  const [mounted, setMounted] = useState(true);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      {/* Nút điều khiển Unmount */}
      <div
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          zIndex: 9999,
          background: "rgba(0,0,0,0.8)",
          padding: "20px",
          borderRadius: "8px",
          color: "white",
        }}
      >
        <h3>Memory Leak Test</h3>
        <button
          onClick={() => setMounted(!mounted)}
          style={{
            padding: "10px 20px",
            background: mounted ? "#ff4444" : "#44ff44",
            color: mounted ? "white" : "black",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "16px",
          }}
        >
          {mounted ? "UNMOUNT SCENE (Kill)" : "MOUNT SCENE"}
        </button>
        <p style={{ fontSize: "12px", marginTop: "10px", color: "#ccc" }}>
          Bật Console (F12) để xem log: <br />
          1. Xem "Zombie check" có chạy tiếp không. <br />
          2. Xem "GLPerf has been disposed" có hiện không.
        </p>
      </div>

      {mounted && <Leva collapsed={false} />}
      {mounted ? (
        <SceneContent />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#222",
            color: "#666",
          }}
        >
          <h2>Scene is Unmounted. Check Console.</h2>
        </div>
      )}
    </div>
  );
}
