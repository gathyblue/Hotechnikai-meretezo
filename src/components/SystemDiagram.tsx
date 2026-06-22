import React from "react";
import { HeatPumpModel, HydraulicInput, HydraulicResults } from "../types";

export interface SystemDiagramProps {
  title?: string;
  description?: string;
  selectedModel: HeatPumpModel | null;
  hydraulicState: HydraulicInput;
  hydraulicResults: HydraulicResults;
  theme?: "light" | "dark";
}

export const SystemDiagram: React.FC<SystemDiagramProps> = ({
  title = "Rendszerséma",
  description,
  selectedModel,
  hydraulicState,
  hydraulicResults,
  theme = "light",
}) => {
  const isDark = theme === "dark";
  const fg = isDark ? "#e2e8f0" : "#1e293b";
  const line1 = isDark ? "#94a3b8" : "#475569";
  const line2 = isDark ? "#475569" : "#94a3b8";
  const labelFg = isDark ? "#94a3b8" : "#64748b";
  const subFg = isDark ? "#64748b" : "#94a3b8";

  const r = hydraulicResults;
  const flowLabelP = `${r.primaryFlowTempC}°C | ${r.primaryFlowRateLh} L/h | ${r.primaryMassFlowKgh} kg/h | ${r.primaryEstimatedVelocityMs?.toFixed(2)} m/s`;
  const retLabelP = `${r.primaryReturnTempC}°C | ${r.primaryFlowRateLh} L/h | ${r.primaryMassFlowKgh} kg/h`;
  const flowLabelS = r.secondaryFlowRateLh > 0 ? `${r.secondaryFlowTempC}°C | ${r.secondaryFlowRateLh} L/h | ${r.secondaryMassFlowKgh} kg/h | ${r.secondaryEstimatedVelocityMs?.toFixed(2)} m/s` : "";
  const retLabelS = r.secondaryFlowRateLh > 0 ? `${r.secondaryReturnTempC}°C | ${r.secondaryFlowRateLh} L/h | ${r.secondaryMassFlowKgh} kg/h` : "";

  const isHX = hydraulicState.includeHeatExchanger;

  return (
    <section className={`rounded-xl border shadow-md p-4 transition-all duration-300 flex flex-col ${
      isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-800"
    }`}>
      <div className="flex justify-between items-start gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="font-extrabold text-[12px] uppercase tracking-wider">{title}</h2>
          {description && (
            <p className={`text-[10px] mt-1 font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>{description}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mt-4">
        <div className="lg:col-span-3 border rounded-xl p-2 bg-white/50 dark:bg-slate-950/40 relative overflow-hidden flex items-center justify-center min-h-[420px]">
          <svg viewBox="0 0 1100 520" className="w-full h-auto max-w-[1100px] select-none" style={{ minHeight: "380px" }}>
            <defs>
              <pattern id="grid-mono" width="20" height="20" patternUnits="userSpaceOnUse">
                <rect width="20" height="20" fill="none" stroke={isDark ? "#1e293b" : "#f1f5f9"} strokeWidth="0.5" />
              </pattern>

              {/* Ball valve */}
              <g id="ball-valve">
                <circle cx="0" cy="0" r="7" fill="none" stroke={fg} strokeWidth="1.5" />
                <line x1="-5" y1="-5" x2="5" y2="5" stroke={fg} strokeWidth="1.5" />
              </g>

              {/* Pressure gauge */}
              <g id="pressure-gauge">
                <circle cx="0" cy="0" r="7" fill="none" stroke={fg} strokeWidth="1.5" />
                <line x1="0" y1="0" x2="4" y2="-4" stroke={fg} strokeWidth="1" />
                <circle cx="0" cy="0" r="1.5" fill={fg} />
              </g>

              {/* Air vent */}
              <g id="air-vent">
                <path d="M-4,-4 Q0,-8 4,-4" fill="none" stroke={fg} strokeWidth="1.5" />
                <line x1="0" y1="-4" x2="0" y2="3" stroke={fg} strokeWidth="1.5" />
                <circle cx="0" cy="4" r="1.5" fill={fg} />
              </g>

              {/* Safety valve */}
              <g id="safety-valve">
                <circle cx="0" cy="0" r="7" fill="none" stroke={fg} strokeWidth="1.5" />
                <line x1="-3" y1="-3" x2="3" y2="3" stroke={fg} strokeWidth="1.5" />
                <polygon points="3,0 3,8 8,4" fill="none" stroke={fg} strokeWidth="1" />
              </g>

              {/* Non-return valve */}
              <g id="non-return">
                <line x1="-7" y1="0" x2="7" y2="0" stroke={fg} strokeWidth="1.5" />
                <polygon points="-3,-6 4,0 -3,6" fill="none" stroke={fg} strokeWidth="1.5" />
              </g>

              {/* Circulation pump */}
              <g id="pump">
                <circle cx="0" cy="0" r="12" fill="none" stroke={fg} strokeWidth="1.5" />
                <polygon points="-4,-4 4,0 -4,4" fill={fg} />
              </g>

              {/* Expansion vessel */}
              <g id="expansion-vessel">
                <rect x="-10" y="-16" width="20" height="32" rx="10" fill="none" stroke={fg} strokeWidth="1.5" />
                <line x1="0" y1="-16" x2="0" y2="-22" stroke={fg} strokeWidth="1.5" />
                <line x1="-8" y1="-2" x2="8" y2="-2" stroke={fg} strokeWidth="1" />
                <line x1="-8" y1="2" x2="8" y2="2" stroke={fg} strokeWidth="1" />
              </g>

              {/* 3-way valve */}
              <g id="three-way">
                <circle cx="0" cy="0" r="8" fill="none" stroke={fg} strokeWidth="1.5" />
                <line x1="-5" y1="0" x2="5" y2="0" stroke={fg} strokeWidth="1" />
                <line x1="0" y1="0" x2="0" y2="-5" stroke={fg} strokeWidth="1" />
                <circle cx="0" cy="0" r="2" fill={fg} />
              </g>

              {/* Y-filter */}
              <g id="y-filter">
                <rect x="-6" y="-10" width="12" height="20" rx="2" fill="none" stroke={fg} strokeWidth="1.5" />
                <path d="M-3,-3 L3,3 M-3,3 L3,-3" stroke={fg} strokeWidth="1" />
              </g>

              {/* Flow arrow */}
              <g id="flow-arrow">
                <polygon points="0,-4 8,0 0,4" fill={fg} />
              </g>

              {/* Heat exchanger */}
              <g id="hx">
                <rect x="-18" y="-40" width="36" height="80" rx="4" fill="none" stroke={fg} strokeWidth="1.5" />
                <line x1="-8" y1="-35" x2="-8" y2="35" stroke={line1} strokeWidth="1" />
                <line x1="0" y1="-35" x2="0" y2="35" stroke={line2} strokeWidth="1" />
                <line x1="8" y1="-35" x2="8" y2="35" stroke={line1} strokeWidth="1" />
              </g>
            </defs>

            <rect width="1100" height="520" fill="url(#grid-mono)" />

            {/* Wall boundary */}
            <rect x="180" y="20" width="10" height="480" rx="2" fill={line2} opacity="0.3" />
            <text x="185" y="500" fill={subFg} fontSize="8" fontWeight="bold" textAnchor="middle" transform="rotate(-90 185 500)">ÉPÜLET HATÁR (KÜLTÉR / BELTÉR)</text>

            {/* ───── MAIN PIPELINES ───── */}
            {/* Primary flow (hot) */}
            <path d="M 140,260 H 200" fill="none" stroke={fg} strokeWidth="2.5" />
            <path d="M 200,260 H 900" fill="none" stroke={fg} strokeWidth="2.5" id="prim-flow" />

            {/* Primary return (cold) */}
            <path d="M 900,380 H 200" fill="none" stroke={fg} strokeWidth="2.5" id="prim-ret" />
            <path d="M 200,380 H 140" fill="none" stroke={fg} strokeWidth="2.5" />

            {/* ───── DATA LABELS ON PRIMARY PIPES ───── */}
            <text x="420" y="252" fill={isDark ? "#38bdf8" : "#2563eb"} fontSize="7" fontFamily="monospace" fontWeight="bold">{flowLabelP}</text>
            <text x="420" y="255" fill={subFg} fontSize="5.5">→ PRIMER ELŐREMENŐ</text>
            <text x="420" y="388" fill={isDark ? "#38bdf8" : "#2563eb"} fontSize="7" fontFamily="monospace" fontWeight="bold">{retLabelP}</text>
            <text x="420" y="391" fill={subFg} fontSize="5.5">→ PRIMER VISSZATÉRŐ</text>

            {/* Flow arrows on primary */}
            <use href="#flow-arrow" x="160" y="260" />
            <use href="#flow-arrow" x="870" y="260" />
            <use href="#flow-arrow" x="230" y="380" />
            <use href="#flow-arrow" x="160" y="380" />

            {/* Ball valves on HP connections */}
            <use href="#ball-valve" x="170" y="260" />
            <use href="#ball-valve" x="170" y="380" />

            {/* Pressure gauge + air vent on flow */}
            <use href="#pressure-gauge" x="240" y="260" />
            <text x="240" y="284" fill={subFg} fontSize="5.5" textAnchor="middle">Nyomásmérő</text>
            <use href="#air-vent" x="270" y="260" />
            <text x="270" y="284" fill={subFg} fontSize="5.5" textAnchor="middle">Légtelenítő</text>

            {/* Y-filter on return */}
            <use href="#y-filter" x="250" y="380" />
            <text x="250" y="400" fill={subFg} fontSize="5.5" textAnchor="middle">Iszapleválasztó</text>

            {/* ───── DHW SECTION ───── */}
            {hydraulicState.includeDhwTank && (
              <>
                {/* 3-way valve */}
                <use href="#three-way" x="200" y="260" />

                {/* DHW flow branch */}
                <path d="M 200,260 V 130 H 360" fill="none" stroke={fg} strokeWidth="2" />
                <path d="M 360,200 V 300 H 260 V 380" fill="none" stroke={fg} strokeWidth="2" />

                <use href="#flow-arrow" x="200" y="240" />
                <use href="#flow-arrow" x="340" y="130" />

                {/* DHW tank */}
                <rect x="360" y="50" width="80" height="150" rx="6" fill="none" stroke={fg} strokeWidth="2" />
                <text x="400" y="72" fill={fg} fontSize="8" fontWeight="bold" textAnchor="middle">HMV TÁROLÓ</text>
                <text x="400" y="83" fill={subFg} fontSize="6.5" textAnchor="middle">{hydraulicState.includeDhwTank ? "200-300 L" : ""}</text>

                {/* Coil */}
                <path d="M 380,100 Q 420,100 420,120 Q 380,140 420,160 L 380,160" fill="none" stroke={fg} strokeWidth="1.5" strokeDasharray="3,2" />

                {/* DHW flow/return labels */}
                <text x="370" y="123" fill={isDark ? "#38bdf8" : "#2563eb"} fontSize="5.5" fontFamily="monospace">{r.primaryFlowTempC}°C</text>
                <text x="370" y="170" fill={isDark ? "#38bdf8" : "#2563eb"} fontSize="5.5" fontFamily="monospace">{r.primaryReturnTempC}°C</text>

                {/* Cold water in */}
                <path d="M 380,200 V 220 H 350" fill="none" stroke={fg} strokeWidth="1" />
                <text x="340" y="228" fill={subFg} fontSize="5.5" textAnchor="end">Hidegvíz</text>

                {/* Hot water out */}
                <path d="M 440,50 V 30 H 480" fill="none" stroke={fg} strokeWidth="1.5" />
                <text x="485" y="33" fill={fg} fontSize="6" fontWeight="bold">HMV</text>

                {/* Non-return on DHW return */}
                <use href="#non-return" x="280" y="380" />

                <text x="320" y="140" fill={subFg} fontSize="5.5" textAnchor="middle">Primer HMV kör</text>
              </>
            )}

            {/* ───── PRIMARY/SECONDARY SEPARATION ───── */}
            {isHX ? (
              <>
                {/* HX */}
                <use href="#hx" x="480" y="320" />
                <text x="480" y="265" fill={fg} fontSize="7" fontWeight="bold" textAnchor="middle">HŐCSERÉLŐ (HX)</text>
                <text x="480" y="273" fill={subFg} fontSize="5.5" textAnchor="middle">{r.recommendedExchangerModel?.substring(0, 30)}</text>
                <text x="480" y="420" fill={subFg} fontSize="5.5" textAnchor="middle">{r.heatExchangerAreaM2} m²</text>

                {/* Primary to HX */}
                <path d="M 440,260 H 462" fill="none" stroke={fg} strokeWidth="2.5" />
                <path d="M 498,380 H 440" fill="none" stroke={fg} strokeWidth="2.5" />

                {/* Secondary flow */}
                <path d="M 498,260 H 880" fill="none" stroke={fg} strokeWidth="2" id="sec-flow" />
                {/* Secondary return */}
                <path d="M 880,380 H 550 V 400 H 498" fill="none" stroke={fg} strokeWidth="2" id="sec-ret" />

                {/* Secondary data labels */}
                <text x="640" y="252" fill={isDark ? "#34d399" : "#059669"} fontSize="7" fontFamily="monospace" fontWeight="bold">{flowLabelS}</text>
                <text x="640" y="255" fill={subFg} fontSize="5.5">→ SZEKUNDER ELŐREMENŐ</text>
                <text x="640" y="388" fill={isDark ? "#34d399" : "#059669"} fontSize="7" fontFamily="monospace" fontWeight="bold">{retLabelS}</text>
                <text x="640" y="391" fill={subFg} fontSize="5.5">→ SZEKUNDER VISSZATÉRŐ</text>

                {/* Flow arrows */}
                <use href="#flow-arrow" x="540" y="260" />
                <use href="#flow-arrow" x="850" y="260" />
                <use href="#flow-arrow" x="600" y="380" />
                <use href="#flow-arrow" x="520" y="400" />

                {/* Primary expansion vessel on return */}
                <use href="#expansion-vessel" x="350" y="430" />
                <path d="M 350,380 V 410" fill="none" stroke={fg} strokeWidth="1.5" />
                <text x="350" y="456" fill={fg} fontSize="6" textAnchor="middle">Primer tág.</text>
                <text x="350" y="464" fill={fg} fontSize="7" fontWeight="bold" textAnchor="middle">{r.primaryVesselSizeL} L</text>
                <text x="350" y="472" fill={subFg} fontSize="5.5" textAnchor="middle">p₀={r.prechargeCalculated} / pₑ={r.finalCalculated}</text>

                {/* Secondary expansion vessel */}
                <use href="#expansion-vessel" x="760" y="430" />
                <path d="M 760,380 V 410" fill="none" stroke={fg} strokeWidth="1.5" />
                <text x="760" y="456" fill={fg} fontSize="6" textAnchor="middle">Szekunder tág.</text>
                <text x="760" y="464" fill={fg} fontSize="7" fontWeight="bold" textAnchor="middle">{r.secondaryVesselSizeL} L</text>
                <text x="760" y="472" fill={subFg} fontSize="5.5" textAnchor="middle">p₀={r.prechargeCalculated} / pₑ={r.finalCalculated}</text>

                {/* Secondary pump */}
                <use href="#pump" x="640" y="260" />
                <text x="640" y="238" fill={fg} fontSize="6" textAnchor="middle">Szekunder</text>
                <text x="640" y="246" fill={subFg} fontSize="5.5" textAnchor="middle">szivattyú</text>
                <text x="640" y="210" fill={subFg} fontSize="5" textAnchor="middle">{r.dabPumpModel?.substring(0, 20)}</text>

                {/* Ball valves around HX */}
                <use href="#ball-valve" x="450" y="260" />
                <use href="#ball-valve" x="510" y="260" />
                <use href="#ball-valve" x="450" y="380" />
                <use href="#ball-valve" x="640" y="380" />
              </>
            ) : (
              <>
                {/* DIRECT SYSTEM */}
                <path d="M 440,260 H 880" fill="none" stroke={fg} strokeWidth="2.5" />
                <path d="M 880,380 H 440" fill="none" stroke={fg} strokeWidth="2.5" />

                {/* Data labels */}
                <text x="580" y="252" fill={isDark ? "#38bdf8" : "#2563eb"} fontSize="7" fontFamily="monospace" fontWeight="bold">{flowLabelP}</text>
                <text x="580" y="255" fill={subFg} fontSize="5.5">→ ELŐREMENŐ</text>
                <text x="580" y="388" fill={isDark ? "#38bdf8" : "#2563eb"} fontSize="7" fontFamily="monospace" fontWeight="bold">{retLabelP}</text>
                <text x="580" y="391" fill={subFg} fontSize="5.5">→ VISSZATÉRŐ</text>

                <use href="#flow-arrow" x="540" y="260" />
                <use href="#flow-arrow" x="850" y="260" />
                <use href="#flow-arrow" x="540" y="380" />
                <use href="#flow-arrow" x="850" y="380" />

                {/* Buffer tank (if >= 50L) */}
                {(hydraulicState.additionalWaterVolumeL >= 50) && (
                  <>
                    <rect x="500" y="180" width="60" height="200" rx="6" fill="none" stroke={fg} strokeWidth="2" />
                    <text x="530" y="280" fill={fg} fontSize="7" fontWeight="bold" textAnchor="middle" transform="rotate(-90 530 280)">PUFFER TARTÁLY</text>
                    <text x="530" y="340" fill={fg} fontSize="8" fontWeight="bold" textAnchor="middle">{hydraulicState.additionalWaterVolumeL} L</text>

                    {/* Cross connection flow */}
                    <path d="M 500,380 H 470 V 240 H 500" fill="none" stroke={fg} strokeWidth="1.5" strokeDasharray="3,2" />
                    <path d="M 560,240 H 880" fill="none" stroke={fg} strokeWidth="2.5" />
                    <path d="M 880,380 H 560" fill="none" stroke={fg} strokeWidth="2.5" />

                    {/* Pump after buffer */}
                    <use href="#pump" x="680" y="240" />
                    <text x="680" y="218" fill={fg} fontSize="6" textAnchor="middle">Keringtető</text>
                    <text x="680" y="226" fill={subFg} fontSize="5.5" textAnchor="middle">szivattyú</text>
                  </>
                )}

                {/* Expansion vessel */}
                <use href="#expansion-vessel" x="400" y="430" />
                <path d="M 400,380 V 410" fill="none" stroke={fg} strokeWidth="1.5" />
                <text x="400" y="456" fill={fg} fontSize="6" textAnchor="middle">Tágulási</text>
                <text x="400" y="464" fill={fg} fontSize="7" fontWeight="bold" textAnchor="middle">{r.vesselSizeL} L</text>
                <text x="400" y="472" fill={subFg} fontSize="5.5" textAnchor="middle">p₀={r.prechargeCalculated} / pₑ={r.finalCalculated}</text>
              </>
            )}

            {/* ───── SAFETY VALVE (on primary side) ───── */}
            <use href="#safety-valve" x="350" y="260" transform="rotate(-90 350 260)" />
            <text x="350" y="295" fill={fg} fontSize="5.5" textAnchor="middle">Biztonsági szelep</text>
            <text x="350" y="302" fill={subFg} fontSize="5" textAnchor="middle">{hydraulicState.safetyValvePressure} bar</text>

            {/* ───── HEAT PUMP ───── */}
            <g transform="translate(30, 180)">
              <rect x="0" y="0" width="110" height="200" rx="6" fill="none" stroke={fg} strokeWidth="2" />
              {/* Fan */}
              <circle cx="55" cy="60" r="32" fill="none" stroke={fg} strokeWidth="1.5" />
              <circle cx="55" cy="60" r="25" fill="none" stroke={line2} strokeWidth="1" strokeDasharray="4,3" />
              <g transform="translate(55, 60)">
                <line x1="-22" y1="0" x2="22" y2="0" stroke={fg} strokeWidth="1" />
                <line x1="0" y1="-22" x2="0" y2="22" stroke={fg} strokeWidth="1" />
                <line x1="-16" y1="-16" x2="16" y2="16" stroke={fg} strokeWidth="1" />
                <line x1="16" y1="-16" x2="-16" y2="16" stroke={fg} strokeWidth="1" />
                <circle cx="0" cy="0" r="6" fill="none" stroke={fg} strokeWidth="1.5" />
              </g>
              {/* Display */}
              <rect x="15" y="110" width="80" height="20" rx="3" fill={isDark ? "#1e293b" : "#f1f5f9"} stroke={fg} strokeWidth="1" />
              <text x="55" y="123" fill={isDark ? "#22c55e" : "#16a34a"} fontSize="7" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                {selectedModel ? `${selectedModel.name?.substring(0, 15)} ${selectedModel.capacityA7W35}kW` : "R290 HP"}
              </text>
              <text x="55" y="148" fill={fg} fontSize="9" fontWeight="bold" textAnchor="middle">HŐSZIVATTYÚ</text>
              <text x="55" y="160" fill={subFg} fontSize="6.5" textAnchor="middle">R290 monoblokk</text>
              {/* HP connections */}
              <line x1="70" y1="200" x2="70" y2="240" stroke={fg} strokeWidth="2" />
              <line x1="85" y1="200" x2="85" y2="240" stroke={fg} strokeWidth="2" />
            </g>

            {/* ───── EMITTERS ───── */}
            <g transform="translate(890, 180)">
              {hydraulicState.secondaryLoops === "floor" || hydraulicState.secondaryLoops === "mixed" ? (
                <>
                  {/* Manifold */}
                  <rect x="0" y="30" width="14" height="60" rx="2" fill="none" stroke={fg} strokeWidth="1.5" />
                  <rect x="0" y="130" width="14" height="60" rx="2" fill="none" stroke={fg} strokeWidth="1.5" />
                  {/* Floor loops */}
                  <path d="M 14,40 H 100 Q 110,40 110,50 V 150 Q 110,160 100,160 H 14" fill="none" stroke={fg} strokeWidth="2" />
                  <path d="M 14,55 H 85 Q 95,55 95,65 V 135 Q 95,145 85,145 H 14" fill="none" stroke={fg} strokeWidth="2" />
                  <path d="M 14,70 H 70 Q 80,70 80,80 V 120 Q 80,130 70,130 H 14" fill="none" stroke={fg} strokeWidth="2" />
                  <text x="60" y="108" fill={fg} fontSize="8" fontWeight="bold" textAnchor="middle">PADLÓFŰTÉS</text>
                  <text x="60" y="118" fill={subFg} fontSize="6" textAnchor="middle">35°C</text>
                </>
              ) : null}

              {hydraulicState.secondaryLoops === "radiators" ? (
                <>
                  <line x1="0" y1="50" x2="30" y2="50" stroke={fg} strokeWidth="2" />
                  <line x1="0" y1="170" x2="30" y2="170" stroke={fg} strokeWidth="2" />
                  <rect x="30" y="10" width="100" height="180" rx="4" fill="none" stroke={fg} strokeWidth="2" />
                  {Array.from({ length: 6 }).map((_, i) => (
                    <line key={i} x1={42 + i * 14} y1="25" x2={42 + i * 14} y2="175" stroke={fg} strokeWidth="6" strokeLinecap="round" />
                  ))}
                  <text x="80" y="0" fill={fg} fontSize="8" fontWeight="bold" textAnchor="middle">RADIÁTOROK</text>
                  <text x="80" y="200" fill={subFg} fontSize="6" textAnchor="middle">55°C</text>
                </>
              ) : null}

              {hydraulicState.secondaryLoops === "fan_coil" ? (
                <>
                  <line x1="0" y1="50" x2="30" y2="50" stroke={fg} strokeWidth="2" />
                  <line x1="0" y1="170" x2="30" y2="170" stroke={fg} strokeWidth="2" />
                  <rect x="30" y="10" width="110" height="180" rx="6" fill="none" stroke={fg} strokeWidth="2" />
                  <rect x="45" y="20" width="80" height="30" rx="2" fill="none" stroke={fg} strokeWidth="1" />
                  {Array.from({ length: 6 }).map((_, i) => (
                    <line key={i} x1={50 + i * 12} y1="23" x2={50 + i * 12} y2="47" stroke={fg} strokeWidth="1" />
                  ))}
                  <circle cx="80" cy="100" r="20" fill="none" stroke={fg} strokeWidth="1" />
                  <line x1="80" y1="85" x2="80" y2="115" stroke={fg} strokeWidth="2" />
                  <line x1="65" y1="100" x2="95" y2="100" stroke={fg} strokeWidth="2" />
                  <text x="80" y="155" fill={fg} fontSize="8" fontWeight="bold" textAnchor="middle">FAN-COIL</text>
                  <text x="80" y="200" fill={subFg} fontSize="6" textAnchor="middle">45°C</text>
                </>
              ) : null}

              {hydraulicState.secondaryLoops === "mixed" && (
                <>
                  <line x1="0" y1="50" x2="30" y2="50" stroke={fg} strokeWidth="1.5" />
                  <line x1="0" y1="170" x2="30" y2="170" stroke={fg} strokeWidth="1.5" />
                  {/* Mini radiator */}
                  <rect x="40" y="100" width="60" height="80" rx="3" fill="none" stroke={fg} strokeWidth="1.5" />
                  {Array.from({ length: 3 }).map((_, i) => (
                    <line key={i} x1={47 + i * 18} y1="110" x2={47 + i * 18} y2="170" stroke={fg} strokeWidth="4" strokeLinecap="round" />
                  ))}
                  <text x="70" y="195" fill={subFg} fontSize="5.5" textAnchor="middle">Radiátor</text>
                  {/* Manifold */}
                  <rect x="40" y="10" width="10" height="45" rx="1.5" fill="none" stroke={fg} strokeWidth="1" />
                  <rect x="40" y="55" width="10" height="45" rx="1.5" fill="none" stroke={fg} strokeWidth="1" />
                  <path d="M 50,20 H 70 A 5,5 0 0 1 75,25 V 65" fill="none" stroke={fg} strokeWidth="1.5" />
                  <path d="M 50,60 H 70 A 5,5 0 0 0 75,55 V 45" fill="none" stroke={fg} strokeWidth="1.5" />
                  <text x="60" y="90" fill={fg} fontSize="6" textAnchor="middle">Padló</text>
                </>
              )}
            </g>

            {/* ───── LEGEND ───── */}
            <g transform="translate(10, 470)">
              <text x="0" y="0" fill={fg} fontSize="6" fontWeight="bold">Jelmagyarázat:</text>
              <line x1="0" y1="6" x2="20" y2="6" stroke={fg} strokeWidth="1.5" />
              <text x="24" y="9" fill={subFg} fontSize="5.5">Primer kör (HP ←→ HX/Ház)</text>
              <line x1="120" y1="6" x2="140" y2="6" stroke={fg} strokeWidth="1" />
              <text x="144" y="9" fill={subFg} fontSize="5.5">Szekunder kör (hőleadók)</text>
            </g>
          </svg>
        </div>

        {/* ───── SIDEBAR SPECS ───── */}
        <div className={`rounded-xl p-4 border flex flex-col space-y-3 ${
          isDark ? "bg-slate-950/40 border-slate-800" : "bg-slate-50 border-slate-200"
        }`}>
          <h3 className="font-extrabold text-[11px] uppercase tracking-wider">Rendszeradatok</h3>

          <div className="space-y-2 text-[9.5px]">
            <div className="flex justify-between">
              <span className={isDark ? "text-slate-400" : "text-slate-500"}>Csúcshőigény:</span>
              <span className="font-bold">{r.primaryFlowRateLh ? (r.primaryFlowRateLh * 1.163 * Number(hydraulicState.deltaT || 5) / 1000).toFixed(1) : "—"} kW</span>
            </div>
            <div className="flex justify-between">
              <span className={isDark ? "text-slate-400" : "text-slate-500"}>Primer tömegáram:</span>
              <span className="font-mono font-bold">{r.primaryMassFlowKgh} kg/h</span>
            </div>
            <div className="flex justify-between">
              <span className={isDark ? "text-slate-400" : "text-slate-500"}>Primer ΔT:</span>
              <span className="font-mono font-bold">{hydraulicState.deltaT} °C</span>
            </div>
            <div className="flex justify-between">
              <span className={isDark ? "text-slate-400" : "text-slate-500"}>Csőméret (primer):</span>
              <span className="font-mono font-bold">{r.recommendedPipeSize?.split("(")[0]}</span>
            </div>
            <div className="flex justify-between">
              <span className={isDark ? "text-slate-400" : "text-slate-500"}>Sebesség:</span>
              <span className="font-mono font-bold">{r.estimatedVelocityMs} m/s</span>
            </div>
            <div className="flex justify-between">
              <span className={isDark ? "text-slate-400" : "text-slate-500"}>Nyomásesés (cső):</span>
              <span className="font-mono font-bold">{r.primaryPipeLossKpa} kPa</span>
            </div>
            <div className="flex justify-between">
              <span className={isDark ? "text-slate-400" : "text-slate-500"}>Maradék pumpa:</span>
              <span className="font-mono font-bold">{r.remainingPumpHeadKpa} kPa</span>
            </div>
            {r.glycolPercentageUsed > 0 && (
              <div className="flex justify-between">
                <span className={isDark ? "text-slate-400" : "text-slate-500"}>Glikol:</span>
                <span className="font-mono font-bold">{r.glycolPercentageUsed}%</span>
              </div>
            )}
          </div>

          <hr className={isDark ? "border-slate-800" : "border-slate-200"} />

          {isHX && (
            <>
              <h3 className="font-extrabold text-[11px] uppercase tracking-wider">Szekunder</h3>
              <div className="space-y-2 text-[9.5px]">
                <div className="flex justify-between">
                  <span className={isDark ? "text-slate-400" : "text-slate-500"}>Tömegáram:</span>
                  <span className="font-mono font-bold">{r.secondaryMassFlowKgh} kg/h</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? "text-slate-400" : "text-slate-500"}>Csőméret:</span>
                  <span className="font-mono font-bold">{r.recommendedSecondaryPipeSize?.split("(")[0]}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? "text-slate-400" : "text-slate-500"}>Nyomásesés:</span>
                  <span className="font-mono font-bold">{r.secondaryPressureDropKpa} kPa</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? "text-slate-400" : "text-slate-500"}>Szivattyú:</span>
                  <span className="font-mono font-bold text-[8px] leading-tight text-right">{r.dabPumpModel?.substring(0, 25)}</span>
                </div>
              </div>
              <hr className={isDark ? "border-slate-800" : "border-slate-200"} />
            </>
          )}

          <h3 className="font-extrabold text-[11px] uppercase tracking-wider">Tágulási tartály</h3>
          <div className="space-y-2 text-[9.5px]">
            <div className="flex justify-between">
              <span className={isDark ? "text-slate-400" : "text-slate-500"}>Méret:</span>
              <span className="font-mono font-bold">{isHX ? `${r.primaryVesselSizeL}L / ${r.secondaryVesselSizeL}L` : `${r.vesselSizeL} L`}</span>
            </div>
            <div className="flex justify-between">
              <span className={isDark ? "text-slate-400" : "text-slate-500"}>Előfeszítés p₀:</span>
              <span className="font-mono font-bold">{r.prechargeCalculated} bar</span>
            </div>
            <div className="flex justify-between">
              <span className={isDark ? "text-slate-400" : "text-slate-500"}>Végnyomás pₑ:</span>
              <span className="font-mono font-bold">{r.finalCalculated} bar</span>
            </div>
          </div>

          <hr className={isDark ? "border-slate-800" : "border-slate-200"} />

          <h3 className="font-extrabold text-[11px] uppercase tracking-wider">Hőcserélő</h3>
          <div className="space-y-2 text-[9.5px]">
            <div className="flex justify-between">
              <span className={isDark ? "text-slate-400" : "text-slate-500"}>Típus:</span>
              <span className="font-mono font-bold text-[7px] text-right">{isHX ? r.recommendedExchangerModel?.substring(0, 30) : "Nincs"}</span>
            </div>
            <div className="flex justify-between">
              <span className={isDark ? "text-slate-400" : "text-slate-500"}>Felület:</span>
              <span className="font-mono font-bold">{isHX ? `${r.heatExchangerAreaM2} m²` : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className={isDark ? "text-slate-400" : "text-slate-500"}>HMV:</span>
              <span className="font-mono font-bold">{hydraulicState.includeDhwTank ? "Igen" : "Nem"}</span>
            </div>
            <div className="flex justify-between">
              <span className={isDark ? "text-slate-400" : "text-slate-500"}>Rendszertérfogat:</span>
              <span className="font-mono font-bold">{r.systemVolumeL} L</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};