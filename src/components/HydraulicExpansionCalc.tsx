import React, { useState, useMemo, useEffect } from 'react';
import { HydraulicInput, HydraulicResults, EngineeringParams, HeatPumpModel } from '../types';
import { calculateHydraulicsAndVessel } from '../utils/calculations';
import { Info } from 'lucide-react';
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
  onSecondaryLoopsChange?: (loops: HydraulicInput['secondaryLoops']) => void;
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
  const autoDeltaT = (() => {
    switch (state.secondaryLoops) {
      case 'floor': return 5;
      case 'radiators': return 10;
      case 'fan_coil': return 7;
      case 'mixed': return 7;
      default: return 10;
    }
  })();
  const primaryDeltaT = state.primaryDeltaT || autoDeltaT;
  const secondaryDeltaT = state.secondaryDeltaT || autoDeltaT;
  return { ...state, includeHeatExchanger, additionalWaterVolumeL, primaryDeltaT, secondaryDeltaT };
}

const couplingConfigs: Record<string, { label: string; desc: string }> = {
  '4-port-buffer': { label: '4-csonkos puffer', desc: 'Hidraulikus leválasztóként szolgál a primer-szekunder kör között.' },
  'buffer-or-hydro': { label: 'Hidrováltó + puffer', desc: 'Hidraulikus váltós leválasztás és puffer a visszatérőben, közegleválasztás nélkül.' },
  'heat-exchanger': { label: 'Hőcserélő + puffer', desc: 'A leválasztás hőcserélővel történik, puffer a visszatérőben — teljes hidraulikai és közegleválasztás.' },
};

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
  onSecondaryLoopsChange,
}) => {
  const isDark = theme === 'dark';

  const [floorCircuits, setFloorCircuits] = useState<number>(8);
  const [longestCircuit, setLongestCircuit] = useState<number>(100);
  const [radiatorCount, setRadiatorCount] = useState<number>(8);

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

  const synced = useMemo(() => syncHydraulicFields(hydraulicState), [hydraulicState]);

  const pumpHead = selectedModel?.pumpResidualHeadKpa ?? 60;

  const results = useMemo(
    () => calculateHydraulicsAndVessel(peakLoadKw, flowTemp, synced, heatedArea, engineeringParams, pumpHead),
    [peakLoadKw, flowTemp, synced, heatedArea, engineeringParams, pumpHead]
  );

  useEffect(() => { onCalculated(results); }, [results, onCalculated]);

  const estSystemVol = useMemo(() => {
    let mult = engineeringParams?.systemWaterVolumeRadiatorFactor ?? 12;
    if (hydraulicState.secondaryLoops === 'floor') mult = engineeringParams?.systemWaterVolumeFloorFactor ?? 15;
    else if (hydraulicState.secondaryLoops === 'fan_coil') mult = 8;
    else if (hydraulicState.secondaryLoops === 'mixed') mult = 13;
    return Math.round(peakLoadKw * mult + Number(hydraulicState.additionalWaterVolumeL || 0));
  }, [peakLoadKw, hydraulicState, engineeringParams]);

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
            <div className="space-y-1">
              <label className={`text-[9px] font-bold uppercase block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>ΔT / Hőfoklépcső</label>
              <input type="number" min={2} max={30} step={1} value={synced.primaryDeltaT} onChange={(e) => setHydraulicState({ ...hydraulicState, primaryDeltaT: Number(e.target.value) })}
                className={`w-full px-2 py-1 border rounded text-xs font-mono focus:outline-none ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'}`} />
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

          {/* Szekunder oldal */}
          <div className={`space-y-2 ${innerCard}`}>
            <p className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Szekunder oldal (Hőleadók felől)
            </p>
            <div className="space-y-2">
              <SectionLabel label="Csőanyag" isDark={isDark} />
              <SegmentedControl
                options={[
                  { value: 'copper', label: 'Rézcső' },
                  { value: 'pex',    label: '5-rétegű' },
                  { value: 'steel',  label: 'Szénacél' },
                ]}
                value={hydraulicState.secondaryPipeMaterial ?? 'pex'}
                onChange={(v) => setHydraulicState({ ...hydraulicState, secondaryPipeMaterial: v, secondaryPipeSize: 'Auto' })}
                layoutId="hydraulic-secondary-material"
                theme={isDark ? 'dark' : 'light'}
              />
            </div>
            <div className="space-y-2">
              <SectionLabel label="Csőméret" isDark={isDark} />
              <SegmentedControl
                options={getPipeSizes(hydraulicState.secondaryPipeMaterial ?? 'pex').map((m) => ({ value: m.v, label: m.l }))}
                value={hydraulicState.secondaryPipeSize || 'Auto'}
                onChange={(v) => updateInput('secondaryPipeSize', v)}
                layoutId="hydraulic-secondary-size"
                theme={isDark ? 'dark' : 'light'}
              />
            </div>
            <div className="space-y-2">
              <SectionLabel label="Hőleadók jellege" isDark={isDark} />
              <SegmentedControl
                options={[
                  { value: 'floor',     label: 'Padlófűtés' },
                  { value: 'radiators', label: 'Lapradiátorok' },
                  { value: 'fan_coil',  label: 'Fan-coil' },
                  { value: 'mixed',     label: 'Kevert (Pad.+Rad.)' },
                ]}
                value={hydraulicState.secondaryLoops}
                onChange={(v) => { updateInput('secondaryLoops', v); onSecondaryLoopsChange?.(v); }}
                layoutId="hydraulic-secondary-loops"
                theme={isDark ? 'dark' : 'light'}
              />
            </div>
            <div className="space-y-1">
              <label className={`text-[9px] font-bold uppercase block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>ΔT / Hőfoklépcső</label>
              <input type="number" min={2} max={30} step={1} value={synced.secondaryDeltaT} onChange={(e) => setHydraulicState({ ...hydraulicState, secondaryDeltaT: Number(e.target.value) })}
                className={`w-full px-2 py-1 border rounded text-xs font-mono focus:outline-none ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'}`} />
            </div>

            {(hydraulicState.secondaryLoops === 'floor' || hydraulicState.secondaryLoops === 'mixed') && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className={`text-[9px] font-bold uppercase block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Osztó Körök (db)</label>
                  <input type="number" min={2} max={30} value={floorCircuits} onChange={(e) => setFloorCircuits(Number(e.target.value))}
                    className={`w-full px-2 py-1 border rounded text-xs font-mono focus:outline-none ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'}`} />
                </div>
                <div className="space-y-1">
                  <label className={`text-[9px] font-bold uppercase block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Leghosszabb Kör (m)</label>
                  <input type="number" min={20} max={200} value={longestCircuit} onChange={(e) => setLongestCircuit(Number(e.target.value))}
                    className={`w-full px-2 py-1 border rounded text-xs font-mono focus:outline-none ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'}`} />
                </div>
              </div>
            )}
            {(hydraulicState.secondaryLoops === 'radiators' || hydraulicState.secondaryLoops === 'mixed') && (
              <div className="space-y-1">
                <label className={`text-[9px] font-bold uppercase block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Lapradiátorok Száma (db)</label>
                <input type="number" min={1} max={30} value={radiatorCount} onChange={(e) => setRadiatorCount(Number(e.target.value))}
                  className={`w-full px-2 py-1 border rounded text-xs font-mono focus:outline-none ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'}`} />
              </div>
            )}
          </div>

        </div>

        {/* Eredmények */}
        <div>
          <SectionLabel label="Eredmények" isDark={isDark} />
        </div>

        <div className="space-y-2">
          {hydraulicState.includeHeatExchanger ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className={`p-2.5 rounded border ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <p className={`text-[9px] font-black uppercase tracking-widest mb-1.5 ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>I. Primer oldal (Hőszivattyú)</p>
                <ResultRow label="Ajánlott csőméret" value={results.recommendedPipeSize} isDark={isDark} />
                <ResultRow label="Áramlási sebesség" value={`${results.estimatedVelocityMs} m/s`} sub={results.estimatedVelocityMs > 1.0 ? '⚠ Magas sebesség!' : results.estimatedVelocityMs < 0.3 ? '⚠ Alacsony sebesség' : '✓ Optimális tartomány'} isDark={isDark} />
                <ResultRow label="Térfogatáram" value={`${results.flowRateLmin} L/perc`} sub={`${(results.flowRateLh / 1000).toFixed(2)} m³/h`} isDark={isDark} />
                <ResultRow label="ΔT / Hőfoklépcső" value={`${synced.primaryDeltaT} °C`} sub={`E: ${results.primaryFlowTempC}°C → V: ${results.primaryReturnTempC}°C`} isDark={isDark} />
                <ResultRow label="Nyomásveszteség (cső + helyi)" value={`${results.primaryPipeLossKpa} kPa`} isDark={isDark} />
                <ResultRow label="HX nyomásveszteség" value={`${(results.primaryPressureDropKpa - results.primaryPipeLossKpa - 1.8).toFixed(1)} kPa`} isDark={isDark} />
                <ResultRow label="Összes primer nyomásesés" value={`${results.primaryPressureDropKpa} kPa`} isDark={isDark} />
                <ResultRow label="Maradék szivattyúnyomás" value={`${results.remainingPumpHeadKpa} kPa`} isDark={isDark} />
                {results.glycolPercentageUsed > 0 && (
                  <ResultRow label="Fagyálló (glikol)" value={`${results.glycolPercentageUsed}%`} sub={`ρ=${results.glycolDensityKgm3} kg/m³, cp=${results.glycolSpecificHeatWhKgK} Wh/kgK`} isDark={isDark} />
                )}
                <ResultRow label="Tágulási tartály" value={`${results.primaryVesselSizeL} L`} sub={`p₀=${results.prechargeCalculated} bar | pₑ=${results.finalCalculated} bar`} isDark={isDark} />
              </div>
              <div className={`p-2.5 rounded border ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <p className={`text-[9px] font-black uppercase tracking-widest mb-1.5 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>II. Szekunder oldal (Hőleadók)</p>
                <ResultRow label="Csőméret (Gerinc)" value={results.recommendedSecondaryPipeSize ?? '—'} isDark={isDark} />
                {results.secondaryEstimatedVelocityMs !== undefined && <ResultRow label="Sebesség (gerinc)" value={`${results.secondaryEstimatedVelocityMs} m/s`} isDark={isDark} />}
                <ResultRow label="Térfogatáram" value={`${(results.secondaryFlowRateLh / 60).toFixed(2)} L/perc`} sub={`${(results.secondaryFlowRateLh / 1000).toFixed(2)} m³/h`}
                  isDark={isDark} />
                <ResultRow label="ΔT / Hőfoklépcső" value={`${synced.secondaryDeltaT} °C`} sub={`E: ${results.secondaryFlowTempC}°C → V: ${results.secondaryReturnTempC}°C`} isDark={isDark} />
                <ResultRow label="Nyomásveszteség (cső + helyi)" value={`${results.secondaryPipeLossKpa} kPa`} isDark={isDark} />
                <ResultRow label="Összes szekunder nyomásesés" value={`${results.secondaryPressureDropKpa} kPa`} isDark={isDark} />
                <ResultRow label="Maradék szivattyúnyomás" value={`${results.secondaryRemainingHeadKpa} kPa`} sub={results.secondaryRemainingHeadKpa < 10 ? '⚠ Kevés a tartalék' : '✓ Megfelelő tartalék'} isDark={isDark} />
                <ResultRow label="Javasolt segédszivattyú" value={results.dabPumpModel} isDark={isDark} />
                {results.dabPumpSetting && <ResultRow label="Beállítás / Fokozat" value={`${results.dabPumpSetting} • ${results.dabPumpStage}`} isDark={isDark} />}
                <ResultRow label="Tágulási tartály" value={`${results.secondaryVesselSizeL} L`} sub={`p₀=${results.prechargeCalculated} bar | pₑ=${results.finalCalculated} bar`} isDark={isDark} />
              </div>
              <div className={`p-2.5 rounded border md:col-span-2 ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-blue-50 border-blue-200'}`}>
                <p className={`text-[9px] font-black uppercase tracking-widest mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Lemezes Hőcserélő</p>
                <ResultRow label="Ajánlott modell" value={results.recommendedExchangerModel} isDark={isDark} />
                <ResultRow label="Hőátadó felület" value={`${results.heatExchangerAreaM2} m²`} isDark={isDark} />
                <ResultRow label="Vízáram a HX-en" value={`${results.heatExchangerWaterFlowLh} L/h`} isDark={isDark} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className={`p-2.5 rounded border ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <p className={`text-[9px] font-black uppercase tracking-widest mb-1.5 ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>Primer oldal (Hőszivattyú)</p>
                <ResultRow label="Ajánlott csőméret" value={results.recommendedPipeSize} isDark={isDark} />
                <ResultRow label="Áramlási sebesség" value={`${results.estimatedVelocityMs} m/s`} sub={results.estimatedVelocityMs > 1.0 ? '⚠ Magas sebesség!' : results.estimatedVelocityMs < 0.3 ? '⚠ Alacsony sebesség' : '✓ Optimális'} isDark={isDark} />
                <ResultRow label="Térfogatáram" value={`${results.flowRateLmin} L/perc`} sub={`${(results.flowRateLh / 1000).toFixed(2)} m³/h`} isDark={isDark} />
                <ResultRow label="ΔT / Hőfoklépcső" value={`${synced.primaryDeltaT} °C`} sub={`E: ${results.primaryFlowTempC}°C → V: ${results.primaryReturnTempC}°C`} isDark={isDark} />
                <ResultRow label="Nyomásveszteség" value={`${results.primaryPressureDropKpa} kPa`} isDark={isDark} />
                <ResultRow label="Maradék szivattyúnyomás" value={`${results.remainingPumpHeadKpa} kPa`} isDark={isDark} />
                <ResultRow label="Keringtetés" value="Hőszivattyú saját szivattyúja" isDark={isDark} />
                <ResultRow label="Tágulási tartály" value={`${results.vesselSizeL} L`} sub={`p₀=${results.prechargeCalculated} bar | pₑ=${results.finalCalculated} bar`} isDark={isDark} />
              </div>
              <div className={`p-2.5 rounded border ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <p className={`text-[9px] font-black uppercase tracking-widest mb-1.5 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>Szekunder oldal (Hőleadók)</p>
                <ResultRow label="Csőméret (Gerinc)" value={results.recommendedSecondaryPipeSize ?? '—'} isDark={isDark} />
                {results.secondaryEstimatedVelocityMs !== undefined && <ResultRow label="Sebesség (gerinc)" value={`${results.secondaryEstimatedVelocityMs} m/s`} isDark={isDark} />}
                <ResultRow label="Térfogatáram" value={`${(results.secondaryFlowRateLh / 60).toFixed(2)} L/perc`} sub={`${(results.secondaryFlowRateLh / 1000).toFixed(2)} m³/h`}
                  isDark={isDark} />
                <ResultRow label="ΔT / Hőfoklépcső" value={`${synced.secondaryDeltaT} °C`} sub={`E: ${results.secondaryFlowTempC}°C → V: ${results.secondaryReturnTempC}°C`} isDark={isDark} />
                <ResultRow label="Szekunder nyomásesés" value={`${results.secondaryPressureDropKpa} kPa`} isDark={isDark} />
                <ResultRow label="Maradék szivattyúnyomás" value={`${results.secondaryRemainingHeadKpa} kPa`} sub={results.secondaryRemainingHeadKpa < 10 ? '⚠ Kevés a tartalék' : '✓ Megfelelő tartalék'} isDark={isDark} />
                <ResultRow label="Javasolt segédszivattyú" value={results.dabPumpModel} isDark={isDark} />
                {results.dabPumpSetting && <ResultRow label="Beállítás / Fokozat" value={`${results.dabPumpSetting} • ${results.dabPumpStage}`} isDark={isDark} />}
                <ResultRow label="Tágulási tartály" value={`${results.secondaryVesselSizeL} L`} sub={`p₀=${results.prechargeCalculated} bar | pₑ=${results.finalCalculated} bar`} isDark={isDark} />
              </div>
            </div>
          )}

          <div className={`p-2.5 rounded border ${isDark ? 'bg-slate-800/20 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between mb-1.5">
              <p className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Puffer Ellenőrzés</p>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${results.isBufferAdequate ? 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30' : 'text-amber-600 bg-amber-500/10 border-amber-500/30'}`}>
                {results.isBufferAdequate ? '✓ Megfelelő' : '⚠ Kiegészítés javasolt'}
              </span>
            </div>
            <ResultRow label="Szükséges puffertérfogat" value={`${results.recommendedBufferL} L`} isDark={isDark} />
            <ResultRow label="Rendszertérfogat összesen" value={`${estSystemVol} L`} isDark={isDark} />
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
