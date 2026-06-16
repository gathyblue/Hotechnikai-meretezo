import React from 'react';
import { HeatPumpModel, HydraulicResults, HydraulicInput } from '../types';

interface SystemDiagramProps {
  selectedModel: HeatPumpModel | null;
  hydraulicResults: HydraulicResults;
  emitterType: 'floor' | 'radiator' | 'cool18' | 'cool12' | 'fan_coil' | 'mixed';
  hydraulicState: HydraulicInput;
  heatLossKw?: number;
  theme?: 'light' | 'dark';
}

// ─── Reusable SVG Symbol Components ────────────────────────────────────────

// Butterfly / gate valve symbol (ISA style)
const ValveSymbol: React.FC<{ x: number; y: number; label?: string; color?: string }> = ({
  x, y, label, color = '#475569'
}) => (
  <g transform={`translate(${x},${y})`}>
    <polygon points="-7,-5 7,-5 0,0" fill={color} />
    <polygon points="-7,5 7,5 0,0" fill={color} />
    <line x1="-7" y1="-5" x2="-7" y2="5" stroke={color} strokeWidth="1.2" />
    <line x1="7" y1="-5" x2="7" y2="5" stroke={color} strokeWidth="1.2" />
    {label && <text x="0" y="16" textAnchor="middle" fontSize="7" fill={color} fontWeight="600">{label}</text>}
  </g>
);

// 3-way valve
const ThreeWayValve: React.FC<{ x: number; y: number; label?: string }> = ({ x, y, label }) => (
  <g transform={`translate(${x},${y})`}>
    <polygon points="0,-8 8,4 -8,4" fill="#d97706" />
    <polygon points="0,8 8,-4 -8,-4" fill="#d97706" />
    <line x1="0" y1="-8" x2="0" y2="-14" stroke="#d97706" strokeWidth="1.5" />
    {label && <text x="12" y="4" textAnchor="start" fontSize="7" fill="#d97706" fontWeight="700">{label}</text>}
  </g>
);

// Pump symbol (circle with arrow)
const PumpSymbol: React.FC<{ x: number; y: number; label?: string; r?: number; color?: string }> = ({
  x, y, label, r = 12, color = '#0ea5e9'
}) => (
  <g transform={`translate(${x},${y})`}>
    <circle cx="0" cy="0" r={r} fill="none" stroke={color} strokeWidth="1.8" />
    <polygon points={`${-r * 0.4},-${r * 0.5} ${r * 0.55},0 ${-r * 0.4},${r * 0.5}`} fill={color} />
    {label && (
      <text x="0" y={r + 11} textAnchor="middle" fontSize="7" fill={color} fontWeight="700">{label}</text>
    )}
  </g>
);

// Expansion vessel
const ExpansionVessel: React.FC<{ x: number; y: number; label?: string; volume?: number }> = ({ x, y, label, volume }) => (
  <g transform={`translate(${x},${y})`}>
    <line x1="0" y1="0" x2="0" y2="10" stroke="#64748b" strokeWidth="1.5" />
    <ellipse cx="0" cy="20" rx="12" ry="16" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
    <line x1="-12" y1="20" x2="12" y2="20" stroke="#d97706" strokeWidth="1" strokeDasharray="2 1" />
    <text x="0" y="24" textAnchor="middle" fontSize="6" fill="#92400e" fontWeight="700">TAR.</text>
    {volume && <text x="0" y="43" textAnchor="middle" fontSize="7" fill="#d97706" fontWeight="700">{volume}L</text>}
    {label && <text x="0" y="52" textAnchor="middle" fontSize="6.5" fill="#64748b" fontWeight="600">{label}</text>}
  </g>
);

// Heat exchanger (plate)
const PlateExchanger: React.FC<{ x: number; y: number; label?: string }> = ({ x, y, label }) => (
  <g transform={`translate(${x},${y})`}>
    <rect x="-14" y="-40" width="28" height="80" rx="3" fill="#fff7ed" stroke="#ea580c" strokeWidth="1.8" />
    {[-28, -16, -4, 8, 20, 32].map((dy, i) => (
      <line key={i} x1="-10" y1={-40 + 10 + dy} x2="10" y2={-40 + 10 + dy} stroke="#fed7aa" strokeWidth="1" />
    ))}
    <text x="0" y="4" textAnchor="middle" fontSize="6.5" fill="#ea580c" fontWeight="800" transform="rotate(-90)">LEVÁLASZTÓ</text>
    {label && <text x="0" y="52" textAnchor="middle" fontSize="7" fill="#ea580c" fontWeight="700">{label}</text>}
  </g>
);

