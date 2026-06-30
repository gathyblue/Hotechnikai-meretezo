import React, { useState, useMemo } from 'react';
import { BuildingData, CalculationResults, HeatPumpModel } from '../types';
import { HEAT_PUMP_DATABASE } from '../heatPumpData';
import { evaluateHeatPumpEconomics, getHpCapacityAtTemp, getBuildingHeatDemandAtTemp, calculateBivalentCoverage, estimateBackupHours, estimateAnnualEnergySplit } from '../utils/calculations';
import { CONSTRUCTION_YEAR_GROUPS } from './BuildingDataInput';
import { Activity, Flame, Zap, Shield, CheckCircle2, ChevronRight, HelpCircle, Layers, Settings, BatteryCharging, Info } from 'lucide-react';
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

  const dhwVolume = buildingData.dhwVolume ?? 0;
  const dhwTankHuf = dhwVolume === 300 ? 730000 : (dhwVolume === 200 ? 530000 : 0);
  const dhwValveHuf = 95000;
  const dhwPipingHuf = 155000;
  const dhwHeaterHuf = 70000;
  const dhwLaborHuf = 100000;
  const dhwSurcharge = dhwVolume > 0 ? (dhwTankHuf + dhwValveHuf + dhwPipingHuf + dhwHeaterHuf + dhwLaborHuf) : 0;
  
  const totalInvestmentCost = discountedDevicePrice + installationSurcharge + dhwSurcharge;
  const isGrantMode = buildingData.useSubsidy === true;
  const activeSubsidy = isGrantMode ? (buildingData.subsidyValue ?? 3000000) : 0;
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
        calcResults.totalHeatingCostHuf,
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
      const capA = a.capacityAm15W35 || 0;
      const capB = b.capacityAm15W35 || 0;
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

  // Auto-select best model when parameters change — but don't override user's choice
  React.useEffect(() => {
    if (displayedModels.length > 0) {
      // Keep current selection if it's still valid
      const stillValid = selectedModel && displayedModels.some(m => m.id === selectedModel.id);
      if (!stillValid) {
        const best = displayedModels.reduce((prev, curr) => {
          const prevRatio = prev.capacityAtBiv / (prev.demandAtBiv || 0.1);
          const currRatio = curr.capacityAtBiv / (curr.demandAtBiv || 0.1);
          const prevScore = prevRatio >= 1 ? prevRatio : prevRatio - 2;
          const currScore = currRatio >= 1 ? currRatio : currRatio - 2;
          return Math.abs(currScore - 1) < Math.abs(prevScore - 1) ? curr : prev;
        });
        if (best.id !== selectedModel?.id) {
          onSelectModel(best, selectedEmitter);
        }
      }
    }
  }, [displayedModels, onSelectModel, selectedEmitter]);

  // Read current selected unit details
  const activeHPResults = useMemo(() => {
    if (!selectedModel) return null;
    return recommendedModels.find(m => m.id === selectedModel.id) || null;
  }, [selectedModel, recommendedModels]);

  const annualEnergy = useMemo(() => {
    if (!selectedModel) return null;
    return estimateAnnualEnergySplit(
      calcResults.heatLossKw.total,
      buildingData.designTemp,
      bivalentTempManual,
      selectedModel,
      selectedEmitter,
    );
  }, [selectedModel, selectedEmitter, bivalentTempManual, calcResults.heatLossKw.total, buildingData.designTemp]);

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

  const boilerTypeLabels: Record<string, string> = {
    old_atmospheric: 'Régi atmoszférikus',
    new_atmospheric: 'Új atmoszférikus',
    condensing: 'Kondenzációs'
  };

  const yearPreset = CONSTRUCTION_YEAR_GROUPS.find(g => g.id === buildingData.constructionYearGroup);
  const estimatedGasM3 = buildingData.method === 'consumption' ? buildingData.gasAnnualM3 : Math.round(calcResults.yearlyEnergyKwh / (9.44 * 0.80));
  const boilerLabel = buildingData.gasBoilerType ? (boilerTypeLabels[buildingData.gasBoilerType] ?? buildingData.gasBoilerType) : 'Ismeretlen';

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
      
      {/* (Heat loss cards removed per user request — section starts with bivalence graph) */}

      {/* 1. Munkapont meghatározás — unified card with graph + emitter */}
      <div className={`rounded-lg border p-3 transition-all ${
        isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="border-b pb-1.5">
          <h3 className={`font-semibold text-xs ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
            Munkapont meghatározás
          </h3>
        </div>

        <div className="space-y-4 mt-3">

          {/* Full Width High-Impact Responsive Visual SVG Graph */}
          <div className="flex flex-col space-y-2">
            
            {/* Embedded High Fidelity responsive SVG Graph */}
            <div className="w-full overflow-hidden">
              {(() => {
                const sW = 800;
                const sH = 280;
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
                const labelX = gX(bivalentTempManual);
                const demandY = gY(demandAtTempManual);
                const hpY = gY(hpCapAtManual);
                const labelW = 100;
                const labelH = 18;
                const labelGap = 28;
                const labelsOverlap = activeHPResults && Math.abs(demandY - hpY) < labelGap;
                const midY = (hpY + demandY) / 2;
                const hpLabelY = labelsOverlap ? midY - labelGap / 2 : hpY;
                const demandLabelY = labelsOverlap ? midY + labelGap / 2 : demandY;

                return (
                  <div className="w-full space-y-3.5">
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

                      {/* Zone Top Headers */}
                      {(() => {
                        return (
                          <>
                            <text x={(gX(-7) + gX(dTemp)) / 2} y="27" fill={isDark ? "#fb7185" : "#e11d48"} fontSize="8" fontWeight="700" textAnchor="middle">EXTRÉM</text>
                            <text x={(gX(-7) + gX(0)) / 2} y="27" fill={isDark ? "#fbbf24" : "#d97706"} fontSize="8" fontWeight="700" textAnchor="middle">ZORD</text>
                            <text x={(gX(0) + gX(5)) / 2} y="27" fill={isDark ? "#2dd4bf" : "#0d9488"} fontSize="8" fontWeight="700" textAnchor="middle">STANDARD</text>
                            <text x={(gX(5) + gX(15)) / 2} y="27" fill={isDark ? "#60a5fa" : "#2563eb"} fontSize="8" fontWeight="700" textAnchor="middle">ENYHE</text>
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

                      {/* Remaining static tick labels (non-selectable) */}
                      <text x={gX(15)} y={sH - 10} fill={tickColor} fontSize="7" textAnchor="middle" opacity="0.6">+15°C</text>

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
                      {/* 1. Heat Pump Capacity Intersection Point (Készülék) */}
                      {activeHPResults && (
                        <>
                          <circle cx={labelX} cy={hpY} r="5.5" fill="#3b82f6" stroke="#ffffff" strokeWidth="1.5" />
                          <g className="font-sans font-bold">
                            <rect 
                              x={labelX + 10}
                              y={hpLabelY - labelH / 2}
                              width={labelW}
                              height={labelH}
                              rx="3" 
                              fill="#ffffff" 
                              stroke="#3b82f6" 
                              strokeWidth="1.2" 
                              opacity="0.95"
                            />
                            <text 
                              x={labelX + 15}
                              y={hpLabelY + labelH / 4}
                              fill="#2563eb" 
                              fontSize="10"
                              textAnchor="start"
                            >
                              {hpCapAtManual.toFixed(1)} kW (Készülék)
                            </text>
                          </g>
                        </>
                      )}
  
                      {/* 2. Demand Intersection Point (Hőigény) */}
                      <circle cx={labelX} cy={demandY} r="5.5" fill="#f97316" stroke="#ffffff" strokeWidth="1.5" />
                      <g className="font-sans font-bold">
                        <rect 
                          x={labelX + 10}
                          y={demandLabelY - labelH / 2}
                          width={labelW}
                          height={labelH}
                          rx="3" 
                          fill="#ffffff" 
                          stroke="#f97316" 
                          strokeWidth="1.2" 
                          opacity="0.95"
                        />
                        <text 
                          x={labelX + 15}
                          y={demandLabelY + labelH / 4}
                          fill="#ea580c" 
                          fontSize="10"
                          textAnchor="start"
                        >
                          {demandAtTempManual.toFixed(1)} kW (Hőigény)
                        </text>
                      </g>
 
                      {/* Bivalent point mark circle */}
                      <circle cx={gX(actBivTemp)} cy={gY(dMin15 * (1 - (actBivTemp - dTemp) / tRange))} r="5" fill="#10b981" stroke="#ffffff" strokeWidth="1" />

                      {/* Clickable bivalence temperature markers on the X-axis */}
                      {[buildingData.designTemp, -7, -5, -2, 0].map((t) => {
                        const isActive = t === bivalentTempManual;
                        return (
                          <g key={`biv-marker-${t}`} onClick={() => onChangeBivalentTemp(t)} style={{ cursor: 'pointer' }}>
                            {isActive ? (
                              <circle cx={gX(t)} cy={sH - 28} r="5" fill="#10b981" stroke="#fff" strokeWidth="1.5" />
                            ) : (
                              <circle cx={gX(t)} cy={sH - 28} r="4" fill={isDark ? '#334155' : '#e2e8f0'} stroke={isDark ? '#64748b' : '#94a3b8'} strokeWidth="1" />
                            )}
                            <text
                              x={gX(t)} y={sH - 10}
                              fill={isActive ? '#10b981' : tickColor}
                              fontSize="8"
                              textAnchor="middle"
                              fontWeight={isActive ? '800' : '400'}
                            >
                              {t > 0 ? `+${t}°C` : `${t}°C`}
                            </text>
                          </g>
                        );
                      })}
                    </svg>

                    {/* Compact legend directly under chart */}
                    <div className={`flex flex-wrap justify-center gap-3 text-[8px] font-bold uppercase tracking-wide text-slate-400`}>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-1 bg-orange-500 rounded-sm"></span> Hőigény
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-1 bg-blue-500 rounded-sm"></span> Max Gépkapacitás
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-2 bg-blue-500/15 border border-blue-500/30 rounded-sm"></span> Klímahőmérséklet gyakoriság
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-2 bg-red-500/20 border border-red-500/40 rounded-sm"></span> Külső hőforrás igény (hiány)
                      </div>
                    </div>

                    {/* Munkapont elemzés — Two side-by-side panels */}
                    <div className={`flex flex-col md:flex-row gap-3 pt-3`}>
                      {/* Left panel: Heat demand side */}
                      <div className={`w-full md:w-1/2 p-2.5 rounded-lg border flex flex-col gap-1.5 ${isDark ? 'border-slate-800 bg-slate-800/10' : 'border-slate-200 bg-slate-50'}`}>
                        <span className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Hőigény oldal ({bivalentTempManual} °C, {selectedEmitter === 'radiator' ? 'W55' : 'W35'})</span>
                        <div className="space-y-1 text-xs font-mono">
                          <div className="flex justify-between items-center py-0.5">
                            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Maximális hőszükséglet ({dTemp}°C)</span>
                            <span className={`font-bold text-sm ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>{calcResults.heatLossKw.total.toFixed(2)} kW</span>
                          </div>
                          <div className="flex justify-between items-center py-0.5">
                            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Hőszükséglet ({bivalentTempManual}°C)</span>
                            <span className={`font-bold text-sm ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>{demandAtTempManual.toFixed(2)} kW</span>
                          </div>
                          <div className="flex justify-between items-center py-0.5">
                            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Hőszivattyú teljesítmény ({dTemp}°C)</span>
                            <span className={`font-bold text-sm ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{hpCapAtT(dTemp).toFixed(2)} kW</span>
                          </div>
                          <div className="flex justify-between items-center py-0.5">
                            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Hőszivattyú teljesítmény ({bivalentTempManual}°C)</span>
                            <span className={`font-bold text-sm ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{hpCapAtManual.toFixed(2)} kW</span>
                          </div>
                          <div className="flex justify-between items-center py-0.5 font-semibold">
                            <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>Max kiegészítő fűtés igény</span>
                            <span className={`font-bold text-sm ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>+{Math.max(0, calcResults.heatLossKw.total - hpCapAtT(dTemp)).toFixed(2)} kW</span>
                          </div>
                          <div className={`pt-1.5 mt-1 border-t flex justify-between items-center py-0.5 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Készülék</span>
                            <span className={`font-bold text-sm ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{selectedModel?.name ?? 'Nincs kiválasztva'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right panel: Electric / Energy side */}
                      <div className={`w-full md:w-1/2 p-2.5 rounded-lg border flex flex-col gap-1.5 ${isDark ? 'border-slate-800 bg-slate-800/10' : 'border-slate-200 bg-slate-50'}`}>
                        <span className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Elektromos oldal</span>
                        {annualEnergy ? (() => {
                          const scop = selectedEmitter === 'radiator' ? (selectedModel?.scopW55 ?? 3) : (selectedModel?.scopW35 ?? 3.5);
                          const hpElek = Math.round(annualEnergy.hpThermalKwh / scop);
                          const backupElek = annualEnergy.backupThermalKwh;
                          return (
                            <div className="space-y-1 text-xs font-mono">
                              <div className="flex justify-between items-center py-0.5">
                                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Hőszivattyú termikus</span>
                                <span className={`font-bold text-sm ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{annualEnergy.hpThermalKwh.toLocaleString('hu-HU')} kWh</span>
                              </div>
                              <div className="flex justify-between items-center py-0.5">
                                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Kiegészítő termikus</span>
                                <span className={`font-bold text-sm ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>{annualEnergy.backupThermalKwh.toLocaleString('hu-HU')} kWh</span>
                              </div>
                              <div className="flex justify-between items-center py-0.5">
                                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Hőszivattyú elektromos (SCOP {scop.toFixed(2)})</span>
                                <span className={`font-bold text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{hpElek.toLocaleString('hu-HU')} kWh</span>
                              </div>
                              <div className="flex justify-between items-center py-0.5">
                                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Kiegészítő elektromos</span>
                                <span className={`font-bold text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{backupElek.toLocaleString('hu-HU')} kWh</span>
                              </div>
                              <div className="flex justify-between items-center py-0.5">
                                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Hőszivattyú üzemóra</span>
                                <span className={`font-bold text-sm ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>~{Math.max(0, 4392 - estimateBackupHours(bivalentTempManual)).toLocaleString('hu-HU')} h/év</span>
                              </div>
                              <div className="flex justify-between items-center py-0.5">
                                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Kiegészítő üzemóra</span>
                                <span className={`font-bold text-sm ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>~{estimateBackupHours(bivalentTempManual).toLocaleString('hu-HU')} h/év</span>
                              </div>
                            </div>
                          );
                        })() : (
                          <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Válasszon hőszivattyút</span>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Bivalencia + Kiegészítő fűtés + Emitter — 50/50 same-height row */}
        <div className={`flex flex-col md:flex-row gap-3 pt-3 ${isDark ? '' : ''}`}>
          {/* Left 50% — Bivalence temperature selector */}
          <div className={`w-full md:w-1/2 p-2.5 rounded-lg border flex flex-col gap-1.5 ${isDark ? 'border-slate-800 bg-slate-800/10' : 'border-slate-200 bg-slate-50'}`}>
            <span className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Bivalencia hőmérséklet</span>
            <SegmentedControl
              options={[
                { value: buildingData.designTemp, label: `${buildingData.designTemp}°C` },
                { value: -7, label: '-7°C' },
                { value: -5, label: '-5°C' },
                { value: -2, label: '-2°C' },
                { value: 0, label: '0°C' },
              ]}
              value={bivalentTempManual}
              onChange={(val) => onChangeBivalentTemp(val)}
              layoutId="bivalent-temp"
              theme={theme as 'light' | 'dark'}
              className="text-[9px]"
            />
          </div>

          {/* Right 50% — Emitter selection only */}
          <div className={`w-full md:w-1/2 p-2.5 rounded-lg border flex flex-col gap-1.5 ${isDark ? 'border-slate-800 bg-slate-800/10' : 'border-slate-200 bg-slate-50'}`}>
            <span className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Hőleadó (előremenő hőmérséklet választás)</span>
            {activeHPResults ? (() => {
              return (
                <>
                  <SegmentedControl
                    options={[
                      { value: 'floor', label: '+35 °C  Padlófűtés' },
                      { value: 'radiator', label: '+55 °C  Radiátor' },
                    ]}
                    value={selectedEmitter}
                    onChange={onChangeEmitter}
                    layoutId="emitter-select"
                    theme={theme as 'light' | 'dark'}
                  />
                </>
              );
            })() : (
              <div className="flex flex-col items-center justify-center gap-2 h-full">
                <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Válasszon hőszivattyút</span>
                <SegmentedControl
                  options={[
                    { value: 'floor', label: '+35 °C  Padlófűtés' },
                    { value: 'radiator', label: '+55 °C  Radiátor' },
                  ]}
                  value={selectedEmitter}
                  onChange={onChangeEmitter}
                  layoutId="emitter-select"
                  theme={theme as 'light' | 'dark'}
                />
              </div>
            )}
          </div>
        </div>
      </div>


      {/* 2. Ajánlott hőszivattyús berendezések */}
      <div className={`rounded-lg border p-3 transition-all ${
        isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="border-b pb-1.5">
          <h3 className={`font-semibold text-xs ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
            Ajánlott hőszivattyús berendezések
          </h3>
        </div>

        <div className="mt-3 mb-3">
          <SegmentedControl
            options={[
              {
                value: 'recommended',
                label: (
                  <span className="text-[10px] sm:text-xs font-medium px-1 sm:px-2">Ajánl. ({displayedModels.length})</span>
                ),
              },
              {
                value: 'all',
                label: (
                  <span className="text-[10px] sm:text-xs font-medium px-1 sm:px-2">Összes ({recommendedModels.length})</span>
                ),
              },
            ]}
            value={filterNearby ? 'recommended' : 'all'}
            onChange={(v) => setFilterNearby(v === 'recommended')}
            layoutId="hp-filter"
            theme={theme as 'light' | 'dark'}
            className="text-xs w-full"
          />
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
                <th className="py-2 px-3 text-center hidden md:table-cell">W35</th>
                <th className="py-2 px-3 text-center hidden md:table-cell">W55</th>
                <th className="py-2 px-3 text-center hidden md:table-cell">Zaj</th>
                <th className="py-2 px-3 text-center hidden md:table-cell">Táp(V)</th>
                <th className="py-2 px-3 text-center hidden md:table-cell">Megszakító</th>
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
                    className={`cursor-pointer text-xs ${rowBgClass}`}
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
                      {item.capacityAm15W35.toFixed(1)} kW
                    </td>

                    <td className={`py-1.5 px-2 text-center hidden md:table-cell font-mono ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      {item.capacityAm15W55.toFixed(1)} kW
                    </td>

                    <td className={`py-1.5 px-2 text-center hidden md:table-cell ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {item.soundDba} dB(A)
                    </td>

                    <td className="py-1.5 px-2 text-center hidden md:table-cell font-mono">
                      {item.phases === 1 ? '230V' : '400V'}
                    </td>

                    <td className={`py-1.5 px-2 text-center hidden md:table-cell font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {item.ampereRequired}
                    </td>

                    <td className={`py-1.5 px-2 text-right font-mono font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                      {formatHu(item.estimatedPriceHuf)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Árajánlat — 3-card row layout */}
      {activeHPResults && (
        <div className={`rounded-lg border p-3 transition-all ${
          isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'
        }`} id="hp-quotation-panel">
          
          <div className="space-y-3">
            
            <div className="border-b pb-1.5">
              <h3 className={`font-semibold text-xs ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                Árajánlat
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
               
              {/* Card 1: Base Price + Discount + Tech Params */}
              <div className={`p-2.5 rounded-lg border flex flex-col ${
                isDark ? 'border-slate-800 bg-slate-800/10' : 'border-slate-200 bg-slate-50'
              }`}>
                <div className="flex items-start justify-between gap-2 mb-2 min-h-[2rem]">
                  <span className="text-slate-500 text-[10px] font-medium">Hőszivattyú alapgép {discountPct === 0 && '(Listaár)'}</span>
                  <div className="flex items-center gap-1.5 text-right shrink-0 flex-wrap justify-end">
                    <span className={`text-sm font-mono ${discountPct > 0 ? (isDark ? 'text-slate-500 line-through' : 'text-slate-400 line-through') : (isDark ? 'text-slate-200' : 'text-slate-800')}`}>{formatHu(baseDevicePrice)}</span>
                    {discountPct > 0 && (
                      <span className="text-sm font-mono text-emerald-500">{formatHu(discountedDevicePrice)}</span>
                    )}
                  </div>
                </div>
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
                  className="text-[9px] w-full"
                />
                {selectedModel && (
                  <div className="mt-auto pt-2 flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] text-slate-500 leading-relaxed">
                    <span className={`w-full font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{selectedModel.name}</span>
                    <span>SCOP ({selectedEmitter === 'radiator' ? 'W55' : 'W35'}): <strong className={isDark ? 'text-slate-300' : 'text-slate-700'}>{selectedEmitter === 'radiator' ? selectedModel.scopW55 : selectedModel.scopW35}</strong></span>
                    <span>|</span>
                    <span>Méret: {selectedModel.dimensions || 'n.a.'} • {selectedModel.weightKg} kg</span>
                    <span>|</span>
                    <span>Zaj: <strong className={isDark ? 'text-slate-300' : 'text-slate-700'}>{selectedModel.soundDba} dB(A)</strong></span>
                    <span>|</span>
                    <span>Megszakító: <strong className={isDark ? 'text-slate-300' : 'text-slate-700'}>{selectedModel.ampereRequired}</strong></span>
                  </div>
                )}
              </div>

              {/* Card 2: Install with segmented control + buffer tank */}
              <div className={`p-2.5 rounded-lg border flex flex-col ${
                isDark ? 'border-slate-800 bg-slate-800/10' : 'border-slate-200 bg-slate-50'
              }`}>
                <div className="flex items-start justify-between gap-2 mb-2 min-h-[2rem]">
                  <span className="text-slate-500 text-[10px] font-medium">Gépészeti szerelés és telepítés</span>
                  <span className={`text-sm font-mono text-right shrink-0 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{formatHu(installationSurcharge)}</span>
                </div>
                <SegmentedControl
                  options={[
                    { value: 2000000, label: 'Egyszerű' },
                    { value: 2500000, label: 'Normál' },
                    { value: 3000000, label: 'Komplex' }
                  ]}
                  value={installationSurcharge}
                  onChange={(val) => {
                    if (onChangeBuildingData) {
                      onChangeBuildingData({ ...buildingData, mechanicalInstallCost: val });
                    }
                  }}
                  layoutId="install-pkg"
                  theme={isDark ? 'dark' : 'light'}
                  className="text-[9px] w-full"
                />
                <div className="mt-auto pt-2 text-[9px] text-slate-500 leading-relaxed">
                  <span className="block">
                    {installationSurcharge === 2000000 && 'Kisebb készülék, rövid csövezés, egyszerű kialakítás.'}
                    {installationSurcharge === 2500000 && 'Sztenderd telepítés, normál nyomvonal, átlagos megoldások.'}
                    {installationSurcharge === 3000000 && 'Nagyobb készülék, hosszabb csövezés, bonyolultabb kialakítás.'}
                  </span>
                  <span className="block mt-0.5">Tartalmazza: zárt tágulási rendszer, nyomásmérők, légtelenítők, biztonsági szelepek, fagyvédelmi szelep, keringető szekundérköri szivattyú, rézcsövezés, puffertartály, beüzemelés.</span>
                </div>
              </div>

              {/* Card 3: DHW with 3-way segmented control */}
              <div className={`p-2.5 rounded-lg border flex flex-col ${
                isDark ? 'border-slate-800 bg-slate-800/10' : 'border-slate-200 bg-slate-50'
              }`}>
                <div className="flex items-start justify-between gap-2 mb-2 min-h-[2rem]">
                  <span className="text-slate-500 text-[10px] font-medium">HMV tároló</span>
                  <span className={`text-sm font-mono text-right shrink-0 ${dhwVolume > 0 ? (isDark ? 'text-slate-200' : 'text-slate-800') : (isDark ? 'text-slate-500' : 'text-slate-400')}`}>
                    {dhwVolume > 0 ? formatHu(dhwSurcharge) : 'Nincs'}
                  </span>
                </div>
                <SegmentedControl
                  options={[
                    { value: 0, label: 'Nincs' },
                    { value: 200, label: '200L' },
                    { value: 300, label: '300L' }
                  ]}
                  value={dhwVolume}
                  onChange={(val) => {
                    if (onChangeBuildingData) {
                      onChangeBuildingData({ ...buildingData, dhwVolume: val });
                    }
                  }}
                  layoutId="dhw-vol"
                  theme={isDark ? 'dark' : 'light'}
                  className="text-[9px] w-full"
                />
                {dhwVolume > 0 && (
                  <div className="mt-auto pt-2 space-y-0.5 text-[9px] text-slate-500 leading-relaxed">
                    <span className="block">• {dhwVolume}L indirekt HMV-tároló fűtőpatronnal</span>
                    <span className="block">• 3-járatú fűtés-HMV váltószelep</span>
                    <span className="block">• Extra víz és elektromos kiegészítők</span>
                  </div>
                )}
                {dhwVolume === 0 && (
                  <div className="mt-auto pt-2 text-[9px] text-slate-500 italic">Nincs melegvíztároló kiválasztva.</div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 4. Megtérülés — outer card wrapping two inner cards */}
      {activeHPResults && (
        <div className={`rounded-lg border p-3 transition-all ${
          isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'
        }`}>

          <div className="border-b pb-1.5">
            <h3 className={`font-semibold text-xs ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Megtérülés</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-3">

            {/* Left card: Bemenő adatok — 2/3 */}
            <div className={`p-4 rounded-lg border lg:col-span-2 ${isDark ? 'border-slate-800 bg-slate-800/10' : 'border-slate-200 bg-slate-50'}`}>
              <span className="text-xs font-medium text-slate-500 block mb-4">Bemenő adatok</span>

              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap text-sm">
                  <SegmentedControl
                    options={[
                      { value: 'self', label: 'Önerő' },
                      { value: 'grant', label: 'Pályázat' }
                    ]}
                    value={isGrantMode ? 'grant' : 'self'}
                    onChange={(val) => {
                      if (onChangeBuildingData) {
                        onChangeBuildingData({ ...buildingData, useSubsidy: val === 'grant' });
                      }
                    }}
                    layoutId="funding-type"
                    theme={isDark ? 'dark' : 'light'}
                    className="text-xs"
                  />
                  <span className={`font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    Bruttó: {formatHu(totalInvestmentCost)}
                  </span>
                  {isGrantMode && (
                    <>
                      <span className="text-slate-400">–</span>
                      <span className="text-xs text-slate-500">Támogatás:</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={(buildingData.subsidyValue ?? 3000000).toLocaleString('hu-HU')}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, '');
                          const v = parseInt(raw, 10) || 0;
                          if (onChangeBuildingData) {
                            onChangeBuildingData({ ...buildingData, subsidyValue: v });
                          }
                        }}
                        className={`w-28 px-1.5 py-0.5 text-sm font-mono rounded-lg border text-right focus:outline-none focus:ring-1 focus:ring-slate-400 ${
                          isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                        }`}
                      />
                      <span className="text-slate-400">=</span>
                      <span className={`font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                        {formatHu(netInvestmentCost)}
                      </span>
                    </>
                  )}
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-slate-500">
                  <span>Év: <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{yearPreset?.label ?? buildingData.constructionYearGroup ?? '—'}</strong></span>
                  <span>Kazán: <strong>{boilerLabel} ({buildingData.boilerEfficiency}%)</strong></span>
                  <span>Gáz: <strong>{estimatedGasM3.toLocaleString('hu-HU')} m³</strong></span>
                  <span>Hőigény: <strong>{calcResults.heatLossKw.total.toFixed(1)} kW</strong></span>
                </div>

                <div>
                  <span className="text-xs text-slate-500 font-medium block mb-1.5">Villamos tarifa</span>
                  <SegmentedControl
                    options={[
                      { value: 23, label: 'H-Tarifa 23' },
                      { value: 36, label: 'A1 Limit 36' },
                      { value: 70, label: 'A1 Piaci 70' },
                    ]}
                    value={tariffHuf}
                    onChange={onChangeTariff}
                    layoutId="tariff-val"
                    theme={isDark ? 'dark' : 'light'}
                    className="text-xs w-full"
                  />
                </div>
              </div>
            </div>

            {/* Right card: bivalence-based cost breakdown */}
            <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-800 bg-slate-800/10' : 'border-slate-200 bg-slate-50'}`}>
              <div className="space-y-2">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Fűtési költség</div>

                {calcResults.gasCostHuf > 0 && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">Gáz</span>
                      <span className={`text-sm font-mono font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{formatHu(calcResults.gasCostHuf)}</span>
                    </div>
                    {calcResults.gasMarketM3 > 0 && (
                      <>
                        <div className="flex justify-between items-center pl-3">
                          <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Rezsicsökkentett ({calcResults.gasSubsidizedM3} m³)</span>
                          <span className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{formatHu(calcResults.gasSubsidizedCost)}</span>
                        </div>
                        <div className="flex justify-between items-center pl-3">
                          <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Piaci ({calcResults.gasMarketM3} m³)</span>
                          <span className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{formatHu(calcResults.gasMarketCost)}</span>
                        </div>
                      </>
                    )}
                  </>
                )}

                {calcResults.woodCostHuf > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Fatüzelés</span>
                    <span className={`text-sm font-mono font-medium ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>{formatHu(calcResults.woodCostHuf)}</span>
                  </div>
                )}

                {calcResults.electricBoilerCostHuf > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Elektromos kazán (A1 70 Ft)</span>
                    <span className={`text-sm font-mono font-medium ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>{formatHu(calcResults.electricBoilerCostHuf)}</span>
                  </div>
                )}

                <div className={`pt-2 border-t flex justify-between items-center ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                  <span className="text-xs font-medium text-slate-500">Összes fűtési költség</span>
                  <span className={`text-sm font-mono font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{formatHu(calcResults.totalHeatingCostHuf)}</span>
                </div>

                <div className={`pt-2 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                  {annualEnergy && selectedModel ? (() => {
                    const scop = selectedEmitter === 'radiator' ? (selectedModel.scopW55 ?? 3) : (selectedModel.scopW35 ?? 3.5);
                    const hpElekKwh = annualEnergy.hpThermalKwh / scop;
                    const backupElekKwh = annualEnergy.backupThermalKwh;
                    const hpCost = Math.round(hpElekKwh * tariffHuf);
                    const backupCost = Math.round(backupElekKwh * tariffHuf);
                    const totalCost = hpCost + backupCost;
                    const savings = calcResults.totalHeatingCostHuf - totalCost;
                    const payback = savings > 0 ? (netInvestmentCost / savings) : 99;
                    return (<>
                      <div className="flex justify-between items-center">
                        <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Hőszivattyú (SCOP {scop.toFixed(2)})</span>
                        <span className={`text-sm font-mono font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{formatHu(hpCost)}</span>
                      </div>
                      {backupCost > 0 && (
                        <div className="flex justify-between items-center mt-1">
                          <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Kiegészítő elektromos</span>
                          <span className={`text-sm font-mono font-medium ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>{formatHu(backupCost)}</span>
                        </div>
                      )}
                      <div className={`pt-2 mt-2 border-t flex justify-between items-center ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                        <span className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>HP összesen</span>
                        <span className={`text-sm font-mono font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{formatHu(totalCost)}</span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-slate-500">Éves megtakarítás</span>
                        <span className={`text-sm font-mono font-bold ${savings > 0 ? 'text-emerald-500' : 'text-red-500'}`}>{savings > 0 ? '+' : ''}{formatHu(savings)}</span>
                      </div>
                      <div className={`pt-3 border-t flex justify-between items-center mt-2 ${isDark ? 'border-slate-700' : 'border-slate-300'}`}>
                        <span className="text-xs font-medium text-slate-500">Várt megtérülés</span>
                        <span className={`text-base font-mono font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                          {payback === 99 ? 'Nincs' : `${payback.toFixed(1)} év`}
                        </span>
                      </div>
                    </>);
                  })() : (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">Hőszivattyú</span>
                        <span className="text-sm font-mono font-medium text-blue-500">{formatHu(calcResults.hpCostHuf)}</span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-slate-500">Éves megtakarítás</span>
                        <span className={`text-sm font-mono font-medium text-emerald-500`}>+{formatHu(calcResults.yearlySavingsHuf)}</span>
                      </div>
                      <div className={`pt-3 border-t flex justify-between items-center mt-2 ${isDark ? 'border-slate-700' : 'border-slate-300'}`}>
                        <span className="text-xs font-medium text-slate-500">Várt megtérülés</span>
                        <span className={`text-base font-mono font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                          {paybackYears === 99 ? 'Nincs' : `${paybackYears} év`}
                        </span>
                      </div>
                    </>
                  )}
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
                className={`px-2 py-1 text-[10px] font-bold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-200`}
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
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-extrabold text-[10px] uppercase tracking-wide rounded-lg shadow-md transition-all cursor-pointer"
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
