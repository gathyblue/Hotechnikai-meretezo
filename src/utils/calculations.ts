import { BuildingData, CalculationResults, HeatPumpModel, HydraulicInput, HydraulicResults, EngineeringParams } from '../types';

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
export function calculateGasHufCost(m3: number): number {
  if (m3 <= 0) return 0;
  if (m3 <= 1729) {
    return m3 * 101.5;
  } else {
    const discounted = 1729 * 101.5;
    const over = (m3 - 1729) * 747.0;
    return discounted + over;
  }
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

export function getHeatingGasM3(data: BuildingData): number {
  let activeM3 = data.gasAnnualM3;
  if (data.method === 'gas' && data.gasIncludeDhwCorrection && activeM3 > 0) {
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

  // Active method selection mapping - default to the selected method or fallback to max if undefined
  let selectedMethodKw = calculatedFabricKw;
  if (data.method === 'gas') {
    selectedMethodKw = calculatedGasKw;
  } else if (data.method === 'certificate') {
    selectedMethodKw = calculatedCertKw;
  }

  let peakLoadKw = selectedMethodKw;
  let transmissionKw = calculatedFabricTransmissionKw;
  let ventilationKw = calculatedFabricVentilationKw;

  if (data.method === 'gas') {
    ventilationKw = selectedMethodKw * 0.15;
    transmissionKw = selectedMethodKw * 0.85;
  } else if (data.method === 'certificate') {
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
  if (data.method === 'gas' && data.gasAnnualM3 > 0) {
    yearlyEnergyKwh = heatingGasM3 * 9.44 * (data.boilerEfficiency / 100);
  } else {
    yearlyEnergyKwh = peakLoadKw * 1900;
  }

  // Back-calculate equivalent gas block if active method is not gas
  let calculatedGasM3 = data.gasAnnualM3;
  if (data.method !== 'gas') {
    calculatedGasM3 = yearlyEnergyKwh / (9.44 * 0.80); // old 80% boiler baseline
  }

  const gasCostHuf = calculateGasHufCost(calculatedGasM3);

  return {
    heatLossKw: {
      transmission: Number(transmissionKw.toFixed(2)),
      ventilation: Number(ventilationKw.toFixed(2)),
      total: Number(peakLoadKw.toFixed(2)),
    },
    yearlyEnergyKwh: Math.round(yearlyEnergyKwh),
    gasCostHuf: Math.round(gasCostHuf),
    hpCostHuf: 0, 
    yearlySavingsHuf: 0, 
    bivalentTemp: -5, 
    bivalentElectricHeaterKw: 0,
    comparison: {
      gasKw: Number(Math.max(1, calculatedGasKw).toFixed(2)),
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
  emitterType: 'floor' | 'radiator' | 'cool18' | 'cool12',
  temp: number
): number {
  let capMin15 = hp.capacityAm15W35;
  let capMin7 = hp.capacityAm7W35;
  let capPlus7 = hp.capacityA7W35;

  if (emitterType === 'radiator') {
    capMin15 = hp.capacityAm15W55;
    capMin7 = hp.capacityAm7W55;
    capPlus7 = hp.capacityA7W35 * 0.85; // ~15% physics capacity drop at 55°C LWT
  } else if (emitterType === 'cool12') {
    // 50°C LWT: 75% weighted towards W55 performance, 25% towards W35 performance
    capMin15 = hp.capacityAm15W35 * 0.25 + hp.capacityAm15W55 * 0.75;
    capMin7 = hp.capacityAm7W35 * 0.25 + hp.capacityAm7W55 * 0.75;
    capPlus7 = hp.capacityA7W35 * 0.89; // ~11% physics capacity drop at 50°C LWT
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
    { temp: -5, pct: 98.7 },
    { temp: 0, pct: 93.5 },
    { temp: 5, pct: 78.0 },
    { temp: 10, pct: 45.0 },
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
 * Heat pump operational sizing, bivalency, and financial indicators
 */
export function evaluateHeatPumpEconomics(
  peakLoadKw: number,
  yearlyEnergyKwh: number,
  gasCostHuf: number,
  hp: HeatPumpModel,
  emitterType: 'floor' | 'radiator' | 'cool18' | 'cool12',
  electricityTariffHuf: number = 23, // default cheap tariff base price
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
  // Determine SCOP / COP for emitter or cooling mode
  let copUsed = hp.scopW35;
  if (emitterType === 'radiator') {
    copUsed = hp.scopW55;
  } else if (emitterType === 'cool12') {
    copUsed = (hp.scopW35 + hp.scopW55) / 2; // mixed/cooling 45°C winter COP
  } else if (emitterType === 'cool18') {
    copUsed = hp.scopW35; // surface cooling paired with floor heating
  }

  // Calculate bivalent energy coverage
  const coveragePct = calculateBivalentCoverage(bivalentTempManual, designTemp);
  const coverage = coveragePct / 100.0;

  // Segment annual energy requirement:
  // 1) Heat Pump supplies 'coverage' of total demand with high-efficiency COP
  const hpEnergyPortion = yearlyEnergyKwh * coverage;
  const electricityHpKwh = hpEnergyPortion / copUsed;

  // 2) Auxiliary heating supplies remainder with COP = 1.0 (electric resistance)
  const auxEnergyPortion = yearlyEnergyKwh * (1.0 - coverage);
  const electricityAuxKwh = auxEnergyPortion / 1.0;

  // Total annual electricity consumption (kWh/year)
  const electricityKwh = electricityHpKwh + electricityAuxKwh;

  // Cost with custom electricity tariff
  const hpCostHuf = electricityKwh * electricityTariffHuf;
  const yearlySavingsHuf = gasCostHuf - hpCostHuf;

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
  if (requiredDiameterMm <= 13) {
    return isPEX ? 'PEX 26mm' : isSteel ? 'Szénacél DN20' : 'Rézcső 18mm';
  } else if (requiredDiameterMm <= 20) {
    return isPEX ? 'PEX 32mm' : isSteel ? 'Szénacél DN25' : 'Rézcső 22mm';
  } else if (requiredDiameterMm <= 25) {
    return isPEX ? 'PEX 40mm' : isSteel ? 'Szénacél DN32' : 'Rézcső 28mm';
  } else if (requiredDiameterMm <= 32) {
    return isPEX ? 'PEX 50mm' : isSteel ? 'Szénacél DN40' : 'Rézcső 35mm';
  } else {
    return isPEX ? 'PEX 50mm' : isSteel ? 'Szénacél DN50' : 'Rézcső 42mm';
  }
}

/**
 * Hydraulic, Plate Heat Exchanger, and Expansion Vessel sizing
 */
export function calculateHydraulicsAndVessel(
  peakLoadKw: number,
  flowTemp: number,
  input: HydraulicInput,
  heatedArea: number,
  params?: EngineeringParams
): HydraulicResults {
  const deltaT = input.deltaT;
  const specHeat = params ? params.waterSpecificHeat : 1.163;
  const flowRateM3h = peakLoadKw / (specHeat * deltaT);
  const flowRateLh = flowRateM3h * 1000;
  const flowRateLmin = flowRateLh / 60;

  // Choose standard diameter
  const targetVelocityMs = 0.8;
  const flowRateM3s = flowRateM3h / 3600;
  const requiredAreaM2 = flowRateM3s / targetVelocityMs;
  const requiredDiameterMm = Math.sqrt((4 * requiredAreaM2) / Math.PI) * 1000;

  // Primary pipe decision
  let primaryPipe = input.primaryPipeSize || 'Auto';
  if (primaryPipe === 'Auto') {
    primaryPipe = getAutoRecommendedPipeSize(requiredDiameterMm, input.pipeMaterial);
  }

  // Secondary pipe decision
  const secondaryFlowRateLh = input.includeHeatExchanger ? Math.round((peakLoadKw / (specHeat * 5)) * 1000) : Math.round(flowRateLh);
  const secondaryFlowM3h = secondaryFlowRateLh / 1000;
  const secondaryRequiredDiameterMm = Math.sqrt((4 * (secondaryFlowM3h / 3600) / targetVelocityMs) / Math.PI) * 1000;

  let secondaryPipe = input.secondaryPipeSize || 'Auto';
  if (secondaryPipe === 'Auto') {
    secondaryPipe = getAutoRecommendedPipeSize(secondaryRequiredDiameterMm, input.pipeMaterial);
  }

  // Get exact diameters
  const primaryInnerDiaMm = getPipeInnerDiameter(primaryPipe, input.pipeMaterial);
  const secondaryInnerDiaMm = getPipeInnerDiameter(secondaryPipe, input.pipeMaterial);

  // Math for velocity with selected dimensions
  const primaryInnerDiaM = primaryInnerDiaMm / 1000;
  const primaryActualAreaM2 = (Math.PI * Math.pow(primaryInnerDiaM, 2)) / 4;
  const primaryEstimatedVelocityMs = (flowRateM3h / 3600) / primaryActualAreaM2;

  const secondaryInnerDiaM = secondaryInnerDiaMm / 1000;
  const secondaryActualAreaM2 = (Math.PI * Math.pow(secondaryInnerDiaM, 2)) / 4;
  const secondaryEstimatedVelocityMs = (secondaryFlowM3h / 3600) / secondaryActualAreaM2;

  // Expansion Vessel Sizing
  let specificVolumeLperKw = 12;
  const floorFactor = params ? params.systemWaterVolumeFloorFactor : 15;
  const radiatorFactor = params ? params.systemWaterVolumeRadiatorFactor : 12;

  if (input.secondaryLoops === 'floor') specificVolumeLperKw = floorFactor;
  else if (input.secondaryLoops === 'radiators') specificVolumeLperKw = radiatorFactor;
  else if (input.secondaryLoops === 'fan_coil') specificVolumeLperKw = 8;
  else if (input.secondaryLoops === 'mixed') specificVolumeLperKw = Math.round((floorFactor + radiatorFactor) / 2);

  const estimatedSystemVolumeL = (peakLoadKw * specificVolumeLperKw) + Number(input.additionalWaterVolumeL || 0);

  let expansionCoeff = 0.0145; // Default 55°C -> 1.45%
  if (flowTemp <= 35) expansionCoeff = 0.0063;
  else if (flowTemp <= 45) expansionCoeff = 0.0104;
  else if (flowTemp <= 55) expansionCoeff = 0.0145;
  else if (flowTemp <= 65) expansionCoeff = 0.0198;

  const prechargeBar = 1.0;
  const finalBar = 2.5;
  const pressFactor = (finalBar + 1.0) / (finalBar - prechargeBar); // ~2.33
  const standardSizes = [8, 12, 18, 24, 35, 50, 80, 100, 120, 150];

  let roundedVesselSizeL = 18;
  let primaryVesselSizeL = 12;
  let secondaryVesselSizeL = 0;

  const expSafety = params ? params.expansionSafetyFactor : 1.10;

  if (input.includeHeatExchanger) {
    // Split systems: separate primary loop and secondary house heating loop
    const primaryVolumeL = 35 + (input.includeDhwTank ? 15 : 0) + (input.additionalWaterVolumeL ? Number(input.additionalWaterVolumeL) : 0);
    const primaryExpVol = primaryVolumeL * expansionCoeff * expSafety;
    const primaryExactVessel = primaryExpVol * pressFactor;
    primaryVesselSizeL = standardSizes.find((size) => size >= primaryExactVessel) || 8;
    if (primaryVesselSizeL < 8) primaryVesselSizeL = 8;

    // Secondary volume: House lines and radiator/floor terminal units
    const secondaryVolumeL = peakLoadKw * specificVolumeLperKw;
    const secondaryExpVol = secondaryVolumeL * expansionCoeff * expSafety;
    const secondaryExactVessel = secondaryExpVol * pressFactor;
    secondaryVesselSizeL = standardSizes.find((size) => size >= secondaryExactVessel) || 12;
    if (secondaryVesselSizeL < 12) secondaryVesselSizeL = 12;

    roundedVesselSizeL = primaryVesselSizeL;
  } else {
    // Normal unified direct system (continuous single system layout)
    const expansionVolumeL = estimatedSystemVolumeL * expansionCoeff * expSafety;
    const exactVesselL = expansionVolumeL * pressFactor;
    roundedVesselSizeL = standardSizes.find((size) => size >= exactVesselL) || 18;
    primaryVesselSizeL = roundedVesselSizeL;
    secondaryVesselSizeL = 0;
  }

  // Cordivari Plate Heat Exchanger Sizing (Hungarian premium installer standard)
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

  // Calculate dynamic primary and secondary pressure losses (kPa resistances) with average 10m pipe length
  // dP (kPa) = 0.125 * (v^2) / (d / 1000)
  const frictionMult = params ? params.pexFrictionMultiplier : 1.35;
  const pexMultiplier = input.pipeMaterial === 'pex' ? frictionMult : 1.0;
  const basePrimaryLossPipes = 0.125 * (primaryEstimatedVelocityMs * primaryEstimatedVelocityMs) / (primaryInnerDiaMm / 1000) * pexMultiplier;
  const baseSecondaryLossPipes = 0.125 * (secondaryEstimatedVelocityMs * secondaryEstimatedVelocityMs) / (secondaryInnerDiaMm / 1000) * pexMultiplier;

  const primaryExchangerLoss = input.includeHeatExchanger ? 11.2 * (flowRateM3h / 2.0) : 0;
  const secondaryExchangerLoss = input.includeHeatExchanger ? 9.8 * (secondaryFlowM3h / 2.0) : 0;

  const primaryPressureDropKpa = Number((basePrimaryLossPipes + primaryExchangerLoss + 1.8).toFixed(1));
  const secondaryPressureDropKpa = input.includeHeatExchanger
    ? Number((baseSecondaryLossPipes + secondaryExchangerLoss + 2.2).toFixed(1))
    : Number((baseSecondaryLossPipes + 1.2).toFixed(1));

  const remainingPumpHeadKpa = Number((60.0 - primaryPressureDropKpa).toFixed(1));

  // DAB Pump Selection with small pipe size multiplier warning - Dab Evosta 2 is fully sufficient
  let dabPumpModel = '';
  if (input.secondaryPumpOverride && input.secondaryPumpOverride !== 'Auto') {
    dabPumpModel = input.secondaryPumpOverride;
  } else {
    dabPumpModel = 'DAB Evosta 2 40-70/180 (A-osztályú, nagyhatékonyságú)';
  }

  // Dynamic DAB pump recommended settings & stage logic
  let dabPumpSetting = 'Állandó differenciálnyomás (Constant Pressure / CP)';
  let dabPumpStage = 'CP2 (Közepes fűtési fokozat)';

  if (input.secondaryLoops === 'floor') {
    dabPumpSetting = 'Állandó differenciálnyomás (Padlófűtési osztógyűjtőhöz)';
    if (secondaryFlowRateLh <= 1100) {
      dabPumpStage = 'CP1 (I. alacsony állandó nyomás)';
    } else if (secondaryFlowRateLh <= 1900) {
      dabPumpStage = 'CP2 (II. közepes, javasolt fűtési fokozat)';
    } else {
      dabPumpStage = 'CP3 (III. nagyüzemi padlófűtési kör)';
    }
  } else if (input.secondaryLoops === 'radiators') {
    dabPumpSetting = 'Arányos differenciálnyomás (Termosztatikus radiátor szelepekhez)';
    if (secondaryFlowRateLh <= 1100) {
      dabPumpStage = 'PP1 (I. alacsony arányos nyomás)';
    } else if (secondaryFlowRateLh <= 1900) {
      dabPumpStage = 'PP2 (II. közepes, optimális fokozat)';
    } else {
      dabPumpStage = 'PP3 (III. magas arányos nyomás)';
    }
  } else if (input.secondaryLoops === 'mixed') {
    dabPumpSetting = 'Állandó differenciálnyomás (Kevert rendszerű osztó-gyűjtőhöz)';
    if (secondaryFlowRateLh <= 1500) {
      dabPumpStage = 'CP2 (II. közepes kevert rendszer fokozat)';
    } else {
      dabPumpStage = 'CP3 (III. magas kevert átfolyási fokozat)';
    }
  } else {
    // Fan coil/puffer bypass
    dabPumpSetting = 'Állandó fordulatszámú görbe (Constant Speed / III. fokozat)';
    dabPumpStage = 'III-as fokozat (Maximális vízszállításra állítva)';
  }

  // Recommended buffer volume check
  const recommendedBufferL = Math.round(peakLoadKw * 20); // 20 L / kW minimum
  const isBufferAdequate = Number(input.additionalWaterVolumeL || 0) >= recommendedBufferL;

  // Flow rate splits for primary and secondary (secunder) zones
  const primaryFlowRateLh = Math.round(flowRateLh);

  return {
    flowRateLh: Math.round(flowRateLh),
    flowRateLmin: Number(flowRateLmin.toFixed(1)),
    estimatedVelocityMs: Number(primaryEstimatedVelocityMs.toFixed(2)),
    primaryEstimatedVelocityMs: Number(primaryEstimatedVelocityMs.toFixed(2)),
    secondaryEstimatedVelocityMs: Number(secondaryEstimatedVelocityMs.toFixed(2)),
    recommendedPipeSize: `${primaryPipe} (${input.pipeMaterial === 'copper' ? 'Réz' : input.pipeMaterial === 'pex' ? 'PEX' : 'Szénacél'})`,
    recommendedSecondaryPipeSize: `${secondaryPipe} (${input.pipeMaterial === 'copper' ? 'Réz' : input.pipeMaterial === 'pex' ? 'PEX' : 'Szénacél'})`,
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
    remainingPumpHeadKpa
  };
}
