import React from "react";

interface Cp {
  x: number;
  y: number;
  fg: string;
  size?: number;
}

export function BallValve({ x, y, fg }: Cp) {
  return (
    <g transform={`translate(${x},${y})`}>
      <circle cx="0" cy="0" r="7" fill="none" stroke={fg} strokeWidth="1.5" />
      <line x1="-5" y1="-5" x2="5" y2="5" stroke={fg} strokeWidth="1.5" />
    </g>
  );
}

export function PressureGauge({ x, y, fg }: Cp) {
  return (
    <g transform={`translate(${x},${y})`}>
      <circle cx="0" cy="0" r="7" fill="none" stroke={fg} strokeWidth="1.5" />
      <line x1="0" y1="0" x2="4" y2="-4" stroke={fg} strokeWidth="1" />
      <circle cx="0" cy="0" r="1.5" fill={fg} />
    </g>
  );
}

export function AirVent({ x, y, fg }: Cp) {
  return (
    <g transform={`translate(${x},${y})`}>
      <path d="M-4,-4 Q0,-8 4,-4" fill="none" stroke={fg} strokeWidth="1.5" />
      <line x1="0" y1="-4" x2="0" y2="3" stroke={fg} strokeWidth="1.5" />
      <circle cx="0" cy="4" r="1.5" fill={fg} />
    </g>
  );
}

export function SafetyValve({ x, y, fg, size = 1 }: Cp) {
  const s = size;
  return (
    <g transform={`translate(${x},${y})`}>
      <circle cx="0" cy="0" r={7 * s} fill="none" stroke={fg} strokeWidth="1.5" />
      <line x1={-3 * s} y1={-3 * s} x2={3 * s} y2={3 * s} stroke={fg} strokeWidth="1.5" />
      <polygon points={`${3 * s},0 ${3 * s},${8 * s} ${8 * s},${4 * s}`} fill="none" stroke={fg} strokeWidth="1" />
    </g>
  );
}

export function NonReturnValve({ x, y, fg }: Cp) {
  return (
    <g transform={`translate(${x},${y})`}>
      <line x1="-7" y1="0" x2="7" y2="0" stroke={fg} strokeWidth="1.5" />
      <polygon points="-3,-6 4,0 -3,6" fill="none" stroke={fg} strokeWidth="1.5" />
    </g>
  );
}

export function CirculatorPump({ x, y, fg }: Cp) {
  return (
    <g transform={`translate(${x},${y})`}>
      <circle cx="0" cy="0" r="12" fill="none" stroke={fg} strokeWidth="1.5" />
      <polygon points="-4,-4 4,0 -4,4" fill={fg} />
    </g>
  );
}

export function ExpansionVessel({ x, y, fg }: Cp) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x="-10" y="-16" width="20" height="32" rx="10" fill="none" stroke={fg} strokeWidth="1.5" />
      <line x1="0" y1="-16" x2="0" y2="-22" stroke={fg} strokeWidth="1.5" />
      <line x1="-8" y1="-2" x2="8" y2="-2" stroke={fg} strokeWidth="1" />
      <line x1="-8" y1="2" x2="8" y2="2" stroke={fg} strokeWidth="1" />
    </g>
  );
}

export function ThreeWayValve({ x, y, fg, size = 1 }: Cp) {
  const s = size;
  return (
    <g transform={`translate(${x},${y})`}>
      <circle cx="0" cy="0" r={8 * s} fill="none" stroke={fg} strokeWidth="1.5" />
      <line x1={-5 * s} y1="0" x2={5 * s} y2="0" stroke={fg} strokeWidth="1" />
      <line x1="0" y1="0" x2="0" y2={-5 * s} stroke={fg} strokeWidth="1" />
      <circle cx="0" cy="0" r="2" fill={fg} />
    </g>
  );
}

export function YFilter({ x, y, fg }: Cp) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x="-6" y="-10" width="12" height="20" rx="2" fill="none" stroke={fg} strokeWidth="1.5" />
      <path d="M-3,-3 L3,3 M-3,3 L3,-3" stroke={fg} strokeWidth="1" />
    </g>
  );
}

export function FlowArrow({ x, y, fg }: Cp) {
  return (
    <polygon points={`${x},${y - 4} ${x + 8},${y} ${x},${y + 4}`} fill={fg} />
  );
}

