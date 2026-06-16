import React from 'react';
import { HeatPumpModel, HydraulicResults, HydraulicInput } from '../types';
import { GitCommit, ShieldCheck, Layers } from 'lucide-react';

interface SystemDiagramProps {
  selectedModel: HeatPumpModel | null;
  hydraulicResults: HydraulicResults;
  emitterType: 'floor' | 'radiator' | 'cool18' | 'cool12' | 'fan_coil' | 'mixed';
  hydraulicState: HydraulicInput;
  theme?: 'light' | 'dark';
}

export const SystemDiagram: React.FC<SystemDiagramProps> = ({
  selectedModel,
  hydraulicResults,
  emitterType,
  hydraulicState,
  theme = 'dark'
}) => {
  const isDark = theme === 'dark';
  
  const hasExchanger = hydraulicState.includeHeatExchanger;
  const hasBuffer = !hasExchanger && (hydraulicState.additionalWaterVolumeL || 0) > 0;
  const isDirect = !hasExchanger && (!hydraulicState.additionalWaterVolumeL || hydraulicState.additionalWaterVolumeL === 0);

  return (
    <div className={`rounded-md border flex flex-col overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`} id="system-diagram">
      
      <div className={`px-4 py-3 border-b flex items-center justify-between ${isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'}`}>
        <div className="flex items-center gap-2">
          <span className="font-bold text-xs uppercase tracking-wider">
            Folytonos Kapcsolási Sémavázlat
          </span>
        </div>
      </div>

      <div className={`overflow-x-auto select-none flex justify-center p-6 min-h-[440px] ${isDark ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
        <svg
          viewBox="0 0 900 360"
          className="w-full h-auto max-w-[1000px] drop-shadow-sm"
          style={{ minHeight: '380px' }}
        >
          <defs>
            <marker id="arrowRed" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
            </marker>
            <marker id="arrowBlue" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
            </marker>
          </defs>

          {/* BACKGROUND ZONES */}
          <rect x="20" y="20" width="160" height="320" fill={isDark ? "#1e293b" : "#f1f5f9"} rx="6" />
          <text x="100" y="45" fill={isDark ? "#475569" : "#94a3b8"} fontSize="11" fontWeight="bold" textAnchor="middle" letterSpacing="3">KÜLTÉR</text>
          
          <rect x="200" y="20" width="670" height="320" fill={isDark ? "#0f172a" : "#ffffff"} rx="6" stroke={isDark ? "#1e293b" : "#e2e8f0"} strokeWidth="2" />
          <text x="535" y="45" fill={isDark ? "#475569" : "#94a3b8"} fontSize="11" fontWeight="bold" textAnchor="middle" letterSpacing="3">BELTÉRI GÉPÉSZET</text>

          {/* MAIN HORIZONTAL PIPES */}
          {/* Primary Flow */}
          <path d={`M 140 120 L 460 120`} fill="none" stroke="#ef4444" strokeWidth="3.5" markerMid="url(#arrowRed)" />
          {/* Primary Return */}
          <path d={`M 460 240 L 140 240`} fill="none" stroke="#3b82f6" strokeWidth="3.5" markerMid="url(#arrowBlue)" />

          {/* Secondary Pipes */}
          {/* Sec Flow */}
          <path d={`M 540 120 L 760 120`} fill="none" stroke="#ef4444" strokeWidth="3.5" />
          <path d={`M 660 120 L 730 120`} fill="none" stroke="none" markerEnd="url(#arrowRed)" />
          {/* Sec Return */}
          <path d={`M 760 240 L 540 240`} fill="none" stroke="#3b82f6" strokeWidth="3.5" />
          <path d={`M 760 240 L 660 240`} fill="none" stroke="none" markerEnd="url(#arrowBlue)" />


          {/* 1. HEAT PUMP */}
          <g transform="translate(60, 120)">
            <rect x="0" y="-20" width="80" height="160" rx="4" fill={isDark ? "#334155" : "#e2e8f0"} stroke={isDark ? "#475569" : "#cbd5e1"} strokeWidth="2" />
            <circle cx="40" cy="60" r="22" fill={isDark ? "#1e293b" : "#cbd5e1"} />
            <text x="40" y="105" fill={isDark ? "#f8fafc" : "#334155"} fontSize="10" fontWeight="bold" textAnchor="middle">Monoblokk</text>
            <circle cx="0" cy="-20" r="9" fill="#10b981" />
            <text x="0" y="-16.5" fill="#fff" fontSize="9" fontWeight="bold" textAnchor="middle">1</text>
          </g>

          {/* 2. FROST VALVES */}
          <g transform="translate(180, 120)">
             <polygon points="-5,-6 5,6 -5,6" fill={isDark ? "#60a5fa" : "#3b82f6"} />
          </g>
          <g transform="translate(180, 240)">
             <polygon points="-5,-6 5,6 -5,6" fill={isDark ? "#60a5fa" : "#3b82f6"} transform="rotate(180)" />
             <text x="0" y="20" fill={isDark ? "#94a3b8" : "#64748b"} fontSize="9" fontWeight="bold" textAnchor="middle">FAGY</text>
          </g>

          {/* 3-4-5. DHW BRANCH AND COMPONENTS */}
          {hydraulicState.includeDhwTank && (
            <g>
              {/* 3-way valve at Flow (Red) */}
              <g transform="translate(260, 120)">
                <polygon points="-8,-6 8,-6 0,2" fill="#f59e0b" />
                <polygon points="-8,6 8,6 0,2" fill="#f59e0b" />
                <polygon points="6,-8 6,8 0,2" fill="#f59e0b" />
                <text x="0" y="20" fill="#f59e0b" fontSize="9" fontWeight="bold" textAnchor="middle">3-J</text>
              </g>

              {/* DHW Flow Branch */}
              <path d="M 260 120 V 60 H 320" fill="none" stroke="#ef4444" strokeWidth="3" />
              {/* DHW Return Branch */}
              <path d="M 320 100 H 220 V 240" fill="none" stroke="#3b82f6" strokeWidth="3" />
              <circle cx="220" cy="240" r="3" fill="#3b82f6" />

              {/* DHW Tank */}
              <g transform="translate(320, 40)">
                 <rect x="0" y="0" width="50" height="70" rx="8" fill={isDark ? "#1e293b" : "#f1f5f9"} stroke="#8b5cf6" strokeWidth="2" />
                 <text x="25" y="40" fill="#8b5cf6" fontSize="10" fontWeight="bold" textAnchor="middle">HMV</text>
                 <circle cx="0" cy="0" r="9" fill="#10b981" />
                 <text x="0" y="3.5" fill="#fff" fontSize="9" fontWeight="bold" textAnchor="middle">3</text>
              </g>
            </g>
          )}

          {/* FILTER */}
          <g transform="translate(320, 240)">
             <rect x="-8" y="-10" width="16" height="20" rx="3" fill={isDark ? "#475569" : "#64748b"} />
             <text x="0" y="22" fill={isDark ? "#94a3b8" : "#64748b"} fontSize="9" fontWeight="bold" textAnchor="middle">ISZAP</text>
          </g>

          {/* PRIMARY EXPANSION TANK */}
          <g transform="translate(400, 240)">
             <path d="M 0 0 V 40" fill="none" stroke="#3b82f6" strokeWidth="2" />
             <rect x="-12" y="40" width="24" height="36" rx="12" fill="#ef4444" stroke="#fff" strokeWidth="1.5"/>
             <text x="0" y="90" fill={isDark ? "#94a3b8" : "#64748b"} fontSize="9" fontWeight="bold" textAnchor="middle">TÁG. T.</text>
          </g>

          {/* CENTRAL COUPLING (Heat Exchanger / Buffer / Direct) */}
          <g transform="translate(460, 90)">
            {hasExchanger ? (
              <g>
                <rect x="0" y="0" width="24" height="180" rx="3" fill="#f97316" />
                <text x="12" y="90" fill="#fff" fontSize="9" fontWeight="bold" textAnchor="middle" transform="rotate(-90 12 90)">LEMEZES</text>
                
                {/* Secondary Buffer Link */}
                <path d="M 24 30 H 40" fill="none" stroke="#ef4444" strokeWidth="3" />
                <path d="M 24 150 H 40" fill="none" stroke="#3b82f6" strokeWidth="3" />
                
                <rect x="40" y="0" width="40" height="180" rx="6" fill={isDark ? "#1e293b" : "#e2e8f0"} stroke="#10b981" strokeWidth="2" />
                <text x="60" y="90" fill={isDark ? "#94a3b8" : "#64748b"} fontSize="9" fontWeight="bold" textAnchor="middle" transform="rotate(-90 60 90)">PUFFER</text>
              </g>
            ) : hasBuffer ? (
              <g>
                <rect x="15" y="0" width="50" height="180" rx="8" fill={isDark ? "#334155" : "#e2e8f0"} stroke="#f43f5e" strokeWidth="2" />
                <text x="40" y="90" fill={isDark ? "#e2e8f0" : "#334155"} fontSize="10" fontWeight="bold" textAnchor="middle" transform="rotate(-90 40 90)">PUFFER</text>
                {/* Connections In */}
                <path d="M 0 30 H 15" fill="none" stroke="#ef4444" strokeWidth="3" />
                <path d="M 0 150 H 15" fill="none" stroke="#3b82f6" strokeWidth="3" />
                {/* Connections Out */}
                <path d="M 65 30 H 80" fill="none" stroke="#ef4444" strokeWidth="3" />
                <path d="M 65 150 H 80" fill="none" stroke="#3b82f6" strokeWidth="3" />
              </g>
            ) : (
              <g>
                <path d="M 0 30 H 80" fill="none" stroke="#ef4444" strokeWidth="3.5" strokeDasharray="6 4" />
                <path d="M 0 150 H 80" fill="none" stroke="#3b82f6" strokeWidth="3.5" strokeDasharray="6 4" />
                <text x="40" y="90" fill={isDark ? "#94a3b8" : "#64748b"} fontSize="10" fontWeight="bold" textAnchor="middle">DIREKT</text>
              </g>
            )}
            <circle cx="40" cy="-10" r="9" fill="#10b981" />
            <text x="40" y="-6.5" fill="#fff" fontSize="9" fontWeight="bold" textAnchor="middle">5</text>
          </g>

          {/* SECONDARY COMPONENTS */}
          {/* Secondary Pump */}
          {(hasExchanger || hasBuffer) && (
            <g transform="translate(580, 120)">
              <circle cx="0" cy="0" r="12" fill={isDark ? "#059669" : "#10b981"} stroke={isDark ? "#047857" : "#059669"} strokeWidth="2" />
              <polygon points="-5,-6 7,0 -5,6" fill="#fff" />
              <text x="0" y="24" fill={isDark ? "#34d399" : "#059669"} fontSize="9" fontWeight="bold" textAnchor="middle">SZIV.</text>
              <circle cx="0" cy="-24" r="9" fill="#10b981" />
              <text x="0" y="-20.5" fill="#fff" fontSize="9" fontWeight="bold" textAnchor="middle">6</text>
            </g>
          )}

          {/* Secondary Expansion Tank (Only if Heat Exchanger separates the loops) */}
          {hasExchanger && (
            <g transform="translate(680, 240)">
               <path d="M 0 0 V 40" fill="none" stroke="#3b82f6" strokeWidth="2" />
               <rect x="-12" y="40" width="24" height="36" rx="12" fill="#ef4444" stroke="#fff" strokeWidth="1.5"/>
               <text x="0" y="90" fill={isDark ? "#94a3b8" : "#64748b"} fontSize="9" fontWeight="bold" textAnchor="middle">SZEK. TÁG.</text>
            </g>
          )}

          {/* EMITTER MANIFOLD / RADIATORS */}
          <g transform="translate(760, 120)">
             <path d="M 0 0 H 20 V -20 H 80 V 0 H 100 V 120 H 80 V 140 H 20 V 120 H 0 Z" fill="none" stroke={isDark ? "#334155" : "#cbd5e1"} strokeWidth="2" strokeLinejoin="round" />
             <rect x="30" y="-20" width="40" height="160" rx="4" fill={isDark ? "#1e293b" : "#f8fafc"} stroke={isDark ? "#475569" : "#e2e8f0"} strokeWidth="1" />
             
             <text x="50" y="50" fill={isDark ? "#f8fafc" : "#1e293b"} fontSize="11" fontWeight="bold" textAnchor="middle">FŰTÉSI</text>
             <text x="50" y="65" fill={isDark ? "#f8fafc" : "#1e293b"} fontSize="11" fontWeight="bold" textAnchor="middle">HŐLEADÓ</text>
             
             <path d="M 0 0 H 30" fill="none" stroke="#ef4444" strokeWidth="3" />
             <path d="M 0 120 H 30" fill="none" stroke="#3b82f6" strokeWidth="3" />
             
             <circle cx="50" cy="-35" r="9" fill="#10b981" />
             <text x="50" y="-31.5" fill="#fff" fontSize="9" fontWeight="bold" textAnchor="middle">7</text>
          </g>

        </svg>
      </div>

      <div className={`p-4 text-[10px] border-t ${isDark ? 'bg-slate-950 border-slate-850 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <span className={`font-extrabold uppercase block tracking-wider text-[10px] flex items-center gap-1 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
              <Layers className="w-3.5 h-3.5 text-blue-500" /> Jelmagyarázat & Működés
            </span>
            <ul className="list-decimal pl-4 space-y-1 mt-2 text-[10px] leading-relaxed font-medium">
              <li><strong>Kültéri Hőszivattyú Monoblokk:</strong> Előállítja a fűtő/hűtő energiát (R290 közeggel).</li>
              {hydraulicState.includeDhwTank && <li><strong>HMV Modul:</strong> 3-járatú szeleppel indirekt tároló fűtése.</li>}
              <li><strong>Rendszerkapcsolás:</strong> {hasExchanger ? 'Lemezes leválasztó biztosítja a fagyálló és víz körök szétválasztását.' : hasBuffer ? 'Puffertartály hidraulikus váltóként csatolja a primer és szekunder köröket.' : 'Lineáris direkt bypass, leválasztás nélkül.'}</li>
              <li><strong>Biztonsági eszközök:</strong> Tágulási tartály(ok) az üzemi nyomás stabilizálására, iszapleválasztó védelem.</li>
              <li><strong>Hőleadó körök:</strong> Szivattyúval hajtott szekunder kör ({emitterType === 'floor' ? 'Padlófűtési osztó' : 'Radiátorok hálózata'}).</li>
            </ul>
          </div>
          <div className="space-y-1.5 font-sans">
            <span className={`font-extrabold uppercase block tracking-wider text-[10px] flex items-center gap-1 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Épületgépészeti előírások
            </span>
            <ul className="list-disc pl-4 space-y-2 mt-2 text-[10px] leading-relaxed">
              <li><strong>Fagyszelepek (FAGY)</strong>: Kültéri monoblokkok esetén, glikol mentes rendszernél légbeszívásos fagyásgátló szelepek beépítése a kültéri csatlakozásra kötelező.</li>
              <li><strong>Áramlási folytonosság</strong>: A széria bekötések biztosítják a fojtásmentes tömegáramot.</li>
              <li><strong>Mágneses szűrés</strong>: A primer kör visszatérő ágába precíziós iszapleválasztó telepítése elengedhetetlen a kompresszor hőcserélőjének élettartam megóvásához.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

