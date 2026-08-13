import React from "react";
import { HeatPumpModel, HydraulicInput, HydraulicResults, SecondaryCircuit } from "../../types";

const VB_W = 1100;
const VB_H = 680;

const HP_X = 20;
const HP_Y = 310;
const HP_W = 110;
const HP_H = 130;

const PRIM_FLOW_Y = 180;
const PRIM_RET_Y = 500;
const PRIM_FLOW_X2 = 280;
const BUFFER_X = 320;
const BUFFER_W = 90;
const BUFFER_H = 280;
const BUFFER_Y = 160;
const COUPLER_Y = 200;
const MANIFOLD_X1 = 500;
const MANIFOLD_X2 = 1020;
const MANIFOLD_FLOW_Y = 120;
const MANIFOLD_RET_Y = 560;
const DHW_X = 320;
const DHW_Y = 520;
const DHW_W = 90;
const DHW_H = 130;

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

export interface HydraulicDiagramProps {
  selectedModel: HeatPumpModel | null;
  hydraulicState: HydraulicInput;
  hydraulicResults: HydraulicResults;
  theme?: "light" | "dark";
  flowTemp?: number;
}

function BallValve({ x, y, angle = 0, fg, onTop = false }: { x: number; y: number; angle?: number; fg: string; onTop?: boolean }) {
  return (
    <g transform={`translate(${x},${y}) rotate(${angle})`} style={onTop ? { filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.15))" } : {}}>
      <rect x={-8} y={-6} width={16} height={12} rx={2} fill={fg} opacity={0.95} stroke={fg} strokeWidth={1.2} />
      <line x1={-10} y1={0} x2={-6} y2={0} stroke={fg} strokeWidth={1.8} strokeLinecap="round" />
      <line x1={6} y1={0} x2={10} y2={0} stroke={fg} strokeWidth={1.8} strokeLinecap="round" />
      <polygon points="-3,-3 0,0 3,-3 0,0 -3,3 0,0 3,3" fill="none" stroke="#fff" strokeWidth={1.5} opacity={0.7} />
    </g>
  );
}

function CheckValve({ x, y, fg, dir = "right" }: { x: number; y: number; fg: string; dir?: "right" | "left" | "up" | "down" }) {
  const rot = dir === "right" ? 0 : dir === "left" ? 180 : dir === "up" ? -90 : 90;
  return (
    <g transform={`translate(${x},${y}) rotate(${rot})`}>
      <line x1={-8} y1={0} x2={8} y2={0} stroke={fg} strokeWidth={1.5} />
      <polygon points="-3,-4 4,0 -3,4" fill={fg} />
      <line x1={-8} y1={0} x2={-10} y2={0} stroke={fg} strokeWidth={1.5} strokeLinecap="round" />
      <line x1={8} y1={0} x2={10} y2={0} stroke={fg} strokeWidth={1.5} strokeLinecap="round" />
    </g>
  );
}

function SafetyValve({ x, y, fg, pressureBar }: { x: number; y: number; fg: string; pressureBar: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <circle cx={0} cy={0} r={7} fill="none" stroke="#f59e0b" strokeWidth={1.5} />
      <circle cx={0} cy={0} r={4} fill="none" stroke="#f59e0b" strokeWidth={0.8} strokeDasharray="3,2" />
      <line x1={-3} y1={-3} x2={3} y2={3} stroke="#f59e0b" strokeWidth={1.2} />
      <line x1={3} y1={-3} x2={-3} y2={3} stroke="#f59e0b" strokeWidth={1.2} />
      <line x1={0} y1={0} x2={0} y2={10} stroke="#f59e0b" strokeWidth={1} />
      <line x1={-4} y1={10} x2={4} y2={10} stroke="#f59e0b" strokeWidth={1} />
      <text x={0} y={18} fill={fg} fontSize="5" textAnchor="middle" fontWeight="bold">{pressureBar} bar</text>
    </g>
  );
}

function AirVent({ x, y, fg }: { x: number; y: number; fg: string }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <circle cx={0} cy={0} r={6} fill="none" stroke={fg} strokeWidth={1.2} />
      <line x1={0} y1={-5} x2={0} y2={5} stroke={fg} strokeWidth={1.2} />
      <circle cx={0} cy={5} r={1.5} fill={fg} />
      <text x={0} y={14} fill={fg} fontSize="5" textAnchor="middle">Lég</text>
    </g>
  );
}

function ExpansionVessel({ x, y, fg, liters, p0, pe }: { x: number; y: number; fg: string; liters: number; p0: number; pe: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx={0} cy={0} rx={14} ry={10} fill="none" stroke={fg} strokeWidth={1.5} />
      <ellipse cx={0} cy={0} rx={10} ry={6} fill="none" stroke={fg} strokeWidth={0.6} strokeDasharray="3,2" />
      <line x1={-14} y1={0} x2={-18} y2={0} stroke={fg} strokeWidth={1.5} strokeLinecap="round" />
      <line x1={14} y1={0} x2={18} y2={0} stroke={fg} strokeWidth={1.5} strokeLinecap="round" />
      <text x={0} y={17} fill={fg} fontSize="6" textAnchor="middle" fontWeight="bold">{liters} L</text>
      <text x={0} y={24} fill={fg} fontSize="4.5" textAnchor="middle">p₀={p0} / pₑ={pe} bar</text>
    </g>
  );
}

