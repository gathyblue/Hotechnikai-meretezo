import React, { useState, useMemo, useEffect } from 'react';
import { HydraulicInput, HydraulicResults, EngineeringParams } from '../types';
import { calculateHydraulicsAndVessel } from '../utils/calculations';
import { Gauge, Droplets, Info, Layers, CheckCircle } from 'lucide-react';

interface HydraulicExpansionCalcProps {
  peakLoadKw: number;
  flowTemp: number;
  onCalculated: (results: HydraulicResults) => void;
  hydraulicState: HydraulicInput;
  setHydraulicState: (state: HydraulicInput) => void;
  heatedArea: number;
  engineeringParams?: EngineeringParams;
  theme?: string;
}

// Reusable segmented control (same visual language as the main header)
function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  isDark,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  isDark: boolean;
}) {
  return (
    <div className={`p-[2px] rounded border flex gap-0.5 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-200 border-slate-300'}`}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 text-[10px] font-bold px-3 py-1 rounded-[3px] transition-all cursor-pointer whitespace-nowrap ${
            value === opt.value
              ? isDark ? 'bg-slate-800 text-slate-100 shadow-sm' : 'bg-white text-slate-900 shadow-sm'
              : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// Reusable section label
function SectionLabel({ label, isDark }: { label: string; isDark: boolean }) {
  return (
    <p className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
      {label}
    </p>
  );
}

// Reusable result row
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

export const HydraulicExpansionCalc: React.FC<HydraulicExpansionCalcProps> = ({
  peakLoadKw,
  flowTemp,
  onCalculated,
  hydraulicState,
  setHydraulicState,
  heatedArea,
  engineeringParams,
  theme,
}) => {
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState<'rendszer' | 'meretezs' | 'eredmenyek'>('rendszer');

  // Local state
  const [floorCircuits, setFloorCircuits] = useState<number>(8);
  const [longestCircuit, setLongestCircuit] = useState<number>(100);
  const [radiatorCount, setRadiatorCount] = useState<number>(8);

  const updateInput = (field: keyof HydraulicInput, value: any) => {
    setHydraulicState({ ...hydraulicState, [field]: value });
  };

  const results = useMemo(
    () => calculateHydraulicsAndVessel(peakLoadKw, flowTemp, hydraulicState, heatedArea, engineeringParams),
    [peakLoadKw, flowTemp, hydraulicState, heatedArea, engineeringParams]
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

  // Pipe size options based on material
  const pipeSizes = useMemo(() => {
    if (hydraulicState.pipeMaterial === 'copper')
      return [{ v: 'Auto', l: 'Auto' }, { v: 'Copper 18mm', l: '18 mm' }, { v: 'Copper 22mm', l: '22 mm' }, { v: 'Copper 28mm', l: '28 mm' }, { v: 'Copper 35mm', l: '35 mm' }];
    if (hydraulicState.pipeMaterial === 'pex')
      return [{ v: 'Auto', l: 'Auto' }, { v: 'PEX 20mm', l: '20 mm' }, { v: 'PEX 26mm', l: '26 mm' }, { v: 'PEX 32mm', l: '32 mm' }, { v: 'PEX 40mm', l: '40 mm' }];
    return [{ v: 'Auto', l: 'Auto' }, { v: 'Steel DN20', l: 'DN20' }, { v: 'Steel DN25', l: 'DN25' }, { v: 'Steel DN32', l: 'DN32' }, { v: 'Steel DN40', l: 'DN40' }];
  }, [hydraulicState.pipeMaterial]);

  // Coupling type options
  const couplingOptions = [
    { id: 'heat_exchanger', title: 'Hőcserélős leválasztás', desc: 'Fagyálló fűtéskör primer oldalon', ex: true, buf: 0 },
    { id: 'buffer',         title: 'Puffertartály',          desc: '100 L hidraulikus váltó funkcióval',  ex: false, buf: 100 },
    { id: 'direct',         title: 'Direkt Bypass',          desc: 'Sorba kötött rendszer',                ex: false, buf: 0 },
    { id: 'hydro_switch',   title: 'Hidrováltó',             desc: 'Klasszikus nyomáskülönbség mentesítő', ex: false, buf: 20 },
  ];

  const activeCoupling = (opt: typeof couplingOptions[0]) =>
    hydraulicState.includeHeatExchanger === opt.ex &&
    ((opt.id === 'heat_exchanger') ||
     (opt.id === 'buffer'       && hydraulicState.additionalWaterVolumeL === 100 && !hydraulicState.includeHeatExchanger) ||
     (opt.id === 'direct'       && hydraulicState.additionalWaterVolumeL === 0   && !hydraulicState.includeHeatExchanger) ||
     (opt.id === 'hydro_switch' && hydraulicState.additionalWaterVolumeL === 20  && !hydraulicState.includeHeatExchanger));

  const cardBase = `p-2 rounded border cursor-pointer select-none transition-all text-xs`;

  return (
    <div
      className={`rounded border shadow-sm overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}
      id="hydraulics-calculator"
    >
      {/* Header with internal tab navigator */}
      <div className={`px-3 py-2 border-b flex items-center justify-between ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex items-center gap-2">
          <Gauge className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-blue-400' : 'text-slate-500'}`} />
          <span className={`font-bold text-[11px] uppercase tracking-wider ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
            Hidraulikai Méretezés
          </span>
        </div>
        <SegmentedControl
          options={[
            { value: 'rendszer', label: 'Rendszer' },
            { value: 'meretezs', label: 'Méretezés' },
            { value: 'eredmenyek', label: 'Eredmények' },
          ]}
          value={activeTab}
          onChange={setActiveTab}
          isDark={isDark}
        />
      </div>

      <div className="p-4">

        {/* ═══════════ TAB 1: RENDSZER ═══════════ */}
        {activeTab === 'rendszer' && (
          <div className="space-y-5">

            {/* Coupling type */}
            <div className="space-y-2">
              <SectionLabel label="1. Rendszerkapcsolás típusa (Primer–Szekunder illesztés)" isDark={isDark} />
              <div className="grid grid-cols-2 gap-2">
                {couplingOptions.map((opt) => {
                  const sel = activeCoupling(opt);
                  return (
                    <div
                      key={opt.id}
                      onClick={() => setHydraulicState({ ...hydraulicState, includeHeatExchanger: opt.ex, additionalWaterVolumeL: opt.buf })}
                      className={`${cardBase} ${sel
                        ? isDark ? 'bg-slate-800 border-slate-500' : 'bg-blue-50 border-blue-400'
                        : isDark ? 'bg-slate-900 border-slate-700 hover:border-slate-600' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className={`font-bold text-[11px] mb-0.5 ${sel ? (isDark ? 'text-white' : 'text-blue-800') : (isDark ? 'text-slate-300' : 'text-slate-600')}`}>
                        {opt.title}
                      </div>
                      <div className={`text-[9.5px] ${sel ? (isDark ? 'text-slate-300' : 'text-blue-700') : (isDark ? 'text-slate-500' : 'text-slate-400')}`}>
                        {opt.desc}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* HMV */}
            <div className="space-y-2">
              <SectionLabel label="2. Háztartási melegvíz (HMV)" isDark={isDark} />
              <SegmentedControl
                options={[
                  { value: 'yes' as any, label: 'Igen, HMV tárolóval' },
                  { value: 'no'  as any, label: 'Nincs HMV' },
                ]}
                value={(hydraulicState.includeDhwTank ? 'yes' : 'no') as any}
                onChange={(v) => updateInput('includeDhwTank', v === 'yes')}
                isDark={isDark}
              />
            </div>

            {/* Extra buffer volume (if not heat exchanger) */}
            {!hydraulicState.includeHeatExchanger && (
              <div className="space-y-2">
                <SectionLabel label="3. Extra puffertartály / Hidraulikus váltó (L)" isDark={isDark} />
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0} max={300} step={10}
                    value={hydraulicState.additionalWaterVolumeL}
                    onChange={(e) => updateInput('additionalWaterVolumeL', Number(e.target.value))}
                    className="flex-1 accent-blue-500 cursor-pointer h-1 rounded-lg"
                  />
                  <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded border shrink-0 ${isDark ? 'bg-slate-950 border-slate-800 text-blue-400' : 'bg-slate-100 border-slate-300 text-blue-700'}`}>
                    {hydraulicState.additionalWaterVolumeL} L
                  </span>
                </div>
                <div className="flex justify-between text-[9px] text-slate-400 font-medium">
                  <span>0 L (Bypass)</span>
                  <span>100 L (Puffer)</span>
                  <span>300 L (Nagy tároló)</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════ TAB 2: MÉRETEZÉS ═══════════ */}
        {activeTab === 'meretezs' && (
          <div className="space-y-5">

            {/* Pipe material */}
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
                isDark={isDark}
              />
            </div>

            {/* Primer + Szekunder pipe size side-by-side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <SectionLabel label="Primer csőméret" isDark={isDark} />
                <div className={`p-[2px] rounded border flex flex-wrap gap-0.5 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-200 border-slate-300'}`}>
                  {pipeSizes.map((m) => (
                    <button
                      key={m.v}
                      type="button"
                      onClick={() => updateInput('primaryPipeSize', m.v)}
                      className={`flex-1 min-w-[36px] text-[10px] font-bold px-1.5 py-1 rounded-[3px] transition-all cursor-pointer ${
                        (hydraulicState.primaryPipeSize === m.v || (!hydraulicState.primaryPipeSize && m.v === 'Auto'))
                          ? isDark ? 'bg-slate-800 text-slate-100 shadow-sm' : 'bg-white text-slate-900 shadow-sm'
                          : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {m.l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <SectionLabel label="Szekunder csőméret (Gerinc)" isDark={isDark} />
                <div className={`p-[2px] rounded border flex flex-wrap gap-0.5 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-200 border-slate-300'}`}>
                  {pipeSizes.map((m) => (
                    <button
                      key={m.v}
                      type="button"
                      onClick={() => updateInput('secondaryPipeSize', m.v)}
                      className={`flex-1 min-w-[36px] text-[10px] font-bold px-1.5 py-1 rounded-[3px] transition-all cursor-pointer ${
                        (hydraulicState.secondaryPipeSize === m.v || (!hydraulicState.secondaryPipeSize && m.v === 'Auto'))
                          ? isDark ? 'bg-slate-800 text-slate-100 shadow-sm' : 'bg-white text-slate-900 shadow-sm'
                          : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {m.l}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Tervezési hőlépcső */}
            <div className="space-y-2">
              <SectionLabel label="Tervezési Hőlépcső — ΔT" isDark={isDark} />
              <SegmentedControl
                options={[
                  { value: '5' as any,  label: '5 °C' },
                  { value: '7' as any,  label: '7 °C' },
                  { value: '10' as any, label: '10 °C' },
                  { value: '15' as any, label: '15 °C' },
                ]}
                value={String(hydraulicState.deltaT) as any}
                onChange={(v) => updateInput('deltaT', Number(v))}
                isDark={isDark}
              />
            </div>

            {/* Hőleadók jellege */}
            <div className="space-y-2">
              <SectionLabel label="Hőleadók jellege (Szekunder)" isDark={isDark} />
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { v: 'floor',     l: 'Padlófűtés' },
                  { v: 'radiators', l: 'Lapradiátorok' },
                  { v: 'fan_coil',  l: 'Fan-coil' },
                  { v: 'mixed',     l: 'Kevert (Pad.+Rad.)' },
                ].map((m) => (
                  <div
                    key={m.v}
                    onClick={() => updateInput('secondaryLoops', m.v as any)}
                    className={`${cardBase} text-center ${
                      hydraulicState.secondaryLoops === m.v
                        ? isDark ? 'bg-blue-700 border-blue-500 text-white' : 'bg-blue-50 border-blue-500 text-blue-800 font-semibold'
                        : isDark ? 'bg-slate-900 border-slate-700 hover:border-slate-600 text-slate-400' : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    {m.l}
                  </div>
                ))}
              </div>

              {/* Floor circuit details */}
              {(hydraulicState.secondaryLoops === 'floor' || hydraulicState.secondaryLoops === 'mixed') && (
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div className="space-y-1">
                    <label className={`text-[9px] font-bold uppercase block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Osztó Körök (db)</label>
                    <input
                      type="number" min={2} max={30} value={floorCircuits}
                      onChange={(e) => setFloorCircuits(Number(e.target.value))}
                      className={`w-full px-2 py-1 border rounded text-xs font-mono focus:outline-none ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={`text-[9px] font-bold uppercase block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Leghosszabb Kör (m)</label>
                    <input
                      type="number" min={20} max={200} value={longestCircuit}
                      onChange={(e) => setLongestCircuit(Number(e.target.value))}
                      className={`w-full px-2 py-1 border rounded text-xs font-mono focus:outline-none ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'}`}
                    />
                  </div>
                </div>
              )}
              {(hydraulicState.secondaryLoops === 'radiators' || hydraulicState.secondaryLoops === 'mixed') && (
                <div className="space-y-1 mt-1">
                  <label className={`text-[9px] font-bold uppercase block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Lapradiátorok Száma (db)</label>
                  <input
                    type="number" min={1} max={30} value={radiatorCount}
                    onChange={(e) => setRadiatorCount(Number(e.target.value))}
                    className={`w-full px-2 py-1 border rounded text-xs font-mono focus:outline-none ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'}`}
                  />
                </div>
              )}
            </div>

            {/* ─── ENGINEERING PARAMETERS ─── */}
            <div className={`p-3 rounded border space-y-4 ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <SectionLabel label="Mérnöki Paraméterek (Haladó)" isDark={isDark} />

              {/* Target velocity slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Tervezett csősebesség</span>
                  <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded border ${isDark ? 'bg-slate-900 border-slate-800 text-blue-400' : 'bg-white border-slate-300 text-blue-700'}`}>
                    {hydraulicState.targetVelocityMs?.toFixed(2) ?? '0.60'} m/s
                  </span>
                </div>
                <input
                  type="range"
                  min={0.3} max={1.2} step={0.05}
                  value={hydraulicState.targetVelocityMs ?? 0.6}
                  onChange={(e) => updateInput('targetVelocityMs' as any, parseFloat(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer h-1 rounded-lg"
                />
                <div className="flex justify-between text-[9px] text-slate-400 font-medium">
                  <span>0.3 m/s (Padló min.)</span>
                  <span className="text-blue-500 font-bold">0.6 m/s (Ajánlott primer)</span>
                  <span>1.2 m/s (Max. réz)</span>
                </div>
              </div>

              {/* Static height slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Statikus magasság (Rendszer)</span>
                  <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded border ${isDark ? 'bg-slate-900 border-slate-800 text-blue-400' : 'bg-white border-slate-300 text-blue-700'}`}>
                    {hydraulicState.staticHeight} m
                  </span>
                </div>
                <input
                  type="range"
                  min={1} max={20} step={0.5}
                  value={hydraulicState.staticHeight}
                  onChange={(e) => updateInput('staticHeight', parseFloat(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer h-1 rounded-lg"
                />
                <div className="flex justify-between text-[9px] text-slate-400 font-medium">
                  <span>1 m (Fsz.)</span>
                  <span>4 m (2 szint)</span>
                  <span>20 m (Torony)</span>
                </div>
              </div>

              {/* Safety valve pressure */}
              <div className="space-y-2">
                <span className={`text-[10px] font-bold block ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Biztonsági szelep nyomása</span>
                <SegmentedControl
                  options={[
                    { value: '2.5' as any, label: '2.5 bar' },
                    { value: '3.0' as any, label: '3.0 bar' },
                    { value: '4.0' as any, label: '4.0 bar' },
                    { value: '6.0' as any, label: '6.0 bar' },
                  ]}
                  value={String(hydraulicState.safetyValvePressure) as any}
                  onChange={(v) => updateInput('safetyValvePressure', parseFloat(v as any))}
                  isDark={isDark}
                />
              </div>
            </div>
          </div>
        )}

        {/* ═══════════ TAB 3: EREDMÉNYEK ═══════════ */}
        {activeTab === 'eredmenyek' && (
          <div className="space-y-4">

            {hydraulicState.includeHeatExchanger ? (
              <>
                {/* I. Primary */}
                <div className={`p-3 rounded border ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>I. Primer oldal (Hőszivattyú)</p>
                  <ResultRow label="Tágulási tartály" value={`${results.primaryVesselSizeL} L`} isDark={isDark} />
                  <ResultRow label="Ajánlott csőméret" value={results.recommendedPipeSize} isDark={isDark} />
                  <ResultRow label="Áramlási sebesség" value={`${results.estimatedVelocityMs} m/s`} sub={results.estimatedVelocityMs > 1.0 ? '⚠ Magas sebesség!' : results.estimatedVelocityMs < 0.3 ? '⚠ Alacsony sebesség' : '✓ Optimális tartomány'} isDark={isDark} />
                  <ResultRow label="Térfogatáram" value={`${results.flowRateLh} L/h`} sub={`${results.flowRateLmin} L/perc`} isDark={isDark} />
                  <ResultRow label="Nyomásveszteség" value={`${results.primaryPressureDropKpa} kPa`} isDark={isDark} />
                  <ResultRow label="Maradék szivattyónyomás" value={`${results.remainingPumpHeadKpa} kPa`} isDark={isDark} />
                </div>

                {/* II. Secondary */}
                <div className={`p-3 rounded border ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>II. Szekunder oldal (Hőleadók)</p>
                  <ResultRow label="Tágulási tartály" value={`${results.secondaryVesselSizeL} L`} isDark={isDark} />
                  <ResultRow label="Csőméret (Gerinc)" value={results.recommendedSecondaryPipeSize ?? '—'} isDark={isDark} />
                  {results.secondaryEstimatedVelocityMs !== undefined && (
                    <ResultRow label="Sebesség (gerinc)" value={`${results.secondaryEstimatedVelocityMs} m/s`} isDark={isDark} />
                  )}
                  <ResultRow label="Térfogatáram" value={`${results.secondaryFlowRateLh} L/h`}
                    sub={(hydraulicState.secondaryLoops === 'floor' || hydraulicState.secondaryLoops === 'mixed')
                      ? `Körönként: ${(results.secondaryFlowRateLh / (floorCircuits || 8) / 60).toFixed(2)} L/perc`
                      : undefined}
                    isDark={isDark}
                  />
                  <ResultRow label="Nyomásveszteség" value={`${results.secondaryPressureDropKpa} kPa`} isDark={isDark} />
                  <ResultRow label="Javasolt segédszivattyú" value={results.dabPumpModel} isDark={isDark} />
                  {results.dabPumpSetting && (
                    <ResultRow label="Beállítás / Fokozat" value={`${results.dabPumpSetting} • ${results.dabPumpStage}`} isDark={isDark} />
                  )}
                </div>

                {/* Heat exchanger */}
                <div className={`p-3 rounded border ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-blue-50 border-blue-200'}`}>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Lemezes Hőcserélő</p>
                  <ResultRow label="Ajánlott modell" value={results.recommendedExchangerModel} isDark={isDark} />
                  <ResultRow label="Hőátadó felület" value={`${results.heatExchangerAreaM2} m²`} isDark={isDark} />
                  <ResultRow label="Vízáram a HX-en" value={`${results.heatExchangerWaterFlowLh} L/h`} isDark={isDark} />
                </div>
              </>
            ) : (
              /* Unified circuit */
              <div className={`p-3 rounded border ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Egyesített Hidraulikai Kör</p>
                <ResultRow label="Tágulási tartály" value={`${results.vesselSizeL} L`} isDark={isDark} />
                <ResultRow label="Előtöltési nyomás" value={`${results.vesselPrechargeBar} bar`} isDark={isDark} />
                <ResultRow label="Üzemi nyomás (max)" value={`${results.vesselFinalBar} bar`} isDark={isDark} />
                <ResultRow label="Ajánlott csőméret" value={results.recommendedPipeSize} isDark={isDark} />
                <ResultRow
                  label="Áramlási sebesség"
                  value={`${results.estimatedVelocityMs} m/s`}
                  sub={results.estimatedVelocityMs > 1.0 ? '⚠ Magas sebesség!' : results.estimatedVelocityMs < 0.3 ? '⚠ Alacsony sebesség' : '✓ Optimális'}
                  isDark={isDark}
                />
                <ResultRow label="Térfogatáram" value={`${results.flowRateLh} L/h`} sub={`${results.flowRateLmin} L/perc`} isDark={isDark} />
                <ResultRow label="Rendszer-vízmennyiség" value={`${estSystemVol} L`} isDark={isDark} />
                <ResultRow label="Keringtetés" value="Hőszivattyú saját szivattyúja" isDark={isDark} />
              </div>
            )}

            {/* Buffer check */}
            <div className={`p-3 rounded border ${isDark ? 'bg-slate-800/20 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <p className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Puffer Ellenőrzés</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  results.isBufferAdequate
                    ? 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30'
                    : 'text-amber-600 bg-amber-500/10 border-amber-500/30'
                }`}>
                  {results.isBufferAdequate ? '✓ Megfelelő' : '⚠ Kiegészítés javasolt'}
                </span>
              </div>
              <ResultRow label="Szükséges puffertérfogat" value={`${results.recommendedBufferL} L`} isDark={isDark} />
              <ResultRow label="Rendszertérfogat összesen" value={`${estSystemVol} L`} isDark={isDark} />
            </div>

            {/* Recommended pump */}
            <div className={`p-3 rounded border ${isDark ? 'bg-slate-800/20 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Javasolt Keringtető Szivattyú</p>
              <ResultRow label="Modell" value={recommendedPump.model} isDark={isDark} />
              <ResultRow label="Névleges áramlás" value={recommendedPump.flow} isDark={isDark} />
              <ResultRow label="Szállítómagasság" value={recommendedPump.head} isDark={isDark} />
              <p className={`text-[9px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{recommendedPump.note}</p>
            </div>

            {/* Frost notice */}
            <div className={`flex gap-1.5 p-2 rounded border text-[9px] leading-snug ${isDark ? 'bg-slate-950/20 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
              <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
              <span>
                <strong>FAGYVÉDELMI KÖVETELMÉNY:</strong> Monoblokkos kivitelnél a kültéri ágon fagyvédelmi lefúvató szelep (pl. Caleffi iFrost) beépítése kötelező! Glikol fagyálló nem kerül alkalmazásra.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