// Buffer tank
const BufferTank: React.FC<{ x: number; y: number; label?: string; volume?: number }> = ({ x, y, label, volume }) => (
  <g transform={`translate(${x},${y})`}>
    <rect x="-18" y="-48" width="36" height="96" rx="18" fill="none" stroke="#6366f1" strokeWidth="2" />
    <line x1="-15" y1="-16" x2="15" y2="-16" stroke="#6366f1" strokeWidth="0.8" strokeDasharray="3 2" />
    <line x1="-15" y1="16" x2="15" y2="16" stroke="#6366f1" strokeWidth="0.8" strokeDasharray="3 2" />
    <text x="0" y="-2" textAnchor="middle" fontSize="6" fill="#6366f1" fontWeight="800">PUFFER</text>
    {volume && <text x="0" y="9" textAnchor="middle" fontSize="7" fill="#6366f1" fontWeight="700">{volume}L</text>}
    {label && <text x="0" y="60" textAnchor="middle" fontSize="7" fill="#6366f1" fontWeight="600">{label}</text>}
  </g>
);

// DHW tank
const DhwTank: React.FC<{ x: number; y: number; volume?: number }> = ({ x, y, volume }) => (
  <g transform={`translate(${x},${y})`}>
    <rect x="-20" y="-52" width="40" height="104" rx="20" fill="none" stroke="#8b5cf6" strokeWidth="2" />
    <path d="M -12 -20 Q 0 -30 12 -20 Q 0 -10 -12 -20" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="1" />
    <text x="0" y="2" textAnchor="middle" fontSize="6.5" fill="#8b5cf6" fontWeight="800">HMV</text>
    {volume && <text x="0" y="13" textAnchor="middle" fontSize="7" fill="#8b5cf6" fontWeight="700">{volume}L</text>}
    <text x="0" y="65" textAnchor="middle" fontSize="7" fill="#8b5cf6" fontWeight="600">Indirekt tároló</text>
  </g>
);

// Safety valve
const SafetyValve: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x},${y})`}>
    <rect x="-5" y="-8" width="10" height="10" fill="#fee2e2" stroke="#ef4444" strokeWidth="1.5" rx="1" />
    <path d="M -3 -8 L 0 -15 L 3 -8" fill="none" stroke="#ef4444" strokeWidth="1.5" />
    <text x="0" y="12" textAnchor="middle" fontSize="6" fill="#ef4444" fontWeight="700">BV</text>
  </g>
);

// Filter / dirt separator
const DirtSeparator: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x},${y})`}>
    <rect x="-8" y="-10" width="16" height="20" rx="2" fill="#f1f5f9" stroke="#64748b" strokeWidth="1.5" />
    {[-3, 1, 5].map((dy, i) => (
      <line key={i} x1="-5" y1={-7 + dy * 2.2} x2="5" y2={-7 + dy * 2.2} stroke="#94a3b8" strokeWidth="0.8" />
    ))}
    <text x="0" y="20" textAnchor="middle" fontSize="6.5" fill="#64748b" fontWeight="700">ISZAP</text>
  </g>
);

// Thermometer tag
const TempTag: React.FC<{ x: number; y: number; label: string; value?: string; color?: string }> = ({
  x, y, label, value, color = '#0f172a'
}) => (
  <g transform={`translate(${x},${y})`}>
    <circle cx="0" cy="0" r="9" fill="white" stroke={color} strokeWidth="1.2" />
    <text x="0" y="3" textAnchor="middle" fontSize="6" fill={color} fontWeight="800">T</text>
    {value && (
      <text x="12" y="4" textAnchor="start" fontSize="7.5" fill={color} fontWeight="700">{value}</text>
    )}
    {label && (
      <text x="0" y="19" textAnchor="middle" fontSize="6" fill="#64748b">{label}</text>
    )}
  </g>
);

// Component badge with number
const ComponentBadge: React.FC<{ x: number; y: number; n: number }> = ({ x, y, n }) => (
  <g transform={`translate(${x},${y})`}>
    <circle cx="0" cy="0" r="8" fill="#0f172a" />
    <text x="0" y="3.5" textAnchor="middle" fontSize="8" fill="white" fontWeight="800">{n}</text>
  </g>
);

