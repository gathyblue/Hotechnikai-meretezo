import { BuildingData, CalculationResults, HeatPumpModel, HydraulicInput, HydraulicResults, EngineeringParams, CircuitHydraulicResult, normalizeCouplingType } from '../types';

/**
 * Calculates building structures' U-values with insulation
 * U_new = 1 / ( (1/U_base) + (thickness_cm / 100) / lambda )
 */
export function calculateUValue(baseU: number, insulationThicknessCm: number, lambda: number = 0.038): number {
  if (insulationThicknessCm <= 0) return baseU;
  const baseR = 1.0 / baseU;
  const insulationR = (insulationThicknessCm / 100) / lambda;
  return 1.0 / (baseR + insulationR);
}

/**
 * Standard utility Hungarian gas cost calculator
 * Residential discount up to 1729 m3/year: 101.5 HUF/m3.
 * Over quota: 747.0 HUF/m3.
 */
export function getGasBreakdown(m3: number): {
  total: number;
  subsidizedM3: number;
  marketM3: number;
  subsidizedCost: number;
  marketCost: number;
} {
  if (m3 <= 0) {
    return { total: 0, subsidizedM3: 0, marketM3: 0, subsidizedCost: 0, marketCost: 0 };
  }
  if (m3 <= 1729) {
    return {
      total: m3 * 101.5,
      subsidizedM3: m3,
      marketM3: 0,
      subsidizedCost: m3 * 101.5,
      marketCost: 0,
    };
  }
  const subsidizedM3 = 1729;
  const marketM3 = m3 - 1729;
  const subsidizedCost = subsidizedM3 * 101.5;
  const marketCost = marketM3 * 747;
  return {
    total: subsidizedCost + marketCost,
    subsidizedM3,
    marketM3,
    subsidizedCost,
    marketCost,
  };
}

export function calculateGasHufCost(m3: number): number {
  return getGasBreakdown(m3).total;
}

/**
 * Reverse calculation: Hungarian gas consumption in m3 based on Annual Cost (HUF)
 */
export function calculateGasM3FromHuf(huf: number): number {
  if (huf <= 0) return 0;
  const discountedLimitHuf = 1729 * 101.5; // ~175,493.5 HUF
  if (huf <= discountedLimitHuf) {
    return huf / 101.5;
  } else {
    const overHuf = huf - discountedLimitHuf;
    return 1729 + (overHuf / 747.0);
  }
}

export function getWoodCost(m3: number, pricePerM3: number): number {
  if (m3 <= 0 || pricePerM3 <= 0) return 0;
  return m3 * pricePerM3;
}

export function getWoodThermalKwh(m3: number, kwhPerM3: number, efficiency: number): number {
  if (m3 <= 0 || kwhPerM3 <= 0) return 0;
  return m3 * kwhPerM3 * (efficiency / 100);
}

export function getElectricBoilerCost(kwh: number, tariffHuf: number = 70): number {
  if (kwh <= 0) return 0;
  return kwh * tariffHuf;
}

export function getHeatingGasM3(data: BuildingData): number {
  if (data.gasEnabled === false) return 0;
  let activeM3 = data.gasAnnualM3;
  if (data.method === 'consumption' && data.gasIncludeDhwCorrection && activeM3 > 0) {
     if (activeM3 < 1700) {
       activeM3 = activeM3 * 0.70; // 30% DHW
     } else if (activeM3 <= 3000) {
       activeM3 = activeM3 * 0.80; // 20% DHW
     } else {
       activeM3 = activeM3 * 0.90; // 10% DHW
     }
  }
  return activeM3;
}

/**
 * Main heat loss assessment engine with concurrent execution of all 3 methods for side-by-side comparison
 */
