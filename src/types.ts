export interface StructureItem {
  name: string;
  area: number; // m2
  uValue: number; // W/m2K
  insulationThickness: number; // cm
  baseUValue: number; // U-value without insulation
}

export interface BuildingData {
  ownerName: string;
  address: string;
  location: string;
  designTemp: number; // °C, e.g. -15 or -13
  heatedArea: number; // m2
  ceilingHeight: number; // m
  indoorTemp: number; // °C, usually 20 or 22
  method: 'consumption' | 'fabric' | 'certificate';
  levels?: number; // épület szintek száma (1, 2, 3...)
  // Gas-based
  gasCalculationSource?: 'm3' | 'annual_huf' | 'monthly_huf';
  gasAnnualHuf?: number;
  gasMonthlyHuf?: number;
  gasAnnualM3: number;
  gasEnabled?: boolean;
  gasIncludeDhwCorrection?: boolean;
  gasBoilerType?: 'old_atmospheric' | 'new_atmospheric' | 'condensing';
  boilerEfficiency: number; // %
  // Wood-based
  woodEnabled?: boolean;
  woodCubicMeters?: number; // erdei m³/év
  woodPricePerM3?: number; // Ft/erdei m³, default 38000
  woodEnergyKwhPerM3?: number; // kWh/erdei m³, default 3000
  woodEfficiency?: number; // %, default 70
  // Electric boiler
  electricBoilerEnabled?: boolean;
  electricBoilerKwh?: number; // kWh/év
  // Certificate-based
  certHeatDemandKw: number;
  certSpecificLossQ: number; // W/m3K
  // Structure-based
  walls: StructureItem;
  roof: StructureItem;
  floor: StructureItem;
  windows: StructureItem;
  ventilationRate: number; // air changes per hour (n)
  // Manual override option
  manualOverrideKw?: number;
  useManualOverride?: boolean;
  surveyDate?: string;
  constructionYearGroup?: string; // pl: '<1980', '1980-1990', '1991-2001', '2002-2015', '2016-2020', '2021-'
  dhwPersons?: number; // legacy persons count
  includeDhwPackage?: boolean; // selectable DHW (HMV) package around 1,000,000 HUF
  dhwVolume?: 200 | 300; // DHW tank size (200L or 300L)
  useSubsidy?: boolean; // selectable subsidy
  subsidyValue?: number; // customizable subsidy value
  mechanicalInstallCost?: number; // customizable/selectable mechanical installation cost (2M, 2.5rd, 3M)
  productDiscountPct?: number; // Device discount inside SizingResults
}

export interface HeatPumpModel {
  id: string;
  name: string;
  manufacturer: 'Fisher' | 'Panasonic' | 'Midea';
  refrigerant: 'R290';
  capacityA7W35: number; // kW
  copA7W35: number;
  capacityA7W55: number; // kW
  capacityAm7W35: number; // kW
  copAm7W35: number;
  capacityAm7W55: number; // kW
  copAm7W55: number;
  capacityAm15W35: number; // kW at -15°C W35
  copAm15W35: number;       // COP at -15°C W35
  capacityAm15W55: number; // kW at -15°C W55
  copAm15W55: number;       // COP at -15°C W55
  scopW35: number;
  scopW55: number;
  soundDba: number; // Sound power level db(A)
  soundPressureDba1m: number; // Sound pressure level at 1m db(A)
  soundPressureDba5m: number; // Sound pressure level at 5m db(A)
  voltage: '230V' | '400V';
  phases: 1 | 3;
  weightKg: number;
  dimensions?: string; // Kültéri egység méretei pl: "1100×445×850 mm"
  estimatedPriceHuf: number;
  eurPriceNetto?: number; // Nettó EUR listaár (Panasonic)
  lastPriceUpdate?: string; // ISO dátum, pl "2026-01-26"
  maxFlowTemp: number; // °C
  ampereRequired: string; // e.g. "1x16A" or "3x16A"
  pumpResidualHeadKpa: number; // Maradék szivattyúnyomás kPa
}

