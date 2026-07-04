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
}

function SectionLabel({ label, isDark }: { label: string; isDark: boolean }) {
  return (
    <p className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
      {label}
    </p>
  );
}

function ResultRow({ label, value, sub, isDark }: { label: string; value: React.ReactNode; sub?: string; isDark: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1.5 border-b last:border-b-0 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
      <div>
        <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</span>
        {sub && <span className={`block text-[9px] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{sub}</span>}
      </div>
      <span className={`font-mono font-bold text-[11px] ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{value}</span>
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
  return { ...state, includeHeatExchanger, additionalWaterVolumeL };
}

const couplingConfigs: Record<string, { label: string; desc: string }> = {
  '4-port-buffer': { label: '4-csonkos puffer', desc: 'Négyszer csatlakozós puffertartály a primer-szekunder kör hidraulikai leválasztására.' },
  'buffer-or-hydro': { label: 'Hidrováltó + puffer', desc: 'Hidrováltó és puffer a visszatérőben — hidraulikai leválasztás, közegleválasztás nélkül.' },
  'heat-exchanger': { label: 'Hőcserélő + puffer', desc: 'Hőcserélő és puffer a visszatérőben — teljes hidraulikai és közegleválasztás.' },
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

  const results = useMemo(
    () => calculateHydraulicsAndVessel(peakLoadKw, flowTemp, synced, heatedArea, engineeringParams),
    [peakLoadKw, flowTemp, synced, heatedArea, engineeringParams]
  );

  useEffect(() => { onCalculated(results); }, [results, onCalculated]);

  const estSystemVol = useMemo(() => {
    let mult = engineeringParams?.systemWaterVolumeRadiatorFactor ?? 12;
    if (hydraulicState.secondaryLoops === 'floor') mult = engineeringParams?.systemWaterVolumeFloorFactor ?? 15;
    else if (hydraulicState.secondaryLoops === 'fan_coil') mult = 8;
    else if (hydraulicState.secondaryLoops === 'mixed') mult = 13;
    return Math.round(peakLoadKw * mult + Number(hydraulicState.additionalWaterVolumeL || 0));
  }, [peakLoadKw, hydraulicState, engineeringParams]);

  const recommendedPump = useMemo(() => {
    const flowLh = results.flowRateLh;
    let headMult = 1.0;
    if (hydraulicState.secondaryLoops === 'floor' && longestCircuit > 100) headMult = 1.25;
    if (peakLoadKw <= 7.0 && floorCircuits <= 6)
      return { model: 'Grundfos UPM3 Auto 25-50 130', flow: `${(flowLh / 1000).toFixed(2)} m³/h`, head: `${(4.0 * headMult).toFixed(1)} m v.o.`, note: 'Kis rendszer, kisméretű osztógyűjtőhöz.' };
    if (peakLoadKw <= 13.5 && floorCircuits <= 12)
      return { model: 'Grundfos UPM3 Auto 25-70 180', flow: `${(flowLh / 1000).toFixed(2)} m³/h`, head: `${(5.5 * headMult).toFixed(1)} m v.o.`, note: 'Prémium, közepes lakórendszerekhez.' };
    if (peakLoadKw <= 16.0)
      return { model: 'Wilo Yonos Para 25/7.5 RLS', flow: `${(flowLh / 1000).toFixed(2)} m³/h`, head: `${(6.5 * headMult).toFixed(1)} m v.o.`, note: 'Nagy teljesítményű monoblokk segédszivattyú.' };
    return { model: 'Grundfos MAGNA3 25-80 180', flow: `${(flowLh / 1000).toFixed(2)} m³/h`, head: `${(7.8 * headMult).toFixed(1)} m v.o.`, note: 'Ipari keringtető nagy fűtőművekbe.' };
  }, [peakLoadKw, floorCircuits, longestCircuit, results, hydraulicState]);

  const pipeSizes = useMemo(() => {
    if (hydraulicState.pipeMaterial === 'copper')
      return [{ v: 'Auto', l: 'Auto' }, { v: 'Copper 18mm', l: '18 mm' }, { v: 'Copper 22mm', l: '22 mm' }, { v: 'Copper 28mm', l: '28 mm' }, { v: 'Copper 35mm', l: '35 mm' }];
    if (hydraulicState.pipeMaterial === 'pex')
      return [{ v: 'Auto', l: 'Auto' }, { v: 'PEX 20mm', l: '20 mm' }, { v: 'PEX 26mm', l: '26 mm' }, { v: 'PEX 32mm', l: '32 mm' }, { v: 'PEX 40mm', l: '40 mm' }];
    return [{ v: 'Auto', l: 'Auto' }, { v: 'Steel DN20', l: 'DN20' }, { v: 'Steel DN25', l: 'DN25' }, { v: 'Steel DN32', l: 'DN32' }, { v: 'Steel DN40', l: 'DN40' }];
  }, [hydraulicState.pipeMaterial]);

  const couplingOptions = Object.entries(couplingConfigs).map(([value, cfg]) => ({
    value,
    label: cfg.label,
  }));

  const activeCfg = couplingConfigs[hydraulicState.couplingType];

  const innerCard = `p-4 rounded-lg border ${isDark ? 'border-slate-800 bg-slate-800/10' : 'border-slate-200 bg-slate-50'}`;

  return (
    <div className={`rounded-lg border p-3 transition-all ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
      <div className="border-b pb-1.5">
        <h3 className={`font-semibold text-xs ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
          Hidraulikai méretezés
        </h3>
      </div>

      <div className="space-y-5 mt-3">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

        {/* Rendszerkapcsolás */}
        <div className={innerCard}>
          <label className={`text-[10px] font-bold uppercase tracking-wider block mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
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
          <p className={`mt-2 text-[10px] leading-snug ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            {activeCfg?.desc}
          </p>
        </div>

        {/* Puffer méret */}
        <div className={innerCard}>
          <label className={`text-[10px] font-bold uppercase tracking-wider block mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
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
          <p className={`mt-2 text-[10px] leading-snug ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Alapesetben 60 L elegendő. Nagyobb méret növeli a rendszertérfogatot és a tágulási tartály méretét.
          </p>
        </div>

        </div>

        {/* Méretezési paraméterek */}
        <div>
          <SectionLabel label="Méretezési paraméterek" isDark={isDark} />
        </div>

        <div className="space-y-2">
          <SectionLabel label="Gerinc anyaga" isDark={isDark} />
          <SegmentedControl
            options={[
              { value: 'copper', label: 'Rézcső' },
              { value: 'pex',    label: '5-rétegű' },
              { value: 'steel',  label: 'Szénacél' },
            ]}
            value={hydraulicState.pipeMaterial}
            onChange={(v) => setHydraulicState({ ...hydraulicState, pipeMaterial: v, primaryPipeSize: 'Auto', secondaryPipeSize: 'Auto' })}
            layoutId="hydraulic-material"
            theme={isDark ? 'dark' : 'light'}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <SectionLabel label="Primer csőméret" isDark={isDark} />
            <SegmentedControl
              options={pipeSizes.map((m) => ({ value: m.v, label: m.l }))}
              value={hydraulicState.primaryPipeSize || 'Auto'}
              onChange={(v) => updateInput('primaryPipeSize', v)}
              layoutId="hydraulic-primary-size"
              theme={isDark ? 'dark' : 'light'}
            />
          </div>
          <div className="space-y-2">
            <SectionLabel label="Szekunder csőméret (Gerinc)" isDark={isDark} />
            <SegmentedControl
              options={pipeSizes.map((m) => ({ value: m.v, label: m.l }))}
              value={hydraulicState.secondaryPipeSize || 'Auto'}
              onChange={(v) => updateInput('secondaryPipeSize', v)}
              layoutId="hydraulic-secondary-size"
              theme={isDark ? 'dark' : 'light'}
            />
          </div>
        </div>

        <div className="space-y-2">
          <SectionLabel label="Tervezési Hőlépcső — ΔT" isDark={isDark} />
          <SegmentedControl
            options={[
              { value: '5',  label: '5 °C' },
              { value: '7',  label: '7 °C' },
              { value: '10', label: '10 °C' },
              { value: '15', label: '15 °C' },
            ]}
            value={String(hydraulicState.deltaT)}
            onChange={(v) => updateInput('deltaT', Number(v))}
            layoutId="hydraulic-deltat"
            theme={isDark ? 'dark' : 'light'}
          />
        </div>

        <div className="space-y-2">
          <SectionLabel label="Hőleadók jellege (Szekunder)" isDark={isDark} />
          <SegmentedControl
            options={[
              { value: 'floor',     label: 'Padlófűtés' },
              { value: 'radiators', label: 'Lapradiátorok' },
              { value: 'fan_coil',  label: 'Fan-coil' },
              { value: 'mixed',     label: 'Kevert (Pad.+Rad.)' },
            ]}
            value={hydraulicState.secondaryLoops}
            onChange={(v) => updateInput('secondaryLoops', v)}
            layoutId="hydraulic-secondary-loops"
            theme={isDark ? 'dark' : 'light'}
          />
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

        {/* Mérnöki paraméterek */}
        <div className={`p-3 rounded border space-y-4 ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
          <SectionLabel label="Mérnöki Paraméterek (Haladó)" isDark={isDark} />

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Tervezett csősebesség</span>
              <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded border ${isDark ? 'bg-slate-900 border-slate-800 text-blue-400' : 'bg-white border-slate-300 text-blue-700'}`}>
                {hydraulicState.targetVelocityMs?.toFixed(2) ?? '0.60'} m/s
              </span>
            </div>
            <input type="range" min={0.3} max={1.2} step={0.05} value={hydraulicState.targetVelocityMs ?? 0.6}
              onChange={(e) => updateInput('targetVelocityMs' as any, parseFloat(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer h-1 rounded-lg" />
            <div className="flex justify-between text-[9px] text-slate-400 font-medium">
              <span>0.3 m/s (Padló min.)</span>
              <span className="text-blue-500 font-bold">0.6 m/s (Ajánlott primer)</span>
              <span>1.2 m/s (Max. réz)</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Becsült csőhossz (primer kör)</span>
              <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded border ${isDark ? 'bg-slate-900 border-slate-800 text-blue-400' : 'bg-white border-slate-300 text-blue-700'}`}>
                {hydraulicState.pipeLengthEstimate ?? 15} m
              </span>
            </div>
            <input type="range" min={5} max={50} step={5} value={hydraulicState.pipeLengthEstimate ?? 15}
              onChange={(e) => updateInput('pipeLengthEstimate', Number(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer h-1 rounded-lg" />
            <div className="flex justify-between text-[9px] text-slate-400 font-medium">
              <span>5 m (Közel)</span>
              <span>25 m (Távoli)</span>
              <span>50 m (Nagyon távoli)</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Idomok / szerelvények száma</span>
              <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded border ${isDark ? 'bg-slate-900 border-slate-800 text-blue-400' : 'bg-white border-slate-300 text-blue-700'}`}>
                {hydraulicState.fittingsCount ?? 8} db
              </span>
            </div>
            <input type="range" min={2} max={20} step={1} value={hydraulicState.fittingsCount ?? 8}
              onChange={(e) => updateInput('fittingsCount', Number(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer h-1 rounded-lg" />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Statikus magasság (Rendszer)</span>
              <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded border ${isDark ? 'bg-slate-900 border-slate-800 text-blue-400' : 'bg-white border-slate-300 text-blue-700'}`}>
                {hydraulicState.staticHeight} m
              </span>
            </div>
            <input type="range" min={1} max={20} step={0.5} value={hydraulicState.staticHeight}
              onChange={(e) => updateInput('staticHeight', parseFloat(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer h-1 rounded-lg" />
            <div className="flex justify-between text-[9px] text-slate-400 font-medium">
              <span>1 m (Fsz.)</span>
              <span>4 m (2 szint)</span>
              <span>20 m (Torony)</span>
            </div>
          </div>

          <div className="space-y-2">
            <span className={`text-[10px] font-bold block ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Biztonsági szelep nyomása</span>
            <SegmentedControl
              options={[
                { value: '2.5', label: '2.5 bar' },
                { value: '3.0', label: '3.0 bar' },
                { value: '4.0', label: '4.0 bar' },
                { value: '6.0', label: '6.0 bar' },
              ]}
              value={String(hydraulicState.safetyValvePressure)}
              onChange={(v) => updateInput('safetyValvePressure', parseFloat(v))}
              layoutId="hydraulic-safety-valve"
              theme={isDark ? 'dark' : 'light'}
            />
          </div>
        </div>

        {/* Eredmények */}
        <div>
          <SectionLabel label="Eredmények" isDark={isDark} />
        </div>

        <div className="space-y-4">
          {hydraulicState.includeHeatExchanger ? (
            <>
              <div className={`p-3 rounded border ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>I. Primer oldal (Hőszivattyú)</p>
                <ResultRow label="Tágulási tartály" value={`${results.primaryVesselSizeL} L`} sub={`p₀=${results.prechargeCalculated} bar | pₑ=${results.finalCalculated} bar`} isDark={isDark} />
                <ResultRow label="Tömegáram" value={`${results.primaryMassFlowKgh} kg/h`} sub={`${results.flowRateLh} L/h`} isDark={isDark} />
                <ResultRow label="Ajánlott csőméret" value={results.recommendedPipeSize} isDark={isDark} />
                <ResultRow label="Áramlási sebesség" value={`${results.estimatedVelocityMs} m/s`} sub={results.estimatedVelocityMs > 1.0 ? '⚠ Magas sebesség!' : results.estimatedVelocityMs < 0.3 ? '⚠ Alacsony sebesség' : '✓ Optimális tartomány'} isDark={isDark} />
                <ResultRow label="Térfogatáram" value={`${results.flowRateLh} L/h`} sub={`${results.flowRateLmin} L/perc`} isDark={isDark} />
                <ResultRow label="ΔT / Hőfoklépcső" value={`${hydraulicState.deltaT} °C`} sub={`E: ${results.primaryFlowTempC}°C → V: ${results.primaryReturnTempC}°C`} isDark={isDark} />
                <ResultRow label="Nyomásveszteség (cső + helyi)" value={`${results.primaryPipeLossKpa} kPa`} isDark={isDark} />
                {hydraulicState.includeHeatExchanger && <ResultRow label="HX nyomásveszteség" value={`${(results.primaryPressureDropKpa - results.primaryPipeLossKpa - 1.8).toFixed(1)} kPa`} isDark={isDark} />}
                <ResultRow label="Összes primer nyomásesés" value={`${results.primaryPressureDropKpa} kPa`} isDark={isDark} />
                <ResultRow label="Maradék szivattyúnyomás" value={`${results.remainingPumpHeadKpa} kPa`} isDark={isDark} />
                {results.glycolPercentageUsed > 0 && (
                  <ResultRow label="Fagyálló (glikol)" value={`${results.glycolPercentageUsed}%`} sub={`ρ=${results.glycolDensityKgm3} kg/m³, cp=${results.glycolSpecificHeatWhKgK} Wh/kgK`} isDark={isDark} />
                )}
              </div>
              <div className={`p-3 rounded border ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>II. Szekunder oldal (Hőleadók)</p>
                <ResultRow label="Tágulási tartály" value={`${results.secondaryVesselSizeL} L`} sub={`p₀=${results.prechargeCalculated} bar | pₑ=${results.finalCalculated} bar`} isDark={isDark} />
                <ResultRow label="Tömegáram" value={`${results.secondaryMassFlowKgh} kg/h`} sub={`${results.secondaryFlowRateLh} L/h`} isDark={isDark} />
                <ResultRow label="Csőméret (Gerinc)" value={results.recommendedSecondaryPipeSize ?? '—'} isDark={isDark} />
                {results.secondaryEstimatedVelocityMs !== undefined && <ResultRow label="Sebesség (gerinc)" value={`${results.secondaryEstimatedVelocityMs} m/s`} isDark={isDark} />}
                <ResultRow label="Térfogatáram" value={`${results.secondaryFlowRateLh} L/h`}
                  sub={(hydraulicState.secondaryLoops === 'floor' || hydraulicState.secondaryLoops === 'mixed') ? `Körönként: ${(results.secondaryFlowRateLh / (floorCircuits || 8) / 60).toFixed(2)} L/perc` : undefined}
                  isDark={isDark} />
                <ResultRow label="ΔT / Hőfoklépcső" value={`5 °C`} sub={`E: ${results.secondaryFlowTempC}°C → V: ${results.secondaryReturnTempC}°C`} isDark={isDark} />
                <ResultRow label="Nyomásveszteség (cső + helyi)" value={`${results.secondaryPipeLossKpa} kPa`} isDark={isDark} />
                <ResultRow label="Összes szekunder nyomásesés" value={`${results.secondaryPressureDropKpa} kPa`} isDark={isDark} />
                <ResultRow label="Javasolt segédszivattyú" value={results.dabPumpModel} isDark={isDark} />
                {results.dabPumpSetting && <ResultRow label="Beállítás / Fokozat" value={`${results.dabPumpSetting} • ${results.dabPumpStage}`} isDark={isDark} />}
              </div>
              <div className={`p-3 rounded border ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-blue-50 border-blue-200'}`}>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Lemezes Hőcserélő</p>
                <ResultRow label="Ajánlott modell" value={results.recommendedExchangerModel} isDark={isDark} />
                <ResultRow label="Hőátadó felület" value={`${results.heatExchangerAreaM2} m²`} isDark={isDark} />
                <ResultRow label="Vízáram a HX-en" value={`${results.heatExchangerWaterFlowLh} L/h`} isDark={isDark} />
              </div>
            </>
          ) : (
            <div className={`p-3 rounded border ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Egyesített Hidraulikai Kör</p>
              <ResultRow label="Tágulási tartály" value={`${results.vesselSizeL} L`} sub={`p₀=${results.prechargeCalculated} bar | pₑ=${results.finalCalculated} bar`} isDark={isDark} />
              <ResultRow label="Tömegáram" value={`${results.primaryMassFlowKgh} kg/h`} sub={`${results.flowRateLh} L/h`} isDark={isDark} />
              <ResultRow label="Ajánlott csőméret" value={results.recommendedPipeSize} isDark={isDark} />
              <ResultRow label="Áramlási sebesség" value={`${results.estimatedVelocityMs} m/s`}
                sub={results.estimatedVelocityMs > 1.0 ? '⚠ Magas sebesség!' : results.estimatedVelocityMs < 0.3 ? '⚠ Alacsony sebesség' : '✓ Optimális'} isDark={isDark} />
              <ResultRow label="Térfogatáram" value={`${results.flowRateLh} L/h`} sub={`${results.flowRateLmin} L/perc`} isDark={isDark} />
              <ResultRow label="ΔT / Hőfoklépcső" value={`${hydraulicState.deltaT} °C`} sub={`E: ${results.primaryFlowTempC}°C → V: ${results.primaryReturnTempC}°C`} isDark={isDark} />
              <ResultRow label="Rendszer-vízmennyiség" value={`${estSystemVol} L`} isDark={isDark} />
              <ResultRow label="Nyomásveszteség" value={`${results.primaryPressureDropKpa} kPa`} isDark={isDark} />
              <ResultRow label="Maradék szivattyúnyomás" value={`${results.remainingPumpHeadKpa} kPa`} isDark={isDark} />
              <ResultRow label="Keringtetés" value="Hőszivattyú saját szivattyúja" isDark={isDark} />
            </div>
          )}

          <div className={`p-3 rounded border ${isDark ? 'bg-slate-800/20 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <p className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Puffer Ellenőrzés</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${results.isBufferAdequate ? 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30' : 'text-amber-600 bg-amber-500/10 border-amber-500/30'}`}>
                {results.isBufferAdequate ? '✓ Megfelelő' : '⚠ Kiegészítés javasolt'}
              </span>
            </div>
            <ResultRow label="Szükséges puffertérfogat" value={`${results.recommendedBufferL} L`} isDark={isDark} />
            <ResultRow label="Rendszertérfogat összesen" value={`${estSystemVol} L`} isDark={isDark} />
          </div>

          <div className={`p-3 rounded border ${isDark ? 'bg-slate-800/20 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Javasolt Keringtető Szivattyú</p>
            <ResultRow label="Modell" value={recommendedPump.model} isDark={isDark} />
            <ResultRow label="Névleges áramlás" value={recommendedPump.flow} isDark={isDark} />
            <ResultRow label="Szállítómagasság" value={recommendedPump.head} isDark={isDark} />
            <p className={`text-[9px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{recommendedPump.note}</p>
          </div>

          <div className={`flex gap-1.5 p-2 rounded border text-[9px] leading-snug ${isDark ? 'bg-slate-950/20 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
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