export function performHeatLossCalculation(data: BuildingData, params?: EngineeringParams): CalculationResults {
  const tempDifference = data.indoorTemp - data.designTemp; // e.g. 22 - (-15) = 37 °C
  const volume = data.heatedArea * data.ceilingHeight;
  const airCap = params ? params.airHeatCapacityFactor : 0.34;

  const heatingGasM3 = getHeatingGasM3(data);

  // 1. Gas-based baseline peak load (constant calculation)
  const gasEnergyKwh = heatingGasM3 * 9.44 * (data.boilerEfficiency / 100);
  const calculatedGasKw = gasEnergyKwh / 2000;

  // 2. Fabric-based baseline detailed peak load
  const netWallArea = Math.max(0, data.walls.area - data.windows.area);
  const wallU = calculateUValue(data.walls.baseUValue, data.walls.insulationThickness, 0.038);
  const wallLoss = wallU * netWallArea * tempDifference;

  const roofU = calculateUValue(data.roof.baseUValue, data.roof.insulationThickness, 0.040);
  const roofLoss = roofU * data.roof.area * tempDifference;

  const floorU = calculateUValue(data.floor.baseUValue, data.floor.insulationThickness, 0.035);
  const floorLoss = floorU * data.floor.area * tempDifference;

  const windowLoss = data.windows.uValue * data.windows.area * tempDifference;

  const calculatedFabricTransmissionKw = (wallLoss + roofLoss + floorLoss + windowLoss) / 1000;
  const calculatedFabricVentilationKw = (airCap * data.ventilationRate * volume * tempDifference) / 1000;
  const calculatedFabricKw = calculatedFabricTransmissionKw + calculatedFabricVentilationKw;

  // 3. Certificate-based peak load
  let calculatedCertKw = 0;
  if (data.certHeatDemandKw > 0) {
    calculatedCertKw = data.certHeatDemandKw;
  } else {
    calculatedCertKw = (data.certSpecificLossQ * volume * tempDifference) / 1000;
  }

  // Wood & electric boiler contributions
  const woodKwh = getWoodThermalKwh(
    data.woodEnabled ? (data.woodCubicMeters || 0) : 0,
    data.woodEnergyKwhPerM3 || 3000,
    data.woodEfficiency || 70
  );
  const electricBoilerKwh = data.electricBoilerEnabled ? (data.electricBoilerKwh || 0) : 0;

  // Total yearly energy from all consumption sources
  const totalConsumptionKwh = gasEnergyKwh + woodKwh + electricBoilerKwh;

  // Active method selection
  let selectedMethodKw = calculatedFabricKw;
  if (data.method === 'consumption' && totalConsumptionKwh > 0) {
    selectedMethodKw = totalConsumptionKwh / 2000;
  } else if (data.method === 'certificate') {
    selectedMethodKw = calculatedCertKw;
  }

  let peakLoadKw = selectedMethodKw;
  let transmissionKw = calculatedFabricTransmissionKw;
  let ventilationKw = calculatedFabricVentilationKw;

  if (data.method !== 'fabric') {
    ventilationKw = selectedMethodKw * 0.15;
    transmissionKw = selectedMethodKw * 0.85;
  }

  // Support manual override
  if (data.useManualOverride && data.manualOverrideKw !== undefined) {
    peakLoadKw = data.manualOverrideKw;
    ventilationKw = peakLoadKw * 0.15;
    transmissionKw = peakLoadKw * 0.85;
  }

  // Clamp absolute lower boundary
  if (peakLoadKw < 1) peakLoadKw = 1;

  // Yearly heating energy demand (kWh/year)
  let yearlyEnergyKwh = 0;
  if (data.method === 'consumption' && totalConsumptionKwh > 0) {
    yearlyEnergyKwh = totalConsumptionKwh;
  } else {
    yearlyEnergyKwh = peakLoadKw * 1900;
  }

  // Gas-only cost breakdown
  const gasM3ForCost = data.gasEnabled !== false && data.gasAnnualM3 > 0 ? data.gasAnnualM3 : 0;
  const gasBreakdown = getGasBreakdown(gasM3ForCost);

  // Wood cost
  const woodCost = getWoodCost(
    data.woodEnabled ? (data.woodCubicMeters || 0) : 0,
    data.woodPricePerM3 || 38000
  );

  // Electric boiler cost
  const electricCost = getElectricBoilerCost(
    data.electricBoilerEnabled ? (data.electricBoilerKwh || 0) : 0,
    70
  );

  // Total heating cost
  const totalCost = Math.round(gasBreakdown.total) + woodCost + electricCost;

  return {
    heatLossKw: {
      transmission: Number(transmissionKw.toFixed(2)),
      ventilation: Number(ventilationKw.toFixed(2)),
      total: Number(peakLoadKw.toFixed(2)),
    },
    yearlyEnergyKwh: Math.round(yearlyEnergyKwh),
    gasCostHuf: Math.round(gasBreakdown.total),
    gasSubsidizedM3: gasBreakdown.subsidizedM3,
    gasMarketM3: gasBreakdown.marketM3,
    gasSubsidizedCost: Math.round(gasBreakdown.subsidizedCost),
    gasMarketCost: Math.round(gasBreakdown.marketCost),
    woodCostHuf: Math.round(woodCost),
    electricBoilerCostHuf: Math.round(electricCost),
    totalHeatingCostHuf: totalCost,
    hpCostHuf: 0, 
    yearlySavingsHuf: 0, 
    bivalentTemp: -5, 
    bivalentElectricHeaterKw: 0,
    comparison: {
      consumptionKw: Number(Math.max(1, data.method === 'consumption' ? peakLoadKw : calculatedGasKw).toFixed(2)),
      fabricKw: Number(Math.max(1, calculatedFabricKw).toFixed(2)),
      certKw: Number(Math.max(1, calculatedCertKw).toFixed(2)),
    }
  };
}

/**
 * Interpolates the heat pump output capacity at a given outdoor temperature
 */
export function getHpCapacityAtTemp(
  hp: HeatPumpModel,
  emitterType: 'floor' | 'radiator',
  temp: number
): number {
  let capMin15 = hp.capacityAm15W35;
  let capMin7 = hp.capacityAm7W35;
  let capPlus7 = hp.capacityA7W35;

  if (emitterType === 'radiator') {
    capMin15 = hp.capacityAm15W55;
    capMin7 = hp.capacityAm7W55;
    capPlus7 = hp.capacityA7W55;
  }

  if (temp <= -15) return capMin15;
  if (temp >= 7) return capPlus7;

  if (temp <= -7) {
    const ratio = (temp - (-15)) / (-7 - (-15)); // 0 to 1
    return capMin15 + ratio * (capMin7 - capMin15);
  } else {
    const ratio = (temp - (-7)) / (7 - (-7)); // 0 to 1
    return capMin7 + ratio * (capPlus7 - capMin7);
  }
}

/**
 * Calculates building required heat load demand at a given outdoor temperature
 */
export function getBuildingHeatDemandAtTemp(
  peakLoadKw: number,
  designTemp: number,
  temp: number
): number {
  if (temp >= 15) return 0;
  if (temp <= designTemp) return peakLoadKw;
  const ratio = (15 - temp) / (15 - designTemp);
  return peakLoadKw * ratio;
}

/**
 * Calculates continuous heating energy coverage percentage based on bivalence temperature.
 * Custom piecewise interpolation corresponding to typical Hungarian climate hour frequencies.
 */
/**
 * Calculates continuous heating energy coverage percentage based on bivalence temperature.
 * Custom piecewise interpolation corresponding to typical Hungarian climate hour frequencies, scaled in respect to designTemp.
 */
export function calculateBivalentCoverage(bivalentTemp: number, designTemp: number = -15): number {
  if (bivalentTemp <= designTemp) return 100.0;
  if (bivalentTemp >= 15) return 0.0;

  const refPoints = [
    { temp: -15, pct: 100.0 },
    { temp: -10, pct: 99.8 },
    { temp: -5, pct: 99.4 },
    { temp: 0, pct: 97.0 },
    { temp: 5, pct: 87.0 },
    { temp: 10, pct: 55.0 },
    { temp: 15, pct: 0.0 }
  ];

  // Adjust point array dynamically based on designTemp:
  // Points at or colder than designTemp are coerced to 100% and deduplicated.
  let activePoints = refPoints.map(p => {
    if (p.temp <= designTemp) {
      return { temp: designTemp, pct: 100.0 };
    }
    return p;
  }).filter((p, idx, self) => idx === self.findIndex((t) => t.temp === p.temp));

  activePoints.sort((a, b) => a.temp - b.temp);

  for (let i = 0; i < activePoints.length - 1; i++) {
    const p1 = activePoints[i];
    const p2 = activePoints[i + 1];
    if (bivalentTemp >= p1.temp && bivalentTemp <= p2.temp) {
      const ratio = (bivalentTemp - p1.temp) / (p2.temp - p1.temp);
      const val = p1.pct + ratio * (p2.pct - p1.pct);
      return Math.min(100.0, Math.max(0.0, Number(val.toFixed(2))));
    }
  }
  return 100.0;
}