function PressureGauge({ x, y, fg }: { x: number; y: number; fg: string }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <circle cx={0} cy={0} r={7} fill="#0f172a" stroke={fg} strokeWidth={1.2} />
      <path d="M-5,0 Q0,-5 5,0 Q0,5 -5,0" fill="none" stroke="#22c55e" strokeWidth={1.2} />
      <circle cx={0} cy={0} r={3.5} fill="none" stroke="#22c55e" strokeWidth={0.8} />
      <text x={0} y={13} fill={fg} fontSize="4.5" textAnchor="middle">kPa</text>
    </g>
  );
}

function YFilter({ x, y, fg, angle = 0 }: { x: number; y: number; fg: string; angle?: number }) {
  return (
    <g transform={`translate(${x},${y}) rotate(${angle})`}>
      <path d="M-9,-4 L9,-4 L0,3 Z" fill="none" stroke={fg} strokeWidth={1.5} />
      <line x1={-9} y1={-4} x2={9} y2={-4} stroke={fg} strokeWidth={1.8} />
      <line x1={-9} y1={-4} x2={-11} y2={-4} stroke={fg} strokeWidth={1.5} strokeLinecap="round" />
      <line x1={9} y1={-4} x2={11} y2={-4} stroke={fg} strokeWidth={1.5} strokeLinecap="round" />
    </g>
  );
}

function Pump({ x, y, fg, label = "Szivattyú" }: { x: number; y: number; fg: string; label?: string }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <circle cx={0} cy={0} r={14} fill="#1e293b" stroke={fg} strokeWidth={1.5} />
      <circle cx={0} cy={0} r={9} fill="none" stroke={fg} strokeWidth={1} />
      <circle cx={0} cy={0} r={4} fill="#0f172a" stroke={fg} strokeWidth={0.8} />
      <g stroke="#64748b" strokeWidth={1.5} strokeLinecap="round">
        <line x1={-6} y1={-6} x2={6} y2={6} />
        <line x1={-6} y1={6} x2={6} y2={-6} />
      </g>
      <line x1={-14} y1={0} x2={-17} y2={0} stroke={fg} strokeWidth={1.8} strokeLinecap="round" />
      <line x1={14} y1={0} x2={17} y2={0} stroke={fg} strokeWidth={1.8} strokeLinecap="round" />
      <text x={0} y={22} fill={fg} fontSize="5.5" textAnchor="middle" fontWeight="bold">{label}</text>
    </g>
  );
}

function ThreeWayValve({ x, y, fg, position = "mixed" }: { x: number; y: number; fg: string; position?: "A" | "B" | "mixed" }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <path d="M-10,0 L10,0 M0,-10 L0,10" fill="none" stroke={fg} strokeWidth={1.8} />
      <polygon points="-4,-4 4,0 -4,4" fill={fg} />
      <circle cx={0} cy={-10} r={3} fill="none" stroke={fg} strokeWidth={1.2} />
      <circle cx={0} cy={10} r={3} fill="none" stroke={fg} strokeWidth={1.2} />
      <circle cx={-10} cy={0} r={3} fill="none" stroke={fg} strokeWidth={1.2} />
      <circle cx={10} cy={0} r={3} fill="none" stroke={fg} strokeWidth={1.2} />
      <text x={0} y={22} fill={fg} fontSize="5" textAnchor="middle">3WV</text>
    </g>
  );
}

function HeatExchanger({ x, y, w, h, fg, label, area }: { x: number; y: number; w: number; h: number; fg: string; label: string; area?: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={-w/2} y={-h/2} width={w} height={h} rx={4} fill="none" stroke={fg} strokeWidth={1.5} />
      <rect x={-w/2} y={-h/2} width={w} height={h} rx={2} fill="none" stroke={fg} strokeWidth={0.5} strokeDasharray="4,3" />
      {[...Array(6)].map((_, i) => (
        <line key={i} x1={-w/2 + 6} y1={-h/2 + 10 + i * (h - 20) / 5} x2={w/2 - 6} y2={-h/2 + 10 + i * (h - 20) / 5} stroke={fg} strokeWidth={0.8} strokeDasharray="2,2" />
      ))}
      <text x={0} y={-h/2 - 6} fill={fg} fontSize="6.5" textAnchor="middle" fontWeight="bold">{label}</text>
      {area && <text x={0} y={h/2 + 14} fill={fg} fontSize="5" textAnchor="middle">{area.toFixed(2)} m²</text>}
    </g>
  );
}

function BufferTank({ x, y, w, h, fg, label, volume, temp }: { x: number; y: number; w: number; h: number; fg: string; label: string; volume: number; temp?: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={-w/2} y={-h/2} width={w} height={h} rx={6} fill="none" stroke={fg} strokeWidth={2} />
      <ellipse cx={0} cy={-h/2} rx={w/2} ry={6} fill="none" stroke={fg} strokeWidth={2} />
      <ellipse cx={0} cy={h/2} rx={w/2} ry={6} fill="none" stroke={fg} strokeWidth={2} />
      <line x1={-w/2 + 4} y1={-h/2 + 20} x2={w/2 - 4} y2={-h/2 + 20} stroke={fg} strokeWidth={0.8} strokeDasharray="4,3" />
      <line x1={-w/2 + 4} y1={h/2 - 20} x2={w/2 - 4} y2={h/2 - 20} stroke={fg} strokeWidth={0.8} strokeDasharray="4,3" />
      <text x={0} y={-h/2 - 10} fill={fg} fontSize="7" textAnchor="middle" fontWeight="bold">{label}</text>
      <text x={0} y={h/2 + 18} fill={fg} fontSize="6" textAnchor="middle" fontWeight="bold">{volume} L</text>
      {temp && <text x={0} y={h/2 + 28} fill={fg} fontSize="5.5" textAnchor="middle">~{temp}°C</text>}
    </g>
  );
}

