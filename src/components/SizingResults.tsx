import React, { useState, useMemo } from 'react';
import { BuildingData, CalculationResults, HeatPumpModel } from '../types';
import { HEAT_PUMP_DATABASE } from '../heatPumpData';
import { evaluateHeatPumpEconomics, getHpCapacityAtTemp, getBuildingHeatDemandAtTemp, calculateBivalentCoverage } from '../utils/calculations';
import { Activity, Flame, Zap, TrendingUp, Shield, CheckCircle2, ChevronRight, HelpCircle, Layers, Settings, BatteryCharging, Info } from 'lucide-react';
import { SegmentedControl } from './SegmentedControl';

interface SizingResultsProps {
  buildingData: BuildingData;
  calcResults: CalculationResults;
  onSelectModel: (model: HeatPumpModel, emitterType: 'floor' | 'radiator') => void;
  selectedModel: HeatPumpModel | null;
  selectedEmitter: 'floor' | 'radiator';
  onChangeEmitter: (emitter: 'floor' | 'radiator') => void;
  tariffHuf: number;
  onChangeTariff: (tariff: number) => void;
  bivalentTempManual: number;
  onChangeBivalentTemp: (temp: number) => void;
  theme?: 'light' | 'dark';
  onChangeBuildingData?: (data: BuildingData) => void;
}