export interface CalculationResults {
  heatLossKw: {
    transmission: number;
    ventilation: number;
    total: number;
  };
  yearlyEnergyKwh: number;
  gasCostHuf: number;
  gasSubsidizedM3: number;
  gasMarketM3: number;
  gasSubsidizedCost: number;
  gasMarketCost: number;
  woodCostHuf: number; // Fatüzelés éves költsége
  electricBoilerCostHuf: number; // Elektromos kazán éves költsége
  totalHeatingCostHuf: number; // gáz + fa + elektromos összesen
  hpCostHuf: number;
  yearlySavingsHuf: number;
  bivalentTemp: number; // °C
  bivalentElectricHeaterKw: number;
  comparison?: {
    consumptionKw: number;
    fabricKw: number;
    certKw: number;
  };
}

export interface SecondaryCircuit {
  id: string;
  type: 'floor' | 'radiators' | 'fan_coil';
  label: string;
  flowTempC: number;
  isMixed: boolean;
  floorCircuits: number;
  longestCircuitM: number;
  radiatorCount: number;
}

export type CouplingType =
  | 'direct'          // Topológia 1: direkt / auto-bypass (HP belső szivattyú + szekunder szivattyú)
  | 'low-loss-header' // Topológia 2: hidraulikus váltó (LLH) + szekunder szivattyú
  | 'buffer-dhw'      // Topológia 3: puffer + HMV 3-járatú váltószelep
  | 'bivalent'        // Topológia 4: biválens (HP + gázkazán/elektromos betét) LLH-n át
  | 'heat-exchanger'; // (megtartott) lemezes hőcserélős leválasztás — tiszta víz, glikol nélkül

/** Régi kapcsolási módok átképzése az új topológiákra (4-port-buffer→buffer-dhw, buffer-or-hydro→low-loss-header). */
export function normalizeCouplingType(t: string | undefined | null): CouplingType {
  switch (t) {
    case 'direct':
    case 'low-loss-header':
    case 'buffer-dhw':
    case 'bivalent':
    case 'heat-exchanger':
      return t;
    case '4-port-buffer':
      return 'buffer-dhw';
    case 'buffer-or-hydro':
      return 'low-loss-header';
    default:
      return 'buffer-dhw';
  }
}

export interface HydraulicInput {
  pipeMaterial: 'copper' | 'pex' | 'steel';
  primaryDeltaT: number; // °C
  staticHeight: number; // m (static water head)
  safetyValvePressure: number; // bar, typically 3
  additionalWaterVolumeL: number; // L (optional buffer tank, etc.)
  secondaryCircuits: SecondaryCircuit[];
  includeHeatExchanger: boolean; // heat exchanger selection
  includeDhwTank: boolean; // indirect DHW
  couplingType: CouplingType;
  bufferVolumeL: number; // 60 | 100 | 200
  secondaryPipeMaterial?: 'copper' | 'pex' | 'steel';
  manualPipeSizeOverride?: string; // "Auto" or chosen pipe size
  primaryPipeSize?: string;       // separate primary diameter
  secondaryPipeSize?: string;     // separate secondary diameter
  secondaryPumpOverride?: string; // custom manual secondary pump selection
  targetVelocityMs?: number;      // design target flow velocity m/s (default 0.6)
  pipeLengthEstimate?: number;    // estimated total pipe length in meters (5-50)
  fittingsCount?: number;         // number of fittings/elbows in circuit
  // Topológia 4 (biválens) beállítások
  bivalentSource?: 'gas-boiler' | 'electric-element'; // gázkazán vagy elektromos betét
  bivalentBoilerPowerKw?: number;  // kazán/betét névleges teljesítmény (kW)
  bivalentFlowTempC?: number;      // biválens előremenő hőmérséklet (°C), alap 55
}

export interface EngineeringParams {
  airHeatCapacityFactor: number; // default 0.34 W/m3K
  glycolPercentage: number;      // default 30% for monobloc
  expansionSafetyFactor: number; // default 1.10 safety margin
  pexFrictionMultiplier: number; // default 1.35 resistance
  systemWaterVolumeFloorFactor: number; // L/kW
  systemWaterVolumeRadiatorFactor: number; // L/kW
  waterSpecificHeat: number;     // Wh/L.K, default 1.163
  kwPerFloorLoop: number;        // kW per floor heating loop (default 1.2)
  kwPerRadiator: number;         // kW per radiator (default 1.0)
}