function DHWTank({ x, y, w, h, fg, label, volume, coilArea, temp }: { x: number; y: number; w: number; h: number; fg: string; label: string; volume: number; coilArea?: number; temp?: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={-w/2} y={-h/2} width={w} height={h} rx={8} fill="none" stroke={fg} strokeWidth={2} />
      <ellipse cx={0} cy={-h/2} rx={w/2} ry={8} fill="none" stroke={fg} strokeWidth={2} />
      <ellipse cx={0} cy={h/2} rx={w/2} ry={8} fill="none" stroke={fg} strokeWidth={2} />
      <path d={`M${-w/2 + 4},${-h/2 + 12} Q0,${-h/2 + 2} ${w/2 - 4},${-h/2 + 12}`} fill="none" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="3,2" />
      <text x={0} y={-h/2 - 10} fill={fg} fontSize="7" textAnchor="middle" fontWeight="bold">{label}</text>
      <text x={0} y={h/2 + 18} fill={fg} fontSize="6" textAnchor="middle" fontWeight="bold">{volume} L</text>
      {coilArea && <text x={0} y={h/2 + 28} fill="#ef4444" fontSize="5" textAnchor="middle">Cső: {coilArea.toFixed(2)} m²</text>}
      {temp && <text x={0} y={h/2 + 38} fill={fg} fontSize="5.5" textAnchor="middle">~{temp}°C</text>}
    </g>
  );
}

function Pipe({ x1, y1, x2, y2, color, width = 2.5, dash, label, labelPos = 0.5 }: { x1: number; y1: number; x2: number; y2: number; color: string; width?: number; dash?: string; label?: string; labelPos?: number }) {
  return (
    <g>
      <path d={`M${x1},${y1} L${x2},${y2}`} stroke={color} strokeWidth={width} fill="none" strokeLinecap="round" strokeDasharray={dash} />
      {label && (
        <text
          x={x1 + (x2 - x1) * labelPos}
          y={y1 + (y2 - y1) * labelPos - 8}
          fill={color}
          fontSize="5.5"
          textAnchor="middle"
          fontWeight="bold"
          stroke="#fff"
          strokeWidth="2"
          paintOrder="stroke"
        >
          {label}
        </text>
      )}
    </g>
  );
}

function Arrow({ x, y, angle, color, size = 6 }: { x: number; y: number; angle: number; color: string; size?: number }) {
  return (
    <g transform={`translate(${x},${y}) rotate(${angle})`}>
      <polygon points={`0,0 ${-size},${-size/2} ${-size},${size/2}`} fill={color} />
    </g>
  );
}

function TempLabel({ x, y, temp, color, sub }: { x: number; y: number; temp: number; color: string; sub?: string }) {
  return (
    <g>
      <text x={x} y={y} fill={color} fontSize="6.5" textAnchor="middle" fontWeight="bold" stroke="#fff" strokeWidth="2" paintOrder="stroke">
        {temp.toFixed(0)}°C
      </text>
      {sub && <text x={x} y={y + 10} fill={color} fontSize="5" textAnchor="middle">{sub}</text>}
    </g>
  );
}

function FlowLabel({ x, y, flow, color }: { x: number; y: number; flow: number; color: string }) {
  return (
    <text x={x} y={y} fill={color} fontSize="5.5" textAnchor="middle" fontWeight="bold" stroke="#fff" strokeWidth="2" paintOrder="stroke">
      {flow.toFixed(1)} L/perc
    </text>
  );
}

function Legend({ x, y, items, fg, bg }: { x: number; y: number; items: Array<{ color: string; label: string; width?: number; dash?: string }>; fg: string; bg: string }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={-6} y={-6} width={160} height={items.length * 18 + 12} rx={4} fill={bg} stroke={fg} strokeWidth={1} opacity={0.95} />
      <text x={4} y={6} fill={fg} fontSize="6.5" fontWeight="bold">Jelmagyarázat</text>
      {items.map((item, i) => (
        <g key={i} transform={`translate(8, ${20 + i * 18})`}>
          <line x1={0} y1={4} x2={item.width || 30} y2={4} stroke={item.color} strokeWidth={2.5} strokeDasharray={item.dash} strokeLinecap="round" />
          <text x={40} y={8} fill={fg} fontSize="5.5">{item.label}</text>
        </g>
      ))}
    </g>
  );
}

