import React from "react";
import { HydraulicInput, HydraulicResults, EngineeringParams, HeatPumpModel } from "../types";
import { HydraulicExpansionCalc } from "./HydraulicExpansionCalc";
import { SystemSvg } from "./svg/SystemSvg";
import { CalculationTables } from "./CalculationTables";

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
      {/* ── Inputs + compact results ── */}
      <HydraulicExpansionCalc {...props} />

      {/* ── SVG diagram ── */}
      <div className={`rounded-xl border p-3 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <SystemSvg
          selectedModel={props.selectedModel ?? null}
          hydraulicState={props.hydraulicState}
          hydraulicResults={props.hydraulicResults}
        />
      </div>

      {/* ── Calculation tables ── */}
      <CalculationTables
        results={props.hydraulicResults}
        state={props.hydraulicState}
        isDark={isDark}
      />

      {/* ── Next button ── */}
      <div className={`flex justify-end p-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`} />
    </div>
  );
};
