"use client";

import { Canvas } from "@react-three/fiber";
import {
  Bvh,
  Environment,
  OrbitControls,
  PerspectiveCamera,
  useGLTF,
} from "@react-three/drei";
import { PerfMonitor } from "r3f-monitor";
const Model = ({ src }: { src: string }) => {
  const { scene } = useGLTF(src);

  return (
    <Bvh>
      <primitive object={scene} scale={1} position={[0, 0, 0]} />
    </Bvh>
  );
};

export default function Scene({
  type = "tab",
  src,
}: {
  type?: "tab" | "classic";
  src: string;
}) {
  if (!src) return null;
  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
        margin: "16px 0 24px",
      }}
    >
      <div
        style={{
          width: "min(100%, 980px)",
          height: 520, // bạn chỉnh tuỳ
          overflow: "hidden",
          border: "1px solid rgba(0,0,0,0.12)",
          background: "#fff",
          position: "relative",
          transform: "translateZ(0)",
          isolation: "isolate",
        }}
      >
        <Canvas
          style={{ width: "100%", height: "100%", display: "block" }}
          gl={{ antialias: true }}
        >
          <PerfMonitor displayType={type} />
          <Model src={src} />
          <PerspectiveCamera
            makeDefault
            position={[
              -23.66048018671896, 160.62939543540753, 294.62638097574813,
            ]}
          />
          <OrbitControls
            makeDefault
            target={[
              -17.80215700555211, 55.75636672802748, -19.074812079798466,
            ]}
          />
          <ambientLight intensity={0.35} />
          <Environment preset="city" />
        </Canvas>
      </div>
    </div>
  );
}
