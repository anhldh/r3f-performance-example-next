import React, { useEffect, useMemo, useRef, useState } from "react";
import { getPerf, usePerf } from "../store";

type Theme = { fg: string; bg: string };
const THEMES: Record<string, Theme> = {
  fps: { fg: "#00ffff", bg: "#000022" },
  cpu: { fg: "#00ff00", bg: "#002200" },
  gpu: { fg: "#ff0080", bg: "#220011" },
};

type PanelCfg = {
  key: "fps" | "cpu" | "gpu";
  label: string;
  maxVal: number;
};

const PANELS: PanelCfg[] = [
  { key: "fps", label: "FPS", maxVal: 120 },
  { key: "cpu", label: "CPU", maxVal: 40 },
  { key: "gpu", label: "GPU", maxVal: 40 },
];

const PANEL_H = 48;
const TEXT_H = 15;
const GRAPH_X = 0;
const GRAPH_Y = TEXT_H;
const GRAPH_H = PANEL_H - GRAPH_Y;
const GAP = 6;

const UPDATE_FPS = 15;
const INTERVAL = 1000 / UPDATE_FPS;

export function ChartStats({
  show = true,
  opacity = 1,
  className,
  style,
}: {
  show?: boolean;
  opacity?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const paused = usePerf((s) => s.paused);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(300);

  const dpr = useMemo(
    () => Math.max(1, Math.round(window.devicePixelRatio || 1)),
    [],
  );

  // Resize Observer
  useEffect(() => {
    if (!wrapperRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Math.floor để width chẵn, tránh vẽ pixel lẻ
        setContainerWidth(Math.floor(entry.contentRect.width));
      }
    });
    ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, []);

  // Tính toán kích thước
  const totalGap = (PANELS.length - 1) * GAP;
  const panelW = Math.max(
    0,
    Math.floor((containerWidth - totalGap) / PANELS.length),
  );
  // Graph width thực tế vẽ
  const dynamicGraphW = Math.max(0, panelW - GRAPH_X);

  // Setup Canvas & Background (Chạy khi resize/init)
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;

    // Set kích thước vật lý (Physical pixels)
    c.width = containerWidth * dpr;
    c.height = PANEL_H * dpr;
    // Set kích thước hiển thị (CSS pixels)
    c.style.width = "100%";
    c.style.height = `${PANEL_H}px`;

    const ctx = c.getContext("2d", { alpha: true }); // alpha true để gap trong suốt
    if (!ctx) return;

    // Reset transform và scale theo DPR
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    // Config font/style chung
    ctx.imageSmoothingEnabled = false;
    ctx.font = "bold 9px Menlo, Roboto Mono, monospace";
    ctx.textBaseline = "top";

    // 1. Xóa sạch canvas
    ctx.clearRect(0, 0, containerWidth, PANEL_H);

    // 2. Vẽ nền tĩnh cho từng panel
    for (let p = 0; p < PANELS.length; p++) {
      const { key } = PANELS[p];
      const ox = p * (panelW + GAP);
      const { bg } = THEMES[key];

      ctx.fillStyle = bg;
      ctx.globalAlpha = opacity;
      ctx.fillRect(ox, 0, panelW, PANEL_H);
    }
    ctx.globalAlpha = 1;
  }, [dpr, containerWidth, panelW, opacity]);

  // Render Loop (Animation)
  useEffect(() => {
    if (!show) return;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let lastTime = 0;

    // Lưu min/max cục bộ để hiển thị
    const statsCache = {
      fps: { min: 999, max: 0 },
      cpu: { min: 999, max: 0 },
      gpu: { min: 999, max: 0 },
    };

    function drawFrame(timestamp: number) {
      if (!c || !ctx) return;
      raf = requestAnimationFrame(drawFrame);
      if (paused) return;

      const delta = timestamp - lastTime;
      if (delta < INTERVAL) return;
      lastTime = timestamp - (delta % INTERVAL);

      const perf = getPerf();
      // Đảm bảo imageSmoothing luôn tắt trước khi drawImage
      ctx.imageSmoothingEnabled = false;

      for (let p = 0; p < PANELS.length; p++) {
        const { key, label, maxVal } = PANELS[p];
        const ox = p * (panelW + GAP);
        const { fg, bg } = THEMES[key];

        // Lấy giá trị mới nhất từ store
        const series = perf.chart.data[key];
        const circ = perf.chart.circularId;
        const len = series?.length || 0;
        let v = 0;

        // Lấy giá trị tại index mới nhất
        if (len > 0) {
          // circularId trỏ tới vị trí GHI tiếp theo, nên vị trí vừa ghi là -1
          const idx = (circ - 1 + len) % len;
          v = series[idx] ?? 0;
        }

        // Cập nhật min/max
        const st = statsCache[key];
        // Reset nhẹ nếu max quá cũ (tùy chọn, ở đây giữ logic đơn giản)
        if (v > 0) {
          st.min = Math.min(st.min, v);
          st.max = Math.max(st.max, v);
        }

        // --- A. GRAPH SHIFT (Cuộn biểu đồ) ---
        // Copy vùng ảnh từ (x+1) về (x)
        // Lưu ý: Source coordinate phải nhân dpr, Destination thì không (vì ctx đã scale)
        if (dynamicGraphW > 1) {
          ctx.drawImage(
            c,
            (ox + GRAPH_X + 1) * dpr,
            GRAPH_Y * dpr,
            (dynamicGraphW - 1) * dpr,
            GRAPH_H * dpr,
            ox + GRAPH_X,
            GRAPH_Y,
            dynamicGraphW - 1,
            GRAPH_H,
          );
        }

        // --- B. DRAW NEW BAR (Cột mới bên phải) ---
        const rightEdgeX = ox + GRAPH_X + dynamicGraphW - 1;

        // 1. Xóa cột cũ (vẽ đè màu nền)
        ctx.fillStyle = bg;
        ctx.fillRect(rightEdgeX, GRAPH_Y, 1, GRAPH_H);

        // 2. Vẽ cột giá trị
        ctx.fillStyle = fg;
        const ratio = Math.min(v, maxVal) / maxVal;
        const barH = Math.max(1, Math.round(ratio * GRAPH_H)); // Ít nhất cao 1px để thấy chạy

        // Vẽ từ dưới lên
        if (v > 0) {
          ctx.fillRect(rightEdgeX, GRAPH_Y + GRAPH_H - barH, 1, barH);
        }

        // --- C. TEXT HEADER (Vẽ đè lên trên cùng) ---
        // Xóa header cũ
        ctx.fillStyle = bg;
        ctx.fillRect(ox, 0, panelW, TEXT_H);

        // Vẽ text
        ctx.fillStyle = fg;
        // Format: Label: Now (Min-Max)
        // Ví dụ: FPS: 60 (55-61)
        const minStr = st.min === 999 ? 0 : Math.round(st.min);
        const maxStr = Math.round(st.max);

        ctx.fillText(`${label}`, ox + 4, 3);
        // ctx.fillText(`${label} ${vStr}`, ox + 4, 3);

        ctx.globalAlpha = 0.6;
        const infoTxt = `↓${minStr} ↑${maxStr}`;
        const txtWidth = ctx.measureText(infoTxt).width;
        if (panelW > 60) {
          ctx.fillText(infoTxt, ox + panelW - txtWidth - 2, 3);
        }
        ctx.globalAlpha = 1;
      }
    }

    raf = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(raf);
  }, [paused, show, dpr, panelW, dynamicGraphW]);

  if (!show) return null;

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={{
        width: "100%",
        marginTop: GAP,
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          pointerEvents: "none",
          width: "100%",
          height: `${PANEL_H}px`,
        }}
      />
    </div>
  );
}