export function HeatExchanger({ x, y, fg, line1, line2 }: Cp & { line1: string; line2: string }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x="-18" y="-40" width="36" height="80" rx="4" fill="none" stroke={fg} strokeWidth="1.5" />
      <line x1="-8" y1="-35" x2="-8" y2="35" stroke={line1} strokeWidth="1" />
      <line x1="0" y1="-35" x2="0" y2="35" stroke={line2} strokeWidth="1" />
      <line x1="8" y1="-35" x2="8" y2="35" stroke={line1} strokeWidth="1" />
    </g>
  );
}

export function DhwTank({ x, y, fg, subFg, label, flowTempC, returnTempC }: Cp & { subFg: string; label: string; flowTempC: number; returnTempC: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x="0" y="0" width="80" height="150" rx="6" fill="none" stroke={fg} strokeWidth="2" />
      <text x="40" y="22" fill={fg} fontSize="8" fontWeight="bold" textAnchor="middle">HMV TÁROLÓ</text>
      <text x="40" y="33" fill={subFg} fontSize="6.5" textAnchor="middle">{label}</text>
      <path d="M 20,50 Q 60,50 60,70 Q 20,90 60,110 L 20,110" fill="none" stroke={fg} strokeWidth="1.5" strokeDasharray="3,2" />
      <text x="10" y="73" fill="#38bdf8" fontSize="5.5" fontFamily="monospace">{flowTempC}°C</text>
      <text x="10" y="120" fill="#38bdf8" fontSize="5.5" fontFamily="monospace">{returnTempC}°C</text>
    </g>
  );
}

export function HeatPump({ x, y, fg, line2, subFg, isDark, selectedModel }: Cp & { line2: string; subFg: string; isDark: boolean; selectedModel?: { name?: string; capacityA7W35?: number } | null }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x="0" y="0" width="110" height="200" rx="6" fill="none" stroke={fg} strokeWidth="2" />
      <circle cx="55" cy="60" r="32" fill="none" stroke={fg} strokeWidth="1.5" />
      <circle cx="55" cy="60" r="25" fill="none" stroke={line2} strokeWidth="1" strokeDasharray="4,3" />
      <g transform="translate(55, 60)">
        <line x1="-22" y1="0" x2="22" y2="0" stroke={fg} strokeWidth="1" />
        <line x1="0" y1="-22" x2="0" y2="22" stroke={fg} strokeWidth="1" />
        <line x1="-16" y1="-16" x2="16" y2="16" stroke={fg} strokeWidth="1" />
        <line x1="16" y1="-16" x2="-16" y2="16" stroke={fg} strokeWidth="1" />
        <circle cx="0" cy="0" r="6" fill="none" stroke={fg} strokeWidth="1.5" />
      </g>
      <rect x="15" y="110" width="80" height="20" rx="3" fill={isDark ? "#1e293b" : "#f1f5f9"} stroke={fg} strokeWidth="1" />
      <text x="55" y="123" fill={isDark ? "#22c55e" : "#16a34a"} fontSize="7" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
        {selectedModel ? `${selectedModel.name?.substring(0, 15) ?? ""} ${selectedModel.capacityA7W35}kW` : "R290 HP"}
      </text>
      <text x="55" y="148" fill={fg} fontSize="9" fontWeight="bold" textAnchor="middle">HŐSZIVATTYÚ</text>
      <text x="55" y="160" fill={subFg} fontSize="6.5" textAnchor="middle">R290 monoblokk</text>
      <line x1="70" y1="200" x2="70" y2="240" stroke={fg} strokeWidth="2" />
      <line x1="85" y1="200" x2="85" y2="240" stroke={fg} strokeWidth="2" />
    </g>
  );
}

export function BufferTank({ x, y, fg, volumeL }: Cp & { volumeL: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x="0" y="0" width="60" height="200" rx="6" fill="none" stroke={fg} strokeWidth="2" />
      <text x="30" y="100" fill={fg} fontSize="7" fontWeight="bold" textAnchor="middle" transform="rotate(-90 30 100)">PUFFER TARTÁLY</text>
      <text x="30" y="160" fill={fg} fontSize="8" fontWeight="bold" textAnchor="middle">{volumeL} L</text>
    </g>
  );
}

interface EmitterGroupProps {
  circuits: { type: string; label?: string; flowTempC?: number }[];
  fg: string;
  subFg: string;
}

