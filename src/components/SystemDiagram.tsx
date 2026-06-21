// src/components/SystemDiagram.tsx
import React from "react";
import { HeatPumpModel, HydraulicInput, HydraulicResults } from "../types";
import { Info, List } from "lucide-react";

export interface SystemDiagramProps {
  /** Optional title displayed above the diagram */
  title?: string;
  /** Optional brief description */
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

  // Dynamic helper calculations
  const flowTempText =
    hydraulicState.secondaryLoops === "floor"
      ? "+35 °C (Padlófűtés)"
      : hydraulicState.secondaryLoops === "radiators"
      ? "+55 °C (Radiátor)"
      : hydraulicState.secondaryLoops === "fan_coil"
      ? "+50 °C (Fan-coil)"
      : "+45 °C (Kevert kör)";

  const vesselL = hydraulicState.includeHeatExchanger
    ? hydraulicResults.secondaryVesselSizeL
    : hydraulicResults.vesselSizeL;

  // Color variables for SVG
  const redColor = "#ef4444";
  const blueColor = "#3b82f6";
  const primaryPipeColor = hydraulicState.includeHeatExchanger ? "#10b981" : redColor; // Green if glycol
  const primaryReturnColor = hydraulicState.includeHeatExchanger ? "#06b6d4" : blueColor;