export function HydraulicDiagram({ selectedModel, hydraulicState, hydraulicResults, theme = "light", flowTemp = 55 }: HydraulicDiagramProps) {
  const isDark = theme === "dark";
  const fg = isDark ? "#e2e8f0" : "#1e293b";
  const subFg = isDark ? "#94a3b8" : "#64748b";
  const bg = isDark ? "#0f172a" : "#f8fafc";
  const gridColor = isDark ? "#1e293b" : "#e2e8f0";
  const PRIM_COLOR = "#ef4444";
  const PRIM_RET_COLOR = "#3b82f6";
  const SEC_COLOR = "#22c55e";
  const SEC_RET_COLOR = "#16a34a";
  const DHW_COLOR = "#f97316";
  const DHW_RET_COLOR = "#ea580c";

  const r = hydraulicResults;
  const s = hydraulicState;
  const circuits = s.secondaryCircuits ?? [];
  const isHX = s.includeHeatExchanger;
  const hasDhw = s.includeDhwTank;
  const bufferVol = s.bufferVolumeL || 60;

  const N = Math.min(circuits.length, 4);
  const BRANCH_X1 = MANIFOLD_X1 + 50;
  const BRANCH_X2 = MANIFOLD_X2 - 40;
  const branchSpacing = N > 1 ? (BRANCH_X2 - BRANCH_X1) / (N - 1) : 0;
  const branchXs = Array.from({ length: N }, (_, i) =>
    N === 1 ? (BRANCH_X1 + BRANCH_X2) / 2 : BRANCH_X1 + i * branchSpacing
  );

  const primaryFlow = r.primaryFlowRateLh > 0 ? r.primaryFlowRateLh / 60 : 0;
  const primaryRetTemp = r.primaryReturnTempC ?? (flowTemp - s.primaryDeltaT);
  const secFlowTotal = r.secondaryFlowRateLh > 0 ? r.secondaryFlowRateLh / 60 : 0;
  const secFlowPerCircuit = circuits.length > 0 ? secFlowTotal / circuits.length : 0;

  const dhwFlow = hasDhw ? primaryFlow * 0.3 : 0;
  const dhwTemp = 55;

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className="w-full h-auto select-none"
      style={{ minHeight: 420, background: bg }}
    >
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="none" stroke={gridColor} strokeWidth="0.4" />
        </pattern>
        <marker id="arrowF" markerWidth="8" markerHeight="6" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L8,3 L0,6 Z" fill="currentColor" />
        </marker>
        <marker id="arrowR" markerWidth="8" markerHeight="6" refX="2" refY="3" orient="auto" markerUnits="strokeWidth">
          <path d="M8,0 L0,3 L8,6 Z" fill="currentColor" />
        </marker>
      </defs>

      <rect width={VB_W} height={VB_H} fill={`url(#grid)`} />

      {/* ── Zone backgrounds ── */}
      <rect x={0} y={0} width={BUFFER_X + BUFFER_W/2 + 40} height={VB_H} fill={isDark ? "#1e293b" : "#fef3f2"} opacity={0.15} />
      <rect x={MANIFOLD_X1 - 30} y={0} width={VB_W - MANIFOLD_X1 + 30} height={VB_H} fill={isDark ? "#1e3a2e" : "#f0fdf4"} opacity={0.12} />
      <rect x={DHW_X - DHW_W/2 - 20} y={DHW_Y - DHW_H/2 - 20} width={DHW_W + 40} height={DHW_H + 40} fill={isDark ? "#3a2a1e" : "#fff7ed"} opacity={0.15} />

      {/* Zone labels */}
      <text x={60} y={24} fill={PRIM_COLOR} fontSize="7.5" fontWeight="bold" opacity={0.8}>PRIMER KÖR (HŐSZIVATTYÚ)</text>
      <text x={MANIFOLD_X1 + 20} y={24} fill={SEC_COLOR} fontSize="7.5" fontWeight="bold" opacity={0.8}>SZEKUNDER KÖR (HŐLEADÓK)</text>
      {hasDhw && <text x={DHW_X} y={DHW_Y - DHW_H/2 - 26} fill={DHW_COLOR} fontSize="7.5" fontWeight="bold" textAnchor="middle" opacity={0.8}>HASZNOS VÍZ (HMV)</text>}

      {/* ── PIPES ── */}

      {/* HP → Buffer primary flow */}
      <Pipe
        x1={HP_X + 110} y1={flowTemp - 5 > 35 ? 320 : 340}
        x2={BUFFER_X - BUFFER_W/2} y2={COUPLER_Y}
        color={PRIM_COLOR} width={3} label={`${primaryFlow.toFixed(1)} L/perc`}
      />
      <Arrow x={BUFFER_X - BUFFER_W/2 - 10} y={COUPLER_Y} angle={0} color={PRIM_COLOR} size={7} />

      {/* HP ← Buffer primary return */}
      <Pipe
        x1={BUFFER_X - BUFFER_W/2} y1={COUPLER_Y + BUFFER_H * 0.35}
        x2={HP_X + 110} y2={flowTemp - 5 > 35 ? 340 : 360}
        color={PRIM_RET_COLOR} width={3}
      />
      <Arrow x={HP_X + 120} y={flowTemp - 5 > 35 ? 340 : 360} angle={180} color={PRIM_RET_COLOR} size={7} />

      {/* HP primary flow temp label */}
      <TempLabel x={HP_X + 55} y={310} temp={flowTemp} color={PRIM_COLOR} sub="HP kimenet" />

      {/* HP primary return temp label */}
      <TempLabel x={HP_X + 55} y={390} temp={primaryRetTemp} color={PRIM_RET_COLOR} sub="HP visszatérő" />

      {/* ── HEAT PUMP UNIT ── */}
      <g transform={`translate(${HP_X},${310})`}>
        <rect x={0} y={0} width={110} height={130} rx={8} fill={isDark ? "#1e293b" : "#f8fafc"} stroke={fg} strokeWidth={2} />
        <circle cx={55} cy={50} r={28} fill="none" stroke={PRIM_COLOR} strokeWidth={1.5} />
        <circle cx={55} cy={50} r={20} fill="none" stroke={subFg} strokeWidth={1} strokeDasharray="4,3" />
        {[0, 45, 90, 135].map(a => (
          <line key={a}
            x1={55 + 18 * Math.cos(a * Math.PI/180)} y1={50 + 18 * Math.sin(a * Math.PI/180)}
            x2={55 - 18 * Math.cos(a * Math.PI/180)} y2={50 - 18 * Math.sin(a * Math.PI/180)}
            stroke={PRIM_COLOR} strokeWidth={1.2}
          />
        ))}
        <circle cx={55} cy={50} r={5} fill="none" stroke={PRIM_COLOR} strokeWidth={1.5} />
        <rect x={10} y={96} width={90} height={20} rx={3} fill={isDark ? "#0f172a" : "#e2e8f0"} stroke={fg} strokeWidth={1} />
        <text x={55} y={109} fill="#22c55e" fontSize="6" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
          {selectedModel ? `${selectedModel.name?.substring(0,14)} ${selectedModel.capacityA7W35}kW` : "R290 MONOBLOKK"}
        </text>
        <text x={55} y={128} fill={fg} fontSize="9" fontWeight="bold" textAnchor="middle">HŐSZIVATTYÚ</text>
        <text x={55} y={140} fill={subFg} fontSize="6" textAnchor="middle">R290 monoblokk</text>

        <line x1={75} y1={130} x2={75} y2={160} stroke={PRIM_COLOR} strokeWidth={3} strokeLinecap="round" />
        <line x1={90} y1={130} x2={90} y2={180} stroke={PRIM_RET_COLOR} strokeWidth={3} strokeLinecap="round" />
        <text x={75} y={172} fill={PRIM_COLOR} fontSize="4.5" textAnchor="middle">Elő</text>
        <text x={90} y={192} fill={PRIM_RET_COLOR} fontSize="4.5" textAnchor="middle">Vissza</text>
      </g>

      {/* HP connection pipes out of unit */}
      <Pipe x1={HP_X + 110} y1={320} x2={HP_X + 110 + 30} y2={320} color={PRIM_COLOR} width={3} />
      <Pipe x1={HP_X + 110} y1={340} x2={HP_X + 110 + 30} y2={340} color={PRIM_RET_COLOR} width={3} />

      {/* Flow arrows on HP outlet pipes */}
      <Arrow x={HP_X + 155} y={320} angle={0} color={PRIM_COLOR} size={6} />
      <Arrow x={HP_X + 155} y={340} angle={180} color={PRIM_RET_COLOR} size={6} />

      {/* Temp labels near HP */}
      <TempLabel x={HP_X + 130} y={315} temp={flowTemp} color={PRIM_COLOR} />
      <TempLabel x={HP_X + 130} y={345} temp={primaryRetTemp} color={PRIM_RET_COLOR} />

      {/* ── BUFFER / HYDRAULIC SEPARATOR ── */}
      <BufferTank
        x={BUFFER_X}
        y={BUFFER_Y + BUFFER_H/2}
        w={BUFFER_W}
        h={BUFFER_H}
        fg={fg}
        label={isHX ? "HŐCSERÉLŐ" : "PUFFER / HIDRAULIKAI SZEPARÁTOR"}
        volume={isHX ? 0 : bufferVol}
        temp={flowTemp - (isHX ? 5 : 2)}
      />

      {/* Buffer connections: primary flow in (top left) */}
      <Pipe
        x1={BUFFER_X - BUFFER_W/2} y1={COUPLER_Y}
        x2={BUFFER_X - BUFFER_W/2 - 10} y2={COUPLER_Y}
        color={PRIM_COLOR} width={3}
      />
      <Arrow x={BUFFER_X - BUFFER_W/2 - 15} y={COUPLER_Y} angle={180} color={PRIM_COLOR} size={6} />

      {/* Buffer: primary return out (bottom left) */}
      <Pipe
        x1={BUFFER_X - BUFFER_W/2} y1={COUPLER_Y + BUFFER_H * 0.35}
        x2={BUFFER_X - BUFFER_W/2 - 10} y2={COUPLER_Y + BUFFER_H * 0.35}
        color={PRIM_RET_COLOR} width={3}
      />
      <Arrow x={BUFFER_X - BUFFER_W/2 - 15} y={COUPLER_Y + BUFFER_H * 0.35} angle={0} color={PRIM_RET_COLOR} size={6} />

      {/* Buffer: secondary flow out (top right) */}
      <Pipe
        x1={BUFFER_X + BUFFER_W/2} y1={MANIFOLD_FLOW_Y + 30}
        x2={BUFFER_X + BUFFER_W/2 + 30} y2={MANIFOLD_FLOW_Y + 30}
        color={SEC_COLOR} width={3} label={`${secFlowTotal.toFixed(1)} L/perc`}
      />
      <Arrow x={BUFFER_X + BUFFER_W/2 + 40} y={MANIFOLD_FLOW_Y + 30} angle={0} color={SEC_COLOR} size={7} />

      {/* Buffer: secondary return in (bottom right) */}
      <Pipe
        x1={BUFFER_X + BUFFER_W/2} y1={MANIFOLD_RET_Y - 30}
        x2={BUFFER_X + BUFFER_W/2 + 30} y2={MANIFOLD_RET_Y - 30}
        color={SEC_RET_COLOR} width={3}
      />
      <Arrow x={BUFFER_X + BUFFER_W/2 + 40} y={MANIFOLD_RET_Y - 30} angle={180} color={SEC_RET_COLOR} size={7} />

      {/* Temp labels at buffer connections */}
      <TempLabel x={BUFFER_X - BUFFER_W/2 - 30} y={COUPLER_Y - 8} temp={flowTemp} color={PRIM_COLOR} sub="Primer elő" />
      <TempLabel x={BUFFER_X - BUFFER_W/2 - 30} y={COUPLER_Y + BUFFER_H * 0.35 + 8} temp={primaryRetTemp} color={PRIM_RET_COLOR} sub="Primer vissza" />
      <TempLabel x={BUFFER_X + BUFFER_W/2 + 55} y={MANIFOLD_FLOW_Y + 20} temp={flowTemp - (isHX ? 5 : 2)} color={SEC_COLOR} sub="Szek. elő" />
      <TempLabel x={BUFFER_X + BUFFER_W/2 + 55} y={MANIFOLD_RET_Y - 40} temp={flowTemp - (isHX ? 5 : 2) - 5} color={SEC_RET_COLOR} sub="Szek. vissza" />

      {/* Expansion vessel on primary */}
      <ExpansionVessel
        x={BUFFER_X - BUFFER_W/2 - 70}
        y={COUPLER_Y - 60}
        fg={fg}
        liters={r.primaryVesselSizeL || 12}
        p0={r.prechargeCalculated || 0.8}
        pe={r.finalCalculated || 1.5}
      />
      <Pipe
        x1={BUFFER_X - BUFFER_W/2 - 70} y1={COUPLER_Y - 60 - 14}
        x2={BUFFER_X - BUFFER_W/2 - 10} y2={COUPLER_Y - 60 - 14}
        color={subFg} width={1.5} dash="4,2"
      />
      <Pipe
        x1={BUFFER_X - BUFFER_W/2 - 10} y1={COUPLER_Y - 60 - 14}
        x2={BUFFER_X - BUFFER_W/2 - 10} y2={COUPLER_Y}
        color={subFg} width={1.5} dash="4,2"
      />

      {/* Safety valve on primary */}
      <SafetyValve x={BUFFER_X - BUFFER_W/2 - 70} y={COUPLER_Y + 90} fg={fg} pressureBar={s.safetyValvePressure || 3} />
      <AirVent x={BUFFER_X - BUFFER_W/2 - 70} y={COUPLER_Y - 90} fg={fg} />

      {/* Y-filter on primary return before HP */}
      <YFilter x={HP_X + 110 + 30} y={flowTemp - 5 > 35 ? 350 : 370} fg={fg} angle={90} />
      <Pipe x1={HP_X + 110 + 30} y1={flowTemp - 5 > 35 ? 350 : 370 - 12} x2={HP_X + 110 + 30} y2={flowTemp - 5 > 35 ? 350 : 370} color={PRIM_RET_COLOR} width={1.5} dash="4,2" />

      {/* ── DHW CIRCUIT ── */}
      {hasDhw && (
        <>
          {/* 3-way valve on primary flow before buffer */}
          <ThreeWayValve x={HP_X + 110 + 80} y={320} fg={fg} position="mixed" />
          <text x={HP_X + 110 + 80} y={310} fill={fg} fontSize="5" textAnchor="middle">3WV</text>

          {/* DHW tank */}
          <DHWTank
            x={DHW_X}
            y={DHW_Y}
            w={DHW_W}
            h={DHW_H}
            fg={fg}
            label="HMV TARTÁLY"
            volume={150}
            coilArea={1.8}
            temp={dhwTemp}
          />

          {/* DHW connections */}
          <Pipe x1={HP_X + 110 + 105} y1={320} x2={DHW_X - DHW_W/2} y2={DHW_Y - DHW_H/2 + 20} color={DHW_COLOR} width={2.5} />
          <Arrow x={DHW_X - DHW_W/2 - 5} y={DHW_Y - DHW_H/2 + 20} angle={180} color={DHW_COLOR} size={6} />
          <Pipe x1={DHW_X - DHW_W/2} y1={DHW_Y + DHW_H/2 - 20} x2={HP_X + 110 + 105} y2={340} color={DHW_RET_COLOR} width={2.5} />
          <Arrow x={HP_X + 110 + 105} y={340} angle={0} color={DHW_RET_COLOR} size={6} />

          <TempLabel x={DHW_X} y={DHW_Y - DHW_H/2 - 10} temp={dhwTemp} color={DHW_COLOR} sub="HMV cél" />
          <TempLabel x={DHW_X} y={DHW_Y + DHW_H/2 + 28} temp={dhwTemp - 5} color={DHW_RET_COLOR} sub="HMV visszatérő" />
        </>
      )}

      {/* ── SECONDARY MANIFOLD ── */}
      <g transform={`translate(${MANIFOLD_X1},${MANIFOLD_FLOW_Y})`}>
        <rect x={0} y={0} width={MANIFOLD_X2 - MANIFOLD_X1} height={20} rx={4} fill={SEC_COLOR} opacity={0.2} stroke={SEC_COLOR} strokeWidth={1.5} />
        <text x={(MANIFOLD_X2 - MANIFOLD_X1)/2} y={-6} fill={SEC_COLOR} fontSize="6.5" textAnchor="middle" fontWeight="bold">ELŐREMENŐ OSZTÓ</text>
        <text x={(MANIFOLD_X2 - MANIFOLD_X1)/2} y={26} fill={subFg} fontSize="5.5" textAnchor="middle">Σ {secFlowTotal.toFixed(1)} L/perc</text>
      </g>

      <g transform={`translate(${MANIFOLD_X1},${MANIFOLD_RET_Y})`}>
        <rect x={0} y={0} width={MANIFOLD_X2 - MANIFOLD_X1} height={20} rx={4} fill={SEC_RET_COLOR} opacity={0.2} stroke={SEC_RET_COLOR} strokeWidth={1.5} />
        <text x={(MANIFOLD_X2 - MANIFOLD_X1)/2} y={-6} fill={SEC_RET_COLOR} fontSize="6.5" textAnchor="middle" fontWeight="bold">VISSZATÉRŐ OSZTÓ</text>
        <text x={(MANIFOLD_X2 - MANIFOLD_X1)/2} y={26} fill={subFg} fontSize="5.5" textAnchor="middle">Σ {secFlowTotal.toFixed(1)} L/perc</text>
      </g>

      {/* Vertical connectors from buffer to manifold */}
      <Pipe x1={BUFFER_X + BUFFER_W/2 + 30} y1={MANIFOLD_FLOW_Y + 30} x2={MANIFOLD_X1} y2={MANIFOLD_FLOW_Y + 10} color={SEC_COLOR} width={3} />
      <Pipe x1={BUFFER_X + BUFFER_W/2 + 30} y1={MANIFOLD_RET_Y - 30} x2={MANIFOLD_X1} y2={MANIFOLD_RET_Y + 10} color={SEC_RET_COLOR} width={3} />
      <Arrow x={MANIFOLD_X1 - 10} y={MANIFOLD_FLOW_Y + 10} angle={180} color={SEC_COLOR} size={7} />
      <Arrow x={MANIFOLD_X1 - 10} y={MANIFOLD_RET_Y + 10} angle={0} color={SEC_RET_COLOR} size={7} />

      {/* ── SECONDARY CIRCUITS ── */}
      {circuits.slice(0, 4).map((circuit, i) => {
        const bx = branchXs[i];
        const flow = secFlowPerCircuit;
        const circuitRetTemp = circuit.flowTempC ? circuit.flowTempC - 5 : (flowTemp - 5);
        const isMixed = circuit.isMixed || circuit.type === 'fan_coil';
        const typeLabel = circuit.type === 'floor' ? 'PADLÓ' : circuit.type === 'radiators' ? 'RADIÁTOR' : 'FAN-COIL';
        const typeColor = circuit.type === 'floor' ? '#06b6d4' : circuit.type === 'radiators' ? '#f59e0b' : '#a855f7';

        return (
          <g key={i} transform={`translate(${bx},${MANIFOLD_FLOW_Y + 50})`}>
            {/* Flow branch from manifold */}
            <Pipe x1={0} y1={0} x2={0} y2={50} color={SEC_COLOR} width={2} />
            <BallValve x={0} y={15} fg={fg} />
            <YFilter x={0} y={25} fg={fg} />
            <Pump x={0} y={45} fg={SEC_COLOR} label={isMixed ? "Keverő" : "Kering."} />

            {/* Flow temp label */}
            <TempLabel x={-25} y={35} temp={circuit.flowTempC || flowTemp - 2} color={SEC_COLOR} />

            {/* Emitter */}
            <g transform={`translate(0,${65})`}>
              {circuit.type === 'floor' ? (
                <>
                  <rect x={-28} y={0} width={56} height={20} rx={2} fill="none" stroke={typeColor} strokeWidth={2} />
                  {[...Array(4)].map((_, j) => (
                    <line key={j} x1={-24 + j * 12} y1={0} x2={-24 + j * 12} y2={20} stroke={typeColor} strokeWidth={1.5} strokeDasharray="3,2" />
                  ))}
                  <text x={0} y={-8} fill={typeColor} fontSize="6.5" textAnchor="middle" fontWeight="bold">{typeLabel}</text>
                  <text x={0} y={32} fill={fg} fontSize="5" textAnchor="middle">{flow.toFixed(1)} L/perc / ág</text>
                </>
              ) : circuit.type === 'radiators' ? (
                <>
                  <rect x={-35} y={0} width={70} height={18} rx={2} fill={isDark ? "#1e293b" : "#fef3f2"} stroke={typeColor} strokeWidth={2} />
                  {[...Array(3)].map((_, j) => (
                    <g key={j} transform={`translate(${j * 22 - 22}, 2)`}>
                      <rect x={-6} y={0} width={12} height={14} rx={1} fill="none" stroke={typeColor} strokeWidth={1.5} />
                      <line x1={0} y1={0} x2={0} y2={14} stroke={typeColor} strokeWidth={0.8} strokeDasharray="2,2" />
                    </g>
                  ))}
                  <text x={0} y={-8} fill={typeColor} fontSize="6.5" textAnchor="middle" fontWeight="bold">{typeLabel}</text>
                  <text x={0} y={30} fill={fg} fontSize="5" textAnchor="middle">{flow.toFixed(1)} L/perc</text>
                </>
              ) : (
                <>
                  <rect x={-30} y={0} width={60} height={20} rx={3} fill="none" stroke={typeColor} strokeWidth={2} />
                  <circle cx={0} cy={10} r={8} fill="none" stroke={typeColor} strokeWidth={1.5} />
                  <circle cx={0} cy={10} r={4} fill="none" stroke={typeColor} strokeWidth={1} strokeDasharray="4,3" />
                  <path d="M-4,-4 Q4,-6 4,0 Q4,6 -4,4" fill="none" stroke={typeColor} strokeWidth={1.2} />
                  <text x={0} y={-8} fill={typeColor} fontSize="6.5" textAnchor="middle" fontWeight="bold">{typeLabel}</text>
                  <text x={0} y={32} fill={fg} fontSize="5" textAnchor="middle">{flow.toFixed(1)} L/perc</text>
                </>
              )}
            </g>

            {/* Return branch */}
            <Pipe x1={0} y1={95} x2={0} y2={130} color={SEC_RET_COLOR} width={2} />
            <BallValve x={0} y={100} fg={fg} />
            <YFilter x={0} y={110} fg={fg} />
            <PressureGauge x={25} y={105} fg={fg} />
            <Pipe x1={0} y1={130} x2={MANIFOLD_X1 - bx} y2={130} color={SEC_RET_COLOR} width={2} />
            <Arrow x={MANIFOLD_X1 - bx - 10} y={130} angle={180} color={SEC_RET_COLOR} size={6} />

            {/* Return temp label */}
            <TempLabel x={-25} y={110} temp={circuitRetTemp} color={SEC_RET_COLOR} sub={isMixed ? "kevert" : undefined} />

            {/* Circuit type badge */}
            <text x={0} y={-20} fill={typeColor} fontSize="5.5" textAnchor="middle" fontWeight="bold">{typeLabel}</text>
          </g>
        );
      })}

      {/* ── LEGEND ── */}
      <Legend
        x={VB_W - 180}
        y={VB_H - 120}
        fg={fg}
        bg={bg}
        items={[
          { color: PRIM_COLOR, label: "Primer előremenő", width: 25 },
          { color: PRIM_RET_COLOR, label: "Primer visszatérő", width: 25 },
          { color: SEC_COLOR, label: "Szekunder előremenő", width: 25 },
          { color: SEC_RET_COLOR, label: "Szekunder visszatérő", width: 25 },
          { color: DHW_COLOR, label: "HMV előremenő", width: 25 },
          { color: DHW_RET_COLOR, label: "HMV visszatérő", width: 25 },
          { color: fg, label: "Szivattyú", dash: "2,2" },
          { color: fg, label: "Szelep / Szűrő", dash: "2,2" },
        ]}
      />

      {/* ── SUMMARY BOX ── */}
      <g transform={`translate(20, ${VB_H - 110})`}>
        <rect x={0} y={0} width={280} height={100} rx={6} fill={isDark ? "#1e293b" : "#f8fafc"} stroke={fg} strokeWidth={1} opacity={0.95} />
        <text x={10} y={14} fill={fg} fontSize="6.5" fontWeight="bold">ÖSSZEFOGLALÓ</text>
        <text x={10} y={28} fill={subFg} fontSize="5">{isHX ? "Hőcserélős" : "Direkt pufferes"} rendszer · {s.couplingType === 'bivalent' ? "Biválens (HP+kazán)" : s.couplingType === 'low-loss-header' ? "Hidraulikus váltó" : s.couplingType === 'direct' ? "Direkt (auto-bypass)" : "Puffer + HMV"}</text>
        <text x={10} y={40} fill={subFg} fontSize="5">ΔT primer: {s.primaryDeltaT}°C · ΔT szekunder: {s.primaryDeltaT}°C</text>
        <text x={10} y={52} fill={PRIM_COLOR} fontSize="5.5" fontWeight="bold">Primer: {primaryFlow.toFixed(1)} L/perc · {r.primaryPressureDropKpa} kPa esés · {r.remainingPumpHeadKpa} kPa maradék</text>
        <text x={10} y={64} fill={SEC_COLOR} fontSize="5.5" fontWeight="bold">Szekunder: {secFlowTotal.toFixed(1)} L/perc · {r.secondaryPressureDropKpa} kPa esés · {r.secondaryRemainingHeadKpa} kPa maradék</text>
        <text x={10} y={76} fill={subFg} fontSize="5">Tágulási tartály: {isHX ? r.primaryVesselSizeL + "/" + r.secondaryVesselSizeL : r.vesselSizeL} L</text>
        <text x={10} y={88} fill={subFg} fontSize="5">Segédszivattyú: {r.dabPumpModel} · {r.dabPumpSetting}</text>
      </g>
    </svg>
  );
}