// Flow arrow on path
const FlowArrow: React.FC<{ x: number; y: number; dir?: 'right' | 'left' | 'up' | 'down'; color: string }> = ({
  x, y, dir = 'right', color
}) => {
  const rot = { right: 0, left: 180, up: -90, down: 90 }[dir];
  return (
    <g transform={`translate(${x},${y}) rotate(${rot})`}>
      <polygon points="0,-4 8,0 0,4" fill={color} />
    </g>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────

export const SystemDiagram: React.FC<SystemDiagramProps> = ({
  selectedModel,
  hydraulicResults,
  emitterType,
  hydraulicState,
  heatLossKw = 0,
  theme = 'dark'
}) => {
  const isDark = theme === 'dark';

  const bg = isDark ? '#0f172a' : '#ffffff';
  const bgZone = isDark ? '#1e293b' : '#f8fafc';
  const borderCol = isDark ? '#334155' : '#cbd5e1';
  const textPrimary = isDark ? '#e2e8f0' : '#0f172a';
  const textMuted = isDark ? '#64748b' : '#94a3b8';
  const gridLine = isDark ? '#1e293b' : '#f1f5f9';

  const RED = '#ef4444';
  const BLUE = '#3b82f6';

  const hasExchanger = hydraulicState.includeHeatExchanger;
  const hasBuffer = !hasExchanger && (hydraulicState.additionalWaterVolumeL || 0) > 0;
  const isDirect = !hasExchanger && !hasBuffer;
  const hasDhw = hydraulicState.includeDhwTank;

  // Derive display values
  const flowTemp = emitterType === 'radiator' ? 55 : emitterType === 'cool18' ? 18 : emitterType === 'cool12' ? 12 : 35;
  const returnTemp = flowTemp - hydraulicState.deltaT;
  const pipeLabel = hydraulicResults.recommendedPipeSize || 'DN25';
  const secPipeLabel = hydraulicResults.recommendedSecondaryPipeSize || pipeLabel;
  const flowRate = hydraulicResults.flowRateLh;
  const vesselL = hasExchanger ? hydraulicResults.primaryVesselSizeL : hydraulicResults.vesselSizeL;
  const secVesselL = hydraulicResults.secondaryVesselSizeL;
  const buffVol = hydraulicState.additionalWaterVolumeL || 0;
  const dhwVol = 200;

  // Emitter label
  const emitterLabel = {
    floor: 'Padlófűtés (35°C)',
    radiator: 'Radiátor (55°C)',
    cool18: 'Mennyezethűtés (18°C)',
    cool12: 'Fan-coil (12°C)',
    fan_coil: 'Fan-coil',
    mixed: 'Vegyes hőleadók',
  }[emitterType] || 'Hőleadók';

  // Bill of materials items
  const bomItems: { n: number; name: string; spec: string; qty: string }[] = [];

  bomItems.push({
    n: 1,
    name: 'Kültéri hőszivattyú monoblokk',
    spec: selectedModel
      ? `${selectedModel.name} | ${selectedModel.capacityA7W35} kW (A7/W35) | R290 | ${selectedModel.voltage}`
      : 'R290 hőszivattyú (modell nem kiválasztott)',
    qty: '1 db',
  });

  if (hasDhw) {
    bomItems.push({
      n: 2,
      name: 'Indirekt HMV tároló',
      spec: `${dhwVol}L hőszivattyús tároló, duplakígyós | 3-járatú motoros szelep`,
      qty: '1 db',
    });
  }

  if (hasExchanger) {
    bomItems.push({
      n: hasDhw ? 3 : 2,
      name: 'Lemezes hőcserélő (leválasztó)',
      spec: `${hydraulicResults.recommendedExchangerModel} | ${hydraulicResults.heatExchangerAreaM2} m² | Rozsdamentes`,
      qty: '1 db',
    });
    bomItems.push({
      n: hasDhw ? 4 : 3,
      name: 'Puffertartály (szekunder)',
      spec: `${secVesselL}L zárt tágulási tartály szekunder kör`,
      qty: '1 db',
    });
  } else if (hasBuffer) {
    bomItems.push({
      n: hasDhw ? 3 : 2,
      name: 'Hidraulikus puffertartály',
      spec: `${buffVol}L | Hidraulikus váltó | Kompresszor ciklusvédelem`,
      qty: '1 db',
    });
  }

  const vesselN = bomItems.length + 1;
  bomItems.push({
    n: vesselN,
    name: 'Zárt tágulási tartály (primer)',
    spec: `${vesselL}L | Előtöltés: ${hydraulicResults.vesselPrechargeBar} bar | Max: ${hydraulicResults.vesselFinalBar} bar`,
    qty: '1 db',
  });

  const pumpN = bomItems.length + 1;
  if (hasExchanger || hasBuffer) {
    bomItems.push({
      n: pumpN,
      name: 'Szekunder keringető szivattyú',
      spec: `${hydraulicResults.dabPumpModel} | Beállítás: ${hydraulicResults.dabPumpSetting ?? 'Auto'} | Fok: ${hydraulicResults.dabPumpStage ?? '2'}`,
      qty: '1 db',
    });
  }

  bomItems.push({
    n: bomItems.length + 1,
    name: 'Biztonsági szelep',
    spec: `${hydraulicState.safetyValvePressure} bar | PN10 | ½" csatlakozás`,
    qty: '2 db',
  });
  bomItems.push({
    n: bomItems.length + 1,
    name: 'Mágneses iszapleválasztó',
    spec: `${pipeLabel} | Mágneses szűrés + légtelenítő | Primer kör visszatérő ág`,
    qty: '1 db',
  });
  bomItems.push({
    n: bomItems.length + 1,
    name: 'Csövezés (primer kör)',
    spec: `${pipeLabel} | ${hydraulicState.pipeMaterial === 'copper' ? 'Rézcső' : hydraulicState.pipeMaterial === 'pex' ? 'PEX-A szigetelt' : 'Acélcső'} | v = ${hydraulicResults.estimatedVelocityMs} m/s`,
    qty: 'tervrajz szerint',
  });
  if (hasExchanger || hasBuffer) {
    bomItems.push({
      n: bomItems.length + 1,
      name: 'Csövezés (szekunder kör)',
      spec: `${secPipeLabel} | Hőleadó körök | ${emitterLabel}`,
      qty: 'tervrajz szerint',
    });
  }
  bomItems.push({
    n: bomItems.length + 1,
    name: 'Fagyvédelmi szelepek (kültéri)',
    spec: 'Légbeszívásos fagyásgátló szelep | Kültéri csatlakozáson | Kötelező monoblokkhoz',
    qty: '2 db',
  });

  // ─── SVG Layout ────────────────────────────────────────────────────────
  // Canvas: 1000 × 420 internal units
  const W = 1000, H = 420;

  // Pipe Y levels
  const yFlow = 140;
  const yRet = 280;
  const yMid = (yFlow + yRet) / 2; // 210

  // X zones
  const xHP = 80;           // Heat pump center
  const xFrost = 175;       // Frost valves
  const xDhwTee = 255;      // DHW branch tee
  const xDhwTank = 235;     // DHW tank x
  const xFilter = 340;      // Dirt sep
  const xBV = 390;          // Safety valve
  const xCoupling = 470;    // Buffer/exchanger/direct center
  const xSecPump = 590;     // Secondary pump
  const xExpVess = 440;     // Primary exp vessel (below return)
  const xSecExp = 680;      // Secondary exp vessel
  const xEmitter = 820;     // Emitter manifold center
  const xEnd = 940;         // Right edge

  return (
    <div
      className={`rounded-lg border overflow-hidden flex flex-col`}
      style={{ background: bg, borderColor: borderCol }}
      id="system-diagram"
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b"
        style={{ borderColor: borderCol, background: isDark ? '#1e293b' : '#f1f5f9' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-1 h-5 rounded"
            style={{ background: 'linear-gradient(180deg, #3b82f6, #ef4444)' }}
          />
          <div>
            <span
              className="font-black text-xs uppercase tracking-widest"
              style={{ color: textPrimary }}
            >
              P&amp;I Folyamatábra — Gépészeti Kapcsolási Sémavázlat
            </span>
            <span className="ml-3 text-[10px] font-medium" style={{ color: textMuted }}>
              MSZ EN ISO 10628 alapján
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {[
            { color: RED, label: 'Előremenő (meleg)' },
            { color: BLUE, label: 'Visszatérő (hideg)' },
            { color: '#d97706', label: 'HMV kör' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="h-[3px] w-6 rounded" style={{ background: color }} />
              <span className="text-[9px] font-semibold" style={{ color: textMuted }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── SVG Diagram ── */}
      <div className="overflow-x-auto" style={{ background: bg }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: '100%', minWidth: 720, display: 'block' }}
          fontFamily="'Inter', 'ui-sans-serif', system-ui, sans-serif"
        >
          {/* Grid lines */}
          {Array.from({ length: 20 }, (_, i) => i * 50).map(x => (
            <line key={`gx${x}`} x1={x} y1={0} x2={x} y2={H} stroke={gridLine} strokeWidth="0.5" />
          ))}
          {Array.from({ length: 9 }, (_, i) => i * 50).map(y => (
            <line key={`gy${y}`} x1={0} y1={y} x2={W} y2={y} stroke={gridLine} strokeWidth="0.5" />
          ))}

          {/* ── Zone backgrounds ── */}
          {/* Outdoor */}
          <rect x="10" y="10" width="155" height={H - 20} rx="6" fill={isDark ? '#172033' : '#f0f9ff'} stroke="#38bdf8" strokeWidth="1" strokeDasharray="5 3" />
          <text x="87" y="28" textAnchor="middle" fontSize="8" fill="#38bdf8" fontWeight="800" letterSpacing="3">KÜLTÉR</text>

          {/* Indoor */}
          <rect x="170" y="10" width={W - 180} height={H - 20} rx="6" fill={isDark ? '#0f172a' : '#fafafa'} stroke={borderCol} strokeWidth="1" />
          <text x={170 + (W - 180) / 2} y="28" textAnchor="middle" fontSize="8" fill={textMuted} fontWeight="800" letterSpacing="3">BELTÉRI GÉPÉSZETI TÉR</text>

          {/* ── MAIN PIPES ── */}
          {/* Primary flow (red) */}
          <line x1={xHP + 40} y1={yFlow} x2={hasExchanger ? xCoupling - 14 : hasBuffer ? xCoupling - 18 : xCoupling + 40} y2={yFlow} stroke={RED} strokeWidth="3.5" />
          {/* Primary return (blue) */}
          <line x1={hasExchanger ? xCoupling - 14 : hasBuffer ? xCoupling - 18 : xCoupling + 40} y1={yRet} x2={xHP + 40} y2={yRet} stroke={BLUE} strokeWidth="3.5" />

          {/* Flow arrows on main pipes */}
          <FlowArrow x={230} y={yFlow} dir="right" color={RED} />
          <FlowArrow x={350} y={yFlow} dir="right" color={RED} />
          <FlowArrow x={350} y={yRet} dir="left" color={BLUE} />
          <FlowArrow x={230} y={yRet} dir="left" color={BLUE} />

          {/* Secondary pipes (after coupling) */}
          {(hasExchanger || hasBuffer) && (
            <>
              <line x1={hasExchanger ? xCoupling + 14 : xCoupling + 18} y1={yFlow} x2={xEmitter - 28} y2={yFlow} stroke={RED} strokeWidth="3" />
              <line x1={xEmitter - 28} y1={yRet} x2={hasExchanger ? xCoupling + 14 : xCoupling + 18} y2={yRet} stroke={BLUE} strokeWidth="3" />
              <FlowArrow x={680} y={yFlow} dir="right" color={RED} />
              <FlowArrow x={680} y={yRet} dir="left" color={BLUE} />
            </>
          )}
          {isDirect && (
            <>
              <line x1={xCoupling + 40} y1={yFlow} x2={xEmitter - 28} y2={yFlow} stroke={RED} strokeWidth="3" strokeDasharray="8 4" />
              <line x1={xEmitter - 28} y1={yRet} x2={xCoupling + 40} y2={yRet} stroke={BLUE} strokeWidth="3" strokeDasharray="8 4" />
              <FlowArrow x={680} y={yFlow} dir="right" color={RED} />
              <FlowArrow x={680} y={yRet} dir="left" color={BLUE} />
            </>
          )}

          {/* ── Pipe size labels ── */}
          <rect x="193" y={yFlow - 16} width="34" height="12" rx="2" fill={isDark ? '#1e293b' : '#dbeafe'} />
          <text x="210" y={yFlow - 7} textAnchor="middle" fontSize="7.5" fill={BLUE} fontWeight="800">{pipeLabel}</text>
          {(hasExchanger || hasBuffer) && (
            <>
              <rect x="618" y={yFlow - 16} width="34" height="12" rx="2" fill={isDark ? '#1e293b' : '#dcfce7'} />
              <text x="635" y={yFlow - 7} textAnchor="middle" fontSize="7.5" fill="#16a34a" fontWeight="800">{secPipeLabel}</text>
            </>
          )}

          {/* Flow rate tag */}
          <rect x="276" y={yFlow - 16} width="54" height="12" rx="2" fill={isDark ? '#1e293b' : '#fff7ed'} />
          <text x="303" y={yFlow - 7} textAnchor="middle" fontSize="7" fill="#d97706" fontWeight="700">Q={flowRate} L/h</text>

          {/* ── Temp tags ── */}
          <TempTag x={xHP + 50} y={yFlow - 18} label="" value={`${flowTemp}°C`} color={RED} />
          <TempTag x={xHP + 50} y={yRet + 10} label="" value={`${returnTemp}°C`} color={BLUE} />

          {/* ── 1. HEAT PUMP ── */}
          <g transform={`translate(${xHP},${yMid})`}>
            {/* Body */}
            <rect x="-38" y="-72" width="76" height="144" rx="6" fill={isDark ? '#1e293b' : '#e2e8f0'} stroke={isDark ? '#475569' : '#94a3b8'} strokeWidth="2" />
            {/* Fan circle */}
            <circle cx="0" cy="-20" r="22" fill="none" stroke={isDark ? '#64748b' : '#94a3b8'} strokeWidth="1.5" strokeDasharray="4 2" />
            <circle cx="0" cy="-20" r="4" fill={isDark ? '#64748b' : '#94a3b8'} />
            {/* Fan blades */}
            {[0, 72, 144, 216, 288].map((angle, i) => (
              <line
                key={i}
                x1="0" y1="-20"
                x2={Math.sin((angle * Math.PI) / 180) * 18}
                y2={-20 + Math.cos((angle * Math.PI) / 180) * 18}
                stroke={isDark ? '#64748b' : '#94a3b8'}
                strokeWidth="2"
              />
            ))}
            {/* Compressor coil indicator */}
            <rect x="-20" y="12" width="40" height="24" rx="3" fill="none" stroke={isDark ? '#475569' : '#94a3b8'} strokeWidth="1" />
            <text x="0" y="29" textAnchor="middle" fontSize="6" fill={textMuted} fontWeight="600">COMPRESSOR</text>
            {/* Labels */}
            <text x="0" y="52" textAnchor="middle" fontSize="8" fill={textPrimary} fontWeight="800">MONOBLOKK</text>
            <text x="0" y="63" textAnchor="middle" fontSize="6.5" fill={textMuted}>R290 propán</text>
            {selectedModel && (
              <text x="0" y="74" textAnchor="middle" fontSize="6" fill="#38bdf8" fontWeight="600">{selectedModel.capacityA7W35}kW A7/W35</text>
            )}
            {/* Pipe stubs */}
            <line x1="38" y1={yFlow - yMid} x2="46" y2={yFlow - yMid} stroke={RED} strokeWidth="3.5" />
            <line x1="38" y1={yRet - yMid} x2="46" y2={yRet - yMid} stroke={BLUE} strokeWidth="3.5" />
          </g>
          <ComponentBadge x={xHP - 24} y={yFlow - 82} n={1} />

          {/* ── Frost valves ── */}
          <ValveSymbol x={xFrost} y={yFlow} label="FAGY" color={isDark ? '#60a5fa' : '#2563eb'} />
          <ValveSymbol x={xFrost} y={yRet} color={isDark ? '#60a5fa' : '#2563eb'} />

          {/* ── DHW Branch ── */}
          {hasDhw && (
            <g>
              <ThreeWayValve x={xDhwTee} y={yFlow} label="3J" />
              {/* DHW up branch */}
              <line x1={xDhwTee} y1={yFlow - 8} x2={xDhwTee} y2={yFlow - 80} stroke={RED} strokeWidth="2.5" />
              <line x1={xDhwTee} y1={yFlow - 80} x2={xDhwTank + 20} y2={yFlow - 80} stroke={RED} strokeWidth="2.5" />
              <FlowArrow x={xDhwTee} y={yFlow - 50} dir="up" color={RED} />
              {/* DHW return branch */}
              <line x1={xDhwTank - 20} y1={yFlow - 60} x2={xDhwTank - 50} y2={yFlow - 60} stroke={BLUE} strokeWidth="2" />
              <line x1={xDhwTank - 50} y1={yFlow - 60} x2={xDhwTank - 50} y2={yRet} stroke={BLUE} strokeWidth="2" />
              <circle cx={xDhwTank - 50} cy={yRet} r="3.5" fill={BLUE} />
              {/* DHW Tank */}
              <DhwTank x={xDhwTank + 0} y={yFlow - 130} volume={200} />
              <ComponentBadge x={xDhwTank - 15} y={yFlow - 175} n={2} />
            </g>
          )}

          {/* ── Dirt separator ── */}
          <DirtSeparator x={xFilter} y={yRet} />

          {/* ── Safety valve (primary) ── */}
          <SafetyValve x={xBV} y={yFlow} />

          {/* ── Primary expansion vessel ── */}
          <line x1={xExpVess} y1={yRet} x2={xExpVess} y2={yRet + 14} stroke={BLUE} strokeWidth="1.5" />
          <ExpansionVessel x={xExpVess} y={yRet + 14} volume={vesselL} label="Primer TT" />

          {/* ── COUPLING (Exchanger / Buffer / Direct) ── */}
          {hasExchanger && (
            <g>
              <PlateExchanger x={xCoupling} y={yMid} label={hydraulicResults.recommendedExchangerModel?.split(' ')[0]} />
              <ComponentBadge x={xCoupling - 10} y={yMid - 52} n={hasDhw ? 3 : 2} />
            </g>
          )}
          {hasBuffer && (
            <g>
              <BufferTank x={xCoupling} y={yMid} volume={buffVol} />
              <ComponentBadge x={xCoupling - 14} y={yMid - 60} n={hasDhw ? 3 : 2} />
            </g>
          )}
          {isDirect && (
            <g>
              <rect x={xCoupling - 30} y={yFlow - 8} width="60" height="16" rx="4" fill={isDark ? '#1e293b' : '#f0fdf4'} stroke="#22c55e" strokeWidth="1.5" />
              <text x={xCoupling} y={yFlow + 4} textAnchor="middle" fontSize="7.5" fill="#22c55e" fontWeight="700">DIREKT CSATOLÁS</text>
            </g>
          )}

          {/* ── Secondary pump ── */}
          {(hasExchanger || hasBuffer) && (
            <g>
              <PumpSymbol
                x={xSecPump}
                y={yFlow}
                r={13}
                label={hydraulicResults.dabPumpModel?.split(' ').slice(0, 2).join(' ')}
                color="#10b981"
              />
              <ComponentBadge x={xSecPump - 10} y={yFlow - 26} n={hasDhw ? (hasExchanger ? 4 : 4) : (hasExchanger ? 3 : 3)} />
            </g>
          )}

          {/* ── Secondary expansion vessel ── */}
          {hasExchanger && (
            <g>
              <line x1={xSecExp} y1={yRet} x2={xSecExp} y2={yRet + 14} stroke={BLUE} strokeWidth="1.5" />
              <ExpansionVessel x={xSecExp} y={yRet + 14} volume={secVesselL} label="Szekunder TT" />
            </g>
          )}

          {/* ── EMITTER manifold ── */}
          <g transform={`translate(${xEmitter},${yMid})`}>
            <rect x="-28" y={yFlow - yMid - 8} width="16" height="16" rx="2" fill={isDark ? '#1e293b' : '#f0f9ff'} stroke={RED} strokeWidth="1.5" />
            <rect x="-28" y={yRet - yMid - 8} width="16" height="16" rx="2" fill={isDark ? '#1e293b' : '#eff6ff'} stroke={BLUE} strokeWidth="1.5" />
            <rect x="-10" y="-56" width="90" height="112" rx="6" fill={isDark ? '#1e293b' : '#f8fafc'} stroke={isDark ? '#334155' : '#e2e8f0'} strokeWidth="2" />
            {/* Emitter pipes */}
            {[-30, -10, 10, 30].map((dy, i) => (
              <g key={i}>
                <line x1="80" y1={dy} x2="95" y2={dy} stroke={dy < 0 ? RED : BLUE} strokeWidth="1.5" />
                <line x1="95" y1={dy} x2="95" y2={dy < 0 ? dy - 8 : dy + 8} stroke={dy < 0 ? RED : BLUE} strokeWidth="1.5" />
              </g>
            ))}
            <text x="35" y="-12" textAnchor="middle" fontSize="8" fill={textPrimary} fontWeight="800">{
              emitterType === 'floor' ? 'PADLÓ' : emitterType === 'radiator' ? 'RADIÁTOR' : 'HŐLEADÓ'
            }</text>
            <text x="35" y="0" textAnchor="middle" fontSize="7" fill={textMuted}>osztó–gyűjtő</text>
            <text x="35" y="13" textAnchor="middle" fontSize="7" fill={RED}>{flowTemp}°C / {returnTemp}°C</text>
          </g>
          <ComponentBadge x={xEmitter + 56} y={yFlow - 68} n={bomItems.length} />

          {/* ── Operating parameters strip at bottom ── */}
          <rect x="10" y={H - 56} width={W - 20} height="44" rx="4" fill={isDark ? '#1e293b' : '#f8fafc'} stroke={borderCol} strokeWidth="1" />
          {[
            { label: 'Hőigény', val: heatLossKw > 0 ? `${heatLossKw.toFixed(1)} kW` : '–' },
            { label: 'Tömegáram', val: `${flowRate} L/h` },
            { label: 'Hőlépcső ΔT', val: `${hydraulicState.deltaT}°C` },
            { label: 'Előre / Vissza', val: `${flowTemp}°C / ${returnTemp}°C` },
            { label: 'Csősebesség', val: `${hydraulicResults.estimatedVelocityMs} m/s` },
            { label: 'Primer csőméret', val: pipeLabel },
            { label: 'Biztonsági szelep', val: `${hydraulicState.safetyValvePressure} bar` },
            { label: 'Tágulási tartály', val: `${vesselL}L / ${hydraulicResults.vesselPrechargeBar}b` },
          ].map(({ label, val }, i) => (
            <g key={i} transform={`translate(${20 + i * 122}, ${H - 48})`}>
              <text x="0" y="10" fontSize="6.5" fill={textMuted} fontWeight="600" letterSpacing="0.5">{label}</text>
              <text x="0" y="24" fontSize="8.5" fill={textPrimary} fontWeight="800" fontFamily="'JetBrains Mono', monospace">{val}</text>
            </g>
          ))}
        </svg>
      </div>

      {/* ── Bill of Materials Table ── */}
      <div
        className="border-t"
        style={{ borderColor: borderCol, background: isDark ? '#0f172a' : '#ffffff' }}
      >
        <div
          className="px-4 py-2 border-b flex items-center gap-2"
          style={{ borderColor: borderCol, background: isDark ? '#1e293b' : '#f1f5f9' }}
        >
          <span className="font-black text-[10px] uppercase tracking-widest" style={{ color: textPrimary }}>
            Darabjegyzék — Főbb Gépészeti Elemek
          </span>
          <span className="text-[9px] font-medium ml-2" style={{ color: textMuted }}>
            (Tájékoztató jellegű, végleges lista tervező hatásköre)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: isDark ? '#1e293b' : '#f8fafc', borderBottom: `1px solid ${borderCol}` }}>
                {['#', 'Megnevezés', 'Műszaki specifikáció', 'Mennyiség'].map((h, i) => (
                  <th
                    key={h}
                    style={{
                      padding: '7px 12px',
                      textAlign: i === 0 ? 'center' : 'left',
                      fontWeight: 700,
                      fontSize: 9,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: textMuted,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bomItems.map((item, idx) => (
                <tr
                  key={item.n}
                  style={{
                    borderBottom: `1px solid ${gridLine}`,
                    background: idx % 2 === 0
                      ? (isDark ? '#0f172a' : '#ffffff')
                      : (isDark ? '#111827' : '#f8fafc'),
                  }}
                >
                  <td style={{ padding: '7px 12px', textAlign: 'center', width: 36 }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: '#0f172a',
                        color: '#fff',
                        fontSize: 9,
                        fontWeight: 800,
                      }}
                    >
                      {item.n}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: '7px 12px',
                      fontWeight: 700,
                      color: textPrimary,
                      whiteSpace: 'nowrap',
                      fontSize: 11,
                    }}
                  >
                    {item.name}
                  </td>
                  <td
                    style={{
                      padding: '7px 12px',
                      color: textMuted,
                      fontSize: 10,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {item.spec}
                  </td>
                  <td
                    style={{
                      padding: '7px 12px',
                      color: textPrimary,
                      fontWeight: 700,
                      fontSize: 11,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.qty}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer note */}
        <div
          className="px-4 py-2 flex items-center gap-2 border-t"
          style={{ borderColor: borderCol, background: isDark ? '#1e293b' : '#f8fafc' }}
        >
          <span style={{ color: textMuted, fontSize: 9 }}>
            ⚠ Ez a sémavázlat tájékoztató jellegű. A tényleges gépészeti tervdokumentáció elkészítése és hitelesítése tervező mérnök hatásköre (MSZ EN 12831 / 45825).
            Fagyvédelmi szelepek monoblokk hőszivattyúhoz kötelező beépíteni a kültéri csatlakozásokon (MSZ EN 14511).
          </span>
        </div>
      </div>
    </div>
  );
};