/**
 * Estimate the number of hours per year when outdoor temperature drops below
 * the given bivalent threshold. Uses a Normal approximation fitted to
 * Hungarian TMY heating-season data (mean 3.6°C, σ 5.03°C, season 4392 h).
 */
export function estimateBackupHours(bivalentTemp: number): number {
  if (bivalentTemp <= -15) return 0;
  if (bivalentTemp >= 15) return 4392;
  const mean = 3.6;
  const stdDev = 5.03;
  const z = (bivalentTemp - mean) / stdDev;
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * x);
  const er = 1 - (((((1.061405429 * t + -1.453152027) * t) + 1.421413741) * t + -0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  const cdf = 0.5 * (1 + sign * er);
  return Math.round(4392 * cdf);
}

const NORM_STDDEV = 5.03;
const NORM_MEAN = 3.6;
const SEASON_HOURS = 4392;

function normalPdf(x: number, mean: number, stdDev: number): number {
  const z = (x - mean) / stdDev;
  return Math.exp(-0.5 * z * z) / (stdDev * Math.sqrt(2 * Math.PI));
}

/**
 * Numerically integrate the area between the building heat-demand curve and
 * the heat-pump capacity curve, weighted by the outdoor-temperature
 * distribution, to obtain the annual thermal energy split.
 *
 * Returns the total thermal kWh delivered by the HP, the total thermal kWh
 * required from backup, the number of hours with non-zero backup, and the
 * total annual heat demand (all thermal, before COP).
 */
export function estimateAnnualEnergySplit(
  peakLoadKw: number,
  designTemp: number,
  bivalentTemp: number,
  hp: HeatPumpModel,
  emitterType: 'floor' | 'radiator',
): {
  hpThermalKwh: number;
  backupThermalKwh: number;
  backupHours: number;
  totalDemandKwh: number;
} {
  const step = 0.5;
  let hpThermalKwh = 0;
  let backupThermalKwh = 0;
  let backupHours = 0;
  let totalDemandKwh = 0;

  for (let t = designTemp; t <= 15; t += step) {
    const pdf = normalPdf(t + step / 2, NORM_MEAN, NORM_STDDEV);
    const hoursAtT = pdf * step * SEASON_HOURS;

    const demand = getBuildingHeatDemandAtTemp(peakLoadKw, designTemp, t);
    const hpCap = getHpCapacityAtTemp(hp, emitterType, t);
    const deficit = Math.max(0, demand - hpCap);

    hpThermalKwh += Math.min(demand, hpCap) * hoursAtT;
    backupThermalKwh += deficit * hoursAtT;
    totalDemandKwh += demand * hoursAtT;

    if (deficit > 0.01) {
      backupHours += hoursAtT;
    }
  }

  return {
    hpThermalKwh: Math.round(hpThermalKwh),
    backupThermalKwh: Math.round(backupThermalKwh),
    backupHours: Math.round(backupHours),
    totalDemandKwh: Math.round(totalDemandKwh),
  };
}

/**
 * Heat pump operational sizing, bivalency, and financial indicators
 */
export function evaluateHeatPumpEconomics(
  peakLoadKw: number,
  yearlyEnergyKwh: number,
  heatingCostHuf: number,
  hp: HeatPumpModel,
  emitterType: 'floor' | 'radiator',
  electricityTariffHuf: number = 23,
  bivalentTempManual: number = -5,
  designTemp: number = -15
): {
  hpCostHuf: number;
  yearlySavingsHuf: number;
  copUsed: number;
  bivalencyTemp: number;
  bivalencyHeaterKw: number;
  electricityKwh: number;
} {
  // Determine SCOP for emitter
  let copUsed = emitterType === 'radiator' ? hp.scopW55 : hp.scopW35;

  // Numerical integration for accurate HP/backup energy split
  const split = estimateAnnualEnergySplit(
    peakLoadKw, designTemp, bivalentTempManual, hp, emitterType
  );

  // 1) Heat Pump thermal energy, divided by SCOP → electrical kWh
  const electricityHpKwh = split.hpThermalKwh / copUsed;

  // 2) Backup heating (COP = 1.0, electric resistance)
  const electricityBackupKwh = split.backupThermalKwh / 1.0;

  // Total annual electricity consumption (kWh/year)
  const electricityKwh = electricityHpKwh + electricityBackupKwh;

  // Cost with custom electricity tariff
  const hpCostHuf = electricityKwh * electricityTariffHuf;
  const yearlySavingsHuf = heatingCostHuf - hpCostHuf;

  // Severe winter heating capacity at -15°C
  const capacityAtMin15 = emitterType === 'radiator' ? hp.capacityAm15W55 : hp.capacityAm15W35;

  // Back up heater capacity (deficit at absolute design temp T_design)
  const bivalencyHeaterKw = Math.max(0, peakLoadKw - capacityAtMin15);

  return {
    hpCostHuf: Math.round(hpCostHuf),
    yearlySavingsHuf: Math.round(yearlySavingsHuf),
    copUsed: Number(copUsed.toFixed(2)),
    bivalencyTemp: bivalentTempManual,
    bivalencyHeaterKw: Number(bivalencyHeaterKw.toFixed(1)),
    electricityKwh: Math.round(electricityKwh)
  };
}

/**
 * Glycol properties at given percentage and temperature
 * Returns density (kg/m3), specific heat (Wh/kgK), dynamic viscosity (Pa·s)
 */
function getGlycolProperties(glycolPct: number, tempC: number): {
  density: number;
  specificHeatWhKgK: number;
  viscosityPaS: number;
} {
  if (glycolPct <= 0) {
    return { density: 1000, specificHeatWhKgK: 1.163, viscosityPaS: 0.0010 };
  }
  const p = Math.min(50, Math.max(0, glycolPct)) / 100;

  // Propylene glycol correlations (approximate, valid 0-50%, 0-60°C)
  const density = 1000 - 100 * p + 0.4 * (20 - tempC);
  const specificHeatWhKgK = 1.163 * (1 - 0.35 * p);
  const viscosityPaS = 0.0010 * Math.exp(3.5 * p + 0.02 * (20 - tempC));

  return {
    density: Math.round(density),
    specificHeatWhKgK: Number(specificHeatWhKgK.toFixed(4)),
    viscosityPaS: Number(viscosityPaS.toFixed(6)),
  };
}

/**
 * Hydraulic, Plate Heat Exchanger, and Expansion Vessel sizing
 */
function getPipeInnerDiameter(pipeSize: string, material: 'copper' | 'pex' | 'steel'): number {
  const lower = pipeSize.toLowerCase();
  if (lower.includes('18mm')) return 16;
  if (lower.includes('22mm')) return 20;
  if (lower.includes('28mm')) return 25;
  if (lower.includes('35mm')) return 32;
  if (lower.includes('42mm')) return 39;
  
  if (lower.includes('20mm')) return 16;
  if (lower.includes('26mm')) return 20;
  if (lower.includes('32mm')) return 26;
  if (lower.includes('40mm')) return 32;
  if (lower.includes('50mm')) return 40;
  
  if (lower.includes('dn20')) return 20;
  if (lower.includes('dn25')) return 26;
  if (lower.includes('dn32')) return 32;
  if (lower.includes('dn40')) return 41;
  if (lower.includes('dn50')) return 53;

  // Defaults based on material
  if (material === 'pex') return 20; // PEX 26
  if (material === 'steel') return 26; // Steel DN25
  return 20; // Copper 22
}

function getAutoRecommendedPipeSize(requiredDiameterMm: number, material: 'copper' | 'pex' | 'steel'): string {
  const isPEX = material === 'pex';
  const isSteel = material === 'steel';
  if (requiredDiameterMm <= 14) {
    return isPEX ? 'PEX 20mm' : isSteel ? 'Szénacél 18mm' : 'Rézcső 18mm';
  } else if (requiredDiameterMm <= 22) {
    return isPEX ? 'PEX 26mm' : isSteel ? 'Szénacél 22mm' : 'Rézcső 22mm';
  } else if (requiredDiameterMm <= 32) {
    return isPEX ? 'PEX 32mm' : isSteel ? 'Szénacél 28mm' : 'Rézcső 28mm';
  } else if (requiredDiameterMm <= 40) {
    return isPEX ? 'PEX 40mm' : isSteel ? 'Szénacél 35mm' : 'Rézcső 35mm';
  } else {
    return isPEX ? 'PEX 50mm' : isSteel ? 'Szénacél 35mm' : 'Rézcső 42mm';
  }
}

/**
 * Biválens hidraulika (Topológia 4): kazán/betét teljesítmény, ág-áramok és keverési arány a közös LLH-n.
 * A biválens forrás a méretezési ponton a HP kapacitáshiányát (deficit) fedezi; gázkazánnál a felhasználó
 * nagyobb teljesítményt is megadhat (pl. meglévő kazán megtartása).
 */
export function calculateBivalentHydraulics(
  peakLoadKw: number,
  hpCapacityAtDesignKw: number,
  input: HydraulicInput,
): {
  source: 'gas-boiler' | 'electric-element' | 'none';
  boilerPowerKw: number;
  boilerFlowRateLh: number;
  mixingRatio: number;
  flowTempC: number;
  coveragePct: number;
} {
  const coupling = normalizeCouplingType(input.couplingType);
  if (coupling !== 'bivalent') {
    return { source: 'none', boilerPowerKw: 0, boilerFlowRateLh: 0, mixingRatio: 0, flowTempC: input.bivalentFlowTempC ?? 55, coveragePct: 0 };
  }
  const source = input.bivalentSource ?? 'electric-element';
  const deficitKw = Math.max(0, peakLoadKw - (hpCapacityAtDesignKw || 0));
  const userPower = input.bivalentBoilerPowerKw && input.bivalentBoilerPowerKw > 0 ? input.bivalentBoilerPowerKw : undefined;
  const boilerPowerKw = source === 'gas-boiler'
    ? (userPower ?? Math.max(deficitKw, peakLoadKw * 0.25)) // kazán: felhasználói érték, különben deficit (min. 25% csúcs)
    : Math.max(deficitKw, 0); // elektromos betét: pontosan a deficit
  const flowTempC = input.bivalentFlowTempC ?? 55;
  const deltaT = input.primaryDeltaT || 5;
  const boilerFlowRateLh = boilerPowerKw > 0 ? Math.round((boilerPowerKw / (1.163 * deltaT)) * 1000) : 0;
  const hpFlowRateLh = (peakLoadKw / (1.163 * deltaT)) * 1000;
  const totalFlow = hpFlowRateLh + boilerFlowRateLh;
  const mixingRatio = totalFlow > 0 ? Number((boilerFlowRateLh / totalFlow).toFixed(3)) : 0;
  const coveragePct = peakLoadKw > 0 ? Math.min(100, Number(((boilerPowerKw / peakLoadKw) * 100).toFixed(1))) : 0;
  return {
    source,
    boilerPowerKw: Number(boilerPowerKw.toFixed(1)),
    boilerFlowRateLh,
    mixingRatio,
    flowTempC,
    coveragePct,
  };
}

/**
 * Hydraulic, Plate Heat Exchanger, and Expansion Vessel sizing
 */
export function calculateHydraulicsAndVessel(
  peakLoadKw: number,
  flowTemp: number,
  input: HydraulicInput,
  heatedArea: number,
  params?: EngineeringParams,
  pumpResidualHeadKpa?: number,
  hpCapacityAtDesignKw?: number
): HydraulicResults {
  const primaryDeltaT = input.primaryDeltaT || 5;
  const secondaryCircuits = input.secondaryCircuits || [];
  const pumpHead = pumpResidualHeadKpa ?? 60;
  const coupling = normalizeCouplingType(input.couplingType);

  // --- Glycol properties ---
  // GLIKOL TILTVA (FINAL scope 2026-08): tiszta víz MINDENÜTT (ρ=1000 kg/m³, cp=1.163 Wh/kgK),
  // hőcserélős kapcsolásnál is. A params.glycolPercentage NINCS figyelembe véve.
  // Fagyvédelem más úton: lefúvató szelep (pl. Caleffi iFrost) / leürítés.
  const glycolPct = 0;
  const glycol = getGlycolProperties(glycolPct, flowTemp);
  const specHeatWhLk = params ? params.waterSpecificHeat : 1.163;

  // Tiszta víz mindkét oldalon (glikol tiltva) → a hőcserélős mód is víz-víz
  const effectiveSpecHeat = specHeatWhLk;

  const flowRateM3h = peakLoadKw / (effectiveSpecHeat * primaryDeltaT);
  const flowRateLh = flowRateM3h * 1000;
  const flowRateLmin = flowRateLh / 60;

  // --- Use targetVelocityMs from input ---
  const targetVelocityMs = input.targetVelocityMs ?? 0.6;
  const flowRateM3s = flowRateM3h / 3600;
  const requiredAreaM2 = flowRateM3s / targetVelocityMs;
  const requiredDiameterMm = Math.sqrt((4 * requiredAreaM2) / Math.PI) * 1000;

  // Pipe length estimate (default 10m if not set)
  const pipeLengthM = (input.pipeLengthEstimate ?? 5) * 2; // oda-vissza

  // --- Primary pipe decision ---
  let primaryPipe = input.primaryPipeSize || 'Auto';
  if (primaryPipe === 'Auto') {
    const lengthFactor = Math.pow(Math.max(pipeLengthM, 5) / 10, 0.2);
    primaryPipe = getAutoRecommendedPipeSize(requiredDiameterMm * lengthFactor, input.pipeMaterial);
  }

  // --- Get exact diameters for primary ---
  const primaryInnerDiaMm = getPipeInnerDiameter(primaryPipe, input.pipeMaterial);
  const primaryInnerDiaM = primaryInnerDiaMm / 1000;
  const primaryActualAreaM2 = (Math.PI * Math.pow(primaryInnerDiaM, 2)) / 4;
  const primaryEstimatedVelocityMs = (flowRateM3h / 3600) / primaryActualAreaM2;

  // --- Primary mass flow ---
  const primaryDensity = 1000; // tiszta víz (glikol tiltva)
  const primaryMassFlowKgh = Math.round(flowRateLh * primaryDensity / 1000);

  // --- Distribute peak load among secondary circuits ---
  const kwPerFloorLoop = params?.kwPerFloorLoop ?? 1.2;
  const kwPerRadiator = params?.kwPerRadiator ?? 1.0;

  const circuitWeights = secondaryCircuits.map(c => ({
    id: c.id,
    weight: c.type === 'floor' ? c.floorCircuits * kwPerFloorLoop
          : c.type === 'radiators' ? c.radiatorCount * kwPerRadiator
          : 1,
  }));
  const totalWeight = circuitWeights.reduce((s, w) => s + w.weight, 0);

  const secondaryPipeMaterial = input.secondaryPipeMaterial || input.pipeMaterial;
  const pexFrictionMult = params?.pexFrictionMultiplier ?? 1.35;

  // --- Calculate each circuit's hydraulics ---
  function selectDabPump(type: string, flowLh: number): { pumpModel: string; pumpSetting: string; pumpStage: string } {
    const model = input.secondaryPumpOverride && input.secondaryPumpOverride !== 'Auto'
      ? input.secondaryPumpOverride
      : 'DAB Evosta 2 40-70/180 (A-osztályú, nagyhatékonyságú)';
    if (type === 'floor') {
      const setting = 'Állandó differenciálnyomás (Padlófűtési osztógyűjtőhöz)';
      let stage: string;
      if (flowLh <= 1100) stage = 'CP1 (I. alacsony állandó nyomás)';
      else if (flowLh <= 1900) stage = 'CP2 (II. közepes, javasolt fűtési fokozat)';
      else stage = 'CP3 (III. nagyüzemi padlófűtési kör)';
      return { pumpModel: model, pumpSetting: setting, pumpStage: stage };
    }
    if (type === 'radiators') {
      const setting = 'Arányos differenciálnyomás (Termosztatikus radiátor szelepekhez)';
      let stage: string;
      if (flowLh <= 1100) stage = 'PP1 (I. alacsony arányos nyomás)';
      else if (flowLh <= 1900) stage = 'PP2 (II. közepes, optimális fokozat)';
      else stage = 'PP3 (III. magas arányos nyomás)';
      return { pumpModel: model, pumpSetting: setting, pumpStage: stage };
    }
    return {
      pumpModel: model,
      pumpSetting: 'Állandó fordulatszámú görbe (Constant Speed / III. fokozat)',
      pumpStage: 'III-as fokozat (Maximális vízszállításra állítva)',
    };
  }

  const circuitResults: CircuitHydraulicResult[] = secondaryCircuits.map((c) => {
    const weight = circuitWeights.find(w => w.id === c.id)?.weight ?? 1;
    const circuitLoad = totalWeight > 0 ? (weight / totalWeight) * peakLoadKw : 0;
    const deltaT = c.type === 'floor' ? 5 : c.type === 'radiators' ? 10 : 7;
    const flowTempC = c.type === 'floor' ? 35 : c.type === 'radiators' ? 55 : 45;
    const returnTempC = flowTempC - deltaT;
    const flowLh = circuitLoad > 0 ? Math.round((circuitLoad / (specHeatWhLk * deltaT)) * 1000) : 0;
    const flowM3h = flowLh / 1000;
    const flowLmin = flowLh / 60;

    const pexMult = secondaryPipeMaterial === 'pex' ? pexFrictionMult : 1.0;
    const viscosity = 0.0010;
    const fittings = input.fittingsCount ?? 6;

    // Pipe sizing – floor uses fixed PEX 16x2 loop, radiator uses velocity-based sizing
    let pipeSize: string;
    let innerDiaM: number;
    let actualAreaM2: number;
    let velocityMs: number;
    let pipeLossKpa: number;

    if (c.type === 'floor') {
      const loopLengthM = (c.longestCircuitM || 100) * 2;
      const loopInnerDiaMm = 12; // PEX 16x2 → 12 mm inner diameter
      innerDiaM = loopInnerDiaMm / 1000;
      actualAreaM2 = (Math.PI * Math.pow(innerDiaM, 2)) / 4;
      const flowM3s = flowM3h / 3600;
      velocityMs = actualAreaM2 > 0 ? Number((flowM3s / actualAreaM2).toFixed(2)) : 0;
      pipeSize = 'PEX 16x2 (padlókör)';

      const re = velocityMs > 0 ? 1000 * velocityMs * innerDiaM / viscosity : 0;
      const fFactor = re > 2000 ? 0.3164 / Math.pow(re, 0.25) : 64 / Math.max(re, 1);
      pipeLossKpa = velocityMs > 0
        ? Number((fFactor * (loopLengthM / innerDiaM) * (1000 * velocityMs * velocityMs / 2000) * pexMult).toFixed(1))
        : 0;
    } else {
      const flowM3s = flowM3h / 3600;
      const reqAreaM2 = flowM3s / targetVelocityMs;
      const reqDiaMm = Math.sqrt((4 * reqAreaM2) / Math.PI) * 1000;
      const circuitPipeLen = (input.pipeLengthEstimate ?? 5) * 2;

      pipeSize = getAutoRecommendedPipeSize(reqDiaMm, secondaryPipeMaterial);
      const innerDiaMm = getPipeInnerDiameter(pipeSize, secondaryPipeMaterial);
      innerDiaM = innerDiaMm / 1000;
      actualAreaM2 = (Math.PI * Math.pow(innerDiaM, 2)) / 4;
      velocityMs = actualAreaM2 > 0 ? Number((flowM3s / actualAreaM2).toFixed(2)) : 0;

      const re = velocityMs > 0 ? 1000 * velocityMs * innerDiaM / viscosity : 0;
      const fFactor = re > 2000 ? 0.3164 / Math.pow(re, 0.25) : 64 / Math.max(re, 1);
      pipeLossKpa = velocityMs > 0
        ? Number((fFactor * (circuitPipeLen / innerDiaM) * (1000 * velocityMs * velocityMs / 2000) * pexMult).toFixed(1))
        : 0;
    }

    const localLossKpa = velocityMs > 0 ? Number((fittings * 0.15 * (velocityMs / 0.8)).toFixed(1)) : 0;
    const exchLoss = input.includeHeatExchanger ? 9.8 * (flowM3h / 2.0) : 0;
    const pressureDropKpa = input.includeHeatExchanger
      ? Number((pipeLossKpa + exchLoss + localLossKpa + 2.2).toFixed(1))
      : Number((pipeLossKpa + localLossKpa + 1.2).toFixed(1));

    // Pump
    const pumpResult = selectDabPump(c.type, flowLh);
    const pumpMaxHead = 70;
    const pumpMaxFlow = 4200;
    const flowRatioVal = Math.min(flowLh / pumpMaxFlow, 1);
    const pumpAvailable = pumpMaxHead * (1 - Math.pow(flowRatioVal, 1.5));
    const remainingHead = Number((pumpAvailable - pressureDropKpa).toFixed(1));

    return {
      circuitId: c.id,
      label: c.label,
      type: c.type,
      loadKw: Number(circuitLoad.toFixed(2)),
      deltaT,
      flowTempC,
      returnTempC,
      flowRateLh: flowLh,
      flowRateLmin: Number(flowLmin.toFixed(1)),
      pipeSize,
      velocityMs,
      pressureDropKpa,
      remainingHeadKpa: remainingHead,
      ...pumpResult,
    };
  });

  // --- Aggregate secondary values (for backward compat / vessel sizing) ---
  const secondaryFlowRateLh = circuitResults.reduce((s, r) => s + r.flowRateLh, 0);
  const secondaryFlowM3h = secondaryFlowRateLh / 1000;
  const secondaryDeltaT = circuitResults.length > 0 ? Math.min(...circuitResults.map(r => r.deltaT)) : primaryDeltaT;
  const secondaryFlowTempC = circuitResults.length > 0
    ? input.includeHeatExchanger ? flowTemp - 5 : flowTemp
    : flowTemp;
  const secondaryReturnTempC = secondaryFlowTempC - secondaryDeltaT;

  // Pick a representative circuit for pipe sizing display (largest flow)
  const dominantCircuit = [...circuitResults].sort((a, b) => b.flowRateLh - a.flowRateLh)[0];
  const secondaryPipe = dominantCircuit?.pipeSize ?? '—';
  const secondaryEstimatedVelocityMs = dominantCircuit?.velocityMs;
  const secondaryPipeLossKpa = dominantCircuit?.pressureDropKpa ?? 0;
  const secondaryPressureDropKpa = dominantCircuit?.pressureDropKpa ?? 0;
  const secondaryRemainingHeadKpa = dominantCircuit?.remainingHeadKpa ?? 0;
  const dabPumpModel = dominantCircuit?.pumpModel ?? '';
  const dabPumpSetting = dominantCircuit?.pumpSetting;
  const dabPumpStage = dominantCircuit?.pumpStage;
  const secondaryMassFlowKgh = circuitResults.reduce((s, r) => s + Math.round(r.flowRateLh), 0);

  // --- Expansion Vessel Sizing ---
  let specificVolumeLperKw = 12;
  const floorFactor = params ? params.systemWaterVolumeFloorFactor : 15;
  const radiatorFactor = params ? params.systemWaterVolumeRadiatorFactor : 12;

  if (secondaryCircuits.length > 0) {
    const hasFloor = secondaryCircuits.some(c => c.type === 'floor');
    const hasRadiator = secondaryCircuits.some(c => c.type === 'radiators');
    const hasFanCoil = secondaryCircuits.some(c => c.type === 'fan_coil');
    if (hasFloor && hasRadiator) specificVolumeLperKw = Math.round((floorFactor + radiatorFactor) / 2);
    else if (hasFloor) specificVolumeLperKw = floorFactor;
    else if (hasRadiator) specificVolumeLperKw = radiatorFactor;
    else if (hasFanCoil) specificVolumeLperKw = 8;
  }

  const estimatedSystemVolumeL = (peakLoadKw * specificVolumeLperKw) + Number(input.additionalWaterVolumeL || 0);

  let expansionCoeff = 0.0145;
  if (flowTemp <= 35) expansionCoeff = 0.0063;
  else if (flowTemp <= 45) expansionCoeff = 0.0104;
  else if (flowTemp <= 55) expansionCoeff = 0.0145;
  else if (flowTemp <= 65) expansionCoeff = 0.0198;

  // --- Proper precharge/final pressure ---
  const prechargeBar = Number((input.staticHeight * 0.1 + 0.3).toFixed(1));
  const finalBar = Number((input.safetyValvePressure * 0.9).toFixed(1));
  const pressFactor = finalBar > prechargeBar
    ? (finalBar + 1.0) / (finalBar - prechargeBar)
    : 3.0;

  const standardSizes = [8, 12, 18, 24, 35, 50, 80, 100, 120, 150];

  let roundedVesselSizeL = 18;
  let primaryVesselSizeL = 12;
  let secondaryVesselSizeL = 0;

  const expSafety = params ? params.expansionSafetyFactor : 1.10;

  // Szekunder tágulási tartály: puffer NÉLKÜLI szekunder körnél kell (direkt / LLH / biválens / HX).
  // Pufferes kapcsolásnál (buffer-dhw) a puffer térfogata benne van az estimatedSystemVolumeL-ben.
  const bufferlessSecondary = coupling === 'direct' || coupling === 'low-loss-header' || coupling === 'bivalent';
  const needsSecondaryVessel = input.includeHeatExchanger || (bufferlessSecondary && secondaryCircuits.length > 0);

  if (input.includeHeatExchanger) {
    const primaryVolumeL = 35 + (input.includeDhwTank ? 15 : 0) + (input.additionalWaterVolumeL ? Number(input.additionalWaterVolumeL) : 0);
    const primaryExpVol = primaryVolumeL * expansionCoeff * expSafety;
    const primaryExactVessel = primaryExpVol * pressFactor;
    primaryVesselSizeL = standardSizes.find((size) => size >= primaryExactVessel) || 8;
    if (primaryVesselSizeL < 8) primaryVesselSizeL = 8;

    const secondaryVolumeL = peakLoadKw * specificVolumeLperKw;
    const secondaryExpVol = secondaryVolumeL * expansionCoeff * expSafety;
    const secondaryExactVessel = secondaryExpVol * pressFactor;
    secondaryVesselSizeL = standardSizes.find((size) => size >= secondaryExactVessel) || 12;
    if (secondaryVesselSizeL < 12) secondaryVesselSizeL = 12;

    roundedVesselSizeL = primaryVesselSizeL;
  } else {
    const expansionVolumeL = estimatedSystemVolumeL * expansionCoeff * expSafety;
    const exactVesselL = expansionVolumeL * pressFactor;
    roundedVesselSizeL = standardSizes.find((size) => size >= exactVesselL) || 18;
    primaryVesselSizeL = roundedVesselSizeL;
    if (needsSecondaryVessel) {
      const secondaryVolumeL = peakLoadKw * specificVolumeLperKw;
      const secondaryExpVol = secondaryVolumeL * expansionCoeff * expSafety;
      const secondaryExactVessel = secondaryExpVol * pressFactor;
      secondaryVesselSizeL = standardSizes.find((size) => size >= secondaryExactVessel) || 12;
      if (secondaryVesselSizeL < 12) secondaryVesselSizeL = 12;
    } else {
      secondaryVesselSizeL = 0;
    }
  }

  // --- Plate Heat Exchanger Sizing ---
  let recommendedExchangerModel = 'Cordivari SL-22-30 (30 lemezes, 0.66 m² felület)';
  let heatExchangerAreaM2 = 0.66;
  if (peakLoadKw <= 8) {
    recommendedExchangerModel = 'Cordivari SL-22-30 (30 lemezes, 0.66 m² felület)';
    heatExchangerAreaM2 = 0.66;
  } else if (peakLoadKw <= 13) {
    recommendedExchangerModel = 'Cordivari SL-22-40 (40 lemezes, 0.88 m² felület)';
    heatExchangerAreaM2 = 0.88;
  } else if (peakLoadKw <= 18) {
    recommendedExchangerModel = 'Cordivari SL-32-30 (30 lemezes, 1.15 m² fűtési felület)';
    heatExchangerAreaM2 = 1.15;
  } else {
    recommendedExchangerModel = 'Cordivari SL-32-40 (40 lemezes, 1.54 m² magas átviteli felület)';
    heatExchangerAreaM2 = 1.54;
  }

  // --- Primary pressure drop ---
  const frictionMult = params ? params.pexFrictionMultiplier : 1.35;
  const pexMultiplier = input.pipeMaterial === 'pex' ? frictionMult : 1.0;
  const fittingsCount = input.fittingsCount ?? 6;

  const primaryViscosity = 0.0010; // tiszta víz (glikol tiltva)
  const primaryRe = primaryDensity * primaryEstimatedVelocityMs * primaryInnerDiaM / primaryViscosity;
  const primaryFFactor = primaryRe > 2000 ? 0.3164 / Math.pow(primaryRe, 0.25) : 64 / Math.max(primaryRe, 1);
  const primaryPipeLossKpa = Number((
    primaryFFactor * (pipeLengthM / primaryInnerDiaM) * (primaryDensity * primaryEstimatedVelocityMs * primaryEstimatedVelocityMs / 2000) * pexMultiplier
  ).toFixed(1));

  const localLossPerFittingKpa = 0.15;
  const primaryLocalLossKpa = Number((fittingsCount * localLossPerFittingKpa * (primaryEstimatedVelocityMs / 0.8)).toFixed(1));
  const primaryExchangerLoss = input.includeHeatExchanger ? 11.2 * (flowRateM3h / 2.0) : 0;
  const primaryPressureDropKpa = Number((primaryPipeLossKpa + primaryExchangerLoss + primaryLocalLossKpa + 1.8).toFixed(1));
  const remainingPumpHeadKpa = Number((pumpHead - primaryPressureDropKpa).toFixed(1));

  // --- Buffer méretezés rendszertípus-alapúan: padló kW×15, radiátor kW×12, vegyes átlag (javítás #1) ---
  const hasFloorCirc = secondaryCircuits.some(c => c.type === 'floor');
  const hasRadCirc = secondaryCircuits.some(c => c.type === 'radiators');
  const floorFactorL = params?.systemWaterVolumeFloorFactor ?? 15;
  const radiatorFactorL = params?.systemWaterVolumeRadiatorFactor ?? 12;
  const bufferFactorL = hasFloorCirc && hasRadCirc
    ? Math.round((floorFactorL + radiatorFactorL) / 2)
    : hasFloorCirc ? floorFactorL : radiatorFactorL;
  const recommendedBufferL = Math.round(peakLoadKw * bufferFactorL);
  const isBufferAdequate = Number(input.additionalWaterVolumeL || 0) >= recommendedBufferL;

  // --- Szekunder keringtető (a váltó/puffer UTÁN) — minden topológiában, állandó nyomású üzemmód ---
  const secPump = selectDabPump('floor', secondaryFlowRateLh);

  // --- Hidraulikus váltó (LLH) referencia-méretezés: a szekunder igény viszi a váltót ---
  const llhFlowRateLh = secondaryFlowRateLh > 0 ? secondaryFlowRateLh : Math.round(flowRateLh);
  const llhFlowM3s = (llhFlowRateLh / 1000) / 3600;
  const llhAreaM2 = llhFlowM3s / (input.targetVelocityMs ?? 0.6);
  const llhDiaMm = llhAreaM2 > 0 ? Math.sqrt((4 * llhAreaM2) / Math.PI) * 1000 : 40;
  const llhRecommendedDiam = llhDiaMm <= 32 ? 'DN32' : llhDiaMm <= 40 ? 'DN40' : llhDiaMm <= 50 ? 'DN50' : 'DN65';

  // --- Biválens hidraulika (Topológia 4) ---
  const bivalent = calculateBivalentHydraulics(peakLoadKw, hpCapacityAtDesignKw ?? 0, input);

  // --- Validációs figyelmeztetések (gyártói szabályok — terv 4. fejezet) ---
  const validationWarnings: string[] = [];
  if (coupling === 'direct') {
    validationWarnings.push('Direkt kapcsolás: a HP belső szivattyúja hajtja a primer kört — nagyobb rendszernél (>10 kW / több zóna) hidraulikus váltó javasolt.');
  }
  if (input.includeDhwTank && coupling !== 'buffer-dhw' && coupling !== 'bivalent') {
    validationWarnings.push('HMV tartály esetén a 3-járatú váltószelep kötelező elem — ezt a "Puffer + HMV" topológia modellezi helyesen.');
  }
  if (coupling === 'bivalent' && !input.bivalentSource) {
    validationWarnings.push('Biválens topológia: válaszd ki a kiegészítő hőforrást (gázkazán vagy elektromos betét).');
  }
  if (coupling === 'bivalent' && input.bivalentSource === 'gas-boiler' && !(input.bivalentBoilerPowerKw && input.bivalentBoilerPowerKw > 0)) {
    validationWarnings.push('Biválens gázkazán: add meg a kazán teljesítményét (kW) — különben a biválens deficit alapján számolunk.');
  }
  if (coupling !== 'direct' && coupling !== 'heat-exchanger' && secondaryCircuits.length === 0) {
    validationWarnings.push('Nincs szekunder kör megadva — a szekunder szivattyú és az LLH méretezéséhez adj hozzá legalább egy hőleadó kört.');
  }
  if (primaryDeltaT < 5) {
    validationWarnings.push('A primer ΔT 5°C alatt van — ellenőrizd a hőfoklépcsőt (HP gyártói minimum jellemzően 5°C).');
  }
  // LLH szabály: a szekunder szivattyú MINDIG a váltó/puffer UTÁN van — a layout ezt betartja (negatív nyomás elkerülése)

  const primaryFlowRateLh = Math.round(flowRateLh);

  // --- Temperature labels ---
  const primaryReturnTempC = flowTemp - primaryDeltaT;

  return {
    flowRateLh: Math.round(flowRateLh),
    flowRateLmin: Number(flowRateLmin.toFixed(1)),
    estimatedVelocityMs: Number(primaryEstimatedVelocityMs.toFixed(2)),
    primaryEstimatedVelocityMs: Number(primaryEstimatedVelocityMs.toFixed(2)),
    secondaryEstimatedVelocityMs,
    recommendedPipeSize: primaryPipe,
    recommendedSecondaryPipeSize: secondaryPipe,
    vesselSizeL: roundedVesselSizeL,
    vesselPrechargeBar: prechargeBar,
    vesselFinalBar: finalBar,
    primaryVesselSizeL,
    secondaryVesselSizeL,
    heatExchangerAreaM2: Number(heatExchangerAreaM2.toFixed(2)),
    heatExchangerWaterFlowLh: Math.round(flowRateLh),
    recommendedExchangerModel,
    dabPumpModel,
    dabPumpSetting,
    dabPumpStage,
    recommendedBufferL,
    isBufferAdequate,
    primaryFlowRateLh,
    secondaryFlowRateLh,
    primaryPressureDropKpa,
    secondaryPressureDropKpa,
    remainingPumpHeadKpa,
    secondaryRemainingHeadKpa,
    primaryMassFlowKgh,
    secondaryMassFlowKgh,
    glycolDensityKgm3: Math.round(glycol.density),
    glycolSpecificHeatWhKgK: glycol.specificHeatWhKgK,
    glycolPercentageUsed: glycolPct,
    systemVolumeL: Math.round(estimatedSystemVolumeL),
    prechargeCalculated: prechargeBar,
    finalCalculated: finalBar,
    primaryPipeLossKpa,
    secondaryPipeLossKpa,
    primaryFlowTempC: Math.round(flowTemp),
    primaryReturnTempC: Math.round(primaryReturnTempC),
    secondaryFlowTempC: Math.round(secondaryFlowTempC),
    secondaryReturnTempC: Math.round(secondaryReturnTempC),
    circuitResults,
    // ÚJ — hidraulikai modul 4 topológia (2026-08)
    validationWarnings,
    secondaryPumpModel: secPump.pumpModel,
    secondaryPumpSetting: secPump.pumpSetting,
    secondaryPumpStage: secPump.pumpStage,
    llhFlowRateLh: Math.round(llhFlowRateLh),
    llhRecommendedDiam,
    bivalent,
  };
}
