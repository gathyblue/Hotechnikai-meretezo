import React from "react";
import { CircuitHydraulicResult, HydraulicInput, HydraulicResults, SecondaryCircuit } from "../../types";

interface CircuitTableProps {
  hydraulicState: HydraulicInput;
  hydraulicResults: HydraulicResults;
  isDark: boolean;
}

// ── Kevert/Direkt döntési logika ────────────────────────────
function getMixingRecommendation(circuit: SecondaryCircuit, primaryFlowTempC: number) {
  const isAutoMixed = circuit.flowTempC < primaryFlowTempC - 5;
  const isMixed = circuit.isMixed || isAutoMixed;
  return {
    mode: isMixed ? "KEVERT" : "DIREKT",
    needsMixingValve: isMixed,
    reason: circuit.isMixed
      ? "Manuálisan kevertnek jelölve"
      : isAutoMixed
      ? `Szekunder (${circuit.flowTempC}°C) < Primer (${primaryFlowTempC}°C) − 5°C`
      : "Direkt csatlakozás elegendő",
  };
}

// ── Státusz badge ────────────────────────────────────────────
function StatusBadge({ ok, label, isDark }: { ok: boolean; label: string; isDark: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold border ${
      ok
        ? isDark ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/30"
                 : "text-emerald-700 bg-emerald-50 border-emerald-200"
        : isDark ? "text-amber-300 bg-amber-500/10 border-amber-500/30"
                 : "text-amber-700 bg-amber-50 border-amber-200"
    }`}>
      {ok ? "✓" : "⚠"} {label}
    </span>
  );
}

// ── Egy cella sorhoz ────────────────────────────────────────
function DataRow({ label, children, isDark }: { label: string; children: React.ReactNode; isDark: boolean }) {
  return (
    <div className={`flex flex-col gap-0.5 py-1 border-b ${isDark ? "border-slate-800" : "border-slate-100"}`}>
      <span className={`text-[7.5px] uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>
        {label}
      </span>
      <span className={`font-mono font-bold text-[9px] ${isDark ? "text-slate-100" : "text-slate-800"}`}>
        {children}
      </span>
    </div>
  );
}

