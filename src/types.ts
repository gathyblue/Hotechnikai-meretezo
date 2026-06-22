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
  method: 'gas' | 'fabric' | 'certificate';
  levels?: number; // épület szintek száma (1, 2, 3...)
  // Gas-based
  gasCalculationSource?: 'm3' | 'annual_huf' | 'monthly_huf';
  gasAnnualHuf?: number;
  gasMonthlyHuf?: number;
  gasAnnualM3: number;
  gasIncludeDhwCorrection?: boolean;
  gasBoilerType?: 'old_atmospheric' | 'new_atmospheric' | 'condensing';
  boilerEfficiency: number; // %
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
  hpCostHuf: number;
  yearlySavingsHuf: number;
  bivalentTemp: number; // °C
  bivalentElectricHeaterKw: number;
  comparison?: {
    gasKw: number;
    fabricKw: number;
    certKw: number;
  };
}

export interface HydraulicInput {
  pipeMaterial: 'copper' | 'pex' | 'steel';
  deltaT: number; // °C
  staticHeight: number; // m (static water head)
  safetyValvePressure: number; // bar, typically 3
  additionalWaterVolumeL: number; // L (optional buffer tank, etc.)
  secondaryLoops: 'radiators' | 'floor' | 'fan_coil' | 'mixed';
  includeHeatExchanger: boolean; // heat exchanger selection checkbox
  includeDhwTank: boolean;       // indirect DHW (HMV always primary)
  manualPipeSizeOverride?: string; // "Auto" or chosen pipe size
  primaryPipeSize?: string;       // separate primary diameter
  secondaryPipeSize?: string;     // separate secondary diameter
  secondaryPumpOverride?: string; // custom manual secondary pump selection
  targetVelocityMs?: number;      // design target flow velocity m/s (default 0.6)
  pipeLengthEstimate?: number;    // estimated total pipe length in meters (5-50)
  fittingsCount?: number;         // number of fittings/elbows in circuit
}

export interface EngineeringParams {
  airHeatCapacityFactor: number; // default 0.34 W/m3K
  glycolPercentage: number;      // default 30% for monobloc
  expansionSafetyFactor: number; // default 1.10 safety margin
  pexFrictionMultiplier: number; // default 1.35 resistance
  systemWaterVolumeFloorFactor: number; // L/kW
  systemWaterVolumeRadiatorFactor: number; // L/kW
  waterSpecificHeat: number;     // Wh/L.K, default 1.163
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
}
