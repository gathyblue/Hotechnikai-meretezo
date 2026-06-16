import React, { useState, useMemo, useEffect } from 'react';
import { HydraulicInput, HydraulicResults, EngineeringParams } from '../types';
import { calculateHydraulicsAndVessel } from '../utils/calculations';
import { Gauge, Droplets, Info, RefreshCw, Layers, CheckCircle, ListPlus } from 'lucide-react';

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

  // Localized circuit states
  const [floorCircuits, setFloorCircuits] = useState<number>(8);
  const [longestCircuit, setLongestCircuit] = useState<number>(100);
  const [radiatorCount, setRadiatorCount] = useState<number>(8);

  const updateInput = (field: keyof HydraulicInput, value: any) => {
    const newState = { ...hydraulicState, [field]: value };
    setHydraulicState(newState);
  };

  const results = useMemo(() => {
    return calculateHydraulicsAndVessel(peakLoadKw, flowTemp, hydraulicState, heatedArea, engineeringParams);
  }, [peakLoadKw, flowTemp, hydraulicState, heatedArea, engineeringParams]);

  useEffect(() => {
    onCalculated(results);
  }, [results, onCalculated]);

  // System water volume estimate
  const estSystemVol = useMemo(() => {
    let mult = engineeringParams?.systemWaterVolumeRadiatorFactor ?? 12;
    if (hydraulicState.secondaryLoops === 'floor') {
      mult = engineeringParams?.systemWaterVolumeFloorFactor ?? 15;
    } else if (hydraulicState.secondaryLoops === 'radiators') {
      mult = engineeringParams?.systemWaterVolumeRadiatorFactor ?? 12;
    } else if (hydraulicState.secondaryLoops === 'fan_coil') {
      mult = 8;
    } else if (hydraulicState.secondaryLoops === 'mixed') {
      mult = 13;
    }
    return Math.round(peakLoadKw * mult + Number(hydraulicState.additionalWaterVolumeL || 0));
  }, [peakLoadKw, hydraulicState, engineeringParams]);

  // Premium Proposed Circulation Pump Logic
  const recommendedPump = useMemo(() => {
    // Volume flow rate
    const flowLh = results.flowRateLh;
    
    // Friction calculation estimate
    let headMultiplier = 1.0;
    if (hydraulicState.secondaryLoops === 'floor' && longestCircuit > 100) {
      headMultiplier = 1.25; // high pressure drop
    }

    if (peakLoadKw <= 7.0 && floorCircuits <= 6) {
      return {
        model: 'Grundfos UPM3 Auto 25-50 130',
        brand: 'Grundfos',
        flow: `${(flowLh / 1000).toFixed(2)} m³/ó`,
        head: `${(4.0 * headMultiplier).toFixed(1)} m v.o.`,
        note: 'Szezonális hatásfokú, kisméretű osztógyűjtőhöz ideális.'
      };
    } else if (peakLoadKw <= 13.5 && floorCircuits <= 12) {
      return {
        model: 'Grundfos UPM3 Auto 25-70 180',
        brand: 'Grundfos',
        flow: `${(flowLh / 1000).toFixed(2)} m³/ó`,
        head: `${(5.5 * headMultiplier).toFixed(1)} m v.o.`,
        note: 'Ajánlott prémium keringtető közepes lakossági körökhöz.'
      };
    } else if (peakLoadKw <= 16.0) {
      return {
        model: 'Wilo Yonos Para 25/7.5 RLS',
        brand: 'Wilo',
        flow: `${(flowLh / 1000).toFixed(2)} m³/ó`,
        head: `${(6.5 * headMultiplier).toFixed(1)} m v.o.`,
        note: 'Megbízható nagy-teljesítményű monoblokk segédszivattyú.'
      };
    } else {
      return {
        model: 'Grundfos MAGNA3 25-80 180',
        brand: 'Grundfos',
        flow: `${(flowLh / 1000).toFixed(2)} m³/ó`,
        head: `${(7.8 * headMultiplier).toFixed(1)} m v.o.`,
        note: 'Távfelügyelt ipari keringtető nagy fűtőművekbe.'
      };
    }
  }, [peakLoadKw, floorCircuits, longestCircuit, results, hydraulicState]);

  return (
    <div className={`rounded border shadow-sm overflow-hidden ${isDark ? 'bg-slate-900 border-slate-850' : 'bg-slate-50 border-slate-200'}`} id="hydraulics-calculator">
      {/* Header */}
      <div className={`px-4 py-3 border-b flex items-center justify-between ${isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'}`}>
        <div className="flex items-center gap-2">
          <span className="font-medium text-xs">
            Hidraulika, tágulási és hőleadó méretezés
          </span>
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-6 bg-transparent">
        {/* Left Inputs Panel */}
        <div className="space-y-4">
          <h3 className={`text-xs font-semibold block border-b pb-2 ${isDark ? 'text-slate-200 border-slate-800' : 'text-slate-800 border-slate-200'}`}>Bemeneti paraméterek</h3>

          <div className="space-y-4">
            {/* Primary Hydraulic Configuration */}
            <div>
              <label className={`text-[11px] font-semibold mb-2 block uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                1. Rendszerkapcsolás Típusa (Primer-Szekunder illesztés)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'heat_exchanger', title: 'Hőcserélős leválasztás', desc: 'Fagyálló fűtéskör primer oldalon', ex: true, buf: 0 },
                  { id: 'buffer', title: 'Puffertartály', desc: 'Párhuzamos 100L hidraulikus váltó funkcióval', ex: false, buf: 100 },
                  { id: 'direct', title: 'Direkt Bypass', desc: 'Sorba kötött rendszer (Nincs leválasztás)', ex: false, buf: 0 },
                  { id: 'hydro_switch', title: 'Hidrováltó', desc: 'Klasszikus nyomáskülönbség mentesítő', ex: false, buf: 20 },
                ].map((opt) => {
                  const isSelected = hydraulicState.includeHeatExchanger === opt.ex && 
                    ((opt.id === 'heat_exchanger') || (opt.id === 'buffer' && hydraulicState.additionalWaterVolumeL === 100 && !hydraulicState.includeHeatExchanger) || 
                    (opt.id === 'direct' && hydraulicState.additionalWaterVolumeL === 0 && !hydraulicState.includeHeatExchanger) ||
                    (opt.id === 'hydro_switch' && hydraulicState.additionalWaterVolumeL === 20 && !hydraulicState.includeHeatExchanger));
                  return (
                    <div 
                      key={opt.id}
                      onClick={() => {
                        const newState = { ...hydraulicState, includeHeatExchanger: opt.ex, additionalWaterVolumeL: opt.buf };
                        setHydraulicState(newState);
                      }}
                      className={`p-3 rounded-md border cursor-pointer select-none transition-all ${
                        isSelected 
                          ? (isDark ? 'bg-slate-800 border-slate-500 shadow-sm' : 'bg-white border-slate-400 shadow-sm')
                          : (isDark ? 'bg-slate-900 border-slate-700 hover:border-slate-600' : 'bg-slate-50 border-slate-200 hover:border-slate-300')
                      }`}
                    >
                      <div className={`font-semibold text-xs ${isSelected ? (isDark ? 'text-white' : 'text-slate-900') : (isDark ? 'text-slate-400' : 'text-slate-600')}`}>
                         {opt.title}
                      </div>
                      <div className={`text-[10px] mt-1 ${isSelected ? (isDark ? 'text-slate-300' : 'text-slate-600') : (isDark ? 'text-slate-500' : 'text-slate-400')}`}>
                        {opt.desc}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* DHW Configuration */}
            <div>
              <label className={`text-[11px] font-semibold mb-2 block uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                2. Háztartási Melegvíz (HMV)
              </label>
              <div className="flex bg-slate-200/50 dark:bg-slate-900/50 p-1 rounded-md">
                 {[
                  { id: true, title: 'Igen, HMV tárolóval' },
                  { id: false, title: 'Nincs HMV' },
                ].map((opt) => {
                  const isSelected = hydraulicState.includeDhwTank === opt.id;
                  return (
                    <button
                      key={opt.id === true ? 'yes' : 'no'}
                      onClick={() => updateInput('includeDhwTank', opt.id)}
                      className={`flex-1 text-[11px] py-1.5 rounded transition-all font-medium ${isSelected ? (isDark ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-800 shadow-sm') : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}
                    >
                       {opt.title}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {/* PRIMARY SIDE */}
              <div className={`p-4 rounded-md border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <h4 className={`text-xs font-bold mb-4 uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                   Primer Oldal (Hőszivattyú ág)
                </h4>
                
                <div className="space-y-4">
                  <div>
                    <label className={`text-[10px] font-medium mb-1.5 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Gerinc anyaga</label>
                    <div className="flex bg-slate-200/50 dark:bg-slate-900/50 p-1 rounded-md">
                      {[
                        {v: 'copper', l: 'Réz'},
                        {v: 'pex', l: '5-rétegű'},
                        {v: 'steel', l: 'Szénacél'}
                      ].map(m => (
                        <button
                          key={m.v}
                          onClick={() => {
                            const newState = { 
                              ...hydraulicState, 
                              pipeMaterial: m.v as any, 
                              primaryPipeSize: 'Auto',
                              secondaryPipeSize: 'Auto' 
                            };
                            setHydraulicState(newState);
                          }}
                          className={`flex-1 text-[10px] py-1.5 rounded transition-all font-medium ${hydraulicState.pipeMaterial === m.v ? (isDark ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-800 shadow-sm') : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}
                        >
                           {m.l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={`text-[10px] font-medium mb-1 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Primer csőméret</label>
                    <div className="flex bg-slate-200/50 dark:bg-slate-900/50 p-1 rounded-md">
                      {([
                        {v: 'Auto', l: 'Auto'}, 
                        ...(hydraulicState.pipeMaterial === 'copper' ? [
                          {v: 'Copper 18mm', l: '18'},
                          {v: 'Copper 22mm', l: '22'},
                          {v: 'Copper 28mm', l: '28'},
                          {v: 'Copper 35mm', l: '35'}
                        ] : hydraulicState.pipeMaterial === 'pex' ? [
                          {v: 'PEX 20mm', l: '20'},
                          {v: 'PEX 26mm', l: '26'},
                          {v: 'PEX 32mm', l: '32'},
                          {v: 'PEX 40mm', l: '40'}
                        ] : [
                          {v: 'Steel DN20', l: 'DN20'},
                          {v: 'Steel DN25', l: 'DN25'},
                          {v: 'Steel DN32', l: 'DN32'},
                          {v: 'Steel DN40', l: 'DN40'}
                        ])
                      ]).map(m => (
                        <button
                          key={m.v}
                          onClick={() => updateInput('primaryPipeSize', m.v)}
                          className={`flex-1 text-[10px] py-1.5 rounded transition-all font-medium ${hydraulicState.primaryPipeSize === m.v || (!hydraulicState.primaryPipeSize && m.v === 'Auto') ? (isDark ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-800 shadow-sm') : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}
                        >
                           {m.l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                     <label className={`text-[10px] font-medium mb-1 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Tervezési Hőlépcső (ΔT)</label>
                     <div className="flex bg-slate-200/50 dark:bg-slate-900/50 p-1 rounded-md">
                      {[5, 7, 10, 15].map(dt => (
                        <button
                          key={dt}
                          onClick={() => updateInput('deltaT', dt)}
                          className={`flex-1 text-[11px] py-1.5 rounded transition-all font-mono font-medium ${hydraulicState.deltaT === dt ? (isDark ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-800 shadow-sm') : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}
                        >
                           {dt}°C
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECONDARY SIDE */}
              <div className={`p-4 rounded-md border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <h4 className={`text-xs font-bold mb-4 uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                   Szekunder Oldal (Hőleadók)
                </h4>
                
                <div className="space-y-4">
                  <div>
                    <label className={`text-[10px] font-medium mb-1.5 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Hőleadók jellege</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        {v: 'floor', l: 'Padlófűtés'},
                        {v: 'radiators', l: 'Lapradiátorok'},
                        {v: 'fan_coil', l: 'Fan-coil'},
                        {v: 'mixed', l: 'Kevert (Padló+Rad)'}
                      ].map(m => (
                         <div 
                            key={m.v}
                            onClick={() => updateInput('secondaryLoops', m.v as any)}
                            className={`px-2 py-1.5 rounded border cursor-pointer text-center text-[10px] select-none transition-all ${hydraulicState.secondaryLoops === m.v ? (isDark ? 'bg-blue-600 border-blue-500 text-white font-medium' : 'bg-blue-50 border-blue-500 text-blue-800 font-medium') : (isDark ? 'bg-slate-900 border-slate-700 hover:border-slate-600 text-slate-400' : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600')}`}
                         >
                           {m.l}
                         </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={`text-[10px] font-medium mb-1 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Szekunder csőméret (Gerinc)</label>
                    <div className="flex bg-slate-200/50 dark:bg-slate-900/50 p-1 rounded-md">
                      {([
                        {v: 'Auto', l: 'Auto'}, 
                        ...(hydraulicState.pipeMaterial === 'copper' ? [
                          {v: 'Copper 18mm', l: '18'},
                          {v: 'Copper 22mm', l: '22'},
                          {v: 'Copper 28mm', l: '28'},
                          {v: 'Copper 35mm', l: '35'}
                        ] : hydraulicState.pipeMaterial === 'pex' ? [
                          {v: 'PEX 20mm', l: '20'},
                          {v: 'PEX 26mm', l: '26'},
                          {v: 'PEX 32mm', l: '32'},
                          {v: 'PEX 40mm', l: '40'}
                        ] : [
                          {v: 'Steel DN20', l: 'DN20'},
                          {v: 'Steel DN25', l: 'DN25'},
                          {v: 'Steel DN32', l: 'DN32'},
                          {v: 'Steel DN40', l: 'DN40'}
                        ])
                      ]).map(m => (
                        <button
                          key={m.v}
                          onClick={() => updateInput('secondaryPipeSize', m.v)}
                          className={`flex-1 text-[10px] py-1.5 rounded transition-all font-medium ${hydraulicState.secondaryPipeSize === m.v || (!hydraulicState.secondaryPipeSize && m.v === 'Auto') ? (isDark ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-800 shadow-sm') : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}
                        >
                           {m.l}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(hydraulicState.secondaryLoops === 'floor' || hydraulicState.secondaryLoops === 'mixed') && (
                    <div className="grid grid-cols-2 gap-2">
                       <div className="space-y-1">
                          <label className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Osztó Körök (db)</label>
                          <input
                            type="number"
                            min="2"
                            max="30"
                            value={floorCircuits}
                            onChange={(e) => setFloorCircuits(Number(e.target.value))}
                            className={`w-full px-2 py-1 border rounded text-[11px] font-mono focus:outline-none ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'}`}
                          />
                       </div>
                       <div className="space-y-1">
                          <label className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Max Hossz (m)</label>
                          <input
                            type="number"
                            min="20"
                            max="200"
                            value={longestCircuit}
                            onChange={(e) => setLongestCircuit(Number(e.target.value))}
                            className={`w-full px-2 py-1 border rounded text-[11px] font-mono focus:outline-none ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'}`}
                          />
                       </div>
                    </div>
                  )}

                  {(hydraulicState.secondaryLoops === 'radiators' || hydraulicState.secondaryLoops === 'mixed') && (
                     <div className="space-y-1">
                        <label className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Lapradiátorok Száma (db)</label>
                        <input
                          type="number"
                          min="1"
                          max="30"
                          value={radiatorCount}
                          onChange={(e) => setRadiatorCount(Number(e.target.value))}
                          className={`w-full px-2 py-1 border rounded text-[11px] font-mono focus:outline-none ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'}`}
                        />
                     </div>
                  )}

                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RESULTS PANEL */}
        <div className={`space-y-5 p-4 rounded-md border ${isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
          <div className="border-b pb-3 flex justify-between items-center border-slate-200 dark:border-slate-800">
            <h3 className={`text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Számított hálózati paraméterek</h3>
            <span className={`text-[10px] px-2 py-1 rounded-md font-mono ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>Eredmények</span>
          </div>

          <div className="space-y-4">
            {hydraulicState.includeHeatExchanger ? (
              // DECOUPLED PRIMARY & SECONDARY SIDE SIZING
              <div className="space-y-4">
                
                {/* I. PRIMARY SIDE */}
                <div className={`p-4 rounded-md border space-y-3 ${isDark ? 'border-slate-800 bg-slate-800/10' : 'border-slate-200 bg-slate-50'}`}>
                  <div className="flex items-center justify-between border-b pb-2 dark:border-slate-800 border-slate-200">
                    <span className="text-xs font-semibold">I. Primer oldal (Hőszivattyú)</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500 block mb-1">Zárt tágulási tartály</span>
                      <span className="font-mono text-base block">{results.primaryVesselSizeL} L</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1">Ajánlott csőméret</span>
                      <span className="font-mono text-sm block leading-tight">{results.recommendedPipeSize}</span>
                      <span className="text-slate-500 block text-[10px]">Tervezett sebesség: {results.estimatedVelocityMs} m/s</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1">Térfogatáram</span>
                      <span className="font-mono block">{results.flowRateLh} L/óra</span>
                      <span className="text-[10px] text-slate-500 block">({results.flowRateLmin} L/perc)</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1">Primer szivattyú</span>
                      <span className="font-mono font-black block">Hőszivattyú beépített szivattyúja</span>
                      <span className="text-slate-500 block">Hidraulikus nyomás: {results.remainingPumpHeadKpa} kPa maradék</span>
                    </div>
                  </div>
                </div>

                {/* II. SECONDARY SIDE */}
                <div className={`p-4 rounded-md border space-y-3 ${isDark ? 'border-slate-800 bg-slate-800/10' : 'border-slate-200 bg-slate-50'}`}>
                  <div className="flex items-center justify-between border-b pb-2 dark:border-slate-800 border-slate-200">
                    <span className="text-xs font-semibold">II. Szekunder oldal (Lakás fűtés)</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500 block mb-1">Zárt tágulási tartály</span>
                      <span className="font-mono text-base block">{results.secondaryVesselSizeL} L</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1">Ajánlott csőméret</span>
                      <span className="font-mono text-sm block leading-tight">{results.recommendedSecondaryPipeSize}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1">Térfogatáram</span>
                      <span className="font-mono block">{results.secondaryFlowRateLh} L/óra</span>
                      {(hydraulicState.secondaryLoops === 'floor' || hydraulicState.secondaryLoops === 'mixed') && (
                        <span className="text-[10px] text-slate-500 block">Körönként: {(results.secondaryFlowRateLh / (floorCircuits || 8) / 60).toFixed(2)} L/perc</span>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1">Javasolt segédszivattyú (DAB)</span>
                      <span className="font-mono block text-xs leading-tight">{results.dabPumpModel}</span>
                      <span className="text-slate-500 text-[10px] block mt-0.5">{results.dabPumpSetting} • Fokozat: {results.dabPumpStage}</span>
                    </div>
                  </div>
                </div>

                {/* SHARED HEAT EXCHANGER CARD */}
                <div className={`p-3 mt-1 border rounded-md text-xs flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-800/20' : 'border-slate-200 bg-slate-100'}`}>
                  <div>
                    <span className="text-slate-500 block font-medium">Lemezes hőcserélő leválasztás</span>
                    <span className="font-medium block mt-0.5">{results.recommendedExchangerModel}</span>
                    <span className="text-slate-500 block text-[10px]">Hőcserélő nettó felülete: {results.heatExchangerAreaM2} m² (Cordivari)</span>
                  </div>
                </div>

              </div>
            ) : (
              // UNIFIED SIMPLE DYN COUPLING (NO HEAT EXCHANGER)
              <div className="space-y-4">
                <div className={`p-4 rounded-md border space-y-3 ${isDark ? 'border-slate-800 bg-slate-800/10' : 'border-slate-200 bg-slate-50'}`}>
                  <div className="flex items-center justify-between border-b pb-2 dark:border-slate-800 border-slate-200">
                    <span className="text-xs font-semibold">Egyesített hidraulikai kör</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500 block mb-1">Közös tágulási tartály</span>
                      <span className="font-mono text-base block">{results.vesselSizeL} L</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1">Ajánlott csőméret</span>
                      <span className="font-mono text-sm block leading-tight">{results.recommendedPipeSize}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1">Térfogatáram</span>
                      <span className="font-mono block">{results.flowRateLh} L/óra</span>
                      <span className="text-slate-500 block text-[10px]">Rendszer térfogat: {estSystemVol} L</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1">Keringtetés</span>
                      <span className="font-mono block">Hőszivattyú saját szivattyúja</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PUFFER TANK CHECK VIA THEME-CONSISTENT LAYOUT */}
            <div className={`p-4 rounded-md border space-y-2 ${isDark ? 'bg-slate-800/10 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between text-xs font-semibold">
                <span>III. Puffer tároló ellenőrzés</span>
                <span className={`px-2 py-0.5 rounded-md font-medium text-[10px] ${
                  results.isBufferAdequate 
                    ? 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' 
                    : 'text-amber-600 bg-amber-500/10 border-amber-500/20'
                }`}>
                  {results.isBufferAdequate ? 'Térfogat elegendő' : 'Kiegészítés javasolt'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs mt-2">
                <div>
                  <span className="text-slate-500 block mb-1">Szükséges puffertérfogat</span>
                  <span className="font-mono block">{results.recommendedBufferL} L</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">Rendszertérfogat összesen</span>
                  <span className="font-mono block">{estSystemVol} L</span>
                </div>
              </div>
            </div>

            {/* Frost protection notice */}
            <div className={`flex gap-1.5 text-[8px] border p-2 rounded leading-snug ${
              isDark ? 'bg-slate-950/20 border-slate-800/80 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
              <span>
                <strong>FAGYVÉDELMI KÖVETELMÉNY:</strong> Monoblokkos kivitelnél a kültéri ágon fagyvédelmi gépészeti lefúvató szelep (pl. Caleffi iFrost fagyszelep) beépítése kötelező! Glikol fagyálló nem kerül alkalmazásra.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
