import React from "react";
import { HydraulicResults, HydraulicInput } from "../types";

interface Props {
  results: HydraulicResults;
  state: HydraulicInput;
  isDark: boolean;
}

function Td({ label, value, sub, isDark }: { label: string; value: React.ReactNode; sub?: string; isDark: boolean }) {
  return (
    <div className={`flex items-center justify-between py-0.5 border-b last:border-b-0 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
      <span className={`text-[8px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        {label}
        {sub && <span className={`font-normal text-[7px] ml-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{sub}</span>}
      </span>
      <span className={`font-mono font-bold text-[9px] text-right ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{value}</span>
    </div>
  );
}

export function CalculationTables({ results: r, state, isDark }: Props) {
  const hasCircuits = (r.circuitResults ?? []).length > 0;

  const floorResults = (r.circuitResults ?? []).filter(cr => cr.type === 'floor');
  const radResults = (r.circuitResults ?? []).filter(cr => cr.type === 'radiators');
  // fan_coil filtered separately if needed

  const colCls = `p-2 rounded border ${isDark ? 'bg-slate-800/20 border-slate-700' : 'bg-slate-50 border-slate-200'}`;

  return (
    <div className={`rounded-xl border p-3 ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
      <h3 className={`font-extrabold text-[10px] uppercase tracking-wider mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
        SZÁMÍTÁSI ADATOK
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">

        {/* ── Column 1: Primer ── */}
        <div className={colCls}>
          <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>Primer / Hőszivattyú</p>
          <Td label="Teljesítmény" value={`${r.primaryFlowRateLh ? (r.primaryFlowRateLh * 1.163 * Number(state.primaryDeltaT || 5) / 1000).toFixed(1) : "—"} kW`} isDark={isDark} />
          <Td label="Térfogatáram" value={`${r.flowRateLmin} L/perc`} sub={`${(r.flowRateLh / 1000).toFixed(2)} m³/h`} isDark={isDark} />
          <Td label="ΔT" value={`${state.primaryDeltaT} °C`} sub={`E: ${r.primaryFlowTempC}°C V: ${r.primaryReturnTempC}°C`} isDark={isDark} />
          <Td label="Csőméret" value={r.recommendedPipeSize} isDark={isDark} />
          <Td label="Sebesség" value={`${r.estimatedVelocityMs} m/s`} sub={r.estimatedVelocityMs > 1.0 ? '⚠ Magas' : r.estimatedVelocityMs < 0.3 ? '⚠ Alacsony' : '✓ OK'} isDark={isDark} />
          <Td label="Nyomásesés" value={`${r.primaryPressureDropKpa} kPa`} isDark={isDark} />
          <Td label="Maradék nyomás" value={`${r.remainingPumpHeadKpa} kPa`} isDark={isDark} />
          {r.glycolPercentageUsed > 0 && <Td label="Glikol" value={`${r.glycolPercentageUsed}%`} isDark={isDark} />}
          <Td label="Tágulási tartály" value={`${r.primaryVesselSizeL} L`} sub={`p₀=${r.prechargeCalculated} pₑ=${r.finalCalculated}`} isDark={isDark} />
          <Td label="Keringtetés" value="Hősziv. saját sziv." isDark={isDark} />
        </div>

        {/* ── Column 2: HMV + Leválasztás ── */}
        <div className={colCls}>
          <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>HMV &amp; Leválasztás</p>
          <Td label="HMV tartály" value={state.includeDhwTank ? '200 L' : 'Nincs'} isDark={isDark} />
          {state.includeDhwTank && <Td label="Töltési idő" value="~1 h" isDark={isDark} />}
          <div className={`border-t my-1 ${isDark ? 'border-slate-700' : 'border-slate-200'}`} />
          {state.includeHeatExchanger ? (
            <>
              <Td label="HX modell" value={r.recommendedExchangerModel} isDark={isDark} />
              <Td label="Felület" value={`${r.heatExchangerAreaM2} m²`} isDark={isDark} />
              <Td label="Vízáram" value={`${r.heatExchangerWaterFlowLh} L/h`} isDark={isDark} />
            </>
          ) : (
            <>
              <Td label="Kapcsolás" value={state.couplingType === '4-port-buffer' ? '4-csonkos puffer' : 'Hidrováltó + puffer'} isDark={isDark} />
              <Td label="Puffer térfogat" value={`${state.bufferVolumeL ?? 100} L`} isDark={isDark} />
            </>
          )}
          {r.secondaryVesselSizeL > 0 && (
            <Td label="Szek. tág. tartály" value={`${r.secondaryVesselSizeL} L`} sub={`p₀=${r.prechargeCalculated} pₑ=${r.finalCalculated}`} isDark={isDark} />
          )}
        </div>

        {/* ── Column 3: Padlófűtés ── */}
        <div className={colCls}>
          <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>Padlófűtés</p>
          {floorResults.length > 0 ? floorResults.map((cr) => (
            <div key={cr.circuitId} className="mb-1.5 last:mb-0">
              <p className={`text-[7px] font-bold mb-0.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{cr.label}</p>
              <Td label="kW" value={`${cr.loadKw}`} isDark={isDark} />
              <Td label="ΔT" value={`${cr.deltaT}°C`} sub={`E:${cr.flowTempC}° V:${cr.returnTempC}°`} isDark={isDark} />
              <Td label="Térfogatáram" value={`${cr.flowRateLmin} L/perc`} isDark={isDark} />
              <Td label="Cső / Seb." value={`${cr.pipeSize} / ${cr.velocityMs} m/s`} isDark={isDark} />
              <Td label="Nyomásesés" value={`${cr.pressureDropKpa} kPa`} isDark={isDark} />
              <Td label="Maradék nyomás" value={`${cr.remainingHeadKpa} kPa`} sub={cr.remainingHeadKpa < 10 ? '⚠ Kevés' : '✓ OK'} isDark={isDark} />
              <Td label="Szivattyú" value={cr.pumpModel} isDark={isDark} />
              <Td label="Beállítás" value={`${cr.pumpSetting} • ${cr.pumpStage}`} isDark={isDark} />
            </div>
          )) : (
            <p className={`text-[8px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Nincs padlófűtés kör</p>
          )}
        </div>

        {/* ── Column 4: Radiátor körök ── */}
        <div className={colCls}>
          <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-red-400' : 'text-red-700'}`}>Radiátor körök</p>
          {radResults.length > 0 ? radResults.map((cr) => (
            <div key={cr.circuitId} className="mb-1.5 last:mb-0">
              <p className={`text-[7px] font-bold mb-0.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{cr.label}</p>
              <Td label="kW" value={`${cr.loadKw}`} isDark={isDark} />
              <Td label="ΔT" value={`${cr.deltaT}°C`} sub={`E:${cr.flowTempC}° V:${cr.returnTempC}°`} isDark={isDark} />
              <Td label="Térfogatáram" value={`${cr.flowRateLmin} L/perc`} isDark={isDark} />
              <Td label="Cső / Seb." value={`${cr.pipeSize} / ${cr.velocityMs} m/s`} isDark={isDark} />
              <Td label="Nyomásesés" value={`${cr.pressureDropKpa} kPa`} isDark={isDark} />
              <Td label="Maradék nyomás" value={`${cr.remainingHeadKpa} kPa`} sub={cr.remainingHeadKpa < 10 ? '⚠ Kevés' : '✓ OK'} isDark={isDark} />
              <Td label="Szivattyú" value={cr.pumpModel} isDark={isDark} />
              <Td label="Beállítás" value={`${cr.pumpSetting} • ${cr.pumpStage}`} isDark={isDark} />
            </div>
          )) : (
            <p className={`text-[8px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Nincs radiátor kör</p>
          )}
        </div>

      </div>

      {/* Buffer / vessel status row */}
      <div className={`flex flex-wrap items-center gap-3 mt-2 p-2 rounded border text-[8px] ${isDark ? 'bg-slate-800/10 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
        <span className={`font-bold px-1.5 py-0.5 rounded border ${r.isBufferAdequate ? 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30' : 'text-amber-600 bg-amber-500/10 border-amber-500/30'}`}>
          {r.isBufferAdequate ? '✓ Puffer OK' : '⚠ Puffer bővítés'}
        </span>
        <span>Szükséges puffer: <strong>{r.recommendedBufferL} L</strong></span>
        <span>Rendszertérfogat: <strong>{r.systemVolumeL} L</strong></span>
      </div>
    </div>
  );
}