  return (
    <section
      className={`rounded-xl border shadow-md p-4 transition-all duration-300 flex flex-col ${
        isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-800"
      }`}
    >
      <div className="flex justify-between items-start gap-4 pb-3 border-b border-slate-250 dark:border-slate-800">
        <div>
          <h2 className="font-extrabold text-[12px] uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            {title}
          </h2>
          {description && (
            <p className={`text-[10px] mt-1 font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-950 border dark:border-slate-850 px-2.5 py-1 rounded">
          <Info className="w-3.5 h-3.5 text-blue-500" />
          <span>Statikus rendszerábra — elemek listája jobbra</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mt-4">
        {/* SVG Drawing Canvas (Spans 3 columns on desktop) */}
        <div className="lg:col-span-3 border dark:border-slate-850 rounded-xl p-2 bg-slate-950/5 dark:bg-slate-950/40 relative overflow-hidden flex items-center justify-center min-h-[380px]">
          <svg
            viewBox="0 0 1000 480"
            className="w-full h-auto max-w-[1000px] select-none"
            style={{ minHeight: "360px" }}
          >
            {/* GRID BACKGROUND */}
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <rect width="20" height="20" fill="none" stroke={isDark ? "#1e293b" : "#f1f5f9"} strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="1000" height="480" fill="url(#grid)" />

            {/* BASE ELEMENTS DEFINITIONS */}
            <defs>
              {/* Pump Icon */}
              <g id="dab-pump">
                <circle cx="0" cy="0" r="14" fill="#047857" stroke="#34d399" strokeWidth="1.5" />
                <polygon points="-4,-4 6,0 -4,4" fill="#ffffff" />
              </g>
              {/* Expansion Vessel Red */}
              <g id="expansion-vessel">
                <rect x="-12" y="-18" width="24" height="36" rx="12" fill="#dc2626" stroke="#ffffff" strokeWidth="1.5" />
                <line x1="0" y1="-18" x2="0" y2="-26" stroke="#475569" strokeWidth="1.5" />
              </g>
              {/* Heat Exchanger symbol */}
              <g id="heat-exchanger">
                <rect x="-20" y="-50" width="40" height="100" rx="6" fill={isDark ? "#1e293b" : "#f8fafc"} stroke="#f97316" strokeWidth="2.5" />
                {/* Internal channel representations */}
                <path d="M-10,-40 V 40" stroke="#ef4444" strokeWidth="2" strokeDasharray="3,3" />
                <path d="M 0,-40 V 40" stroke="#10b981" strokeWidth="2" strokeDasharray="3,3" />
                <path d="M 10,-40 V 40" stroke="#3b82f6" strokeWidth="2" strokeDasharray="3,3" />
              </g>
              {/* 3 Way Valve */}
              <g id="three-way-valve">
                <polygon points="-7,-7 7,0 -7,7" fill="#eab308" />
                <polygon points="-7,-7 0,7 7,-7" fill="#eab308" transform="rotate(90)" />
                <circle cx="0" cy="0" r="3.5" fill="#ffffff" />
              </g>
              {/* Y filter */}
              <g id="y-filter">
                <rect x="-8" y="-12" width="16" height="24" rx="2" fill={isDark ? "#475569" : "#64748b"} stroke="#ffffff" strokeWidth="1" />
                <path d="M-4,-4 L4,4 M-4,4 L4,-4" stroke="#ffffff" strokeWidth="1" />
                <circle cx="0" cy="0" r="3" fill="#ef4444" />
              </g>
              {/* Freeze Protection Valve */}
              <g id="freeze-valve">
                <circle cx="0" cy="0" r="8" fill={isDark ? "#fef2f2" : "#fff"} stroke="#dc2626" strokeWidth="1.5" />
                <path d="M-5,0 L5,0" stroke="#dc2626" strokeWidth="1.5" />
                <path d="M0,-5 L0,5" stroke="#dc2626" strokeWidth="1.5" />
                <circle cx="0" cy="0" r="1.5" fill="#dc2626" />
              </g>
            </defs>

            {/* CLIMATIC DIVIDING ZONE (OUTSIDE / INSIDE WALL) */}
            <rect x="150" y="20" width="12" height="440" rx="3" fill={isDark ? "#334155" : "#cbd5e1"} opacity="0.4" />
            <text x="156" y="450" fill={isDark ? "#475569" : "#94a3b8"} fontSize="8.5" fontWeight="bold" textAnchor="middle" transform="rotate(-90 156 450)">HÁZFAL (KÜLTÉR / BELTÉR HATÁR)</text>

            {/* ======================= PIPELINES ======================= */}
            {/* 1. Primary circuit flow (Hot) from HP to house */}
            <path d="M 120,240 H 220" fill="none" stroke={primaryPipeColor} strokeWidth="3" />
            {/* 2. Primary circuit return (Cold) back to HP */}
            <path d="M 220,360 H 120" fill="none" stroke={primaryReturnColor} strokeWidth="3" />

            {/* Freeze Protection Valve on primary return */}
            <g transform="translate(145, 360)">
              <use href="#freeze-valve" />
              <text x="0" y="-14" fill="#dc2626" fontSize="6.5" fontWeight="bold" textAnchor="middle">Fagyv.</text>
            </g>

            {/* HMV Diverter Branching */}
            {hydraulicState.includeDhwTank ? (
              <>
                {/* Connection from diverter valve to DHW coil */}
                <path d="M 220,240 V 120 H 320" fill="none" stroke={primaryPipeColor} strokeWidth="3" />
                {/* Connection from DHW coil back to main Return */}
                <path d="M 320,170 H 260 V 360" fill="none" stroke={primaryReturnColor} strokeWidth="3" />
                {/* Node connector dot */}
                <circle cx="260" cy="360" r="4.5" fill={primaryReturnColor} stroke="#ffffff" strokeWidth="1.5" />
              </>
            ) : null}

            {/* Main Separation logic (HX vs Buffer vs LLH vs Direct) */}
            {hydraulicState.includeHeatExchanger ? (
              <>
                {/* PRIMARY LOOP to HX */}
                <path d="M 220,240 H 420" fill="none" stroke={primaryPipeColor} strokeWidth="3" />
                <path d="M 420,360 H 260" fill="none" stroke={primaryReturnColor} strokeWidth="3" />

                {/* Lemezes hőcserélő placement */}
                <g>
                  <use href="#heat-exchanger" x="440" y="300" />
                  <text x="440" y="240" fill="#f97316" fontSize="8" fontWeight="black" textAnchor="middle">HŐCSERÉLŐ (HX)</text>
                </g>

                {/* SZEKUNDER LOOP (Water circuit) from HX */}
                {/* Secondary Flow (Hot Red) */}
                <path d="M 460,250 H 700" fill="none" stroke={redColor} strokeWidth="3.5" />
                
                {/* Secondary Return (Cold Blue) */}
                <path d="M 700,350 H 550 V 380 H 465" fill="none" stroke={blueColor} strokeWidth="3.5" />
                
                {/* Buffer on secondary return - cross-connected bottom-to-top */}
                <g>
                  <rect x="470" y="310" width="70" height="120" rx="6" fill={isDark ? "#1e293b" : "#f8fafc"} stroke="#f43f5e" strokeWidth="2" />
                  <text x="505" y="370" fill={isDark ? "#cbd5e1" : "#475569"} fontSize="8.5" fontWeight="black" textAnchor="middle">SOROS PUFFER</text>
                  <text x="505" y="395" fill="#f43f5e" fontSize="7.5" fontWeight="bold" textAnchor="middle">{hydraulicState.additionalWaterVolumeL || 100} L</text>
                  {/* Cross connection: flow enters bottom, exits top */}
                  <path d="M 470,350 H 460 V 240 H 470" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="3,2" />
                  <path d="M 540,340 H 550 V 440 H 540" fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="3,2" />
                </g>

                {/* Secondary circulation pump */}
                <g>
                  <use href="#dab-pump" x="580" y="250" />
                  <text x="580" y="230" fill="#10b981" fontSize="8" fontWeight="bold" textAnchor="middle">Szekunder pumpa</text>
                </g>

                {/* Secondary Expansion Vessel */}
                <g>
                  <use href="#expansion-vessel" x="650" y="410" />
                  <path d="M 650,350 V 390" fill="none" stroke={blueColor} strokeWidth="2" />
                  <text x="650" y="438" fill={isDark ? "#cbd5e1" : "#475569"} fontSize="7.5" fontWeight="bold" textAnchor="middle">Szekunder Tág.</text>
                  <text x="650" y="448" fill="#dc2626" fontSize="7.5" fontWeight="bold" textAnchor="middle">{vesselL} L</text>
                </g>

                {/* Primary Expansion Vessel (on primary return) */}
                <g>
                  <use href="#expansion-vessel" x="300" y="410" />
                  <path d="M 300,360 V 390" fill="none" stroke={primaryReturnColor} strokeWidth="2" />
                  <text x="300" y="438" fill={isDark ? "#cbd5e1" : "#475569"} fontSize="7.5" fontWeight="bold" textAnchor="middle">Primer Tág.</text>
                  <text x="300" y="448" fill="#dc2626" fontSize="7.5" fontWeight="bold" textAnchor="middle">{hydraulicResults.primaryVesselSizeL} L</text>
                </g>
              </>
            ) : (
              <>
                {/* DIRECT SYSTEM WITH BUFFER OR BYPASS */}
                {/* Flow lines */}
                <path d="M 220,240 H 420" fill="none" stroke={redColor} strokeWidth="3.5" />
                {/* Return lines */}
                <path d="M 420,360 H 260" fill="none" stroke={blueColor} strokeWidth="3.5" />

                {hydraulicState.additionalWaterVolumeL >= 50 ? (
                  <>
                  {/* 4-port Buffer tank with cross-connection bottom-to-top */}
                  <g>
                    <rect x="420" y="190" width="70" height="200" rx="8" fill={isDark ? "#1e293b" : "#f8fafc"} stroke={blueColor} strokeWidth="2.5" />
                    <text x="455" y="290" fill={isDark ? "#94a3b8" : "#475569"} fontSize="8" fontWeight="black" textAnchor="middle" transform="rotate(-90 455 290)">PUFFER TARTÁLY</text>
                    <text x="455" y="330" fill={blueColor} fontSize="8.5" fontWeight="black" textAnchor="middle">{hydraulicState.additionalWaterVolumeL} L</text>
                    {/* Cross connections: primary bottom, secondary top */}
                    <path d="M 420,360 H 380 V 240 H 420" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="3,2" />
                    <path d="M 490,240 H 700" fill="none" stroke="#ef4444" strokeWidth="3.5" />
                    <path d="M 700,350 H 490" fill="none" stroke={blueColor} strokeWidth="3.5" />
                  </g>

                    {/* Secondary pump is needed after LLH buffer */}
                    <g>
                      <use href="#dab-pump" x="550" y="240" />
                      <text x="550" y="220" fill="#10b981" fontSize="8" fontWeight="bold" textAnchor="middle">Keringtető sziv.</text>
                    </g>
                  </>
                ) : (
                  <>
                    {/* Direct connection flow and return */}
                    <path d="M 420,240 H 700" fill="none" stroke={redColor} strokeWidth="3.5" />
                    <path d="M 700,350 H 420" fill="none" stroke={blueColor} strokeWidth="3.5" />
                    
                    {/* Differential bypass line */}
                    <path d="M 400,240 V 360" fill="none" stroke="#64748b" strokeWidth="2" strokeDasharray="4,2" />
                    <circle cx="400" cy="300" r="6" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" />
                    <text x="400" y="290" fill={isDark ? "#94a3b8" : "#64748b"} fontSize="7" fontWeight="bold" textAnchor="middle">Bypass szelep</text>
                  </>
                )}

                {/* Central System Expansion Vessel */}
                <g>
                  <use href="#expansion-vessel" x="350" y="410" />
                  <path d="M 350,360 V 390" fill="none" stroke={blueColor} strokeWidth="2" />
                  <text x="350" y="438" fill={isDark ? "#cbd5e1" : "#475569"} fontSize="8" fontWeight="black" textAnchor="middle">Tágulási tartály</text>
                  <text x="350" y="448" fill="#dc2626" fontSize="8.5" fontWeight="black" textAnchor="middle">{vesselL} L</text>
                </g>
              </>
            )}

            {/* INDIRECT DHW CYLINDER SECTION */}
            {hydraulicState.includeDhwTank ? (
              <>
                {/* 3-way diverter valve placement */}
                <g>
                  <use href="#three-way-valve" x="220" y="240" />
                </g>
                
                {/* DHW tank jacket */}
                <g>
                  <rect x="320" y="50" width="100" height="150" rx="8" fill={isDark ? "#2e1065" : "#fdf4ff"} stroke="#d946ef" strokeWidth="2.5" />
                  <text x="370" y="70" fill={isDark ? "#f0abfc" : "#c026d3"} fontSize="9.5" fontWeight="black" textAnchor="middle">HMV TÁROLÓ</text>
                  
                  {/* Coiled heat exchanger coil inside tank */}
                  <path d="M 320,120 C 350,120 390,130 370,140 C 350,150 390,160 370,170 L 320,170" fill="none" stroke={primaryPipeColor} strokeWidth="3" strokeLinecap="round" />
                  
                  {/* Domestic Water input and output */}
                  {/* Cold water input */}
                  <path d="M 330,200 V 220 H 310" fill="none" stroke="#0ea5e9" strokeWidth="2" />
                  <text x="290" y="223" fill="#0ea5e9" fontSize="7" fontWeight="bold">Hálózati hidegvíz</text>
                  
                  {/* Hot sanitary water output */}
                  <path d="M 370,50 V 30 H 440" fill="none" stroke="#ec4899" strokeWidth="2.5" />
                  <text x="445" y="28" fill="#ec4899" fontSize="8.5" fontWeight="black" textAnchor="start">SZANITER MELEGVÍZ (HMV)</text>
                  
                  {/* Shower head drawing */}
                  <path d="M 450,15 H 465 A 8,8 0 0 1 473,23 V 25" fill="none" stroke="#ec4899" strokeWidth="2" />
                  <path d="M 468,25 H 478 L 476,28 H 470 Z" fill="#ec4899" />
                  {/* Water drops */}
                  <circle cx="471" cy="33" r="0.8" fill="#38bdf8" />
                  <circle cx="475" cy="33" r="0.8" fill="#38bdf8" />
                </g>
              </>
            ) : null}

            {/* MAGNETIC FILTER (Y-FILTER) on Main return line */}
            <g>
              <use href="#y-filter" x="180" y="360" transform="rotate(-90 180 360)" />
              <text x="180" y="390" fill={isDark ? "#cbd5e1" : "#475569"} fontSize="8" fontWeight="bold" textAnchor="middle">Iszapleválasztó</text>
            </g>

            {/* ======================= EQUIPMENT UNITS ======================= */}
            
            {/* HEAT PUMP CHASSIS DRAWING */}
            <g
              transform="translate(15, 200)"
            >
              <rect x="0" y="0" width="110" height="190" rx="8" fill={isDark ? "#1e293b" : "#ffffff"} stroke={isDark ? "#475569" : "#cbd5e1"} strokeWidth="2.5" />
              {/* Fan grid */}
              <circle cx="55" cy="65" r="35" fill={isDark ? "#0f172a" : "#f8fafc"} stroke={isDark ? "#334155" : "#e2e8f0"} strokeWidth="2" />
              <circle cx="55" cy="65" r="28" fill="none" stroke={isDark ? "#334155" : "#e2e8f0"} strokeWidth="1.5" strokeDasharray="5,3" />
              
              {/* Fan Blades (Rotated 45 deg) */}
              <g transform="translate(55, 65) rotate(45)">
                <ellipse cx="0" cy="0" rx="30" ry="8" fill={isDark ? "#475569" : "#94a3b8"} opacity="0.8" />
                <ellipse cx="0" cy="0" rx="8" ry="30" fill={isDark ? "#475569" : "#94a3b8"} opacity="0.8" />
                <circle cx="0" cy="0" r="7" fill={isDark ? "#1e293b" : "#ffffff"} />
              </g>
              
              {/* Controller Screen display */}
              <rect x="15" y="115" width="80" height="22" rx="3" fill="#020617" stroke="#1e293b" />
              <text x="55" y="129" fill="#22c55e" fontSize="7.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                R290 {selectedModel ? selectedModel.capacityA7W35 + ' kW' : '9.0 kW'}
              </text>
              
              <text x="55" y="155" fill={isDark ? "#38bdf8" : "#0284c7"} fontSize="11" fontWeight="black" textAnchor="middle">KÜLTÉRI EGYSÉG</text>
              <text x="55" y="170" fill={isDark ? "#94a3b8" : "#64748b"} fontSize="8" fontWeight="bold" textAnchor="middle">HŐSZIVATTYÚ</text>
            </g>

            {/* EMITTERS SECTION DRAWING */}
            <g
              transform="translate(710, 160)"
            >
              {hydraulicState.secondaryLoops === "floor" || hydraulicState.secondaryLoops === "mixed" ? (
                <>
                  {/* Manifolds */}
                  <rect x="0" y="30" width="16" height="70" rx="2" fill="#ef4444" />
                  <rect x="0" y="140" width="16" height="70" rx="2" fill="#3b82f6" />
                  <text x="-12" y="65" fill="#ef4444" fontSize="11" fontWeight="black">&gt;</text>
                  <text x="-12" y="175" fill="#3b82f6" fontSize="11" fontWeight="black">&lt;</text>
                  
                  {/* Floor heating loops representation */}
                  <path d="M 16,50 H 130 A 10,10 0 0 1 140,60 V 160 A 10,10 0 0 1 130,170 H 16" fill="none" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
                  <path d="M 16,65 H 115 A 10,10 0 0 1 125,75 V 145 A 10,10 0 0 1 115,155 H 16" fill="none" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
                  <path d="M 16,80 H 100 A 10,10 0 0 1 110,90 V 130 A 10,10 0 0 1 100,140 H 16" fill="none" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
                  
                  {/* Description Box */}
                  <rect x="35" y="90" width="115" height="40" rx="4" fill={isDark ? "#1e293b" : "#ffffff"} stroke={isDark ? "#475569" : "#cbd5e1"} strokeWidth="1.5" />
                  <text x="92" y="105" fill={isDark ? "#f59e0b" : "#d97706"} fontSize="9.5" fontWeight="black" textAnchor="middle">PADLÓFŰTÉS</text>
                  <text x="92" y="120" fill={isDark ? "#94a3b8" : "#555555"} fontSize="8" fontWeight="bold" textAnchor="middle">{flowTempText}</text>
                </>
              ) : null}

              {hydraulicState.secondaryLoops === "radiators" ? (
                <>
                  <path d="M 0,50 H 40" fill="none" stroke="#ef4444" strokeWidth="3" />
                  <path d="M 0,170 H 40" fill="none" stroke="#3b82f6" strokeWidth="3" />
                  
                  {/* Radiator radiator elements visual */}
                  <g transform="translate(40, 20)">
                    <rect x="0" y="0" width="110" height="170" rx="4" fill={isDark ? "#1e293b" : "#f1f5f9"} stroke={isDark ? "#64748b" : "#cbd5e1"} strokeWidth="2" />
                    {Array.from({ length: 6 }).map((_, i) => (
                      <line key={i} x1={15 + i * 16} y1="15" x2={15 + i * 16} y2="155" stroke={isDark ? "#334155" : "#cbd5e1"} strokeWidth="7" strokeLinecap="round" />
                    ))}
                    <text x="55" y="-12" fill={isDark ? "#f43f5e" : "#e11d48"} fontSize="9.5" fontWeight="black" textAnchor="middle">RADIÁTOR KÖR</text>
                    <text x="55" y="190" fill={isDark ? "#94a3b8" : "#64748b"} fontSize="8" fontWeight="bold" textAnchor="middle">{flowTempText}</text>
                  </g>
                </>
              ) : null}

              {hydraulicState.secondaryLoops === "fan_coil" ? (
                <>
                  <path d="M 0,50 H 30" fill="none" stroke="#ef4444" strokeWidth="3" />
                  <path d="M 0,170 H 30" fill="none" stroke="#3b82f6" strokeWidth="3" />
                  
                  {/* Fan-Coil Box representation */}
                  <g transform="translate(30, 20)">
                    <rect x="0" y="0" width="120" height="170" rx="8" fill={isDark ? "#1e293b" : "#f1f5f9"} stroke="#0ea5e9" strokeWidth="2.5" />
                    {/* Air grids */}
                    <rect x="15" y="15" width="90" height="35" rx="3" fill="#020617" />
                    {Array.from({ length: 8 }).map((_, i) => (
                      <line key={i} x1={22 + i * 10} y1="20" x2={22 + i * 10} y2="45" stroke="#1e293b" strokeWidth="2" />
                    ))}
                    {/* Fan blades inside FCU */}
                    <circle cx="60" cy="100" r="24" fill="none" stroke={isDark ? "#334155" : "#cbd5e1"} strokeWidth="1.5" />
                    <line x1="60" y1="80" x2="60" y2="120" stroke={isDark ? "#475569" : "#94a3b8"} strokeWidth="3" />
                    <line x1="40" y1="100" x2="80" y2="100" stroke={isDark ? "#475569" : "#94a3b8"} strokeWidth="3" />
                    
                    <text x="60" y="152" fill="#0ea5e9" fontSize="10" fontWeight="black" textAnchor="middle">FAN-COIL KÖR</text>
                    <text x="60" y="190" fill={isDark ? "#94a3b8" : "#64748b"} fontSize="8" fontWeight="bold" textAnchor="middle">{flowTempText}</text>
                  </g>
                </>
              ) : null}

              {/* Mixed loop: show both (reduced sizes) side-by-side */}
              {hydraulicState.secondaryLoops === "mixed" && (
                <>
                  <path d="M 16,50 H 50" fill="none" stroke="#ef4444" strokeWidth="2" />
                  {/* Mini-radiator and manifold connections */}
                  <g transform="translate(50, 115)">
                    <rect x="0" y="0" width="80" height="90" rx="3" fill={isDark ? "#1e293b" : "#f1f5f9"} stroke={isDark ? "#64748b" : "#cbd5e1"} strokeWidth="1.5" />
                    {Array.from({ length: 4 }).map((_, i) => (
                      <line key={i} x1={12 + i * 18} y1="10" x2={12 + i * 18} y2="80" stroke={isDark ? "#334155" : "#cbd5e1"} strokeWidth="4" />
                    ))}
                    <text x="40" y="-8" fill={isDark ? "#f43f5e" : "#e11d48"} fontSize="8.5" fontWeight="black" textAnchor="middle">RADIÁTOROK</text>
                  </g>
                  {/* Connect mini radiator */}
                  <path d="M 50,145 H 16" fill="none" stroke="#3b82f6" strokeWidth="2" />
                </>
              )}
            </g>
          </svg>
        </div>

        {/* Dynamic Descriptive Sidebar Info Panel (Spans 1 column) */}
        <div className="flex flex-col justify-between">
          <div
            className={`rounded-xl p-4 border flex-grow flex flex-col justify-start transition-all duration-300 ${
              isDark ? "bg-slate-950/40 border-slate-800" : "bg-slate-50 border-slate-200"
            }`}
          >
            <div className="flex items-center gap-2 pb-2.5 border-b border-dashed dark:border-slate-850">
              <List className="w-5 h-5 text-blue-500 shrink-0" />
              <h3 className="font-extrabold text-[11px] uppercase tracking-wider">Rendszerkomponensek</h3>
            </div>
            
            <div className="mt-3 space-y-2 text-[9.5px]">
              <div className="flex items-center gap-2">
                <rect className="w-3 h-3 rounded" fill={isDark ? "#1e293b" : "#ffffff"} stroke={isDark ? "#475569" : "#cbd5e1"} strokeWidth="1.5" />
                <span className={`font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>Hőszivattyú (R290)</span>
              </div>
              <div className="flex items-center gap-2">
                <circle cx="6" cy="6" r="5" fill="none" stroke="#10b981" strokeWidth="1.5" />
                <span className={`font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>Keringtető szivattyú</span>
              </div>
              <div className="flex items-center gap-2">
                <line x1="0" y1="6" x2="12" y2="6" stroke="#dc2626" strokeWidth="2" />
                <span className={`font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>Tágulási tartály ({vesselL} L)</span>
              </div>
              {hydraulicState.includeDhwTank && (
                <div className="flex items-center gap-2">
                  <rect className="w-3 h-4 rounded-sm" fill="none" stroke="#d946ef" strokeWidth="1.5" />
                  <span className={`font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>HMV tároló</span>
                </div>
              )}
              {hydraulicState.includeHeatExchanger ? (
                <div className="flex items-center gap-2">
                  <rect className="w-3 h-3" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
                  <span className={`font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>Közegleválasztó (HX)</span>
                </div>
              ) : hydraulicState.includeBuffer ? (
                <div className="flex items-center gap-2">
                  <rect className="w-3 h-4 rounded-sm" fill="none" stroke={isDark ? "#3b82f6" : "#2563eb"} strokeWidth="1.5" />
                  <span className={`font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>Puffer tartály</span>
                </div>
              ) : null}
              <div className="flex items-center gap-2">
                <line x1="0" y1="6" x2="12" y2="6" stroke="#64748b" strokeWidth="1.5" strokeDasharray="2,1" />
                <span className={`font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>By-pass szelep</span>
              </div>
              <div className="flex items-center gap-2">
                <line x1="0" y1="6" x2="12" y2="6" stroke={isDark ? "#3b82f6" : "#60a5fa"} strokeWidth="2" />
                <span className={`font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>Fagyvédelmi szelep (primer visszatérő)</span>
              </div>
              <div className="flex items-center gap-2">
                <circle cx="6" cy="6" r="4" fill="#cbd5e1" stroke="#475569" strokeWidth="1" />
                <span className={`font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>Iszapleválasztó</span>
              </div>
              <div className="flex items-center gap-2">
                <rect className="w-3 h-3" fill="none" stroke="#ef4444" strokeWidth="1.5" />
                <span className={`font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  {hydraulicState.secondaryLoops === "floor" ? "Padlófűtés" : "Hőleadók (radiátor/fan-coil)"}
                </span>
              </div>
            </div>
          </div>
          
          {/* Quick specs overview box at the bottom */}
          <div
            className={`rounded-xl p-3 border mt-3 transition-all duration-300 text-[10px] space-y-1.5 ${
              isDark ? "bg-slate-950/20 border-slate-800 text-slate-300" : "bg-white border-slate-200 text-slate-700"
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-450">Tágulási tartály:</span>
              <span className="font-mono font-bold text-red-500">{vesselL} L</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-450">Közegleválasztó (HX):</span>
              <span className="font-mono font-bold">
                {hydraulicState.includeHeatExchanger ? "Beépítve" : "Nincs"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-450">HMV csomag:</span>
              <span className="font-mono font-bold">
                {hydraulicState.includeDhwTank ? "200-300 L tartály" : "Nincs"}
              </span>
            </div>
            <div className="flex justify-between items-center border-t dark:border-slate-850 pt-1.5 mt-1.5">
              <span className="font-bold text-[9px] uppercase">Fűtési csúcsáramlás:</span>
              <span className="font-mono font-bold text-blue-500">{hydraulicResults.flowRateLh} L/h</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
