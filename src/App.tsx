import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { BuildingData, CalculationResults, HeatPumpModel, HydraulicInput, HydraulicResults, EngineeringParams } from './types';
import { performHeatLossCalculation, evaluateHeatPumpEconomics } from './utils/calculations';
import { getThemeClasses } from './utils/theme';
import { BuildingDataInput } from './components/BuildingDataInput';
import { SizingResults } from './components/SizingResults';
import { HydraulicExpansionCalc } from './components/HydraulicExpansionCalc';
import { SystemDiagram } from './components/SystemDiagram';
import { ReportExport } from './components/ReportExport';
import { PriceRefreshPanel } from './components/PriceRefreshPanel';
import { HEAT_PUMP_DATABASE } from './heatPumpData';
import { Home, Gauge, Activity, FileText, Flame, Zap, Sun, Moon, Settings, X, BookOpen, Layers, CheckCircle, ChevronDown, ChevronUp, Info, RefreshCw } from 'lucide-react';

export default function App() {
  // 1. Core State Hooks
  const [isDark, setIsDark] = useState(false);
  const theme = isDark ? 'dark' as const : 'light' as const;
  const [buildingData, setBuildingData] = useState<BuildingData>({
    ownerName: '',
    address: '',
    location: '',
    designTemp: -13, // standard Central HU
    heatedArea: 120, // average HU square meters
    ceilingHeight: 2.7,
    indoorTemp: 22,
    levels: 1, // default levels
    method: 'fabric',
    gasAnnualM3: 1600,
    gasEnabled: true,
    boilerEfficiency: 80,
    woodEnabled: false,
    woodCubicMeters: 0,
    woodPricePerM3: 38000,
    woodEnergyKwhPerM3: 3000,
    woodEfficiency: 70,
    electricBoilerEnabled: false,
    electricBoilerKwh: 0,
    certHeatDemandKw: 0,
    certSpecificLossQ: 0.38,
    walls: { name: 'Walls', area: 118, uValue: 0.55, insulationThickness: 10, baseUValue: 0.55 },
    roof: { name: 'Roof', area: 120, uValue: 1.3, insulationThickness: 15, baseUValue: 1.3 },
    floor: { name: 'Floor', area: 120, uValue: 0.9, insulationThickness: 5, baseUValue: 0.9 },
    windows: { name: 'Windows', area: 18, uValue: 1.5, insulationThickness: 0, baseUValue: 1.5 },
    ventilationRate: 0.5,
    surveyDate: new Date().toISOString().slice(0, 10),
    constructionYearGroup: '2002-2015',
    dhwVolume: 0,
    useSubsidy: false,
    subsidyValue: 3000000,
    mechanicalInstallCost: 2500000,
  });

  const [selectedModel, setSelectedModel] = useState<HeatPumpModel | null>(null);
  const [selectedEmitter, setSelectedEmitter] = useState<'floor' | 'radiator'>('radiator');
  const [tariffHuf, setTariffHuf] = useState<number>(23); // H-tarifa default: 23 Ft
  const [bivalentTempManual, setBivalentTempManual] = useState<number>(-13); // manual bivalent point slider, defaults to match designTemp (-13) pour Kecskemét

  // Initialize bivalentTempManual to designTemp only on first mount
  const [bivalentInitialized, setBivalentInitialized] = useState(false);
  useEffect(() => {
    if (!bivalentInitialized) {
      setBivalentTempManual(buildingData.designTemp);
      setBivalentInitialized(true);
    }
  }, [bivalentInitialized, buildingData.designTemp]);

  const [engineeringParams, setEngineeringParams] = useState<EngineeringParams>({
    airHeatCapacityFactor: 0.34,
    glycolPercentage: 30,
    expansionSafetyFactor: 1.10,
    pexFrictionMultiplier: 1.35,
    systemWaterVolumeFloorFactor: 15,
    systemWaterVolumeRadiatorFactor: 12,
    waterSpecificHeat: 1.163
  });
  const [isOpenEngineeringModal, setIsOpenEngineeringModal] = useState<boolean>(false);
  const [isOpenPricePanel, setIsOpenPricePanel] = useState(false);

  const [hydraulicState, setHydraulicState] = useState<HydraulicInput>({
    pipeMaterial: 'copper',
    deltaT: 5,
    staticHeight: 4,
    safetyValvePressure: 3.0,
    additionalWaterVolumeL: 100,
    secondaryLoops: 'radiators',
    includeHeatExchanger: false,
    includeDhwTank: true,
    primaryPipeSize: 'Auto',
    secondaryPipeSize: 'Auto',
    secondaryPumpOverride: 'Auto',
    targetVelocityMs: 0.6,
    pipeLengthEstimate: 15,
    fittingsCount: 8,
  });

  const [hydraulicResults, setHydraulicResults] = useState<HydraulicResults>({
    flowRateLh: 1200,
    flowRateLmin: 20,
    estimatedVelocityMs: 0.6,
    recommendedPipeSize: 'Rézcső DN20 (22x1.0)',
    vesselSizeL: 35,
    vesselPrechargeBar: 0.8,
    vesselFinalBar: 2.5,
    heatExchangerAreaM2: 0.6,
    heatExchangerWaterFlowLh: 1200,
    recommendedExchangerModel: 'Hextrend HE100-20 kompakt',
    primaryFlowRateLh: 1200,
    secondaryFlowRateLh: 0,
    primaryPressureDropKpa: 15.0,
    secondaryPressureDropKpa: 0,
    remainingPumpHeadKpa: 45.0,
    dabPumpModel: 'DAB Evosta 2 40-70/180 (A-osztályú, nagyhatékonyságú)'
  });

  const [activeTab, setActiveTab] = useState<'building' | 'equipment' | 'hydraulics' | 'scheme' | 'export'>('building');

  useEffect(() => {
    // Force scroll to top on section change
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    const scrollContainer = document.querySelector('.overflow-y-auto');
    if (scrollContainer) scrollContainer.scrollTop = 0;
  }, [activeTab]);

  // 2. Perform thermal requirements calculations
  const calcResults: CalculationResults = useMemo(() => {
    const rawResults = performHeatLossCalculation(buildingData, engineeringParams);
    
    if (selectedModel) {
      const economics = evaluateHeatPumpEconomics(
        rawResults.heatLossKw.total,
        rawResults.yearlyEnergyKwh,
        rawResults.totalHeatingCostHuf,
        selectedModel,
        selectedEmitter,
        tariffHuf,
        bivalentTempManual,
        buildingData.designTemp
      );

      return {
        ...rawResults,
        hpCostHuf: economics.hpCostHuf,
        yearlySavingsHuf: economics.yearlySavingsHuf,
        bivalentTemp: bivalentTempManual, // manual override as requested by user
        bivalentElectricHeaterKw: economics.bivalencyHeaterKw, // raw calc fallback
      };
    }

    return rawResults;
  }, [buildingData, selectedModel, selectedEmitter, tariffHuf, bivalentTempManual, engineeringParams]);

  // 3. Reactively auto-select the best-fitting heat pump model when calculations update
  useEffect(() => {
    const targetDemand = calcResults.heatLossKw.total;
    
    // Define matching function for a heat pump
    const getMatchScore = (hp: HeatPumpModel) => {
      const dTemp = buildingData.designTemp;
      const tRange = 15 - dTemp;
      const actBiv = Math.max(dTemp, bivalentTempManual);

      const hpMin15 = selectedEmitter === 'radiator' ? hp.capacityAm15W55 : hp.capacityAm15W35;
      const hpAm7 = selectedEmitter === 'radiator' ? hp.capacityAm7W55 : hp.capacityAm7W35;
      const hpA7 = hp.capacityA7W35;
      const hpPlus15 = Math.max(hpA7, hpA7 * 1.05);

      let capacityAtBiv = 0;
      if (actBiv <= -7) {
        capacityAtBiv = hpMin15 + ((actBiv - (-15)) / 8) * (hpAm7 - hpMin15);
      } else if (actBiv <= 7) {
        capacityAtBiv = hpAm7 + ((actBiv - (-7)) / 14) * (hpA7 - hpAm7);
      } else {
        capacityAtBiv = hpA7 + ((actBiv - 7) / 8) * (hpPlus15 - hpA7);
      }
      
      const demandAtBiv = targetDemand * (1 - (actBiv - dTemp) / tRange);
      const ratio = capacityAtBiv / (demandAtBiv || 0.1);
      
      // We want ratio to be >= 0.95 and <= 1.08 (max 8% oversize preferred)
      const isPreferred = ratio >= 0.95 && ratio <= 1.08;
      // Fallback is 0.90 to 1.15
      const isAcceptable = ratio >= 0.90 && ratio <= 1.15;
      const mismatch = Math.abs(ratio - 1.0);
      
      return { isPreferred, isAcceptable, mismatch, id: hp.id, capacity: hp.capacityA7W35, ratio };
    };

    // Find the perfect matching model
    const sortedDb = [...HEAT_PUMP_DATABASE].sort((a, b) => {
      const scoreA = getMatchScore(a);
      const scoreB = getMatchScore(b);
      
      if (scoreA.isPreferred && !scoreB.isPreferred) return -1;
      if (!scoreA.isPreferred && scoreB.isPreferred) return 1;
      
      if (scoreA.isPreferred && scoreB.isPreferred) {
         // Both are preferred, pick the smallest one that is suitable
         return a.capacityA7W35 - b.capacityA7W35;
      }
      
      if (scoreA.isAcceptable && !scoreB.isAcceptable) return -1;
      if (!scoreA.isAcceptable && scoreB.isAcceptable) return 1;

      return scoreA.mismatch - scoreB.mismatch;
    });

    const bestModel = sortedDb[0];

    if (!selectedModel) {
      // Auto-select initial best fit model
      setSelectedModel(bestModel);
    } else {
      // If the currently selected model has become under/oversized for the current bivalent point
      const currentScore = getMatchScore(selectedModel);
      
      if (!currentScore.isAcceptable) {
        setSelectedModel(bestModel);
      }
    }
  }, [calcResults.heatLossKw.total, selectedEmitter, bivalentTempManual, buildingData.designTemp, HEAT_PUMP_DATABASE]);

  // Handle selected HP and automatic hydraulic emitter updates
  const handleSelectModel = useCallback((model: HeatPumpModel, emitterType: 'floor' | 'radiator') => {
    setSelectedModel(model);
    setSelectedEmitter(emitterType);
    
    // update secondary loop in hydraulic settings automatically
    setHydraulicState(prev => ({
      ...prev,
      secondaryLoops: emitterType === 'radiator' ? 'radiators' : 'floor'
    }));
  }, []);

  const handleEmitterChange = (emitter: 'floor' | 'radiator') => {
    setSelectedEmitter(emitter);
    setHydraulicState(prev => ({
      ...prev,
      secondaryLoops: emitter === 'radiator' ? 'radiators' : 'floor'
    }));
  };

  const flowTempForEmitters: Record<string, number> = {
    floor: 35,
    radiator: 55
  };

  const t = getThemeClasses(isDark);
  return (
    <div className={`min-h-screen flex flex-col antialiased font-sans text-[11px] transition-all duration-300 ${t.background} ${t.textPrimary}`}>
      {/* 💻 macOS Style Unified Premium Title & Tab Bar */}
      <header className={`h-12 flex items-center justify-between px-2 sm:px-4 shrink-0 border-b sticky top-0 z-40 select-none shadow-sm ${t.card}`}>
        
        {/* Left Section: Compact spacer */}
        <div className="flex items-center gap-1 w-2 sm:w-12">
        </div>

        {/* Middle Section: macOS Segmented Control Tab Chooser */}
        <div className="flex items-center justify-center flex-grow">
          <div className={`relative p-[2px] rounded-md border flex gap-0.5 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-200 border-slate-300'}`}>
              {['building', 'equipment', 'hydraulics', 'scheme', 'export'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`relative flex-1 flex items-center justify-center text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-3 py-1.5 rounded-[3px] transition-colors cursor-pointer whitespace-nowrap min-w-0 ${
                    activeTab === tab
                      ? isDark ? 'text-slate-100' : 'text-slate-900'
                      : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800')
                  }`}
                >
                  {activeTab === tab && (
                    <motion.div
                      layoutId="activeTab"
                      transition={{ type: 'spring', stiffness: 400, damping: 33 }}
                      className={`absolute inset-0 rounded-[2px] shadow-sm ${isDark ? 'bg-slate-850 border border-slate-700/50' : 'bg-white'}`}
                    />
                  )}
                  <span className="relative z-10 capitalize">
                    {tab === 'building' ? 'Épület' : tab === 'equipment' ? 'Gép' : tab === 'hydraulics' ? 'Hidraulika' : tab === 'scheme' ? 'Séma' : 'Jkv.'}
                  </span>
                </button>
              ))}
          </div>
        </div>

        {/* Right Section: Price, Settings and Theme Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsOpenPricePanel(true)}
            className={`p-1.5 rounded-md border flex items-center justify-center cursor-pointer transition-all ${isDark ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'}`}
            title="Árak ellenőrzése a webshopokban"
          >
            <RefreshCw className="w-3.5 h-3.5 text-green-500" />
          </button>
          <button
            onClick={() => setIsOpenEngineeringModal(true)}
            className={`p-1.5 rounded-md border flex items-center justify-center cursor-pointer transition-all ${isDark ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'}`}
            title="Mérnöki beállítások és képletek"
          >
            <Settings className="w-3.5 h-3.5 text-blue-500" />
          </button>
          <button
            onClick={() => setIsDark(!isDark)}
            className={`p-1.5 rounded-md border flex items-center justify-center cursor-pointer transition-all ${isDark ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'}`}
          >
            {isDark ? <Moon className="w-3.5 h-3.5 text-blue-400" /> : <Sun className="w-3.5 h-3.5 text-orange-400" />}
          </button>
        </div>
      </header>

      {/* Main Core Container */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* TAB WORKSPACE ROUTING */}
        <main className="flex-grow p-3 space-y-3 overflow-y-auto max-w-[1400px] w-full mx-auto">
          <div className="animate-fadeIn">
            {activeTab === 'building' && (
              <div className="space-y-4">
                {/* Section 1: Ház Hőtechnikai Adatok (Sizing Input) - full width */}
                <div className="w-full">
                  <BuildingDataInput data={buildingData} onChange={setBuildingData} theme={theme} />
                </div>
                
                <div className={`flex justify-end p-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                  <button
                    onClick={() => { setActiveTab('equipment'); }}
                    className={`font-semibold text-[11px] px-6 py-2 rounded-sm shadow-sm flex items-center gap-2 cursor-pointer transition-all ${
                      isDark ? 'bg-slate-100 text-slate-900 hover:bg-white' : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    Tovább a Hőszivattyú Kiválasztáshoz
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'equipment' && (
              <div className="space-y-4">
                {/* Section 2: Hőszivattyú Kiválasztás és Bivalencia (Sizing Results & HP list) - full width */}
                <div className="w-full">
                  <SizingResults
                    buildingData={buildingData}
                    onChangeBuildingData={setBuildingData}
                    calcResults={calcResults}
                    onSelectModel={handleSelectModel}
                    selectedModel={selectedModel}
                    selectedEmitter={selectedEmitter}
                    onChangeEmitter={handleEmitterChange}
                    tariffHuf={tariffHuf}
                    onChangeTariff={setTariffHuf}
                    bivalentTempManual={bivalentTempManual}
                    onChangeBivalentTemp={setBivalentTempManual}
                    theme={theme}
                  />
                </div>
                
                <div className={`flex justify-end p-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                  <button
                    onClick={() => { setActiveTab('hydraulics'); }}
                    className={`font-semibold text-[11px] px-6 py-2 rounded-sm shadow-sm flex items-center gap-2 cursor-pointer transition-all ${
                      isDark ? 'bg-slate-100 text-slate-900 hover:bg-white' : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    Tovább a Hidraulikai Tervezéshez
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'hydraulics' && (
              <div className="space-y-4">
                <HydraulicExpansionCalc
                  peakLoadKw={calcResults.heatLossKw.total}
                  flowTemp={flowTempForEmitters[selectedEmitter]}
                  onCalculated={setHydraulicResults}
                  hydraulicState={hydraulicState}
                  setHydraulicState={setHydraulicState}
                  heatedArea={buildingData.heatedArea}
                  engineeringParams={engineeringParams}
                  theme={theme}
                />
                
                <div className={`flex justify-end p-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                  <button
                    onClick={() => { setActiveTab('scheme'); }}
                    className={`font-semibold text-[11px] px-6 py-2 rounded-sm shadow-sm flex items-center gap-2 cursor-pointer transition-all ${
                      isDark ? 'bg-slate-100 text-slate-900 hover:bg-white' : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    Tovább a Rendszersémához
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'scheme' && (
              <div className="space-y-4">
                <SystemDiagram
                  title="Rendszerséma"
                  description={`${selectedModel?.name ?? 'Nincs kiválasztott modell'} — ${calcResults.heatLossKw.total.toFixed(1)} kW csúcshőigény`}
                  selectedModel={selectedModel}
                  hydraulicState={hydraulicState}
                  hydraulicResults={hydraulicResults}
                  theme={theme}
                />
                
                <div className={`flex justify-end p-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                  <button
                    onClick={() => { setActiveTab('export'); }}
                    className={`font-semibold text-[11px] px-6 py-2 rounded-sm shadow-sm flex items-center gap-2 cursor-pointer transition-all ${
                      isDark ? 'bg-slate-100 text-slate-900 hover:bg-white' : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    Tovább a Jegyzőkönyv Generáláshoz
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'export' && (
              <ReportExport
                buildingData={buildingData}
                calcResults={calcResults}
                selectedModel={selectedModel}
                selectedEmitter={selectedEmitter}
                hydraulicResults={hydraulicResults}
                hydraulicState={hydraulicState}
                tariffHuf={tariffHuf}
                bivalentTempManual={bivalentTempManual}
              />
            )}
          </div>
        </main>
      </div>

      {/* 🛠️ SLIDEOVER MODAL FOR FORMULAS AND ENGINEERING PARAMETERS */}
      {isOpenPricePanel && (
        <PriceRefreshPanel isDark={isDark} onClose={() => setIsOpenPricePanel(false)} />
      )}

      {isOpenEngineeringModal && (
        <div className="fixed inset-0 z-50 flex justify-end animate-fadeIn">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-pointer" 
            onClick={() => setIsOpenEngineeringModal(false)}
          />
          
          {/* Main Slide Panel */}
          <div className={`relative w-full max-w-2xl h-full shadow-2xl border-l flex flex-col justify-between overflow-hidden animate-slideLeft ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-250 text-slate-800'
          }`}>
            {/* Header */}
            <div className={`px-5 py-4 border-b flex items-center justify-between shrink-0 ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-500" />
                <div>
                  <h3 className="font-extrabold text-sm uppercase tracking-wider leading-none">Mérnöki Képlettár & Egyedi Átírások</h3>
                  <p className="text-[10px] text-slate-400 font-medium mt-1">Magyar szabványos együtthatók és részletes számítási módszerek</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpenEngineeringModal(false)}
                className={`p-1.5 rounded-full border transition-all cursor-pointer ${
                  isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-100 text-slate-500'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-grow p-5 overflow-y-auto space-y-5 text-xs">
              
              {/* Formula Panel 1: Transmission & Ventilation */}
              <div className={`p-4 rounded border ${
                isDark ? 'bg-slate-950/40 border-slate-850' : 'bg-slate-50 border-slate-200'
              }`}>
                <h4 className="font-extrabold text-xs uppercase text-blue-500 tracking-wide mb-2 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 shrink-0" />
                  1. Hőszükséglet Számítási Képletek (MSZ EN 12831)
                </h4>
                <div className="space-y-2 leading-relaxed">
                  <p>
                    A fűtési csúcsteljesítmény hőszükséglete a <strong>Transzmissziós (szerkezeti)</strong> és a <strong>Ventilációs (szellőzési)</strong> veszteségek lineáris összege:
                  </p>
                  <div className={`p-2.5 rounded font-mono text-[11px] text-center shadow-inner ${
                    isDark ? 'bg-slate-950' : 'bg-white border border-slate-200'
                  }`}>
                    Q_total = Q_tr + Q_v [kW]
                  </div>
                  <p className="mt-1 font-semibold text-[10px] text-slate-400 uppercase">A) Transzmissziós veszteség (Q_tr):</p>
                  <p className="text-[10.5px]">
                    Szerkezeti felületek területeinek, U-értékeinek és a tervezési hőmérséklet-különbségnek a szorzata:
                  </p>
                  <div className="pl-3 border-l-2 border-orange-500 font-mono text-[10px] text-slate-400">
                    Q_tr = [Σ (U_szerkezet * A_szerkezet)] * (T_belső - T_külső) / 1000 [kW]
                  </div>

                  <p className="mt-1 font-semibold text-[10px] text-slate-400 uppercase">B) Ventilációs veszteség (Q_v):</p>
                  <p className="text-[10.5px]">
                    A filtrációs légcseréből és friss levegő igényből származó veszteség, melynél beállítható a levegő fajlagos hőkapacitási szorzója:
                  </p>
                  <div className="pl-3 border-l-2 border-emerald-555 font-mono text-[10px] text-slate-400">
                    Q_v = [<strong>{engineeringParams.airHeatCapacityFactor}</strong> * n_légcsere * V_térfogat] * (T_belső - T_külső) / 1000 [kW]
                  </div>
                </div>
              </div>

              {/* Dynamic Override Input Fields for Engineering Mults */}
              <div className="space-y-3">
                <h4 className={`font-black text-[10px] uppercase tracking-widest block border-b pb-1 ${
                  isDark ? 'text-slate-400 border-slate-800' : 'text-slate-500 border-slate-200'
                }`}>
                  Aktív mérnöki paraméterek & Konstansok kézi módosítása
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Parameter 1: Air Specific Heat */}
                  <div className={`p-3 rounded border flex flex-col justify-between ${
                    isDark ? 'bg-slate-950/30 border-slate-850' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 block">Levegő hőkapacitás szorzó</label>
                      <span className="text-[9px] text-slate-500 mt-0.5 block leading-tight">Alapértelmezett: 0.34 W/m³K. Méretezési fűtőlevegő fajhő.</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <input 
                        type="range" 
                        min="0.30" 
                        max="0.40" 
                        step="0.01"
                        value={engineeringParams.airHeatCapacityFactor}
                        onChange={(e) => setEngineeringParams({
                          ...engineeringParams,
                          airHeatCapacityFactor: parseFloat(e.target.value)
                        })}
                        className="flex-grow accent-blue-500 cursor-pointer h-1 bg-slate-800 rounded-lg"
                      />
                      <span className="font-mono font-bold text-xs bg-slate-900 border border-slate-800 text-blue-400 px-1.5 py-0.5 rounded shrink-0">{engineeringParams.airHeatCapacityFactor}</span>
                    </div>
                  </div>

                  {/* Parameter 2: Water Specific Heat */}
                  <div className={`p-3 rounded border flex flex-col justify-between ${
                    isDark ? 'bg-slate-950/30 border-slate-850' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 block">Víz fajlagos hőkapacitás constante</label>
                      <span className="text-[9px] text-slate-500 mt-0.5 block leading-tight">Alap: 1.163 Wh/L·K (Méretezi a fojtási és térfogatáramokat).</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <input 
                        type="range" 
                        min="1.100" 
                        max="1.250" 
                        step="0.005"
                        value={engineeringParams.waterSpecificHeat}
                        onChange={(e) => setEngineeringParams({
                          ...engineeringParams,
                          waterSpecificHeat: parseFloat(e.target.value)
                        })}
                        className="flex-grow accent-blue-500 cursor-pointer h-1 bg-slate-800 rounded-lg"
                      />
                      <span className="font-mono font-bold text-xs bg-slate-900 border border-slate-800 text-blue-400 px-1.5 py-0.5 rounded shrink-0">{engineeringParams.waterSpecificHeat}</span>
                    </div>
                  </div>

                  {/* Parameter 3: Expansion Vessel Safety Margin */}
                  <div className={`p-3 rounded border flex flex-col justify-between ${
                    isDark ? 'bg-slate-950/30 border-slate-850' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 block">Tágulási biztonsági szorzó</label>
                      <span className="text-[9px] text-slate-500 mt-0.5 block leading-tight">Biztonsági tartalék tényező a tágulási térfogathoz (Standard: 1.10).</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <input 
                        type="range" 
                        min="1.05" 
                        max="1.40" 
                        step="0.01"
                        value={engineeringParams.expansionSafetyFactor}
                        onChange={(e) => setEngineeringParams({
                          ...engineeringParams,
                          expansionSafetyFactor: parseFloat(e.target.value)
                        })}
                        className="flex-grow accent-blue-500 cursor-pointer h-1 bg-slate-800 rounded-lg"
                      />
                      <span className="font-mono font-bold text-xs bg-slate-900 border border-slate-800 text-blue-400 px-1.5 py-0.5 rounded shrink-0">{engineeringParams.expansionSafetyFactor}</span>
                    </div>
                  </div>

                  {/* Parameter 4: PEX Friction Coefficient */}
                  <div className={`p-3 rounded border flex flex-col justify-between ${
                    isDark ? 'bg-slate-950/30 border-slate-850' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 block">5-rétegű cső ellenállás többlet</label>
                      <span className="text-[9px] text-slate-500 mt-0.5 block leading-tight">PEX csövezés belső érdességi dP szorzója (Standard: 1.35).</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <input 
                        type="range" 
                        min="1.00" 
                        max="1.60" 
                        step="0.05"
                        value={engineeringParams.pexFrictionMultiplier}
                        onChange={(e) => setEngineeringParams({
                          ...engineeringParams,
                          pexFrictionMultiplier: parseFloat(e.target.value)
                        })}
                        className="flex-grow accent-blue-500 cursor-pointer h-1 bg-slate-800 rounded-lg"
                      />
                      <span className="font-mono font-bold text-xs bg-slate-900 border border-slate-800 text-blue-400 px-1.5 py-0.5 rounded shrink-0">{engineeringParams.pexFrictionMultiplier}</span>
                    </div>
                  </div>

                  {/* Parameter 5: Specific Volume Index Floor */}
                  <div className={`p-3 rounded border flex flex-col justify-between ${
                    isDark ? 'bg-slate-950/30 border-slate-850' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 block">Padlófűtés fajlagos térfogat</label>
                      <span className="text-[9px] text-slate-500 mt-0.5 block leading-tight">Fűtővíz tartalom kW fűtési csúcsteljesítményenként (Alap: 15 L/kW).</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <input 
                        type="range" 
                        min="8" 
                        max="25" 
                        value={engineeringParams.systemWaterVolumeFloorFactor}
                        onChange={(e) => setEngineeringParams({
                          ...engineeringParams,
                          systemWaterVolumeFloorFactor: parseInt(e.target.value)
                        })}
                        className="flex-grow accent-blue-500 cursor-pointer h-1 bg-slate-800 rounded-lg"
                      />
                      <span className="font-mono font-bold text-xs bg-slate-900 border border-slate-800 text-blue-400 px-1.5 py-0.5 rounded shrink-0">{engineeringParams.systemWaterVolumeFloorFactor} L/kW</span>
                    </div>
                  </div>

                  {/* Parameter 6: Specific Volume Index Radiator */}
                  <div className={`p-3 rounded border flex flex-col justify-between ${
                    isDark ? 'bg-slate-950/30 border-slate-850' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 block">Radiátor fűtés fajlagos térfogat</label>
                      <span className="text-[9px] text-slate-500 mt-0.5 block leading-tight">Fűtővíz tartalom kW fűtési csúcsteljesítményenként (Alap: 12 L/kW).</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <input 
                        type="range" 
                        min="6" 
                        max="20" 
                        value={engineeringParams.systemWaterVolumeRadiatorFactor}
                        onChange={(e) => setEngineeringParams({
                          ...engineeringParams,
                          systemWaterVolumeRadiatorFactor: parseInt(e.target.value)
                        })}
                        className="flex-grow accent-blue-500 cursor-pointer h-1 bg-slate-800 rounded-lg"
                      />
                      <span className="font-mono font-bold text-xs bg-slate-900 border border-slate-800 text-blue-400 px-1.5 py-0.5 rounded shrink-0">{engineeringParams.systemWaterVolumeRadiatorFactor} L/kW</span>
                    </div>
                  </div>

                  {/* Parameter 7: Glycol percentage for Monobloc primary protection */}
                  <div className={`p-3 rounded border flex flex-col justify-between ${
                    isDark ? 'bg-slate-950/30 border-slate-850' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 block">Mono primer fagyálló koncentráció</label>
                      <span className="text-[9px] text-slate-500 mt-0.5 block leading-tight">Propilén-glikol térfogatszázalék a kültéri primer hurokban (Alap: 30%).</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <input 
                        type="range" 
                        min="0" 
                        max="50" 
                        step="5"
                        value={engineeringParams.glycolPercentage}
                        onChange={(e) => setEngineeringParams({
                          ...engineeringParams,
                          glycolPercentage: parseInt(e.target.value)
                        })}
                        className="flex-grow accent-blue-500 cursor-pointer h-1 bg-slate-800 rounded-lg"
                      />
                      <span className="font-mono font-bold text-xs bg-slate-900 border border-slate-800 text-blue-400 px-1.5 py-0.5 rounded shrink-0">{engineeringParams.glycolPercentage} %</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className={`p-4 border-t flex items-center justify-between shrink-0 ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <button
                type="button"
                onClick={() => {
                  setEngineeringParams({
                    airHeatCapacityFactor: 0.34,
                    glycolPercentage: 30,
                    expansionSafetyFactor: 1.10,
                    pexFrictionMultiplier: 1.35,
                    systemWaterVolumeFloorFactor: 15,
                    systemWaterVolumeRadiatorFactor: 12,
                    waterSpecificHeat: 1.163
                  });
                }}
                className={`px-3 py-1.5 rounded text-[10px] font-bold border hover:opacity-80 transition-all cursor-pointer ${
                  isDark ? 'border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300' : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-600'
                }`}
              >
                Gyári Alapértékek Visszaállítása
              </button>
              <button
                type="button"
                onClick={() => setIsOpenEngineeringModal(false)}
                className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-extrabold px-4 py-1.5 rounded shadow cursor-pointer transition-all uppercase"
              >
                Módosítások Alkalmazása ({calcResults.heatLossKw.total} kW)
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
