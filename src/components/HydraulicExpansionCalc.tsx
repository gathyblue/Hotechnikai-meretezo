import React, { useMemo, useEffect } from 'react';
import { HydraulicInput, HydraulicResults, EngineeringParams, HeatPumpModel, SecondaryCircuit } from '../types';
import { calculateHydraulicsAndVessel } from '../utils/calculations';
import { Info, Plus, X, GripVertical } from 'lucide-react';
import { SegmentedControl } from './SegmentedControl';

interface HydraulicExpansionCalcProps {
  peakLoadKw: number;
  flowTemp: number;
  onCalculated: (results: HydraulicResults) => void;
  hydraulicState: HydraulicInput;
  setHydraulicState: (state: HydraulicInput) => void;
  heatedArea: number;
  engineeringParams?: EngineeringParams;
  theme?: string;
  selectedModel?: HeatPumpModel | null;
}

function SectionLabel({ label, isDark }: { label: string; isDark: boolean }) {
  return (
    <p className={`text-[8px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
      {label}
    </p>
  );
}

function ResultRow({ label, value, sub, isDark }: { label: string; value: React.ReactNode; sub?: string; isDark: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1 border-b last:border-b-0 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
      <span className={`text-[9px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        {label}
        {sub && <span className={`font-normal text-[8px] ml-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{sub}</span>}
      </span>
      <span className={`font-mono font-bold text-[10px] text-right ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
        {value}
      </span>
    </div>
  );
}

function getCircuitDeltaT(type: SecondaryCircuit['type']): number {
  switch (type) {
    case 'floor': return 5;
    case 'radiators': return 10;
    case 'fan_coil': return 7;
  }
}

function syncHydraulicFields(state: HydraulicInput): HydraulicInput {
  let includeHeatExchanger = false;
  let additionalWaterVolumeL = state.bufferVolumeL || 100;
  switch (state.couplingType) {
    case 'heat-exchanger':
      includeHeatExchanger = true;
      additionalWaterVolumeL = 0;
      break;
    case '4-port-buffer':
    case 'buffer-or-hydro':
      includeHeatExchanger = false;
      additionalWaterVolumeL = state.bufferVolumeL || 100;
      break;
  }
  const circuits = state.secondaryCircuits || [];
  const hasFloor = circuits.some(c => c.type === 'floor');
  const hasRadiator = circuits.some(c => c.type === 'radiators');
  const primaryDeltaT = hasRadiator ? 10 : (hasFloor ? 5 : 10);
  return { ...state, includeHeatExchanger, additionalWaterVolumeL, primaryDeltaT };
}

const couplingConfigs: Record<string, { label: string; desc: string }> = {
  '4-port-buffer': { label: '4-csonkos puffer', desc: 'Hidraulikus leválasztóként szolgál a primer-szekunder kör között.' },
  'buffer-or-hydro': { label: 'Hidrováltó + puffer', desc: 'Hidraulikus váltós leválasztás és puffer a visszatérőben, közegleválasztás nélkül.' },
  'heat-exchanger': { label: 'Hőcserélő + puffer', desc: 'A leválasztás hőcserélővel történik, puffer a visszatérőben — teljes hidraulikai és közegleválasztás.' },
};

let circuitIdCounter = 1;
function newCircuitId() { return `circuit-${circuitIdCounter++}`; }

export const HydraulicExpansionCalc: React.FC<HydraulicExpansionCalcProps> = ({
  peakLoadKw,
  flowTemp,
  onCalculated,
  hydraulicState,
  setHydraulicState,
  heatedArea,
  engineeringParams,
  theme,
  selectedModel,
}) => {
  const isDark = theme === 'dark';

  const updateInput = (field: keyof HydraulicInput, value: any) => {
    setHydraulicState(syncHydraulicFields({ ...hydraulicState, [field]: value }));
  };

  const setCouplingType = (val: string) => {
    setHydraulicState(syncHydraulicFields({
      ...hydraulicState,
      couplingType: val as HydraulicInput['couplingType'],
    }));
  };

  const setBufferVolume = (val: number) => {
    setHydraulicState(syncHydraulicFields({
      ...hydraulicState,
      bufferVolumeL: val,
    }));
  };

  const updateCircuit = (id: string, upd: Partial<SecondaryCircuit>) => {
    setHydraulicState(syncHydraulicFields({
      ...hydraulicState,
      secondaryCircuits: (hydraulicState.secondaryCircuits || []).map(c =>
        c.id === id ? { ...c, ...upd } : c
      ),
    }));
  };

  const removeCircuit = (id: string) => {
    setHydraulicState(syncHydraulicFields({
      ...hydraulicState,
      secondaryCircuits: (hydraulicState.secondaryCircuits || []).filter(c => c.id !== id),
    }));
  };

  const addCircuit = () => {
    const count = (hydraulicState.secondaryCircuits || []).length;
    setHydraulicState(syncHydraulicFields({
      ...hydraulicState,
      secondaryCircuits: [
        ...(hydraulicState.secondaryCircuits || []),
        {
          id: newCircuitId(),
          type: 'radiators',
          label: `${count + 1}. kör`,
          flowTempC: 55,
          isMixed: false,
          floorCircuits: 8,
          longestCircuitM: 100,
          radiatorCount: 8,
        },
      ],
    }));
  };

  const synced = useMemo(() => syncHydraulicFields(hydraulicState), [hydraulicState]);

  const pumpHead = selectedModel?.pumpResidualHeadKpa ?? 60;

  const results = useMemo(
    () => calculateHydraulicsAndVessel(peakLoadKw, flowTemp, synced, heatedArea, engineeringParams, pumpHead),
    [peakLoadKw, flowTemp, synced, heatedArea, engineeringParams, pumpHead]
  );

  useEffect(() => { onCalculated(results); }, [results, onCalculated]);

  const circuits = hydraulicState.secondaryCircuits || [];

  const estSystemVol = useMemo(() => {
    let mult = engineeringParams?.systemWaterVolumeRadiatorFactor ?? 12;
    if (circuits.some(c => c.type === 'floor')) mult = engineeringParams?.systemWaterVolumeFloorFactor ?? 15;
    else if (circuits.some(c => c.type === 'fan_coil')) mult = 8;
    return Math.round(peakLoadKw * mult + Number(hydraulicState.additionalWaterVolumeL || 0));
  }, [peakLoadKw, circuits, engineeringParams, hydraulicState.additionalWaterVolumeL]);

  function getPipeSizes(material: string) {
    if (material === 'copper')
      return [{ v: 'Auto', l: 'Auto' }, { v: 'Rézcső 18mm', l: '18 mm' }, { v: 'Rézcső 22mm', l: '22 mm' }, { v: 'Rézcső 28mm', l: '28 mm' }, { v: 'Rézcső 35mm', l: '35 mm' }];
    if (material === 'steel')
      return [{ v: 'Auto', l: 'Auto' }, { v: 'Szénacél 18mm', l: '18 mm' }, { v: 'Szénacél 22mm', l: '22 mm' }, { v: 'Szénacél 28mm', l: '28 mm' }, { v: 'Szénacél 35mm', l: '35 mm' }];
    // pex
    return [{ v: 'Auto', l: 'Auto' }, { v: 'PEX 20mm', l: '20 mm' }, { v: 'PEX 26mm', l: '26 mm' }, { v: 'PEX 32mm', l: '32 mm' }, { v: 'PEX 40mm', l: '40 mm' }];
  }

  const couplingOptions = Object.entries(couplingConfigs).map(([value, cfg]) => ({
    value,
    label: cfg.label,
  }));

  const activeCfg = couplingConfigs[hydraulicState.couplingType];

  const innerCard = `p-2.5 rounded-lg border ${isDark ? 'border-slate-800 bg-slate-800/10' : 'border-slate-200 bg-slate-50'}`;

  return (
    <div className={`rounded-lg border p-3 transition-all ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
      <div className="border-b pb-1.5">
        <h3 className={`font-semibold text-xs ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
          Hidraulikai méretezés
        </h3>
      </div>

      <div className="space-y-3 mt-2">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

        {/* Rendszerkapcsolás */}
        <div className={innerCard}>
          <label className={`text-[9px] font-bold uppercase tracking-wider block mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Rendszerkapcsolás
          </label>
          <SegmentedControl
            options={couplingOptions}
            value={hydraulicState.couplingType}
            onChange={setCouplingType}
            layoutId="hydraulic-coupling"
            theme={isDark ? 'dark' : 'light'}
            className="text-xs w-full"
          />
          <p className={`mt-1 text-[9px] leading-snug ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            {activeCfg?.desc}
          </p>
        </div>

        {/* Puffer méret */}
        <div className={innerCard}>
          <label className={`text-[9px] font-bold uppercase tracking-wider block mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Pufferméret
          </label>
          <SegmentedControl
            options={[
              { value: 60, label: '60 L' },
              { value: 100, label: '100 L' },
              { value: 200, label: '200 L' },
            ]}
            value={hydraulicState.bufferVolumeL}
            onChange={setBufferVolume}
            layoutId="hydraulic-buffer-size"
            theme={isDark ? 'dark' : 'light'}
            className="text-xs w-full"
          />
          <p className={`mt-1 text-[9px] leading-snug ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Alapesetben 60 L elegendő. Nagyobb méret növeli a rendszertérfogatot és a tágulási tartály méretét.
          </p>
        </div>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

          {/* Primer oldal */}
          <div className={`space-y-2 ${innerCard}`}>
            <p className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Primer oldal (Hőszivattyú felől)
            </p>
            <div className="space-y-2">
              <SectionLabel label="Csőanyag" isDark={isDark} />
              <SegmentedControl
                options={[
                  { value: 'copper', label: 'Rézcső' },
                  { value: 'pex',    label: '5-rétegű' },
                  { value: 'steel',  label: 'Szénacél' },
                ]}
                value={hydraulicState.pipeMaterial}
                onChange={(v) => setHydraulicState({ ...hydraulicState, pipeMaterial: v, primaryPipeSize: 'Auto' })}
                layoutId="hydraulic-primary-material"
                theme={isDark ? 'dark' : 'light'}
              />
            </div>
            <div className="space-y-2">
              <SectionLabel label="Csősebesség" isDark={isDark} />
              <SegmentedControl
                options={[
                  { value: 0.3, label: '0.3 m/s' },
                  { value: 0.6, label: '0.6 m/s' },
                  { value: 0.9, label: '0.9 m/s' },
                  { value: 1.2, label: '1.2 m/s' },
                ]}
                value={hydraulicState.targetVelocityMs ?? 0.6}
                onChange={(v) => updateInput('targetVelocityMs' as any, v as number)}
                layoutId="hydraulic-velocity"
                theme={isDark ? 'dark' : 'light'}
                className="text-xs"
              />
            </div>

            <div className="space-y-2">
              <SectionLabel label="Csőméret" isDark={isDark} />
              <SegmentedControl
                options={getPipeSizes(hydraulicState.pipeMaterial).map((m) => ({ value: m.v, label: m.l }))}
                value={hydraulicState.primaryPipeSize || 'Auto'}
                onChange={(v) => updateInput('primaryPipeSize', v)}
                layoutId="hydraulic-primary-size"
                theme={isDark ? 'dark' : 'light'}
              />
            </div>
            <div className="space-y-2">
              <SectionLabel label="Becsült távolság (egyirányú)" isDark={isDark} />
              <SegmentedControl
                options={[
                  { value: 5,  label: '5 m' },
                  { value: 10, label: '10 m' },
                  { value: 15, label: '15 m' },
                  { value: 20, label: '20 m' },
                  { value: 25, label: '25 m' },
                ]}
                value={hydraulicState.pipeLengthEstimate ?? 5}
                onChange={(v) => updateInput('pipeLengthEstimate', v as number)}
                layoutId="hydraulic-pipe-length"
                theme={isDark ? 'dark' : 'light'}
                className="text-xs"
              />
            </div>
          </div>

          {/* Szekunder oldal - körök */}
          <div className={`${innerCard}`}>
            <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Szekunder körök (Hőleadók)
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {circuits.map((circuit, idx) => (
              <div key={circuit.id} className={`p-2 rounded border ${isDark ? 'border-slate-700 bg-slate-900/30' : 'border-slate-300 bg-white/50'}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[9px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{circuit.label}</span>
                  <div className="flex gap-1">
                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-medium ${circuit.isMixed ? 'bg-amber-500/10 text-amber-600' : 'bg-blue-500/10 text-blue-600'} ${isDark ? '' : ''}`}>
                      {circuit.isMixed ? 'Kevert' : 'Direkt'}
                    </span>
                    <button onClick={() => removeCircuit(circuit.id)} className={`p-0.5 rounded hover:bg-red-500/10 ${isDark ? 'text-slate-500 hover:text-red-400' : 'text-slate-400 hover:text-red-600'}`}>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                  <div>
                    <label className={`text-[8px] font-bold uppercase block mb-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Típus</label>
                    <select value={circuit.type} onChange={(e) => {
                      const t = e.target.value as 'floor' | 'radiators';
                      updateCircuit(circuit.id, { type: t, flowTempC: t === 'radiators' ? 55 : 35 });
                    }}
                      className={`w-full px-1.5 py-1 border rounded text-[9px] font-mono ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'}`}>
                      <option value="floor">Padlófűtés</option>
                      <option value="radiators">Lapradiátor</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 mb-1.5">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={circuit.isMixed} onChange={(e) => updateCircuit(circuit.id, { isMixed: e.target.checked })}
                      className="w-3 h-3 rounded" />
                    <span className={`text-[8px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Kevert kör</span>
                  </label>
                  <span className={`text-[8px] px-1 py-0.5 rounded ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                    ΔT = {getCircuitDeltaT(circuit.type)}°C
                  </span>
                </div>

                {circuit.type === 'floor' && (
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className={`text-[8px] font-bold uppercase block mb-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Osztó körök</label>
                      <input type="number" min={1} max={30} value={circuit.floorCircuits} onChange={(e) => updateCircuit(circuit.id, { floorCircuits: Number(e.target.value) })}
                        className={`w-full px-1.5 py-1 border rounded text-[9px] font-mono ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'}`} />
                    </div>
                    <div>
                      <label className={`text-[8px] font-bold uppercase block mb-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Legh. kör (m)</label>
                      <input type="number" min={10} max={200} value={circuit.longestCircuitM} onChange={(e) => updateCircuit(circuit.id, { longestCircuitM: Number(e.target.value) })}
                        className={`w-full px-1.5 py-1 border rounded text-[9px] font-mono ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'}`} />
                    </div>
                  </div>
                )}
                {circuit.type === 'radiators' && (
                  <div className="space-y-1">
                    <label className={`text-[8px] font-bold uppercase block mb-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Radiátorok száma</label>
                    <input type="number" min={1} max={50} value={circuit.radiatorCount} onChange={(e) => updateCircuit(circuit.id, { radiatorCount: Number(e.target.value) })}
                      className={`w-full px-1.5 py-1 border rounded text-[9px] font-mono ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'}`} />
                  </div>
                )}
              </div>
            ))}
            </div>

            <button onClick={addCircuit}
              className={`w-full flex items-center justify-center gap-1 py-1.5 mt-2 border border-dashed rounded text-[9px] font-medium transition-all ${isDark ? 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300' : 'border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-600'}`}>
              <Plus className="w-3 h-3" /> Kör hozzáadása
            </button>
          </div>

        </div>

        {/* Eredmények */}
        <div>
          <SectionLabel label="Eredmények" isDark={isDark} />
        </div>

        <div className="space-y-2">
        {/* Primary + Secondary results row */}
        <div className="flex flex-col lg:flex-row gap-2">
          {/* Primer oldal – 1/3 */}
          <div className="lg:w-1/3">
            <div className={`p-2.5 rounded border h-full ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <p className={`text-[9px] font-black uppercase tracking-widest mb-1.5 ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>Primer oldal (Hőszivattyú)</p>
              <ResultRow label="Ajánlott csőméret" value={results.recommendedPipeSize} isDark={isDark} />
              <ResultRow label="Áramlási sebesség" value={`${results.estimatedVelocityMs} m/s`} sub={results.estimatedVelocityMs > 1.0 ? '⚠ Magas sebesség!' : results.estimatedVelocityMs < 0.3 ? '⚠ Alacsony sebesség' : '✓ Optimális'} isDark={isDark} />
              <ResultRow label="Térfogatáram" value={`${results.flowRateLmin} L/perc`} sub={`${(results.flowRateLh / 1000).toFixed(2)} m³/h`} isDark={isDark} />
              <ResultRow label="ΔT / Hőfoklépcső" value={`${synced.primaryDeltaT} °C`} sub={`E: ${results.primaryFlowTempC}°C → V: ${results.primaryReturnTempC}°C`} isDark={isDark} />
              <ResultRow label="Nyomásveszteség" value={`${results.primaryPressureDropKpa} kPa`} isDark={isDark} />
              {results.glycolPercentageUsed > 0 && (
                <ResultRow label="Fagyálló (glikol)" value={`${results.glycolPercentageUsed}%`} sub={`ρ=${results.glycolDensityKgm3} kg/m³, cp=${results.glycolSpecificHeatWhKgK} Wh/kgK`} isDark={isDark} />
              )}
              <ResultRow label="Maradék szivattyúnyomás" value={`${results.remainingPumpHeadKpa} kPa`} isDark={isDark} />
              <ResultRow label="Keringtetés" value="Hőszivattyú saját szivattyúja" isDark={isDark} />
              <ResultRow label="Tágulási tartály" value={`${results.primaryVesselSizeL} L`} sub={`p₀=${results.prechargeCalculated} bar | pₑ=${results.finalCalculated} bar`} isDark={isDark} />
              {hydraulicState.includeHeatExchanger && (
                <>
                  <div className={`border-t my-1.5 ${isDark ? 'border-slate-700' : 'border-slate-200'}`} />
                  <p className={`text-[8px] font-black uppercase tracking-wider mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Lemezes Hőcserélő</p>
                  <ResultRow label="Modell" value={results.recommendedExchangerModel} isDark={isDark} />
                  <ResultRow label="Felület" value={`${results.heatExchangerAreaM2} m²`} isDark={isDark} />
                  <ResultRow label="Vízáram" value={`${results.heatExchangerWaterFlowLh} L/h`} isDark={isDark} />
                </>
              )}
            </div>
          </div>

          {/* Szekunder körök – 2/3 */}
          <div className="lg:w-2/3">
            {(results.circuitResults ?? []).length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                {results.circuitResults.map((cr, i) => {
                  const prev = i > 0 ? results.circuitResults[i - 1] : null;
                  const samePump = prev && prev.pumpModel === cr.pumpModel && prev.pumpSetting === cr.pumpSetting && prev.pumpStage === cr.pumpStage;
                  return (
                  <div key={cr.circuitId} className={`p-2.5 rounded border ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <p className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>{cr.label}</p>
                      <span className={`text-[7px] px-1 py-0.5 rounded font-medium ${cr.type === 'floor' ? 'bg-amber-500/10 text-amber-600' : 'bg-red-500/10 text-red-600'}`}>
                        {cr.type === 'floor' ? 'Padló' : 'Rad'}
                      </span>
                    </div>
                    <ResultRow label="kW / ΔT" value={`${cr.loadKw} kW / ${cr.deltaT}°C`} sub={`E: ${cr.flowTempC}°C → V: ${cr.returnTempC}°C`} isDark={isDark} />
                    <ResultRow label="Térfogatáram" value={`${cr.flowRateLmin} L/perc`} sub={`${cr.flowRateLh} L/h`} isDark={isDark} />
                    <ResultRow label="Cső / Sebesség" value={`${cr.pipeSize} / ${cr.velocityMs} m/s`} sub={cr.velocityMs > 1.0 ? '⚠ Magas' : cr.velocityMs < 0.3 ? '⚠ Alacsony' : '✓ OK'} isDark={isDark} />
                    <ResultRow label="Nyomásesés" value={`${cr.pressureDropKpa} kPa`} isDark={isDark} />
                    <ResultRow label="Maradék nyomás" value={`${cr.remainingHeadKpa} kPa`} sub={cr.remainingHeadKpa < 10 ? '⚠ Kevés' : '✓ OK'} isDark={isDark} />
                    <ResultRow label="Szivattyú" value={samePump && i > 0 ? `└ ${cr.pumpModel}` : cr.pumpModel} isDark={isDark} />
                    {(!samePump || i === 0) && <ResultRow label="Beállítás" value={`${cr.pumpSetting} • ${cr.pumpStage}`} isDark={isDark} />}
                  </div>
                  );
                })}
              </div>
            )}
            {(results.circuitResults ?? []).length === 0 && (
              <div className={`p-2.5 rounded border flex items-center justify-center h-full ${isDark ? 'bg-slate-800/20 border-slate-800 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                <span className="text-[9px]">Nincsenek szekunder körök</span>
              </div>
            )}
          </div>
        </div>

        {/* Buffer + Vessel */}
        <div className={`p-2.5 rounded border ${isDark ? 'bg-slate-800/20 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center justify-between mb-1.5">
            <p className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Puffer / Tágulási Ellenőrzés</p>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${results.isBufferAdequate ? 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30' : 'text-amber-600 bg-amber-500/10 border-amber-500/30'}`}>
              {results.isBufferAdequate ? '✓ Puffer megfelelő' : '⚠ Puffer bővítés javasolt'}
            </span>
          </div>
          <ResultRow label="Szükséges puffertérfogat" value={`${results.recommendedBufferL} L`} isDark={isDark} />
          <ResultRow label="Rendszertérfogat összesen" value={`${estSystemVol} L`} isDark={isDark} />
          {results.secondaryVesselSizeL > 0 && (
            <ResultRow label="Szekunder tágulási tartály" value={`${results.secondaryVesselSizeL} L`} sub={`p₀=${results.prechargeCalculated} bar | pₑ=${results.finalCalculated} bar`} isDark={isDark} />
          )}
        </div>

        <div className={`flex gap-1.5 p-2 rounded border text-[8px] leading-snug ${isDark ? 'bg-slate-950/20 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
          <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
          <span>
            <strong>FAGYVÉDELMI KÖVETELMÉNY:</strong> Monoblokkos kivitelnél a kültéri ágon fagyvédelmi lefúvató szelep (pl. Caleffi iFrost) beépítése kötelező! Glikol fagyálló nem kerül alkalmazásra.
          </span>
        </div>
      </div>
    </div>
  </div>
  );
};