export interface CircuitHydraulicResult {
  circuitId: string;
  label: string;
  type: 'floor' | 'radiators' | 'fan_coil';
  loadKw: number;
  deltaT: number;
  flowTempC: number;
  returnTempC: number;
  flowRateLh: number;
  flowRateLmin: number;
  pipeSize: string;
  velocityMs: number;
  pressureDropKpa: number;
  remainingHeadKpa: number;
  pumpModel: string;
  pumpSetting: string;
  pumpStage: string;
}

export interface HydraulicResults {
  flowRateLh: number; // L/h
  flowRateLmin: number; // L/min
  estimatedVelocityMs: number;
  primaryEstimatedVelocityMs?: number;   // primary-side flow velocity ms
  secondaryEstimatedVelocityMs?: number; // secondary-side flow velocity ms
  recommendedPipeSize: string; // e.g. "DN25" or "Copper 28mm" (primary)
  recommendedSecondaryPipeSize?: string; // secondary pipe recommendations
  vesselSizeL: number; // L
  vesselPrechargeBar: number; // bar
  vesselFinalBar: number; // bar
  primaryVesselSizeL: number; // primary-side vessel (Monobloc)
  secondaryVesselSizeL: number; // secondary-side fűtési loop vessel
  heatExchangerAreaM2: number;
  heatExchangerWaterFlowLh: number;
  recommendedExchangerModel: string; // e.g. "Hextrend HE100-24"
  primaryFlowRateLh: number;
  secondaryFlowRateLh: number;
  primaryPressureDropKpa: number;
  secondaryPressureDropKpa: number;
  remainingPumpHeadKpa: number;  // remaining delivery pressure after primary loss
  secondaryRemainingHeadKpa: number;
  dabPumpModel: string;           // DAB pump model recommended
  dabPumpSetting?: string;        // DAB pump suggested setting
  dabPumpStage?: string;          // DAB pump suggested stage
  recommendedBufferL?: number;    // Recommended buffer tank volume
  isBufferAdequate?: boolean;     // Whether additional volume >= recommended
  // NEW FIELDS for mass flow, glycol, precharge calc
  primaryMassFlowKgh: number;     // kg/h primary
  secondaryMassFlowKgh: number;   // kg/h secondary
  glycolDensityKgm3: number;      // kg/m3 at current glycol%
  glycolSpecificHeatWhKgK: number; // Wh/kgK at current glycol%
  glycolPercentageUsed: number;
  systemVolumeL: number;          // total estimated system volume
  prechargeCalculated: number;    // precharge from static height
  finalCalculated: number;        // final pressure from safety valve
  primaryPipeLossKpa: number;     // pipe-only pressure drop (excl HX)
  secondaryPipeLossKpa: number;   // pipe-only pressure drop (excl HX)
  primaryFlowTempC: number;      // primary flow temperature
  primaryReturnTempC: number;    // primary return temperature
  secondaryFlowTempC: number;    // secondary flow temperature
  secondaryReturnTempC: number;  // secondary return temperature
  circuitResults: CircuitHydraulicResult[]; // per-circuit hydraulic results
  // ÚJ — hidraulikai modul 4 topológia (2026-08)
  validationWarnings: string[];  // validációs figyelmeztetések (LLH, 3WV, direkt, biválens)
  secondaryPumpModel?: string;   // szekunder keringtető (váltó/puffer UTÁN) — minden topológiában
  secondaryPumpSetting?: string;
  secondaryPumpStage?: string;
  llhFlowRateLh?: number;        // hidraulikus váltó referencia térfogatárama (szekunder igény)
  llhRecommendedDiam?: string;   // LLH ajánlott csőméret (pl. "DN40")
  bivalent?: {
    source: 'gas-boiler' | 'electric-element' | 'none';
    boilerPowerKw: number;       // kazán/betét teljesítmény (kW) — biválens deficit alapján
    boilerFlowRateLh: number;    // kazán ági térfogatáram (L/h)
    mixingRatio: number;         // 0..1 — kazán által fedett arány a közös LLH-n
    flowTempC: number;           // biválens előremenő hőmérséklet
    coveragePct: number;         // biválens forrás által fedett csúcsterhelés % a méretezési ponton
  };
}
