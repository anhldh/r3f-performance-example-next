"use client";

import { useMemo, useState } from "react";
import Scene from "@/components/Scene";

type Mode = "tab" | "classic";

const DEMOS: Record<Mode, { label: string; src: string; note: string }> = {
  tab: {
    label: "Tab",
    // src: "https://xhmanga.site/modelgirl.glb",
    src: "https://xhmanga.site/just_a_girl.glb",
    note: "Modern tab-based layout for structured debugging.",
  },
  classic: {
    label: "Classic",
    src: "https://xhmanga.site/just_a_girl.glb",
    note: "Compact single-panel layout for quick profiling.",
  },
};

export default function DisplayPreview() {
  const [mode, setMode] = useState<Mode>("tab");
  const current = useMemo(() => DEMOS[mode], [mode]);

  return (
    <section style={{ marginTop: 16, marginBottom: 16 }}>
      {/* control bar: xuống dòng */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          padding: "14px 16px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.03)",
          marginBottom: 12,
        }}
      >
        <div style={{ fontWeight: 650 }}>Display Mode</div>

        <div
          style={{
            display: "inline-flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() => setMode("tab")}
            style={{
              padding: "6px 12px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.10)",
              background:
                mode === "tab" ? "rgba(255,255,255,0.12)" : "transparent",
              color: "inherit",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Tab
          </button>

          <button
            type="button"
            onClick={() => setMode("classic")}
            style={{
              padding: "6px 12px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.10)",
              background:
                mode === "classic" ? "rgba(255,255,255,0.12)" : "transparent",
              color: "inherit",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Classic
          </button>
        </div>

        <div style={{ fontSize: 14, opacity: 0.75 }}>{current.note}</div>
      </div>

      {/* single canvas */}
      <Scene key={mode} type={mode} src={current.src} />
    </section>
  );
}