export const SizingResults: React.FC<SizingResultsProps> = ({
  buildingData,
  calcResults,
  onSelectModel,
  selectedModel,
  selectedEmitter,
  onChangeEmitter,
  tariffHuf,
  onChangeTariff,
  bivalentTempManual,
  onChangeBivalentTemp,
  theme = 'light',
  onChangeBuildingData,
}) => {
  const isDark = theme === 'dark';
  const [selectedInfoModel, setSelectedInfoModel] = useState<HeatPumpModel | null>(null);
  const [filterNearby, setFilterNearby] = useState<boolean>(true);
  // Investment cost components logically calculated
 
  // Calculate dynamic Total Investment
  const isLargeMachine = selectedModel && selectedModel.capacityA7W35 >= 12;
  const installDistance = 'short'; // Kis távolság feltételezve
  
  const baseDevicePrice = selectedModel ? selectedModel.estimatedPriceHuf : 1800000;
  const discountPct = buildingData.productDiscountPct ?? 0;
  const discountedDevicePrice = baseDevicePrice * (1 - discountPct / 100);
  
  const installationSurcharge = buildingData.mechanicalInstallCost ?? 2500000;

  const dhwVolume = buildingData.dhwVolume ?? 200;
  const dhwTankHuf = dhwVolume === 300 ? 730000 : 530000; // 530k is 200L, 730k is 300L
  const dhwValveHuf = 95000; // motoros váltószelep
  const dhwPipingHuf = 155000; // csövezők és szerelvények
  const dhwHeaterHuf = 70000; // fűtőkiegészítés
  const dhwLaborHuf = 100000; // gépészeti szerelési díj
  const dhwSurcharge = buildingData.includeDhwPackage !== false ? (dhwTankHuf + dhwValveHuf + dhwPipingHuf + dhwHeaterHuf + dhwLaborHuf) : 0; // 950,000 Ft for 200L, 1,150,000 Ft for 300L with all fittings included
  
  const totalInvestmentCost = discountedDevicePrice + installationSurcharge + dhwSurcharge;
  const activeSubsidy = buildingData.useSubsidy !== false ? (buildingData.subsidyValue ?? 3000000) : 0;
  const netInvestmentCost = Math.max(0, totalInvestmentCost - activeSubsidy);

  // 1. Recalculate match for all models based on selections
  const recommendedModels = useMemo(() => {
    return HEAT_PUMP_DATABASE.map((hp) => {
      // Determine what the heating capacity is at severe winter -15°C
      const extremeCapacity = selectedEmitter === 'radiator' ? hp.capacityAm15W55 : hp.capacityAm15W35;
      
      // Interpolated capacity at bivalence temperature
      const capacityAtBiv = getHpCapacityAtTemp(hp, selectedEmitter, bivalentTempManual);
      
      // Building heat demand at bivalence temperature
      const demandAtBiv = getBuildingHeatDemandAtTemp(
        calcResults.heatLossKw.total,
        buildingData.designTemp,
        bivalentTempManual
      );

      // Is the capacity adequate at bivalence temperature?
      const isAdequate = capacityAtBiv >= demandAtBiv;
      
      // Determine operational economics
      const economics = evaluateHeatPumpEconomics(
        calcResults.heatLossKw.total,
        calcResults.yearlyEnergyKwh,
        calcResults.gasCostHuf,
        hp,
        selectedEmitter,
        tariffHuf,
        bivalentTempManual,
        buildingData.designTemp
      );

      return {
        ...hp,
        extremeCapacity,
        capacityAtBiv,
        demandAtBiv,
        isAdequate,
        scop: selectedEmitter === 'radiator' ? hp.scopW55 : hp.scopW35,
        economics,
      };
    }).sort((a, b) => {
      // Sort primarily by capacity (kW) ascending — user can see the size progression
      if (a.isAdequate && !b.isAdequate) return -1;
      if (!a.isAdequate && b.isAdequate) return 1;
      
      const capA = a.capacityA7W35 || 0;
      const capB = b.capacityA7W35 || 0;
      return capA - capB;
    });
  }, [calcResults, selectedEmitter, tariffHuf, bivalentTempManual, buildingData]);

  // 1b. Tight capacity-based filtering — only show matches within ±10%
  const displayedModels = useMemo(() => {
    if (!filterNearby) return recommendedModels;
    const targetDemand = calcResults.heatLossKw.total;
    const filtered = recommendedModels.filter(m => {
      const ratio = m.capacityAtBiv / (m.demandAtBiv || 0.1);
      return ratio >= 0.90 && ratio <= 1.10;
    });
    return filtered.length > 0 ? filtered : recommendedModels.slice(0, 3);
  }, [recommendedModels, filterNearby, calcResults.heatLossKw.total]);

  // Handle selected model automatically if none chosen
  React.useEffect(() => {
    if (!selectedModel && displayedModels.length > 0) {
      onSelectModel(displayedModels[0], selectedEmitter);
    }
  }, [displayedModels, selectedModel, onSelectModel, selectedEmitter]);

  // Read current selected unit details
  const activeHPResults = useMemo(() => {
    if (!selectedModel) return null;
    return recommendedModels.find(m => m.id === selectedModel.id) || null;
  }, [selectedModel, recommendedModels]);

  // Payback calculation
  const paybackYears = useMemo(() => {
    if (!activeHPResults) return 0;
    const savings = activeHPResults.economics.yearlySavingsHuf;
    if (savings <= 0) return 99; // no savings
    return Number((netInvestmentCost / savings).toFixed(1));
  }, [netInvestmentCost, activeHPResults]);

  // Helper format currency
  const formatHu = (val: number) => {
    return new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 }).format(val);
  };

  // SVG Chart calculation parameters
  const svgWidth = 300;
  const svgHeight = 150;
  const maxKw = Math.max(16, calcResults.heatLossKw.total * 1.5, activeHPResults ? activeHPResults.capacityA7W35 * 1.25 : 12);

  // Helper convert temp to svg X coordinate
  const getX = (t: number) => {
    // scale -15°C to +15°C onto 20 to 280 px
    return 20 + ((t - (-15)) / 30) * (svgWidth - 40);
  };

  // Helper convert kw to svg Y coordinate
  const getY = (kw: number) => {
    // scale 0 to maxKw onto (height-20) to 20 px
    return (svgHeight - 20) - (kw / maxKw) * (svgHeight - 40);
  };

  // Points for Heat Loss curve (Straight diagonal line)
  // At -15°C, demand = peakLoadKw. At +15°C, demand = 0 kW.
  const demandAtMin15 = calcResults.heatLossKw.total;
  const demandAtPlus15 = 0;

  // Points for Heat Pump Max capacity curve
  // Plotted from severe Am15 (-15°C) to nominal A7 (+7°C)
  const hpCapMin15 = activeHPResults ? (selectedEmitter === 'radiator' ? activeHPResults.capacityAm15W55 : activeHPResults.capacityAm15W35) : 6;
  const hpCapAm7 = activeHPResults ? (selectedEmitter === 'radiator' ? activeHPResults.capacityAm7W55 : activeHPResults.capacityAm7W35) : 8;
  const hpCapA7 = activeHPResults ? activeHPResults.capacityA7W35 : 10;
  const hpCapPlus15 = hpCapA7 * 1.25;

  return (
    <div className="space-y-4" id="sizing-and-heatpump">
      
      {/* Target Heat Loss Card Header display */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {/* Card 1: Total Heat Loss */}
        <div className={`rounded-lg p-3 border flex flex-row items-center justify-between gap-2 transition-all duration-300 ${
          isDark 
            ? 'bg-blue-950/20 border-blue-900/60 text-slate-100' 
            : 'bg-blue-50/50 border-blue-200 text-slate-800'
        }`}>
          <div className="flex flex-col">
            <span className={`${isDark ? 'text-blue-400' : 'text-blue-600'} text-[9px] font-bold uppercase tracking-wider`}>Hőszükséglet</span>
            <span className={`text-[9px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Tervezési hőm.: {buildingData.indoorTemp}°C / {buildingData.designTemp}°C</span>
          </div>
          <div className="flex items-baseline gap-1 shrink-0">
            <span className={`text-2xl md:text-3xl font-light tracking-tight ${isDark ? 'text-white' : 'text-blue-950'}`}>{calcResults.heatLossKw.total}</span>
            <span className={`text-[10px] font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>kW</span>
          </div>
        </div>

        {/* Card 2: Transmission Loss */}
        <div className={`rounded-lg p-3 border flex flex-row items-center justify-between gap-2 transition-all duration-300 ${
          isDark 
            ? 'bg-amber-950/20 border-amber-900/60 text-slate-100' 
            : 'bg-amber-50/50 border-amber-200 text-slate-800'
        }`}>
          <div className="flex flex-col">
            <span className={`${isDark ? 'text-amber-400' : 'text-amber-600'} text-[9px] font-bold uppercase tracking-wider`}>Transzmisszió</span>
            <span className={`text-[9px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Szerkezeti veszteség</span>
          </div>
          <div className="flex items-baseline gap-1 shrink-0">
            <span className={`text-2xl md:text-3xl font-light tracking-tight ${isDark ? 'text-white' : 'text-amber-950'}`}>{calcResults.heatLossKw.transmission}</span>
            <span className={`text-[10px] font-medium ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>kW</span>
          </div>
        </div>

        {/* Card 3: Ventilation Loss */}
        <div className={`rounded-lg p-3 border flex flex-row items-center justify-between gap-2 transition-all duration-300 ${
          isDark 
            ? 'bg-teal-950/20 border-teal-900/60 text-slate-100' 
            : 'bg-teal-50/50 border-teal-200 text-slate-800'
        }`}>
          <div className="flex flex-col">
            <span className={`${isDark ? 'text-teal-400' : 'text-teal-600'} text-[9px] font-bold uppercase tracking-wider`}>Ventiláció</span>
            <span className={`text-[9px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Szellőzési veszteség</span>
          </div>
          <div className="flex items-baseline gap-1 shrink-0">
            <span className={`text-2xl md:text-3xl font-light tracking-tight ${isDark ? 'text-white' : 'text-teal-950'}`}>{calcResults.heatLossKw.ventilation}</span>
            <span className={`text-[10px] font-medium ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>kW</span>
          </div>
        </div>

        {/* Full-width bottom bar for additional details */}
        <div className={`col-span-1 md:col-span-3 rounded-lg border p-2 flex flex-wrap justify-between items-center text-[10px] transition-all duration-300 ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
        }`}>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold">Helyszín:</span>
            <span className="font-mono font-bold text-blue-500">{buildingData.location}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold">Éves fűtési energia:</span>
            <span className="font-mono font-bold text-emerald-500">{calcResults.yearlyEnergyKwh} kWh/év</span>
          </div>
        </div>
      </div>

      {/* Emitter types mapping */}
      <div className={`rounded-lg p-3 border space-y-3 transition-all ${
        isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div>
          <h2 className={`font-medium text-xs flex items-center gap-2 ${
            isDark ? 'text-slate-200' : 'text-slate-800'
          }`}>
            Tervezési téli előremenő vízhőmérséklet
          </h2>
        </div>

        <SegmentedControl
          options={[
            {
              value: 'floor',
              label: (
                <div className="text-center py-0.5">
                  <span className="text-xs font-bold block tracking-tight">+35 °C</span>
                  <span className="text-[8.5px] font-semibold block text-slate-450 dark:text-slate-400">Padlófűtés</span>
                </div>
              ),
            },
            {
              value: 'radiator',
              label: (
                <div className="text-center py-0.5">
                  <span className="text-xs font-bold block tracking-tight">+55 °C</span>
                  <span className="text-[8.5px] font-semibold block text-slate-450 dark:text-slate-400">Radiátoros</span>
                </div>
              ),
            },
          ]}
          value={selectedEmitter}
          onChange={onChangeEmitter}
          layoutId="emitter-select"
          theme={theme as 'light' | 'dark'}
        />
      </div>

      {/* 4. Highly prominent Bivalence Setup Panel placed RIGHT BEFORE the devices catalog */}
      <div className={`p-4 rounded-md border transition-all duration-300 ${
        isDark 
          ? 'bg-slate-900 border-slate-800 text-slate-100' 
          : 'bg-white border-slate-200 text-slate-800'
      }`} id="bivalence-prominent-control">
        
        <div className="space-y-4">
          
          {/* Top Row: Slim Slider & Essential indicator */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800">
            <div className="space-y-1 max-w-sm flex-shrink-0">
              <span className="text-xs font-semibold text-emerald-500 tracking-wide block">Bivalens Munkapont</span>
              <h3 className={`text-sm font-medium flex items-center gap-2 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                Hőmérséklet:
                <span className="text-emerald-500 text-lg font-light leading-none tracking-tight">{bivalentTempManual} °C</span>
              </h3>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Rásegítési pont. Ajánlott: <strong className="text-emerald-500 font-medium">-5°C és -7°C</strong> között.
              </p>
            </div>
            
            {/* Custom Modernized Cleaner HTML5 Slider */}
            <div className="w-full max-w-md pt-2 px-2 shrink">
              <div className="flex justify-between items-center text-xs font-medium text-slate-400 mb-2">
                <span>Min ({buildingData.designTemp}°C)</span>
                <span>Max (+10°C)</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={buildingData.designTemp}
                  max="10"
                  step="1"
                  value={Math.max(buildingData.designTemp, bivalentTempManual)}
                  onChange={(e) => onChangeBivalentTemp(parseInt(e.target.value))}
                  className={`flex-grow h-1.5 rounded-lg appearance-none cursor-pointer accent-emerald-500 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}
                />
              </div>
            </div>
          </div>

          {/* Full Width High-Impact Responsive Visual SVG Graph */}
          <div className="flex flex-col space-y-2">
            
            {/* Embedded High Fidelity responsive SVG Graph */}
            <div className={`p-2 rounded border flex items-center justify-center overflow-hidden transition-all ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              {(() => {
                const sW = 600;
                const sH = 210;
                const mKw = Math.max(16, calcResults.heatLossKw.total * 1.4, activeHPResults ? activeHPResults.capacityA7W35 * 1.25 : 12);
                
                const dTemp = buildingData.designTemp;
                const tRange = 15 - dTemp;
                
                const gX = (t: number) => 35 + ((t - dTemp) / tRange) * (sW - 70);
                const gY = (kw: number) => (sH - 25) - (kw / mKw) * (sH - 55);
                
                const dMin15 = calcResults.heatLossKw.total;
                const dPlus15 = 0;
                
                const hpMin15 = activeHPResults ? (selectedEmitter === 'radiator' ? activeHPResults.capacityAm15W55 : activeHPResults.capacityAm15W35) : 6;
                const hpAm7 = activeHPResults ? (selectedEmitter === 'radiator' ? activeHPResults.capacityAm7W55 : activeHPResults.capacityAm7W35) : 8;
                const hpA7 = activeHPResults ? activeHPResults.capacityA7W35 : 10;
                const hpPlus15 = hpA7 * 1.25;

                const hpCapAtT = (t: number) => {
                  if (t <= -7) {
                    return hpMin15 + ((t - (-15)) / 8) * (hpAm7 - hpMin15);
                  } else if (t <= 7) {
                    return hpAm7 + ((t - (-7)) / 14) * (hpA7 - hpAm7);
                  } else {
                    return hpA7 + ((t - 7) / 8) * (hpPlus15 - hpA7);
                  }
                };
                
                const actBivTemp = Math.max(dTemp, bivalentTempManual);
                const demandAtTempManual = dMin15 * (1 - (actBivTemp - dTemp) / tRange);
                const hpCapAtManual = hpCapAtT(actBivTemp);
                
                const deficitPolygonPoints = [
                  `${gX(dTemp)},${gY(dMin15)}`,
                  `${gX(actBivTemp)},${gY(demandAtTempManual)}`,
                  `${gX(actBivTemp)},${gY(hpCapAtManual)}`,
                  `${gX(dTemp)},${gY(hpCapAtT(dTemp))}`
                ].join(' ');
                                const gridStroke = isDark ? '#1e293b' : '#f1f5f9';
                 const tickColor = isDark ? '#cbd5e1' : '#374151';

                return (
                  <div className="w-full space-y-3.5">
                    {/* Live Munkaponti Értékek Alert Dashboard Card */}
                    <div className={`p-4 rounded-md border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                    }`}>
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-emerald-600 block">Élő adatok ({bivalentTempManual} °C hőmérsékleten)</span>
                        <div className={`flex flex-wrap gap-4 text-xs font-mono font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          <div>
                            Hőigény: <strong className={`font-normal text-sm ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>{demandAtTempManual.toFixed(2)} kW</strong>
                          </div>
                          <div className={`font-sans hidden sm:block ${isDark ? 'text-slate-700' : 'text-slate-200'}`}>|</div>
                          <div>
                            Gép teljesítménye: <strong className={`font-normal text-sm ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{hpCapAtManual.toFixed(2)} kW</strong>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        {hpCapAtManual >= demandAtTempManual ? (
                          <span className={`text-[11px] font-medium px-3 py-1.5 rounded flex items-center gap-1.5 ${
                            isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
                          }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Önálló fűtés (Nincs szükség rásegítésre)
                          </span>
                        ) : (
                          <span className={`text-[11px] font-medium px-3 py-1.5 rounded flex items-center gap-1.5 ${
                            isDark ? 'bg-rose-900/30 text-rose-400' : 'bg-rose-50 text-rose-700'
                          }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Rásegítéses fűtés (+{(demandAtTempManual - hpCapAtManual).toFixed(2)} kW)
                          </span>
                        )}
                      </div>
                    </div>

                    <svg width="100%" height={sH} viewBox={`0 0 ${sW} ${sH}`} className="select-none font-mono overflow-visible">
                      {/* Integrated 4 Climatic Zones in the Background */}
                      {/* Zone 1: Extrém fagy (< -7°C) */}
                      <rect
                        x={gX(dTemp)}
                        y="15"
                        width={gX(-7) - gX(dTemp)}
                        height={sH - 40}
                        fill={isDark ? "rgba(244, 63, 94, 0.05)" : "rgba(244, 63, 94, 0.03)"}
                      />
                      {/* Zone 2: Zord fagy (-7°C to 0°C) */}
                      <rect
                        x={gX(-7)}
                        y="15"
                        width={gX(0) - gX(-7)}
                        height={sH - 40}
                        fill={isDark ? "rgba(245, 158, 11, 0.05)" : "rgba(245, 158, 11, 0.03)"}
                      />
                      {/* Zone 3: Standard fűtés (0°C to 5°C) */}
                      <rect
                        x={gX(0)}
                        y="15"
                        width={gX(5) - gX(0)}
                        height={sH - 40}
                        fill={isDark ? "rgba(20, 184, 166, 0.05)" : "rgba(20, 184, 166, 0.03)"}
                      />
                      {/* Zone 4: Enyhe fűtés (> 5°C) */}
                      <rect
                        x={gX(5)}
                        y="15"
                        width={gX(15) - gX(5)}
                        height={sH - 40}
                        fill={isDark ? "rgba(59, 130, 246, 0.05)" : "rgba(59, 130, 246, 0.03)"}
                      />

                      {/* Zone Top Headers and Percentages (Integrated Hungarian Climatic statistics) */}
                      {(() => {
                        const mean = 1.8;
                        const stdDev = 6.2;
                        const calcPct = (temp: number) => Math.exp(-Math.pow(temp - mean, 2) / (2 * Math.pow(stdDev, 2)));
                        
                        let sExt = 0, sZor = 0, sStd = 0, sEny = 0;
                        for (let t = dTemp; t <= 15; t++) {
                          const w = calcPct(t);
                          if (t < -7) sExt += w;
                          else if (t < 0) sZor += w;
                          else if (t <= 5) sStd += w;
                          else sEny += w;
                        }
                        const totalW = sExt + sZor + sStd + sEny || 1;
                        const pExt = Math.round((sExt / totalW) * 100);
                        const pZor = Math.round((sZor / totalW) * 100);
                        const pStd = Math.round((sStd / totalW) * 100);
                        const pEny = 100 - pExt - pZor - pStd; // ensure exactly 100%
                        
                        return (
                          <>
                            <text x={(gX(dTemp) + gX(-7)) / 2} y="27" fill={isDark ? "#fb7185" : "#e11d48"} fontSize="8.5" fontWeight="800" textAnchor="middle">EXTRÉM: {pExt}%</text>
                            <text x={(gX(-7) + gX(0)) / 2} y="27" fill={isDark ? "#fbbf24" : "#d97706"} fontSize="8.5" fontWeight="800" textAnchor="middle">ZORD: {pZor}%</text>
                            <text x={(gX(0) + gX(5)) / 2} y="27" fill={isDark ? "#2dd4bf" : "#0d9488"} fontSize="8.5" fontWeight="800" textAnchor="middle">STANDARD: {pStd}%</text>
                            <text x={(gX(5) + gX(15)) / 2} y="27" fill={isDark ? "#60a5fa" : "#2563eb"} fontSize="8.5" fontWeight="800" textAnchor="middle">ENYHE: {pEny}%</text>
                          </>
                        );
                      })()}

                      {/* Vertical limits markers separating climate zones */}
                      <line x1={gX(-7)} y1="15" x2={gX(-7)} y2={sH - 25} stroke={isDark ? "rgba(244, 63, 94, 0.2)" : "rgba(244, 63, 94, 0.15)"} strokeWidth="1" strokeDasharray="3 2" />
                      <line x1={gX(0)} y1="15" x2={gX(0)} y2={sH - 25} stroke={isDark ? "rgba(20, 184, 166, 0.2)" : "rgba(20, 184, 166, 0.15)"} strokeWidth="1" strokeDasharray="3 2" />
                      <line x1={gX(5)} y1="15" x2={gX(5)} y2={sH - 25} stroke={isDark ? "rgba(59, 130, 246, 0.2)" : "rgba(59, 130, 246, 0.15)"} strokeWidth="1" strokeDasharray="3 2" />

                      {/* 1. Climate frequency bars in the background (color themed and highlighted) */}
                      {Array.from({ length: 15 - dTemp + 1 }, (_, i) => {
                        const t = dTemp + i;
                        // Realistic meteorological temperature duration frequency (Gaussian bell curve)
                        // Mean is around 3.5°C, standard deviation is 5.2°C for typical Central-Eastern European winter months
                        const mean = 3.5;
                        const stdDev = 5.2;
                        const fPct = 12.0 * Math.exp(-Math.pow(t - mean, 2) / (2 * Math.pow(stdDev, 2)));
                        
                        const x = gX(t);
                        const topY = (sH - 25) - (fPct / 12) * (sH - 55);
                        const barHeight = Math.max(0, (sH - 25) - topY);
                        const barW = (sW - 70) / (15 - dTemp + 2);

                        let barFill = "";
                        let barStroke = "";
                        if (t < -7) {
                          barFill = isDark ? "rgba(244, 63, 94, 0.28)" : "rgba(244, 63, 94, 0.18)";
                          barStroke = "rgba(244, 63, 94, 0.45)";
                        } else if (t < 0) {
                          barFill = isDark ? "rgba(245, 158, 11, 0.28)" : "rgba(245, 158, 11, 0.18)";
                          barStroke = "rgba(245, 158, 11, 0.45)";
                        } else if (t <= 5) {
                          barFill = isDark ? "rgba(20, 184, 166, 0.28)" : "rgba(20, 184, 166, 0.18)";
                          barStroke = "rgba(20, 184, 166, 0.45)";
                        } else {
                          barFill = isDark ? "rgba(59, 130, 246, 0.28)" : "rgba(59, 130, 246, 0.18)";
                          barStroke = "rgba(59, 130, 246, 0.45)";
                        }
                        
                        return (
                          <rect
                            key={`f-bar-${t}`}
                            x={x - barW / 2}
                            y={topY}
                            width={Math.max(2.5, barW - 1)}
                            height={barHeight}
                            fill={barFill}
                            stroke={barStroke}
                            strokeWidth="0.5"
                          />
                        );
                      })}

                      {/* Bivalent Deficit shaded polygon (labeled "Külső kisegítő igény") */}
                      {bivalentTempManual > dTemp && (
                        <polygon
                           points={deficitPolygonPoints}
                           fill="rgba(239, 68, 68, 0.16)"
                           stroke="rgba(239, 68, 68, 0.45)"
                           strokeWidth="0.8"
                           strokeDasharray="2 1"
                        />
                      )}

                      {/* Background Grid Lines */}
                      <line x1="35" y1={gY(0)} x2={sW - 35} y2={gY(0)} stroke={isDark ? '#3f3f46' : '#cbd5e1'} strokeWidth="1" />
                      <line x1="35" y1={gY(mKw * 0.5)} x2={sW - 35} y2={gY(mKw * 0.5)} stroke={gridStroke} strokeWidth="1" strokeDasharray="3" />
                      <line x1="35" y1={gY(mKw)} x2={sW - 35} y2={gY(mKw)} stroke={gridStroke} strokeWidth="1" strokeDasharray="3" />

                      {/* Vertical Temperature limits */}
                      <line x1={gX(dTemp)} y1="15" x2={gX(dTemp)} y2={sH - 25} stroke={gridStroke} strokeWidth="1" />
                      <line x1={gX(0)} y1="15" x2={gX(0)} y2={sH - 25} stroke={gridStroke} strokeWidth="1" strokeDasharray="4" />
                      <line x1={gX(15)} y1="15" x2={gX(15)} y2={sH - 25} stroke={gridStroke} strokeWidth="1" />

                      {/* Tick Labels */}
                      <text x={gX(dTemp)} y={sH - 8} fill={tickColor} fontSize="8" textAnchor="middle">{dTemp}°C</text>
                      <text x={gX(-7)} y={sH - 8} fill={tickColor} fontSize="8" textAnchor="middle" className="font-bold">-7°C</text>
                      <text x={gX(0)} y={sH - 8} fill={tickColor} fontSize="8" textAnchor="middle" className="font-bold">0°C</text>
                      <text x={gX(5)} y={sH - 8} fill={tickColor} fontSize="8" textAnchor="middle" className="font-bold">+5°C</text>
                      <text x={gX(15)} y={sH - 8} fill={tickColor} fontSize="8" textAnchor="middle">+15°C</text>

                      {/* KW vertical indicators */}
                      <text x="5" y={gY(mKw) + 6} fill={tickColor} fontSize="8" textAnchor="start">{Math.round(mKw)} kW</text>
                      <text x="5" y={gY(0) + 3} fill={tickColor} fontSize="8" textAnchor="start">0</text>

                      {/* Linear heat demand curve (Stretching diagonally) */}
                      <line 
                        x1={gX(dTemp)} y1={gY(dMin15)} 
                        x2={gX(15)} y2={gY(dPlus15)} 
                        stroke="#f97316" strokeWidth="2.5" 
                      />

                      {/* Heat Pump capacity line over temp */}
                      <path
                        d={`M ${gX(dTemp)} ${gY(hpCapAtT(dTemp))} L ${gX(-7)} ${gY(hpAm7)} L ${gX(7)} ${gY(hpA7)} L ${gX(15)} ${gY(hpPlus15)}`}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2.5"
                      />

                      {/* Interactive green vertical slider guide */}
                      <line
                        x1={gX(bivalentTempManual)} y1="15"
                        x2={gX(bivalentTempManual)} y2={sH - 25}
                        stroke="#10b981"
                        strokeWidth="1.2"
                        strokeDasharray="3"
                      />
 
                      {/* Precise values on the curves */}
                      {/* 1. Demand Intersection Point */}
                      <circle cx={gX(bivalentTempManual)} cy={gY(demandAtTempManual)} r="5.5" fill="#f97316" stroke="#ffffff" strokeWidth="1.5" />
                      <g className="font-sans font-bold">
                        <rect 
                          x={gX(bivalentTempManual) + (bivalentTempManual > 2 ? -95 : 10)} 
                          y={gY(demandAtTempManual) - 9} 
                          width="85" 
                          height="17" 
                          rx="3" 
                          fill="#ffffff" 
                          stroke="#f97316" 
                          strokeWidth="1.2" 
                          opacity="0.95"
                        />
                        <text 
                          x={gX(bivalentTempManual) + (bivalentTempManual > 2 ? -90 : 15)} 
                          y={gY(demandAtTempManual) + 3} 
                          fill="#ea580c" 
                          fontSize="9.5" 
                          textAnchor="start"
                        >
                          {demandAtTempManual.toFixed(1)} kW (Hőigény)
                        </text>
                      </g>
 
                      {/* 2. Heat Pump Capacity Intersection Point */}
                      {activeHPResults && (
                        <>
                          <circle cx={gX(bivalentTempManual)} cy={gY(hpCapAtManual)} r="5.5" fill="#3b82f6" stroke="#ffffff" strokeWidth="1.5" />
                          <g className="font-sans font-bold">
                            <rect 
                              x={gX(bivalentTempManual) + (bivalentTempManual > 2 ? -95 : 10)} 
                              y={gY(hpCapAtManual) - 9} 
                              width="85" 
                              height="17" 
                              rx="3" 
                              fill="#ffffff" 
                              stroke="#3b82f6" 
                              strokeWidth="1.2" 
                              opacity="0.95"
                            />
                            <text 
                              x={gX(bivalentTempManual) + (bivalentTempManual > 2 ? -90 : 15)} 
                              y={gY(hpCapAtManual) + 3} 
                              fill="#2563eb" 
                              fontSize="9.5" 
                              textAnchor="start"
                            >
                              {hpCapAtManual.toFixed(1)} kW (Gép)
                            </text>
                          </g>
                        </>
                      )}
 
                      {/* Bivalent point mark circle */}
                      <circle cx={gX(actBivTemp)} cy={gY(dMin15 * (1 - (actBivTemp - dTemp) / tRange))} r="5" fill="#10b981" stroke="#ffffff" strokeWidth="1" />
                    </svg>

                    {/* Compact legend under chart */}
                    <div className={`flex flex-wrap justify-center gap-3 text-[8px] font-bold uppercase tracking-wide text-slate-400 border-t pt-1.5 mt-1.5 ${isDark ? 'border-slate-850' : 'border-slate-100'}`}>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-1 bg-orange-500 rounded-sm"></span> Hőigény
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-1 bg-blue-500 rounded-sm"></span> Max Gépkapacitás
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-2 bg-blue-500/15 border border-blue-500/30 rounded-sm"></span> Klímahőmérséklet gyakoriság (%)
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-2 bg-red-500/20 border border-red-500/40 rounded-sm"></span> Külső hőforrás igény (hiány)
                      </div>
                    </div>

                    {/* Highly descriptive summary of integrated metrics below graph */}
                    <div className={`text-[10px] border-t pt-2.5 mt-2 text-center leading-relaxed ${isDark ? 'text-slate-400 border-slate-850' : 'text-slate-500 border-slate-100'}`}>
                      A beállított bivalens pont <strong className="text-emerald-500">{bivalentTempManual}°C</strong> alapján a hőszivattyús kompresszor az éves fűtési hőszükséglet <strong className="text-emerald-500 font-mono">{calculateBivalentCoverage(bivalentTempManual, buildingData.designTemp).toFixed(1)}%</strong>-át teljesen önállóan lefedi. Az ez alatti {bivalentTempManual}°C és {dTemp}°C közötti fagyos időszakokban <strong className="text-rose-500">külső kisegítő fűtés (kazán vagy fűtőpatron)</strong> rásegítése szükséges ({calcResults.bivalentElectricHeaterKw.toFixed(1)} kW fűtési teljesítményigénnyel) a fűtési hőszükséglet biztonságos ellátásához.
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>


      {/* Recommended Heat Pumps table */}
      <div className="space-y-4 pt-4">
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b transition-all ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`}>
          <h2 className={`font-medium text-xs flex items-center gap-2 transition-all ${
            isDark ? 'text-slate-100' : 'text-slate-800'
          }`}>
            Ajánlott hőszivattyús berendezések
          </h2>
          <label className={`inline-flex items-center gap-2 cursor-pointer text-[10px] font-medium px-2 py-1 rounded transition-all ${
            isDark
              ? 'hover:bg-slate-800 text-slate-400'
              : 'hover:bg-slate-100 text-slate-500'
          }`}>
            <input
              type="checkbox"
              checked={filterNearby}
              onChange={(e) => setFilterNearby(e.target.checked)}
              className="w-3 h-3 text-slate-600 rounded focus:ring-0 cursor-pointer"
            />
            {filterNearby ? `Szűkített (${displayedModels.length} db)` : `Összes (${recommendedModels.length} db)`}
          </label>
        </div>

        <div className={`overflow-hidden rounded-lg border transition-all ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`} id="hp-selection-table">
          <table className={`w-full text-left border-collapse text-[10px] ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
            <thead>
              <tr className={`border-b font-medium transition-all text-slate-500 text-[10px] ${
                isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'
              }`}>
                <th className="py-2 px-3">Típus</th>
                <th className="py-2 px-3 text-center hidden md:table-cell">W35 (Telj/SCOP)</th>
                <th className="py-2 px-3 text-center hidden md:table-cell">W55 (Telj/SCOP)</th>
                <th className="py-2 px-3 text-center hidden md:table-cell">Zaj</th>
                <th className="py-2 px-3 text-center hidden md:table-cell">Táp(V)</th>
                <th className="py-2 px-3 text-right">Bruttó ár</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
              {displayedModels.map((item) => {
                const isSelected = selectedModel?.id === item.id;
                const bivalentRatio = item.capacityAtBiv / (item.demandAtBiv || 0.1);

                let statusPill = "";
                let rowBgClass = "";
                let statusBadge = null;

                if (bivalentRatio >= 0.90 && bivalentRatio <= 1.10) {
                  statusPill = "Optimum";
                  statusBadge = (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400 shrink-0">
                      Optimum
                    </span>
                  );
                  rowBgClass = isDark 
                      ? "bg-emerald-900/15 text-slate-200 hover:bg-emerald-900/25 border-l-[4px] border-l-emerald-500" 
                      : "bg-emerald-50 text-slate-800 hover:bg-emerald-100/80 border-l-[4px] border-l-emerald-500";
                } else if ((bivalentRatio >= 0.85 && bivalentRatio < 0.90) || (bivalentRatio > 1.10 && bivalentRatio <= 1.15)) {
                  statusPill = "Elfogadható";
                  statusBadge = (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400 shrink-0">
                      Elfogadható
                    </span>
                  );
                  rowBgClass = isDark 
                      ? "bg-yellow-900/15 text-slate-300 hover:bg-yellow-900/25 border-l-[4px] border-l-yellow-500" 
                      : "bg-yellow-50 text-slate-700 hover:bg-yellow-100/80 border-l-[4px] border-l-yellow-500";
                } else {
                  statusPill = "Nem javasolt";
                  statusBadge = (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-400 shrink-0">
                      Nem javasolt
                    </span>
                  );
                  rowBgClass = isDark 
                      ? "bg-rose-900/10 text-slate-500 hover:bg-rose-900/20 border-l-[4px] border-l-rose-500/50 opacity-60" 
                      : "bg-rose-50/40 text-slate-500 hover:bg-rose-100/60 border-l-[4px] border-l-rose-400/50 opacity-70";
                }

                const getModelDimensions = (m: any) => {
                  if (m.dimensions) return m.dimensions;
                  if (m.manufacturer === 'Panasonic') {
                    return "1266×411×996 mm";
                  }
                  if (m.manufacturer === 'Midea') {
                    return "1111×426×915 mm";
                  }
                  if (m.name.includes("8") || m.name.includes("10")) {
                    return "1100×445×850 mm";
                  }
                  return "1100×445×1100 mm";
                };

                return (
                  <tr
                    key={item.id}
                    onClick={() => onSelectModel(item, selectedEmitter)}
                    className={`cursor-pointer border-b text-xs ${rowBgClass}`}
                  >
                    {/* Megnevezés Column (Name only as requested) */}
                    <td className="py-1.5 px-2">
                      <div className="flex items-center gap-2">
                        {/* Selected Radio Indicator */}
                        <span className={`w-3 h-3 rounded-full border shrink-0 inline-block ${
                          isSelected
                            ? (isDark ? 'border-4 border-slate-100 bg-slate-900' : 'border-4 border-slate-900 bg-white')
                            : (isDark ? 'border-slate-600 bg-transparent' : 'border-slate-400 bg-transparent')
                        }`} />
                        <div>
                          <div className={`font-mono font-medium`}>
                            {item.name}
                          </div>
                          {isSelected && <div className={`text-[11px] font-sans mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{item.description}</div>}
                        </div>
                      </div>
                    </td>

                    <td className={`py-1.5 px-2 text-center hidden md:table-cell font-mono ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      {item.capacityA7W35.toFixed(1)} kW / {item.scopW35.toFixed(1)}
                    </td>

                    <td className={`py-1.5 px-2 text-center hidden md:table-cell font-mono ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      {(item.capacityA7W35 * 0.85).toFixed(1)} kW / {item.scopW55.toFixed(1)}
                    </td>

                    <td className={`py-1.5 px-2 text-center hidden md:table-cell ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {item.soundDba} dB(A)
                    </td>

                    <td className="py-1.5 px-2 text-center hidden md:table-cell font-mono">
                      {item.phases === 1 ? '230V' : '400V'}
                    </td>

                    <td className="py-1.5 px-2 text-right font-mono font-medium">
                      {discountPct > 0 ? (
                        <div className="flex flex-col items-end">
                          <span className="line-through text-[10px] text-slate-400">
                            {formatHu(item.estimatedPriceHuf)}
                          </span>
                          <span className="text-emerald-500">
                            {formatHu(item.estimatedPriceHuf * (1 - discountPct / 100))}
                          </span>
                        </div>
                      ) : (
                        <span>{formatHu(item.estimatedPriceHuf)}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Sleek, Consolidated Investment & Payback Analysis with ZERO clashing background colors (as requested) */}
      {activeHPResults && (
        <div className={`rounded-lg border p-3 transition-all ${
          isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'
        }`} id="hp-diagnostics-panel">
          
          <div className="space-y-3">
            
            {/* Header */}
            <div className="border-b pb-1.5 flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                <h3 className={`font-semibold text-xs ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                  Beruházás & Megtérülés részletezése
                </h3>
              </div>
              <span className="text-[10px] text-slate-500 font-medium">Pénzügyi kalkuláció</span>
            </div>

            {/* 1. Surcharges breakdown (tight 3-column grid) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
               
               {/* Item A: Surcharges & Base Price */}
               <div className={`p-2.5 rounded-lg border flex flex-col justify-between ${isDark ? 'border-slate-800 bg-slate-800/10' : 'border-slate-200 bg-slate-50'}`}>
                <div>
                  <span className="text-slate-500 text-[10px] font-medium block">Hőszivattyú alapgép {discountPct === 0 && '(Listaár)'}</span>
                  <span className={`text-sm font-mono mt-1 block ${discountPct > 0 ? (isDark ? 'text-slate-500 line-through' : 'text-slate-400 line-through') : (isDark ? 'text-slate-200' : 'text-slate-800')}`}>{formatHu(baseDevicePrice)} Ft</span>
                  {discountPct > 0 && (
                     <span className={`text-base font-mono mt-0.5 block text-emerald-500`}>{formatHu(discountedDevicePrice)} Ft</span>
                  )}
                  {selectedModel && (
                    <div className="mt-2 space-y-1 text-[9px] text-slate-500 border-t border-slate-200 dark:border-slate-800 pt-2 leading-relaxed">
                      <span className={`block font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{selectedModel.name}</span>
                      <span className="block">SCOP: <strong>{selectedModel.scopW35}</strong> (W35) / <strong>{selectedModel.scopW55}</strong> (W55)</span>
                      <span className="block">Méret: {selectedModel.dimensions || 'n.a.'} • {selectedModel.weightKg} kg</span>
                      <span className="block">Zaj (LwA / LpA 1m): <strong>{selectedModel.soundDba} dB(A)</strong> / <strong>{selectedModel.soundPressureDba1m} dB(A)</strong></span>
                    </div>
                  )}
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-slate-500">Kedvezmény (%)</span>
                    <div className="min-w-[200px]">
                      <SegmentedControl
                        options={[0, 5, 10, 15, 20, 25].map(pct => ({ value: pct, label: `${pct}%` }))}
                        value={discountPct}
                        onChange={(val) => {
                          if (onChangeBuildingData) {
                            onChangeBuildingData({ ...buildingData, productDiscountPct: val });
                          }
                        }}
                        layoutId="discount-pct"
                        theme={isDark ? 'dark' : 'light'}
                        className="text-[9px]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Item B: Compact Install Rate (Selectable Packages!) */}
              <div className={`p-2.5 rounded-lg border flex flex-col justify-between ${isDark ? 'border-slate-800 bg-slate-800/10' : 'border-slate-200 bg-slate-50'}`}>
                <div>
                  <span className="text-slate-500 text-[10px] font-medium block mb-1">Gépészeti szerelés és telepítés csomag</span>
                  <span className={`text-sm font-mono block mb-1.5 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{formatHu(installationSurcharge)} Ft</span>
                  <p className="text-[9px] text-slate-500 leading-relaxed mb-3">
                    Tartalmazza: komplett zárt tágulási rendszerek fűtéskörhöz, nyomásmérők, légtelenítők, biztonsági szelepek, prémium rézcsövezés telepítése beüzemelési munkadíjjal.
                  </p>
                  
                  {/* Package Cards Side-by-Side as requested */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { val: 2000000, name: 'Egyszerű', desc: 'Rövid nyomvonal, kis gép' },
                      { val: 2500000, name: 'Normál', desc: 'Sztenderd anyagok' },
                      { val: 3000000, name: 'Komplex', desc: 'Hosszú nyomvonal, spec.' }
                    ].map((pkg) => {
                      const isSelected = installationSurcharge === pkg.val;
                      return (
                        <button
                          key={pkg.val}
                          type="button"
                          onClick={() => {
                            if (onChangeBuildingData) {
                              onChangeBuildingData({
                                ...buildingData,
                                mechanicalInstallCost: pkg.val
                              });
                            }
                          }}
                          className={`p-2 rounded-md border text-left flex flex-col justify-start cursor-pointer transition-all ${
                            isSelected
                              ? (isDark ? 'border-slate-500 bg-slate-800/80 shadow text-slate-100' : 'border-slate-400 bg-white shadow-sm ring-1 ring-slate-200 text-slate-900') 
                              : (isDark ? 'border-slate-800 bg-transparent text-slate-400 hover:bg-slate-800' : 'border-slate-200 bg-transparent text-slate-600 hover:bg-slate-100')
                          }`}
                        >
                          <span className={`text-[10px] font-medium leading-tight block ${isSelected ? '' : ''}`}>{pkg.name}</span>
                          <span className={`text-[10px] font-mono block mt-0.5 ${isSelected ? (isDark ? 'text-slate-100' : 'text-slate-900') : (isDark ? 'text-slate-500' : 'text-slate-500')}`}>{formatHu(pkg.val)} Ft</span>
                          <span className={`text-[9px] leading-relaxed mt-1 block ${isSelected ? (isDark ? 'text-slate-400': 'text-slate-600') : 'text-slate-400'}`}>{pkg.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Item C: Accessories (DHW Packages only) */}
              <div className={`p-2.5 rounded-lg border flex flex-col justify-between ${isDark ? 'border-slate-800 bg-slate-800/10' : 'border-slate-200 bg-slate-50'}`}>
                <div className="space-y-2">
                  {/* HMV Toggle Checkbox */}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={buildingData.includeDhwPackage !== false}
                        onChange={(e) => {
                          if (onChangeBuildingData) {
                            onChangeBuildingData({
                              ...buildingData,
                              includeDhwPackage: e.target.checked
                            });
                          }
                        }}
                        className="w-3.5 h-3.5"
                      />
                      <span className="text-[10px] font-medium text-slate-500">
                        HMV Csatlakoztatás
                      </span>
                    </label>
                    <span className={`text-[11px] font-mono ${buildingData.includeDhwPackage !== false ? (isDark ? 'text-slate-200' : 'text-slate-800') : 'text-slate-400'}`}>
                      {buildingData.includeDhwPackage !== false ? `+${formatHu(dhwSurcharge)} Ft` : 'Kikapcsolva'}
                    </span>
                  </div>

                  {buildingData.includeDhwPackage !== false ? (
                    <div className="space-y-2">
                      <div className="text-[9px] text-slate-500 leading-relaxed mt-2 space-y-0.5">
                        <span className="block">A komplett szerelt HMV csomag részei:</span>
                        <span className="block">• {dhwVolume}L indirekt HMV-tároló fűtőpatronnal</span>
                        <span className="block">• 3-járatú fűtés-HMV váltószelep</span>
                        <span className="block">• Extra víz és elektromos kiegészítők</span>
                      </div>
                      
                      {/* DHW Size chooser button toggle */}
                      <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
                        <span className="text-[9px] text-slate-500 block font-medium">Tároló Mérete</span>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { lit: 200, price: 950000, label: '200 L', desc: 'Standard csomag' },
                            { lit: 300, price: 1150000, label: '300 L', desc: 'Nagycsaládos' }
                          ].map((sz) => {
                            const isSelected = (buildingData.dhwVolume ?? 200) === sz.lit;
                            return (
                              <button
                                key={sz.lit}
                                type="button"
                                onClick={() => {
                                  if (onChangeBuildingData) {
                                    onChangeBuildingData({
                                      ...buildingData,
                                      dhwVolume: sz.lit as 200 | 300
                                    });
                                  }
                                }}
                                className={`p-2 rounded-lg border text-center cursor-pointer transition-all ${
                                  isSelected
                                    ? (isDark ? 'border-slate-500 bg-slate-800/80 shadow text-slate-100' : 'border-slate-400 bg-white shadow-sm ring-1 ring-slate-200 text-slate-900') 
                                    : (isDark ? 'border-slate-800 bg-transparent text-slate-400 hover:bg-slate-800' : 'border-slate-200 bg-transparent text-slate-600 hover:bg-slate-100')
                                }`}
                              >
                                <span className="text-[10px] font-medium block leading-none">{sz.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[9px] text-slate-500 italic mt-2">Nincs melegvíztároló kiválasztva.</div>
                  )}
                </div>
              </div>

            </div>

            {/* Standalone State Subsidy / Pályázat Row - Positioned lower, not part of technical costs */}
            <div className={`p-3 rounded-lg border mt-3 ${isDark ? 'border-slate-800 bg-slate-800/10' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-medium block text-slate-500">
                    Állami és Pályázati Támogatás
                  </span>
                  <p className="text-[9px] text-slate-500 leading-relaxed">
                    A beruházás bruttó végösszegéből levonandó állami támogatás.
                  </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 sm:justify-end shrink-0">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={buildingData.useSubsidy !== false}
                      onChange={(e) => {
                        if (onChangeBuildingData) {
                          onChangeBuildingData({
                            ...buildingData,
                            useSubsidy: e.target.checked
                          });
                        }
                      }}
                      className="w-3.5 h-3.5"
                    />
                    <span className="text-[10px] font-medium text-slate-500">Támogatás bevonása</span>
                  </label>

                  {buildingData.useSubsidy !== false && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] text-slate-500 font-medium shrink-0">Érték:</span>
                      <div className="relative w-32">
                        <input
                          type="number"
                          value={buildingData.subsidyValue ?? 3000000}
                          onChange={(e) => {
                            const v = parseInt(e.target.value) || 0;
                            if (onChangeBuildingData) {
                              onChangeBuildingData({
                                ...buildingData,
                                subsidyValue: v
                              });
                            }
                          }}
                          className={`w-full px-2 py-1 pr-6 text-xs font-mono rounded-md border focus:outline-none focus:ring-1 focus:ring-slate-400 ${
                            isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                          }`}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-500">Ft</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Sleek, Simple Investment costs and Tariff Selection */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              
              {/* Left col: Total and Net investment costs - No colors, just borders */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-medium text-slate-500">
                  <span>BERUHÁZÁS ÖSSZESÍTÉS</span>
                </div>
                <div className={`p-3 rounded-lg border space-y-1 ${isDark ? 'border-slate-800 bg-slate-800/10' : 'border-slate-200 bg-slate-50'}`}>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Bruttó teljes költség:</span>
                    <span className="font-mono">{formatHu(totalInvestmentCost)} Ft</span>
                  </div>
                  <div className="flex justify-between text-xs font-medium border-t border-slate-200 dark:border-slate-800 pt-2 mt-2">
                    <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>Saját erő összesen (Bruttó):</span>
                    <span className="font-mono text-emerald-500">{formatHu(netInvestmentCost)} Ft</span>
                  </div>
                </div>
              </div>

              {/* Right col: Tariff selector on same gray baseline */}
              <div className="space-y-2">
                <span className="text-[10px] font-medium text-slate-500 block">Villamos tarifa választó</span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 23, title: 'H-Tarifa', sub: 'Kedvezményes' },
                    { val: 36, title: 'A1 Limit', sub: 'Rezsigát alatt' },
                    { val: 70, title: 'A1 Piaci', sub: 'Rezsilimit felett' }
                  ].map((x) => (
                    <button
                      key={x.val}
                      type="button"
                      onClick={() => onChangeTariff(x.val)}
                      className={`p-2 rounded-lg border text-center cursor-pointer transition-all ${
                        tariffHuf === x.val
                          ? (isDark ? 'bg-slate-800 border-slate-500 text-slate-100 shadow' : 'bg-slate-200 border-slate-400 text-slate-900 shadow-sm')
                          : (isDark ? 'bg-transparent border-slate-800 text-slate-400 hover:bg-slate-800' : 'bg-transparent border-slate-200 text-slate-500 hover:bg-slate-100')
                      }`}
                    >
                      <span className="text-[10px] font-medium block">{x.title}</span>
                      <span className={`text-[10px] font-mono block leading-none mt-0.5 ${tariffHuf === x.val ? '' : 'text-slate-400'}`}>{x.val} Ft</span>
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* 3 & 4. Comparative savings and payback in one tight grid */}
            <div className={`rounded-lg border p-3 transition-all ${isDark ? 'border-slate-800 bg-slate-800/10' : 'border-slate-200 bg-slate-50'}`}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="flex flex-col">
                  <span className="text-slate-500 text-[10px] font-medium">Régi gáz fűtés (éves)</span>
                  <span className={`text-sm font-mono mt-0.5 block ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{formatHu(calcResults.gasCostHuf)}</span>
                </div>

                <div className="flex flex-col border-l border-slate-200 dark:border-slate-800 pl-3">
                  <span className="text-slate-500 text-[10px] font-medium">Új hőszivattyús fűtés</span>
                  <span className="text-sm font-mono mt-0.5 block text-blue-500">{formatHu(calcResults.hpCostHuf)}</span>
                </div>

                <div className="flex flex-col border-l border-slate-200 dark:border-slate-800 pl-3">
                  <span className="text-slate-500 text-[10px] font-medium">Éves megtakarítás</span>
                  <span className="text-sm font-mono mt-0.5 block text-emerald-500">+{formatHu(calcResults.yearlySavingsHuf)}</span>
                </div>

                <div className="flex flex-col border-l border-slate-200 dark:border-slate-800 pl-3">
                  <span className="text-slate-500 text-[10px] font-medium">Várt megtérülés (Állami)</span>
                  <span className={`text-sm font-mono mt-0.5 block ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    {paybackYears === 99 ? 'Nincs' : `${paybackYears} Év`}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 6. Gép Részletes Info Modal (Mobilra fókuszálva, de asztalin is kiváló) */}
      {selectedInfoModel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setSelectedInfoModel(null)} />
          
          <div className={`relative w-full max-w-sm rounded-lg border shadow-xl p-4 transition-all duration-300 ${
            isDark ? 'bg-slate-900 border-slate-750 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-2 mb-3">
              <div>
                <h3 className="font-extrabold text-[#3b82f6] text-[10px] uppercase tracking-wider leading-none">
                  Készülék részletes adatai
                </h3>
                <span className={`text-[12px] font-black font-sans block mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {selectedInfoModel.manufacturer} {selectedInfoModel.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInfoModel(null)}
                className={`px-2 py-1 text-[10px] font-bold rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-200`}
              >
                Bezár
              </button>
            </div>

            {/* Technical grid table */}
            <div className="space-y-2 text-[10px]">
              {/* Manufacturer and Name */}
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/40 font-semibold">
                <span className="text-slate-400">Gyártó / Típus</span>
                <span className="font-bold">{selectedInfoModel.manufacturer} {selectedInfoModel.name}</span>
              </div>

              {/* Refrigerant & Power Supply */}
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/40">
                <span className="text-slate-400">Hűtőközeg / Tápvonal</span>
                <span className="font-mono font-bold text-amber-500">{selectedInfoModel.refrigerant || "R32"} / {selectedInfoModel.voltage} ({selectedInfoModel.ampereRequired})</span>
              </div>

              {/* Weight and Dimensions */}
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/40">
                <span className="text-slate-400">Súly / Külső méret</span>
                <span className="font-mono font-bold">{selectedInfoModel.weightKg} kg / {selectedInfoModel.dimensions || "1100×445×850 mm"}</span>
              </div>

              {/* Sound Power Level (Zajteljesítmény Lw) */}
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/40">
                <span className="text-slate-400">Zajteljesítmény szint (Lw)</span>
                <span className="font-mono font-bold text-indigo-400">{selectedInfoModel.soundDba} dB(A)</span>
              </div>

              {/* Standard heating capacity */}
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/40">
                <span className="text-slate-400">Kapacitás +7°C külső / W35</span>
                <span className="font-mono font-bold text-emerald-500">{selectedInfoModel.capacityA7W35.toFixed(1)} kW (COP: {selectedInfoModel.copA7W35.toFixed(2)})</span>
              </div>

              {/* Under-zero capacities */}
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/40">
                <span className="text-slate-400">Téli teljesítmény (-15°C W35)</span>
                <span className="font-mono font-bold text-emerald-500">{selectedInfoModel.capacityAm15W35.toFixed(1)} kW (COP: {selectedInfoModel.copAm15W35.toFixed(2)})</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/40">
                <span className="text-slate-400">Téli teljesítmény (-15°C W55)</span>
                <span className="font-mono font-bold text-rose-500">{selectedInfoModel.capacityAm15W55.toFixed(1)} kW (COP: {selectedInfoModel.copAm15W55.toFixed(2)})</span>
              </div>

              {/* Seasonal SCOP */}
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/40">
                <span className="text-slate-400">Szezonális SCOP (W35 / W55)</span>
                <span className="font-mono font-bold text-blue-500">{selectedInfoModel.scopW35.toFixed(1)} / {selectedInfoModel.scopW55.toFixed(1)}</span>
              </div>

              {/* Price */}
              <div className="flex justify-between py-1 items-center bg-blue-500/5 px-1.5 rounded mt-2">
                <span className="text-slate-400 font-bold uppercase text-[9px]">Internetes Bruttó ár</span>
                <span className={`text-xs font-black font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatHu(selectedInfoModel.estimatedPriceHuf)}</span>
              </div>
            </div>

            {/* Selecting Button */}
            <div className="mt-3.5 pt-1.5">
              <button
                type="button"
                onClick={() => {
                  onSelectModel(selectedInfoModel, selectedEmitter);
                  setSelectedInfoModel(null);
                }}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-extrabold text-[10px] uppercase tracking-wide rounded shadow-md transition-all cursor-pointer"
              >
                Gép kiválasztása tervezési alapnak
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SizingResults;