// ── Típus → szöveg ───────────────────────────────────────────
const TYPE_LABELS: Record<SecondaryCircuit["type"], string> = {
  floor: "Padlófűtés",
  radiators: "Radiátor",
  fan_coil: "Fan-coil",
};
const TYPE_COLORS: Record<SecondaryCircuit["type"], { light: string; dark: string }> = {
  floor:     { light: "text-emerald-700 bg-emerald-50 border-emerald-200",    dark: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30" },
  radiators: { light: "text-red-700 bg-red-50 border-red-200",                dark: "text-red-300 bg-red-500/10 border-red-500/30" },
  fan_coil:  { light: "text-sky-700 bg-sky-50 border-sky-200",                dark: "text-sky-300 bg-sky-500/10 border-sky-500/30" },
};

export function CircuitTable({ hydraulicState, hydraulicResults: r, isDark }: CircuitTableProps) {
  const circuits = (hydraulicState.secondaryCircuits ?? []).slice(0, 4);
  const circuitResults = r.circuitResults ?? [];

  if (circuits.length === 0) return null;

  const colBg = isDark ? "bg-slate-800/20 border-slate-700" : "bg-white border-slate-200";
  const headerBg = isDark ? "bg-slate-800/40" : "bg-slate-50";

  // ── Összesítő sorok (primer + HX/puffer) ─────────────────
  const isHX = hydraulicState.includeHeatExchanger;

  return (
    <div className={`rounded-xl border p-3 ${isDark ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-200"}`}>
      <h3 className={`font-extrabold text-[10px] uppercase tracking-wider mb-3 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
        KÖRÖNKÉNTI HIDRAULIKAI ÖSSZEHASONLÍTÁS
      </h3>

      {/* ── Körök összehasonlítása ── */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth: circuits.length * 200 }}>
          <thead>
            <tr className={headerBg}>
              {/* Sor-fejléc oszlop */}
              <th className={`text-left text-[8px] font-black uppercase tracking-wider px-2 py-1.5 border-b w-32 ${isDark ? "text-slate-400 border-slate-700" : "text-slate-500 border-slate-200"}`}>
                Adat
              </th>
              {circuits.map((c, i) => {
                const typeColor = TYPE_COLORS[c.type][isDark ? "dark" : "light"];
                return (
                  <th key={c.id} className={`text-center text-[8px] font-black uppercase tracking-wider px-2 py-1.5 border-b border-l ${isDark ? "border-slate-700" : "border-slate-200"}`}>
                    <span className={`inline-block px-2 py-0.5 rounded border text-[8px] ${typeColor}`}>
                      {i + 1}. {c.label}
                    </span>
                    <div className={`text-[7px] mt-0.5 font-normal ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                      {TYPE_LABELS[c.type]}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {/* Hőmérsékletek */}
            <TableRow label="Előremenő" isDark={isDark}>
              {circuits.map(c => (
                <td key={c.id} className={`text-center font-mono font-bold text-[9px] px-2 py-1 border-l ${isDark ? "border-slate-800 text-red-300" : "border-slate-100 text-red-600"}`}>
                  {c.flowTempC} °C
                </td>
              ))}
            </TableRow>
            <TableRow label="Visszatérő" isDark={isDark}>
              {circuits.map(c => {
                const dt = c.type === "floor" ? 5 : c.type === "radiators" ? 10 : 7;
                return (
                  <td key={c.id} className={`text-center font-mono font-bold text-[9px] px-2 py-1 border-l ${isDark ? "border-slate-800 text-blue-300" : "border-slate-100 text-blue-600"}`}>
                    {c.flowTempC - dt} °C
                  </td>
                );
              })}
            </TableRow>
            <TableRow label="ΔT" isDark={isDark}>
              {circuits.map(c => {
                const dt = c.type === "floor" ? 5 : c.type === "radiators" ? 10 : 7;
                return (
                  <td key={c.id} className={`text-center font-mono text-[9px] px-2 py-1 border-l ${isDark ? "border-slate-800 text-slate-300" : "border-slate-100 text-slate-700"}`}>
                    {dt} K
                  </td>
                );
              })}
            </TableRow>

            {/* Hidraulikai adatok */}
            <SectionHeader label="HIDRAULIKA" isDark={isDark} colCount={circuits.length} />
            <TableRow label="Terhelés [kW]" isDark={isDark}>
              {circuits.map(c => {
                const cr = circuitResults.find(r => r.circuitId === c.id);
                return (
                  <td key={c.id} className={`text-center font-mono font-bold text-[9px] px-2 py-1 border-l ${isDark ? "border-slate-800" : "border-slate-100"}`}>
                    {cr?.loadKw ?? "—"} kW
                  </td>
                );
              })}
            </TableRow>
            <TableRow label="Térfogatáram" isDark={isDark}>
              {circuits.map(c => {
                const cr = circuitResults.find(r => r.circuitId === c.id);
                return (
                  <td key={c.id} className={`text-center font-mono font-bold text-[9px] px-2 py-1 border-l ${isDark ? "border-slate-800" : "border-slate-100"}`}>
                    {cr?.flowRateLh ?? "—"} L/h
                    <div className={`text-[7px] font-normal ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                      {cr ? (cr.flowRateLh / 60).toFixed(1) : "—"} L/perc
                    </div>
                  </td>
                );
              })}
            </TableRow>
            <TableRow label="Csőméret" isDark={isDark}>
              {circuits.map(c => {
                const cr = circuitResults.find(r => r.circuitId === c.id);
                return (
                  <td key={c.id} className={`text-center font-mono text-[9px] px-2 py-1 border-l ${isDark ? "border-slate-800" : "border-slate-100"}`}>
                    {cr?.pipeSize ?? "—"}
                  </td>
                );
              })}
            </TableRow>
            <TableRow label="Sebesség [m/s]" isDark={isDark}>
              {circuits.map(c => {
                const cr = circuitResults.find(r => r.circuitId === c.id);
                const v = cr?.velocityMs ?? 0;
                const isOk = v >= 0.2 && v <= 1.0;
                return (
                  <td key={c.id} className={`text-center font-mono font-bold text-[9px] px-2 py-1 border-l ${isDark ? "border-slate-800" : "border-slate-100"}`}>
                    <span className={isOk ? (isDark ? "text-emerald-300" : "text-emerald-700") : (isDark ? "text-amber-300" : "text-amber-600")}>
                      {v} m/s {isOk ? "✓" : "⚠"}
                    </span>
                  </td>
                );
              })}
            </TableRow>
            <TableRow label="Nyomásesés [kPa]" isDark={isDark}>
              {circuits.map(c => {
                const cr = circuitResults.find(r => r.circuitId === c.id);
                return (
                  <td key={c.id} className={`text-center font-mono text-[9px] px-2 py-1 border-l ${isDark ? "border-slate-800" : "border-slate-100"}`}>
                    {cr?.pressureDropKpa ?? "—"} kPa
                  </td>
                );
              })}
            </TableRow>
            <TableRow label="Maradék nyomás" isDark={isDark}>
              {circuits.map(c => {
                const cr = circuitResults.find(r => r.circuitId === c.id);
                const head = cr?.remainingHeadKpa ?? 0;
                const isOk = head >= 5;
                return (
                  <td key={c.id} className={`text-center font-mono font-bold text-[9px] px-2 py-1 border-l ${isDark ? "border-slate-800" : "border-slate-100"}`}>
                    <span className={isOk ? (isDark ? "text-emerald-300" : "text-emerald-700") : (isDark ? "text-red-300" : "text-red-600")}>
                      {head} kPa {isOk ? "✓" : "⚠ KEVÉS"}
                    </span>
                  </td>
                );
              })}
            </TableRow>

            {/* Szivattyú */}
            <SectionHeader label="SZIVATTYÚ" isDark={isDark} colCount={circuits.length} />
            <TableRow label="Modell" isDark={isDark}>
              {circuits.map(c => {
                const cr = circuitResults.find(r => r.circuitId === c.id);
                return (
                  <td key={c.id} className={`text-center text-[8px] px-2 py-1 border-l ${isDark ? "border-slate-800 text-slate-300" : "border-slate-100 text-slate-700"}`}>
                    {cr?.pumpModel?.split(" ").slice(0, 3).join(" ") ?? "—"}
                  </td>
                );
              })}
            </TableRow>
            <TableRow label="Beállítás" isDark={isDark}>
              {circuits.map(c => {
                const cr = circuitResults.find(r => r.circuitId === c.id);
                return (
                  <td key={c.id} className={`text-center text-[7.5px] px-2 py-1 border-l leading-tight ${isDark ? "border-slate-800 text-slate-400" : "border-slate-100 text-slate-500"}`}>
                    {cr?.pumpStage ?? "—"}
                  </td>
                );
              })}
            </TableRow>

            {/* Javaslatok */}
            <SectionHeader label="JAVASLAT" isDark={isDark} colCount={circuits.length} />
            <TableRow label="Csatlakozás módja" isDark={isDark}>
              {circuits.map(c => {
                const rec = getMixingRecommendation(c, r.primaryFlowTempC);
                const isMixed = rec.mode === "KEVERT";
                return (
                  <td key={c.id} className={`text-center px-2 py-1.5 border-l ${isDark ? "border-slate-800" : "border-slate-100"}`}>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-bold border ${
                      isMixed
                        ? isDark ? "text-purple-300 bg-purple-500/10 border-purple-500/30"
                                 : "text-purple-700 bg-purple-50 border-purple-200"
                        : isDark ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/30"
                                 : "text-emerald-700 bg-emerald-50 border-emerald-200"
                    }`}>
                      {isMixed ? "⤳ KEVERT" : "→ DIREKT"}
                    </span>
                  </td>
                );
              })}
            </TableRow>
            <TableRow label="Keverőszelep (3WV)" isDark={isDark}>
              {circuits.map(c => {
                const rec = getMixingRecommendation(c, r.primaryFlowTempC);
                return (
                  <td key={c.id} className={`text-center text-[8px] px-2 py-1 border-l ${isDark ? "border-slate-800" : "border-slate-100"}`}>
                    {rec.needsMixingValve ? (
                      <span className={isDark ? "text-purple-300 font-bold" : "text-purple-700 font-bold"}>Szükséges</span>
                    ) : (
                      <span className={isDark ? "text-slate-500" : "text-slate-400"}>Nem kell</span>
                    )}
                  </td>
                );
              })}
            </TableRow>
            <TableRow label="Indok" isDark={isDark}>
              {circuits.map(c => {
                const rec = getMixingRecommendation(c, r.primaryFlowTempC);
                return (
                  <td key={c.id} className={`text-center text-[7px] px-2 py-1 border-l leading-tight ${isDark ? "border-slate-800 text-slate-500" : "border-slate-100 text-slate-400"}`}>
                    {rec.reason}
                  </td>
                );
              })}
            </TableRow>
          </tbody>
        </table>
      </div>

      {/* ── Primer + Rendszer összesítő ── */}
      <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t ${isDark ? "border-slate-800" : "border-slate-200"}`}>
        <SummaryCard
          label="Primer hőm." value={`${r.primaryFlowTempC}°C / ${r.primaryReturnTempC}°C`}
          sub={`ΔT = ${hydraulicState.primaryDeltaT} K`} color="red" isDark={isDark}
        />
        <SummaryCard
          label="Primer áramlás" value={`${r.primaryFlowRateLh} L/h`}
          sub={r.recommendedPipeSize} color="blue" isDark={isDark}
        />
        <SummaryCard
          label={isHX ? "Hőcserélő" : "Puffer tartály"}
          value={isHX ? `${r.recommendedExchangerModel?.substring(0, 20)}` : `${hydraulicState.bufferVolumeL ?? "—"} L`}
          sub={isHX ? `${r.heatExchangerAreaM2} m²` : ""}
          color="amber" isDark={isDark}
        />
        <SummaryCard
          label="Tágulási tartály" value={`${isHX ? r.primaryVesselSizeL : r.vesselSizeL} L`}
          sub={`p₀=${r.prechargeCalculated} / pₑ=${r.finalCalculated} bar`}
          color="slate" isDark={isDark}
        />
      </div>
    </div>
  );
}

// ── Segéd komponensek ─────────────────────────────────────────

function TableRow({ label, isDark, children }: { label: string; isDark: boolean; children: React.ReactNode }) {
  return (
    <tr className={`${isDark ? "hover:bg-slate-800/20" : "hover:bg-slate-50"} transition-colors`}>
      <td className={`text-[8px] px-2 py-1 font-medium border-b ${isDark ? "border-slate-800 text-slate-400" : "border-slate-100 text-slate-500"}`}>
        {label}
      </td>
      {children}
    </tr>
  );
}

function SectionHeader({ label, isDark, colCount }: { label: string; isDark: boolean; colCount: number }) {
  return (
    <tr>
      <td colSpan={colCount + 1} className={`text-[7px] font-black uppercase tracking-widest px-2 py-1 ${isDark ? "bg-slate-800/40 text-slate-500" : "bg-slate-100 text-slate-400"}`}>
        {label}
      </td>
    </tr>
  );
}

const COLOR_MAP = {
  red:   { light: "text-red-700",   dark: "text-red-300" },
  blue:  { light: "text-blue-700",  dark: "text-blue-300" },
  amber: { light: "text-amber-700", dark: "text-amber-300" },
  slate: { light: "text-slate-700", dark: "text-slate-300" },
};

function SummaryCard({ label, value, sub, color, isDark }: {
  label: string; value: string; sub?: string; color: keyof typeof COLOR_MAP; isDark: boolean;
}) {
  return (
    <div className={`p-2 rounded-lg border ${isDark ? "border-slate-700 bg-slate-800/20" : "border-slate-200 bg-slate-50"}`}>
      <div className={`text-[7.5px] uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>{label}</div>
      <div className={`font-mono font-bold text-[9px] mt-0.5 ${COLOR_MAP[color][isDark ? "dark" : "light"]}`}>{value}</div>
      {sub && <div className={`text-[7px] mt-0.5 ${isDark ? "text-slate-600" : "text-slate-400"}`}>{sub}</div>}
    </div>
  );
}
