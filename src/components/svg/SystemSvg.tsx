import React from "react";
import { HeatPumpModel, HydraulicInput, HydraulicResults } from "../../types";
import {
  BallValve, PressureGauge, AirVent, SafetyValve, NonReturnValve,
  CirculatorPump, ExpansionVessel, ThreeWayValve, YFilter,
  HeatExchanger, DhwTank, HeatPump, BufferTank, EmitterGroup,
} from "./SvgComponents";

interface SystemSvgProps {
  selectedModel: HeatPumpModel | null;
  hydraulicState: HydraulicInput;
  hydraulicResults: HydraulicResults;
  theme?: "light" | "dark";
}

export function SystemSvg({ selectedModel, hydraulicState, hydraulicResults: r, theme = "light" }: SystemSvgProps) {
  const isDark = theme === "dark";
  const fg = isDark ? "#e2e8f0" : "#1e293b";
  const line1 = isDark ? "#94a3b8" : "#475569";
  const line2 = isDark ? "#475569" : "#94a3b8";
  const labelFg = isDark ? "#94a3b8" : "#64748b";
  const subFg = isDark ? "#64748b" : "#94a3b8";

  const flowLabelP = `${r.primaryFlowTempC}°C | ${r.primaryFlowRateLh} L/h | ${r.primaryMassFlowKgh} kg/h | ${r.primaryEstimatedVelocityMs?.toFixed(2)} m/s`;
  const retLabelP = `${r.primaryReturnTempC}°C | ${r.primaryFlowRateLh} L/h | ${r.primaryMassFlowKgh} kg/h`;
  const flowLabelS = r.secondaryFlowRateLh > 0 ? `${r.secondaryFlowTempC}°C | ${r.secondaryFlowRateLh} L/h | ${r.secondaryMassFlowKgh} kg/h | ${r.secondaryEstimatedVelocityMs?.toFixed(2)} m/s` : "";
  const retLabelS = r.secondaryFlowRateLh > 0 ? `${r.secondaryReturnTempC}°C | ${r.secondaryFlowRateLh} L/h | ${r.secondaryMassFlowKgh} kg/h` : "";
  const isHX = hydraulicState.includeHeatExchanger;

  return (
    <svg viewBox="0 0 1100 520" className="w-full h-auto max-w-[1100px] select-none" style={{ minHeight: "380px" }}>
      {/* Grid background */}
      <pattern id="grid-mono" width="20" height="20" patternUnits="userSpaceOnUse">
        <rect width="20" height="20" fill="none" stroke={isDark ? "#1e293b" : "#f1f5f9"} strokeWidth="0.5" />
      </pattern>
      <rect width="1100" height="520" fill="url(#grid-mono)" />

      {/* Wall boundary */}
      <rect x="180" y="20" width="10" height="480" rx="2" fill={line2} opacity="0.3" />
      <text x="185" y="500" fill={subFg} fontSize="8" fontWeight="bold" textAnchor="middle" transform="rotate(-90 185 500)">ÉPÜLET HATÁR (KÜLTÉR / BELTÉR)</text>

      {/* ───── MAIN PIPELINES ───── */}
      <path d="M 140,260 H 200" fill="none" stroke={fg} strokeWidth="2.5" />
      <path d="M 200,260 H 900" fill="none" stroke={fg} strokeWidth="2.5" />
      <path d="M 900,380 H 200" fill="none" stroke={fg} strokeWidth="2.5" />
      <path d="M 200,380 H 140" fill="none" stroke={fg} strokeWidth="2.5" />

      {/* Primary data labels */}
      <text x="420" y="252" fill={isDark ? "#38bdf8" : "#2563eb"} fontSize="7" fontFamily="monospace" fontWeight="bold">{flowLabelP}</text>
      <text x="420" y="255" fill={subFg} fontSize="5.5">→ PRIMER ELŐREMENŐ</text>
      <text x="420" y="388" fill={isDark ? "#38bdf8" : "#2563eb"} fontSize="7" fontFamily="monospace" fontWeight="bold">{retLabelP}</text>
      <text x="420" y="391" fill={subFg} fontSize="5.5">→ PRIMER VISSZATÉRŐ</text>

      {/* Flow arrows on primary */}
      <polygon points="160,256 168,260 160,264" fill={fg} />
      <polygon points="870,256 878,260 870,264" fill={fg} />
      <polygon points="230,376 238,380 230,384" fill={fg} />
      <polygon points="160,376 168,380 160,384" fill={fg} />

      {/* Ball valves on HP connections */}
      <BallValve x={170} y={260} fg={fg} />
      <BallValve x={170} y={380} fg={fg} />

      {/* Pressure gauge + air vent on flow */}
      <PressureGauge x={240} y={260} fg={fg} />
      <text x="240" y="284" fill={subFg} fontSize="5.5" textAnchor="middle">Nyomásmérő</text>
      <AirVent x={270} y={260} fg={fg} />
      <text x="270" y="284" fill={subFg} fontSize="5.5" textAnchor="middle">Légtelenítő</text>
      <YFilter x={250} y={380} fg={fg} />
      <text x="250" y="400" fill={subFg} fontSize="5.5" textAnchor="middle">Iszapleválasztó</text>

      {/* ───── DHW ───── */}
      {hydraulicState.includeDhwTank && (
        <>
          <ThreeWayValve x={200} y={260} fg={fg} />
          <path d="M 200,260 V 130 H 360" fill="none" stroke={fg} strokeWidth="2" />
          <path d="M 360,200 V 300 H 260 V 380" fill="none" stroke={fg} strokeWidth="2" />
          <polygon points="200,236 208,240 200,244" fill={fg} />
          <polygon points="340,126 348,130 340,134" fill={fg} />
          <DhwTank x={360} y={50} fg={fg} subFg={subFg} label="200-300 L" flowTempC={r.primaryFlowTempC} returnTempC={r.primaryReturnTempC} />
          <path d="M 380,200 V 220 H 350" fill="none" stroke={fg} strokeWidth="1" />
          <text x="340" y="228" fill={subFg} fontSize="5.5" textAnchor="end">Hidegvíz</text>
          <path d="M 440,50 V 30 H 480" fill="none" stroke={fg} strokeWidth="1.5" />
          <text x="485" y="33" fill={fg} fontSize="6" fontWeight="bold">HMV</text>
          <NonReturnValve x={280} y={380} fg={fg} />
          <text x="320" y="140" fill={subFg} fontSize="5.5" textAnchor="middle">Primer HMV kör</text>
        </>
      )}

      {/* ───── PRIMARY/SECONDARY SEPARATION ───── */}
      {isHX ? (
        <>
          <HeatExchanger x={480} y={320} fg={fg} line1={line1} line2={line2} />
          <text x="480" y="265" fill={fg} fontSize="7" fontWeight="bold" textAnchor="middle">HŐCSERÉLŐ (HX)</text>
          <text x="480" y="273" fill={subFg} fontSize="5.5" textAnchor="middle">{r.recommendedExchangerModel?.substring(0, 30)}</text>
          <text x="480" y="420" fill={subFg} fontSize="5.5" textAnchor="middle">{r.heatExchangerAreaM2} m²</text>
          <path d="M 440,260 H 462" fill="none" stroke={fg} strokeWidth="2.5" />
          <path d="M 498,380 H 440" fill="none" stroke={fg} strokeWidth="2.5" />
          <path d="M 498,260 H 880" fill="none" stroke={fg} strokeWidth="2" />
          <path d="M 880,380 H 550 V 400 H 498" fill="none" stroke={fg} strokeWidth="2" />
          <text x="640" y="252" fill={isDark ? "#34d399" : "#059669"} fontSize="7" fontFamily="monospace" fontWeight="bold">{flowLabelS}</text>
          <text x="640" y="255" fill={subFg} fontSize="5.5">→ SZEKUNDER ELŐREMENŐ</text>
          <text x="640" y="388" fill={isDark ? "#34d399" : "#059669"} fontSize="7" fontFamily="monospace" fontWeight="bold">{retLabelS}</text>
          <text x="640" y="391" fill={subFg} fontSize="5.5">→ SZEKUNDER VISSZATÉRŐ</text>
          <polygon points="540,256 548,260 540,264" fill={fg} />
          <polygon points="850,256 858,260 850,264" fill={fg} />
          <polygon points="600,376 608,380 600,384" fill={fg} />
          <polygon points="520,396 528,400 520,404" fill={fg} />
          <ExpansionVessel x={350} y={430} fg={fg} />
          <path d="M 350,380 V 410" fill="none" stroke={fg} strokeWidth="1.5" />
          <text x="350" y="456" fill={fg} fontSize="6" textAnchor="middle">Primer tág.</text>
          <text x="350" y="464" fill={fg} fontSize="7" fontWeight="bold" textAnchor="middle">{r.primaryVesselSizeL} L</text>
          <text x="350" y="472" fill={subFg} fontSize="5.5" textAnchor="middle">p₀={r.prechargeCalculated} / pₑ={r.finalCalculated}</text>
          <ExpansionVessel x={760} y={430} fg={fg} />
          <path d="M 760,380 V 410" fill="none" stroke={fg} strokeWidth="1.5" />
          <text x="760" y="456" fill={fg} fontSize="6" textAnchor="middle">Szekunder tág.</text>
          <text x="760" y="464" fill={fg} fontSize="7" fontWeight="bold" textAnchor="middle">{r.secondaryVesselSizeL} L</text>
          <text x="760" y="472" fill={subFg} fontSize="5.5" textAnchor="middle">p₀={r.prechargeCalculated} / pₑ={r.finalCalculated}</text>
          <CirculatorPump x={640} y={260} fg={fg} />
          <text x="640" y="238" fill={fg} fontSize="6" textAnchor="middle">Szekunder</text>
          <text x="640" y="246" fill={subFg} fontSize="5.5" textAnchor="middle">szivattyú</text>
          <text x="640" y="210" fill={subFg} fontSize="5" textAnchor="middle">{r.dabPumpModel?.substring(0, 20)}</text>
          <BallValve x={450} y={260} fg={fg} />
          <BallValve x={510} y={260} fg={fg} />
          <BallValve x={450} y={380} fg={fg} />
          <BallValve x={640} y={380} fg={fg} />
        </>
      ) : (
        <>
          <path d="M 440,260 H 880" fill="none" stroke={fg} strokeWidth="2.5" />
          <path d="M 880,380 H 440" fill="none" stroke={fg} strokeWidth="2.5" />
          <text x="580" y="252" fill={isDark ? "#38bdf8" : "#2563eb"} fontSize="7" fontFamily="monospace" fontWeight="bold">{flowLabelP}</text>
          <text x="580" y="255" fill={subFg} fontSize="5.5">→ ELŐREMENŐ</text>
          <text x="580" y="388" fill={isDark ? "#38bdf8" : "#2563eb"} fontSize="7" fontFamily="monospace" fontWeight="bold">{retLabelP}</text>
          <text x="580" y="391" fill={subFg} fontSize="5.5">→ VISSZATÉRŐ</text>
          <polygon points="540,256 548,260 540,264" fill={fg} />
          <polygon points="850,256 858,260 850,264" fill={fg} />
          <polygon points="540,376 548,380 540,384" fill={fg} />
          <polygon points="850,376 858,380 850,384" fill={fg} />
          {(hydraulicState.additionalWaterVolumeL >= 50) && (
            <>
              <BufferTank x={500} y={180} fg={fg} volumeL={hydraulicState.additionalWaterVolumeL} />
              <path d="M 500,380 H 470 V 240 H 500" fill="none" stroke={fg} strokeWidth="1.5" strokeDasharray="3,2" />
              <path d="M 560,240 H 880" fill="none" stroke={fg} strokeWidth="2.5" />
              <path d="M 880,380 H 560" fill="none" stroke={fg} strokeWidth="2.5" />
              <CirculatorPump x={680} y={240} fg={fg} />
              <text x="680" y="218" fill={fg} fontSize="6" textAnchor="middle">Keringtető</text>
              <text x="680" y="226" fill={subFg} fontSize="5.5" textAnchor="middle">szivattyú</text>
            </>
          )}
          <ExpansionVessel x={400} y={430} fg={fg} />
          <path d="M 400,380 V 410" fill="none" stroke={fg} strokeWidth="1.5" />
          <text x="400" y="456" fill={fg} fontSize="6" textAnchor="middle">Tágulási</text>
          <text x="400" y="464" fill={fg} fontSize="7" fontWeight="bold" textAnchor="middle">{r.vesselSizeL} L</text>
          <text x="400" y="472" fill={subFg} fontSize="5.5" textAnchor="middle">p₀={r.prechargeCalculated} / pₑ={r.finalCalculated}</text>
        </>
      )}

      {/* Safety valve */}
      <SafetyValve x={350} y={260} fg={fg} />
      <text x="350" y="295" fill={fg} fontSize="5.5" textAnchor="middle">Biztonsági szelep</text>
      <text x="350" y="302" fill={subFg} fontSize="5" textAnchor="middle">{hydraulicState.safetyValvePressure} bar</text>

      {/* Heat Pump */}
      <HeatPump x={30} y={180} fg={fg} line2={line2} subFg={subFg} isDark={isDark} selectedModel={selectedModel} />

      {/* Emitters */}
      <g transform="translate(890, 180)">
        <EmitterGroup circuits={hydraulicState.secondaryCircuits ?? []} fg={fg} subFg={subFg} />
      </g>

      {/* Legend */}
      <g transform="translate(10, 470)">
        <text x="0" y="0" fill={fg} fontSize="6" fontWeight="bold">Jelmagyarázat:</text>
        <line x1="0" y1="6" x2="20" y2="6" stroke={fg} strokeWidth="1.5" />
        <text x="24" y="9" fill={subFg} fontSize="5.5">Primer kör (HP ←→ HX/Ház)</text>
        <line x1="120" y1="6" x2="140" y2="6" stroke={fg} strokeWidth="1" />
        <text x="144" y="9" fill={subFg} fontSize="5.5">Szekunder kör (hőleadók)</text>
      </g>
    </svg>
  );
}