export function EmitterGroup({ circuits, fg, subFg }: EmitterGroupProps) {
  const types = [...new Set(circuits.map(c => c.type))];
  const count = types.length;
  if (count === 0) return <text x="60" y="100" fill={subFg} fontSize="7" textAnchor="middle">Nincs szekunder kör</text>;
  const slotH = Math.floor(190 / Math.max(count, 1));
  return (
    <>
      {types.map((type, idx) => {
        const yOff = idx * slotH;
        if (type === 'floor') {
          const c = circuits.find(c => c.type === 'floor');
          return (
            <g key="floor" transform={`translate(0, ${yOff})`}>
              <rect x="0" y="4" width="14" height={slotH - 8} rx="2" fill="none" stroke={fg} strokeWidth="1.5" />
              <path d={`M 14,${slotH * 0.15} H 100 Q 110,${slotH * 0.15} 110,${slotH * 0.25} V ${slotH * 0.75} Q 110,${slotH * 0.85} 100,${slotH * 0.85} H 14`} fill="none" stroke={fg} strokeWidth="2" />
              <path d={`M 14,${slotH * 0.25} H 85 Q 95,${slotH * 0.25} 95,${slotH * 0.35} V ${slotH * 0.65} Q 95,${slotH * 0.75} 85,${slotH * 0.75} H 14`} fill="none" stroke={fg} strokeWidth="2" />
              <text x="60" y={slotH * 0.55} fill={fg} fontSize="7" fontWeight="bold" textAnchor="middle">PADLÓFŰTÉS</text>
              <text x="60" y={slotH * 0.65} fill={subFg} fontSize="5" textAnchor="middle">{c?.flowTempC ?? 35}°C</text>
            </g>
          );
        }
        if (type === 'radiators') {
          const c = circuits.find(c => c.type === 'radiators');
          return (
            <g key="radiators" transform={`translate(0, ${yOff})`}>
              <line x1="0" y1={slotH * 0.15} x2="30" y2={slotH * 0.15} stroke={fg} strokeWidth="2" />
              <line x1="0" y1={slotH * 0.85} x2="30" y2={slotH * 0.85} stroke={fg} strokeWidth="2" />
              <rect x="30" y={slotH * 0.05} width="100" height={slotH * 0.9} rx="4" fill="none" stroke={fg} strokeWidth="2" />
              {Array.from({ length: Math.min(6, Math.max(3, slotH > 60 ? 6 : 4)) }).map((_, i) => (
                <line key={i} x1={42 + i * 14} y1={slotH * 0.12} x2={42 + i * 14} y2={slotH * 0.88} stroke={fg} strokeWidth="5" strokeLinecap="round" />
              ))}
              <text x="80" y={slotH * 0.45} fill={fg} fontSize="7" fontWeight="bold" textAnchor="middle">RADIÁTOROK</text>
              <text x="80" y={slotH * 0.58} fill={subFg} fontSize="5" textAnchor="middle">{c?.flowTempC ?? 55}°C</text>
            </g>
          );
        }
        if (type === 'fan_coil') {
          const c = circuits.find(c => c.type === 'fan_coil');
          const ch = slotH;
          return (
            <g key="fan_coil" transform={`translate(0, ${yOff})`}>
              <line x1="0" y1={ch * 0.15} x2="30" y2={ch * 0.15} stroke={fg} strokeWidth="2" />
              <line x1="0" y1={ch * 0.85} x2="30" y2={ch * 0.85} stroke={fg} strokeWidth="2" />
              <rect x="30" y={ch * 0.05} width="110" height={ch * 0.9} rx="6" fill="none" stroke={fg} strokeWidth="2" />
              <rect x="45" y={ch * 0.1} width="80" height={ch * 0.18} rx="2" fill="none" stroke={fg} strokeWidth="1" />
              <circle cx="80" cy={ch * 0.45} r={ch * 0.12} fill="none" stroke={fg} strokeWidth="1" />
              <line x1="80" y1={ch * 0.35} x2="80" y2={ch * 0.55} stroke={fg} strokeWidth="2" />
              <line x1={80 - ch * 0.1} y1={ch * 0.45} x2={80 + ch * 0.1} y2={ch * 0.45} stroke={fg} strokeWidth="2" />
              <text x="80" y={ch * 0.7} fill={fg} fontSize="7" fontWeight="bold" textAnchor="middle">FAN-COIL</text>
              <text x="80" y={ch * 0.82} fill={subFg} fontSize="5" textAnchor="middle">{c?.flowTempC ?? 45}°C</text>
            </g>
          );
        }
        return null;
      })}
    </>
  );
}
