import React from "react";
import { HydraulicInput, HydraulicResults, EngineeringParams, HeatPumpModel } from "../types";
import { HydraulicExpansionCalc } from "./HydraulicExpansionCalc";
<<<<<<< HEAD
import { HydraulicDiagram } from "./diagram/HydraulicDiagram";
import { CircuitTable } from "./diagram/CircuitTable";
=======
import SystemDiagram from "./diagram/SystemDiagram";
import { CalculationTables } from "./CalculationTables";
>>>>>>> 391cdc8 (séma: teljes újraépítés professzionális DIN/ISO szimbólumokkal + Midea 16kW 3f árfolyam javítás)

interface SystemViewProps {
  peakLoadKw: number;
  flowTemp: number;
  onCalculated: (results: HydraulicResults) => void;
  hydraulicState: HydraulicInput;
  setHydraulicState: (state: HydraulicInput) => void;
  heatedArea: number;
  hydraulicResults: HydraulicResults;
  engineeringParams?: EngineeringParams;
  theme?: string;
  selectedModel?: HeatPumpModel | null;
}

export const SystemView: React.FC<SystemViewProps> = (props) => {
  const isDark = props.theme === "dark";

  return (
    <div className="space-y-4">
      {/* ── Hidraulikai bemenő paraméterek és számítás ── */}
      <HydraulicExpansionCalc {...props} />

<<<<<<< HEAD
      {/* ── Kapcsolási rajz ── */}
      <div className={`rounded-xl border p-3 ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
        <h3 className={`font-extrabold text-[10px] uppercase tracking-wider mb-2 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
          RENDSZERSÉMA
        </h3>
        <HydraulicDiagram
          selectedModel={props.selectedModel ?? null}
          hydraulicState={props.hydraulicState}
          hydraulicResults={props.hydraulicResults}
          theme={isDark ? "dark" : "light"}
=======
      {/* ── SVG diagram ── */}
      <div className={`rounded-xl border p-3 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <SystemDiagram
          selectedModel={props.selectedModel ?? null}
          hydraulicState={props.hydraulicState}
          hydraulicResults={props.hydraulicResults}
          peakLoadKw={props.peakLoadKw}
>>>>>>> 391cdc8 (séma: teljes újraépítés professzionális DIN/ISO szimbólumokkal + Midea 16kW 3f árfolyam javítás)
          flowTemp={props.flowTemp}
        />
      </div>

      {/* ── Körönkénti összehasonlítás + javaslatok ── */}
      <CircuitTable
        hydraulicState={props.hydraulicState}
        hydraulicResults={props.hydraulicResults}
        isDark={isDark}
      />
    </div>
  );
};
