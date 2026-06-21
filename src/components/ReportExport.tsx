import React, { useState } from 'react';
import { BuildingData, CalculationResults, HeatPumpModel, HydraulicResults, HydraulicInput } from '../types';
import { SystemDiagram } from './SystemDiagram';
import { FileDown, Printer, Cloud, Check, Loader2, Sparkles, User, ShieldCheck, MapPin, Gauge } from 'lucide-react';

interface ReportExportProps {
  buildingData: BuildingData;
  calcResults: CalculationResults;
  selectedModel: HeatPumpModel | null;
  selectedEmitter: 'floor' | 'radiator' | 'cool18' | 'cool12';
  hydraulicResults: HydraulicResults;
  hydraulicState: HydraulicInput;
  tariffHuf: number;
  bivalentTempManual?: number;
  theme?: 'light' | 'dark';
}

export const ReportExport: React.FC<ReportExportProps> = ({
  buildingData,
  calcResults,
  selectedModel,
  selectedEmitter,
  hydraulicResults,
  hydraulicState,
  tariffHuf,
  bivalentTempManual = -5,
  theme = 'light'
}) => {
  const isDark = theme === 'dark';
  const [driveToken, setDriveToken] = useState<string>('');
  const [isDriveExporting, setIsDriveExporting] = useState<boolean>(false);
  const [driveExportSuccess, setDriveExportSuccess] = useState<boolean | null>(null);
  const [driveError, setDriveError] = useState<string>('');

  // Fixed parameters for estimate:
  const isLargeMachine = selectedModel && selectedModel.capacityA7W35 >= 12;
  const installDistance = 'short'; // Kis távolságot feltételezünk alapértelmezésben
  const installBaseHuf = 450000;
  
  const dhwVolume = buildingData.dhwVolume ?? 200;
  const dhwTankHuf = dhwVolume === 300 ? 730000 : 530000; // 530k is 200L, 730k is 300L
  const dhwValveHuf = 95000; // motoros váltószelep
  const dhwPipingHuf = 155000; // csövezők és szerelvények
  const dhwHeaterHuf = 70000; // fűtőkiegészítés
  const dhwLaborHuf = 100000; // gépészeti szerelési díj

  const useSubsidy = buildingData.useSubsidy !== false;
  const subsidyAmount = buildingData.subsidyValue ?? 3000000;

  const emitterNameMap = {
    floor: 'Padlófűtés / Alacsony hőmérséklet (35°C)',
    cool18: 'Felületfűtés / Aktív mennyezethűtés (18°C)',
    cool12: 'Fan-coil kényszer-konvektor hűtés (12°C)',
    radiator: 'Klasszikus fém paneles radiátor (55°C-65°C)',
  };

  const currentYear = new Date().getFullYear();

  // Create highly styled, modern print-friendly HTML content
  const generateHtmlReportContent = (): string => {
    const today = buildingData.surveyDate 
      ? new Date(buildingData.surveyDate).toLocaleDateString('hu-HU', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/-/g, '. ') + '.'
      : new Date().toLocaleDateString('hu-HU', { year: 'numeric', month: '2-digit', day: '2-digit' });
    
    const dMin15 = calcResults.heatLossKw.total;
    const hpMin15 = selectedModel ? (selectedEmitter === 'radiator' ? selectedModel.capacityAm15W55 : selectedModel.capacityAm15W35) : 6;
    const hpAm7 = selectedModel ? (selectedEmitter === 'radiator' ? selectedModel.capacityAm7W55 : selectedModel.capacityAm7W35) : 8;
    const hpA7 = selectedModel ? selectedModel.capacityA7W35 : 10;
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
    
    const demandAtTempManual = dMin15 * (1 - (bivalentTempManual - (-15)) / 30);
    const hpCapAtManual = hpCapAtT(bivalentTempManual);

    // Investment breakdown values
    const discountPct = buildingData.productDiscountPct ?? 0;
    const baseDevicePrice = selectedModel ? selectedModel.estimatedPriceHuf : 1800000;
    const discountedDevicePrice = baseDevicePrice * (1 - discountPct / 100);
    
    let installPipeSizeDesc = isLargeMachine ? '5/4" (DN32)' : '1" (DN25)';

    const installationSurcharge = buildingData.mechanicalInstallCost ?? 2500000;
    const dhwSurcharge = buildingData.includeDhwPackage !== false ? (dhwTankHuf + dhwValveHuf + dhwPipingHuf + dhwHeaterHuf + dhwLaborHuf) : 0;
    const totalInvestment = discountedDevicePrice + installationSurcharge + dhwSurcharge;
    const activeSubsidy = useSubsidy ? subsidyAmount : 0;
    const netInvestment = Math.max(0, totalInvestment - activeSubsidy);
    
    const paybackYearsSimple = (selectedModel && calcResults.yearlySavingsHuf > 0)
      ? Number((totalInvestment / calcResults.yearlySavingsHuf).toFixed(1))
      : 99;

    const paybackYearsWithGrant = (selectedModel && calcResults.yearlySavingsHuf > 0)
      ? Number((netInvestment / calcResults.yearlySavingsHuf).toFixed(1))
      : 99;

    const hpInfoHtml = selectedModel
      ? `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Ajánlott r290 Hőszivattyú:</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-family: 'JetBrains Mono', monospace; font-weight: bold; color: #2563eb;">${selectedModel.name}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Hűtőközeg Típus:</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace; color: #16a34a;">R290 (Környezetbarát propán GWP=3)</td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Névleges Leadott Teljesítmény (A7/W35):</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-family: 'JetBrains Mono', monospace; color: #0f172a;">${selectedModel.capacityA7W35} kW (COP: ${selectedModel.copA7W35})</td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Kalkulált fagyos teljesítmény (${buildingData.designTemp}°C):</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-family: 'JetBrains Mono', monospace; color: #0f172a;">${selectedEmitter === 'radiator' ? selectedModel.capacityAm15W55 : selectedModel.capacityAm15W35} kW</td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Szezonális SCOP fűtési tényező:</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-family: 'JetBrains Mono', monospace; font-weight: bold; color: #16a34a;">${selectedEmitter === 'radiator' ? selectedModel.scopW55 : selectedModel.scopW35}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Névleges feszültség fázis:</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace; color: #0f172a;">${selectedModel.voltage} (${selectedModel.phases} fázis)</td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Hangnyomásszint (Lw):</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace; color: #0f172a;">${selectedModel.soundDba} dB(A)</td>
      </tr>
      `
      : '<tr><td colspan="2" style="padding: 15px; text-align: center; color: #64748b;">Csatolt hőszivattyús berendezés nem található a jegyzőkönyvben.</td></tr>';

    return `
<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <title>Mérnöki felmérési jegyzőkönyv - Solar-Kit Partner</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      line-height: 1.5;
      color: #0f172a;
      margin: 0;
      padding: 30px;
      background-color: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .wrapper {
      max-width: 820px;
      margin: 0 auto;
      background-color: #ffffff;
      padding: 40px;
      border-radius: 0;
      border: 1px solid #e2e8f0;
    }
    .header-banner {
      border-bottom: 3px solid #0f172a;
      padding-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 30px;
    }
    .brand-title {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
      margin: 0;
      text-transform: uppercase;
    }
    .brand-subtitle {
      font-size: 11px;
      color: #475569;
      font-weight: 600;
      letter-spacing: 0.5px;
      margin: 4px 0 0 0;
    }
    .lead-box {
      border: 1px solid #e2e8f0;
      padding: 18px 24px;
      margin-bottom: 25px;
    }
    .lead-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    .hud-title {
      font-size: 10px;
      color: #64748b;
      font-weight: 500;
      margin-bottom: 4px;
    }
    .hud-value {
      font-size: 14px;
      font-weight: 600;
      color: #0f172a;
    }
    h2 {
      font-size: 12px;
      font-weight: 600;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
      margin-top: 35px;
      margin-bottom: 15px;
      color: #0f172a;
    }
    h3 {
      font-size: 11px;
      font-weight: 500;
      color: #475569;
      margin-top: 20px;
      margin-bottom: 10px;
    }
    .grid-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 25px;
    }
    .metric-card {
      border: 1px solid #e2e8f0;
      padding: 12px;
    }
    .metric-num {
      font-family: 'JetBrains Mono', monospace;
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin: 4px 0;
    }
    .metric-sub {
      font-size: 8px;
      color: #64748b;
      display: block;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      margin-top: 10px;
      margin-bottom: 25px;
    }
    th {
      border-bottom: 1px solid #e2e8f0;
      color: #0f172a;
      padding: 8px 12px;
      text-align: left;
      font-weight: 600;
      font-size: 10px;
    }
    td {
      padding: 8px 12px;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
    }
    .highlight-hp-table {
      width: 100%;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      margin-bottom: 25px;
    }
    .highlight-hp-table th {
      background-color: #f8fafc;
      color: #0f172a;
    }
    .badge-success, .badge-info, .badge-warning {
      color: #1e293b;
      font-size: 9px;
      font-weight: 500;
      padding: 2px 6px;
      border: 1px solid #e2e8f0;
      display: inline-block;
    }
    .sign-section {
      margin-top: 50px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
    }
    .sign-box {
      text-align: center;
      padding-top: 25px;
      border-top: 1px solid #e2e8f0;
      font-size: 10px;
      font-weight: 500;
      color: #475569;
    }
    .text-mono {
      font-family: 'JetBrains Mono', monospace;
    }
    .text-bold {
      font-weight: 600;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    @media print {
      body {
        padding: 0;
        background-color: #ffffff;
      }
      .wrapper {
        border: none;
        box-shadow: none;
        padding: 0;
        max-width: 100%;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    
    <div class="header-banner">
      <div>
        <h1 class="brand-title">SOLAR-KIT PARTNER</h1>
        <p class="brand-subtitle">Mérnöki felmérési & Hőtechnikai jegyzőkönyv</p>
      </div>
      <div style="text-align: right; font-size: 10px; color: #64748b; line-height: 1.5;">
        Jegyzőkönyv száma: <span class="text-mono text-bold" style="color: #0f172a;">SK-${currentYear}-${Math.floor(1000 + Math.random() * 9000)}</span><br>
        Dátum: <span class="text-bold" style="color: #0f172a;">${today}</span>
      </div>
    </div>

    <!-- CLIENT AND LOCATION DETAILS -->
    <div class="lead-box">
      <div class="lead-grid">
        <div>
          <div class="hud-title">Megbízó / Tulajdonos Neve</div>
          <div class="hud-value" style="color: #1e4ed8;">${buildingData.ownerName || 'Helyszíni felmérés ügyfél'}</div>
        </div>
        <div>
          <div class="hud-title">Ingatlan Pontos Címe</div>
          <div class="hud-value">${buildingData.address || 'Kecskemét és környéke'}</div>
        </div>
      </div>
    </div>

    <h2>1. Részletes Hőtechnikai és Energetikai Értékelés</h2>
    <div class="grid-4">
      <div class="metric-card">
        <span class="hud-title">Fűtött Terület / Térfogat</span>
        <div class="metric-num">${buildingData.heatedArea} m²</div>
        <span class="metric-sub">${buildingData.ceilingHeight} m belmag. (${(buildingData.heatedArea * buildingData.ceilingHeight).toFixed(1)} m³)</span>
      </div>
      <div class="metric-card">
        <span class="hud-title">Transzmisszió / Filtráció</span>
        <div class="metric-num">${calcResults.heatLossKw.transmission.toFixed(1)} kW</div>
        <span class="metric-sub">Légcsere (filtr.): ${(calcResults.heatLossKw.ventilation || 0).toFixed(1)} kW</span>
      </div>
      <div class="metric-card">
        <span class="hud-title">Méretezési Hőigény</span>
        <div class="metric-num">${calcResults.heatLossKw.total.toFixed(2)} kW</div>
        <span class="metric-sub text-bold">T_bázis: ${buildingData.designTemp}°C</span>
      </div>
      <div class="metric-card">
        <span class="hud-title">Éves Energiaigény</span>
        <div class="metric-num">${calcResults.yearlyEnergyKwh} kWh</div>
        <span class="metric-sub">HMV: ${(hydraulicState?.includeDhwTank ? (dhwVolume * 365 * 0.05) : 0).toFixed(0)} kWh/év</span>
      </div>
    </div>

    <h3 style="color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">1.1 Hőtechnikai Rétegrendek és Felületek</h3>
    <table>
      <thead>
        <tr>
          <th>Szerkezeti elem</th>
          <th class="text-right">Felület (m²)</th>
          <th class="text-center">Hőszigetelés (cm)</th>
          <th class="text-right">Eredő U-érték (W/m²K)</th>
          <th style="padding-left: 15px;">Mérnöki Értékelés</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="text-bold">Homlokzati falazat:</td>
          <td class="text-right text-mono">${buildingData.walls?.area?.toFixed(1) || 0} m²</td>
          <td class="text-center text-mono">${buildingData.walls?.insulationThickness || 0} cm</td>
          <td class="text-right text-mono text-bold">${buildingData.walls?.uValue?.toFixed(3) || "0.350"}</td>
          <td style="padding-left: 15px; color: #475569;">${(buildingData.walls?.uValue || 0.35) < 0.24 ? 'Kiváló hőszigeteltség' : 'Megfelelő / átlagos'}</td>
        </tr>
        <tr>
          <td class="text-bold">Padlásfödém / Tető:</td>
          <td class="text-right text-mono">${buildingData.roof?.area?.toFixed(1) || 0} m²</td>
          <td class="text-center text-mono">${buildingData.roof?.insulationThickness || 0} cm</td>
          <td class="text-right text-mono text-bold">${buildingData.roof?.uValue?.toFixed(3) || "0.200"}</td>
          <td style="padding-left: 15px; color: #475569;">${(buildingData.roof?.uValue || 0.2) < 0.17 ? 'Energetikailag fejlett' : 'Átlagos födémszig.'}</td>
        </tr>
        <tr>
          <td class="text-bold">Talajszinti padló:</td>
          <td class="text-right text-mono">${buildingData.floor?.area?.toFixed(1) || 0} m²</td>
          <td class="text-center text-mono">${buildingData.floor?.insulationThickness || 0} cm</td>
          <td class="text-right text-mono text-bold">${buildingData.floor?.uValue?.toFixed(3) || "0.450"}</td>
          <td style="padding-left: 15px; color: #475569;">Szerkezet talajszinten</td>
        </tr>
        <tr>
          <td class="text-bold">Nyílászárók (Ablakok + Ajtók):</td>
          <td class="text-right text-mono">${((buildingData.windows?.area || 0) + (buildingData.doors?.area || 0)).toFixed(1)} m²</td>
          <td class="text-center text-mono">-</td>
          <td class="text-right text-mono text-bold">${buildingData.windows?.uValue?.toFixed(2) || "1.10"}</td>
          <td style="padding-left: 15px; color: #475569;">${(buildingData.windows?.uValue || 1.1) <= 1.1 ? '3-rétegű hőszigetelt thermo' : '2-rétegű standard hőszigetelő'}</td>
        </tr>
      </tbody>
    </table>

    <h2>2. R290 Környezetbarát Hőszivattyú Kiválasztás</h2>
    <div class="highlight-hp-table">
      <table>
        <thead>
          <tr>
            <th colspan="2" style="padding: 10px 12px; font-size: 10px; background-color: #0f172a; color: #ffffff;">GÉPÉSZETI ADATLAP ÉS HATÁSFOK TÉNYEZŐK</th>
          </tr>
        </thead>
        <tbody>
          ${hpInfoHtml}
      </tbody>
    </table>

    <h3 style="color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">2.1 Kiválasztott Bivalens Munkaponti Diagnosztika</h3>
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; margin-bottom: 25px;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 11px;">
        <div>
          <div class="hud-title">Beállított bivalens munkapont:</div>
          <div style="font-size: 18px; font-weight: 800; font-family: 'JetBrains Mono', monospace;">${bivalentTempManual} °C</div>
          <p style="font-size: 10px; color: #475569; margin: 8px 0 0 0; line-height: 1.45;">
            A megadott bivalencia szintig a propános hőszivattyús kompresszor teljesen egyedül fűt. Ez alatt a pont alatt kiegészítő elektromos fűtőpatron vagy meglévő külső gázkazán tud besegíteni.
          </p>
        </div>
        <div style="border-left: 1px solid #e2e8f0; padding-left: 20px;">
          <div class="hud-title">Munkaponti értékek összevetése:</div>
          <div style="margin-top: 4px; font-family: 'JetBrains Mono', monospace; font-size: 11px; line-height: 1.5; color: #0f172a;">
            • Épület hőigénye: <strong>${demandAtTempManual.toFixed(2)} kW</strong><br>
            • Hőszivattyú ereje: <strong>${hpCapAtManual.toFixed(2)} kW</strong><br>
            • Kiegészítő külső igény: <strong>${(demandAtTempManual > hpCapAtManual ? (demandAtTempManual - hpCapAtManual) : 0).toFixed(2)} kW</strong>
          </div>
          <div style="margin-top: 10px;">
            ${hpCapAtManual >= demandAtTempManual 
              ? `<span class="badge-success">KOMPRESSZOR ÖNÁLLÓ (Elegendő fűtőteljesítmény)</span>` 
              : `<span class="badge-warning">KIEGÉSZÍTŐ BELÉP (+${(demandAtTempManual - hpCapAtManual).toFixed(2)} kW fűtőpatron)</span>`
            }
          </div>
        </div>
      </div>
    </div>

    <h2>3. Gazdaságossági & Megtérülési Vizsgálat</h2>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px;">
      <div class="metric-card" style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 18px;">
        <span class="hud-title">Hagyományos éves gázköltség</span>
        <div class="metric-num" style="color: #0f172a; font-size: 18px;">${new Intl.NumberFormat('hu-HU').format(calcResults.gasCostHuf)} Ft/év</div>
        <span class="metric-sub">Kalkulált hatásfok: ${buildingData.boilerEfficiency}% (Kondenzációs bázis)</span>
      </div>

      <div class="metric-card" style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 18px;">
        <span class="hud-title">Tervezett hőszivattyús fűtésköltség</span>
        <div class="metric-num" style="color: #0f172a; font-size: 18px;">${new Intl.NumberFormat('hu-HU').format(calcResults.hpCostHuf)} Ft/év</div>
        <span class="metric-sub text-bold">Kalkulációs tarifa: ${tariffHuf} Ft/kWh (${tariffHuf === 23 ? 'H-tarifa' : 'Standard tarifa'})</span>
      </div>
    </div>

    <h3 style="color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">3.1 Becsült Beruházási Költségrészletező</h3>
    <table>
      <thead>
        <tr>
          <th>Tétel megnevezése</th>
          <th class="text-right">Összeg (HUF)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td colSpan={2} class="text-bold text-mono" style="background-color: #f8fafc; font-size: 10px; color: #0f172a;">A. Hőszivattyú alapgép (Bruttó)</td>
        </tr>
        <tr>
          <td style="padding-left: 20px; color: #475569;">Berendezés bruttó listaára:</td>
          <td class="text-right text-mono">${new Intl.NumberFormat('hu-HU').format(baseDevicePrice)} Ft</td>
        </tr>
        <tr>
          <td style="padding-left: 20px; font-weight: bold;">Berendezés partneri akciós ára (kedvezmény: -${discountPct}%):</td>
          <td class="text-right text-mono text-bold">${new Intl.NumberFormat('hu-HU').format(discountedDevicePrice)} Ft</td>
        </tr>
        <tr>
          <td colSpan={2} class="text-bold text-mono" style="background-color: #f8fafc; font-size: 10px; color: #0f172a;">B. Gépészeti szerelés és telepítés teljes csomag ára (Bruttó)</td>
        </tr>
        <tr>
          <td colSpan={2} style="padding-left: 20px; color: #475569; font-style: italic;">
            Tartalmazza: ${(selectedModel?.capacityA7W35 || 9) > 10 ? '100 literes' : '60 literes'} Inox puffertartály szigetelve fali rögzítéssel, komplett zárt tágulási rendszerek fűtési körhöz tartókkal, mágneses iszapleválasztó, rézcsövezés szerelvényekkel és beüzemelési díjjal. Egységár tételektől mentesítve.
          </td>
        </tr>
        <tr>
          <td style="padding-left: 20px; font-weight: bold;">Gépészeti telepítés komplett csomagdíja:</td>
          <td class="text-right text-mono text-bold">${new Intl.NumberFormat('hu-HU').format(installationSurcharge)} Ft</td>
        </tr>

        <tr>
          <td colSpan={2} class="text-bold text-mono" style="background-color: #f8fafc; font-size: 10px; color: #0f172a;">C. HMV Modul (Melegvíz kiegészítés)</td>
        </tr>
        ${buildingData.includeDhwPackage !== false ? `
        <tr>
          <td colSpan={2} style="padding-left: 20px; color: #475569; font-style: italic;">
            Tartalmazza: ${dhwVolume}L speciális hőszivattyús HMV tároló megnövelt csőkígyó felülettel, motoros 3-járatú váltószelep, segédszerelvények, fűtőpatron védelmi csomag és beszerelés.
          </td>
        </tr>
        ` : `
        <tr>
          <td colSpan={2} style="padding-left: 20px; color: #64748b; font-style: italic;">HMV modul nem került kiválasztásra (Kizárólag fűtés/hűtés)</td>
        </tr>
        `}
        <tr>
          <td style="padding-left: 20px; font-weight: bold;">HMV rendszer összesen:</td>
          <td class="text-right text-mono text-bold">${new Intl.NumberFormat('hu-HU').format(dhwSurcharge)} Ft</td>
        </tr>

        ${useSubsidy ? `
        <tr style="background-color: #f8fafc;">
          <td class="text-bold" style="padding-left: 12px;">Igénybe vehető állami / pályázati támogatás:</td>
          <td class="text-right text-mono text-bold">-${new Intl.NumberFormat('hu-HU').format(activeSubsidy)} Ft</td>
        </tr>` : ''}
        <tr style="background-color: #f8fafc; border-top: 2px solid #0f172a;">
          <td class="text-bold" style="font-size: 11px;">ÖSSZES FIZETENDŐ SAJÁT ERŐ (TÁMOGATÁS UTÁN):</td>
          <td class="text-right text-mono text-bold" style="font-size: 12px;">${new Intl.NumberFormat('hu-HU').format(netInvestment)} Ft</td>
        </tr>
      </tbody>
    </table>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; margin-bottom: 25px; font-size: 11px;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div>
          <div class="hud-title">Teljes Beruházási Érték (Listaáron):</div>
          <div style="font-size: 16px; font-weight: 850; font-family: 'JetBrains Mono', monospace;">${new Intl.NumberFormat('hu-HU').format(totalInvestment)} Ft</div>
          <p style="font-size: 10px; color: #64748b; margin: 4px 0 8px 0; line-height: 1.4;">
            Hőszivattyú, fűtési inverter gépészet és telepítő elemek bruttó végösszege.
          </p>
          <div style="font-size: 10.5px; font-weight: bold; color: #334155;">
            Megtérülés támogatás nélkül: <span style="font-family: 'JetBrains Mono', monospace; font-weight: 800;">${calcResults.yearlySavingsHuf > 0 ? paybackYearsSimple + ' év' : '--'}</span>
          </div>
        </div>
        <div style="border-left: 1px solid #e2e8f0; padding-left: 20px;">
          <div class="hud-title">Nettó Beruházás Saját Erővel:</div>
          <div style="font-size: 16px; font-weight: 850; font-family: 'JetBrains Mono', monospace;">${new Intl.NumberFormat('hu-HU').format(netInvestment)} Ft</div>
          <p style="font-size: 10px; color: #64748b; margin: 4px 0 8px 0; line-height: 1.4;">
            Pályázat által visszaigényelhető összeg levonását követő tiszta saját rész.
          </p>
          <div style="font-size: 10.5px; font-weight: bold;">
            Tervezett megtérülés pályázattal (ROI): <span style="font-family: 'JetBrains Mono', monospace; font-weight: 800;">${calcResults.yearlySavingsHuf > 0 && useSubsidy ? paybackYearsWithGrant + ' év' : '--'}</span>
          </div>
        </div>
      </div>
      <div style="margin-top: 14px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 11px; font-weight: bold; text-align: center;">
        Számított nettó éves gépészeti megtakarítás: <span style="font-family: 'JetBrains Mono', monospace; font-weight: 800;">+${new Intl.NumberFormat('hu-HU').format(calcResults.yearlySavingsHuf)} Ft/év</span>
      </div>
    </div>

    <h2>4. Gépészeti Hidraulikai, Tágulási és Hőcserélő Méretezés</h2>
    <table>
      <thead>
        <tr>
          <th>Szerkezeti Részegység</th>
          <th>Tervezett Méret / Specifikáció</th>
          <th>Tervezési Érdemi Irányelv és Méretezési Érték</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="text-bold">1. Főnyomó gerinccsatorna:</td>
          <td class="text-mono text-bold">${hydraulicResults.recommendedPipeSize}</td>
          <td>Garantált max áramlási sebesség: ${hydraulicResults.estimatedVelocityMs} m/s (&lt; 0.8 m/s lamináris áramláshoz)</td>
        </tr>
        <tr>
          <td class="text-bold">2. Zárt tágulási tartályok:</td>
          <td class="text-mono text-bold">
            ${hydraulicState.includeHeatExchanger 
              ? `Primer: ${hydraulicResults.primaryVesselSizeL} L / Szekunder: ${hydraulicResults.secondaryVesselSizeL} L` 
              : `${hydraulicResults.vesselSizeL} Liter`}
          </td>
          <td>Komplett zárt tágulási védelem. Gáznyomás p0: ${hydraulicResults.vesselPrechargeBar} bar, rsz végnyomás pe: ${hydraulicResults.vesselFinalBar} bar</td>
        </tr>
        <tr>
          <td class="text-bold">3. Hidraulikai hőlépcső és áramlás:</td>
          <td class="text-mono text-bold">ΔT = ${hydraulicState.deltaT} °C fűtési hőlépcső</td>
          <td>Névleges folyadék tömegáram: <span class="text-mono text-bold">${hydraulicResults.flowRateLh} L/óra</span></td>
        </tr>
        <tr>
          <td class="text-bold">4. Lemezes fűtési hőcserélő:</td>
          <td class="text-mono text-bold">
            ${hydraulicState.includeHeatExchanger 
              ? `${hydraulicResults.recommendedExchangerModel}`
              : 'Direct bypass fémösszeköttetés (Nincs leválasztás)'}
          </td>
          <td>
            ${hydraulicState.includeHeatExchanger
              ? `Rozsdamentes saválló kivitel. Optimális átadási felület: ${hydraulicResults.heatExchangerAreaM2} m²`
              : 'Direct áramkör bypass. Külső fagyvédelmi szelep beépítése fokozottan ajánlott!'}
          </td>
        </tr>
        <tr>
          <td class="text-bold">5. Fűtőköri szivattyú (Szekunder):</td>
          <td class="text-mono text-bold">
            ${hydraulicResults.dabPumpModel}
          </td>
          <td>
            <strong>Javasolt beállítás:</strong> ${hydraulicResults.dabPumpSetting} / 
            <strong>Fokozat:</strong> <span class="badge-success">${hydraulicResults.dabPumpStage}</span>
          </td>
        </tr>
        <tr>
          <td class="text-bold">6. Rendszer puffer térfogat:</td>
          <td class="text-mono text-bold">
            Aktuális puffer: ${hydraulicState.additionalWaterVolumeL || 0} L / Javasolt min: ${hydraulicResults.recommendedBufferL} L
          </td>
          <td>
            ${hydraulicResults.isBufferAdequate 
              ? '✔ Sikerült elérni a mérnöki szempontból optimális kompresszorvédelmi puffer térfogatot (sűrű indítás ellen).'
              : `⚠️ Figyelmeztetés: leolvasztási kompresszorvédelemhez legalább ${hydraulicResults.recommendedBufferL} L fűtőpuffer biztosítása javasolt.`}
          </td>
        </tr>
      </tbody>
    </table>

    <div class="sign-section">
      <div class="sign-box">
        Helyszíni felmérő mérnök / Solar-Kit Partner
      </div>
      <div class="sign-box">
        Megrendelő / Tulajdonos ügyfél
      </div>
    </div>

    <div style="page-break-before: always; margin-top: 40px;">
      <h2>5. Gépészeti Hidraulikai Rendszerséma</h2>
      <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 25px; background-color: #ffffff; text-align: center;">
        ${document.querySelector('#print-diagram-container svg')?.outerHTML || '<p style="color:#64748b; font-size:11px;">A hidraulikai séma jelenleg nem áll rendelkezésre a nyomtatáshoz.</p>'}
      </div>
    </div>
    </div>
  </body>
</html>
    `;
  };

  // Printing View Trigger
  const handlePrint = () => {
    const htmlContent = generateHtmlReportContent();
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Kérjük engedélyezze a felugró ablakokat a jegyzőkönyv megtekintéséhez!');
      return;
    }
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 450);
  };

  // Browser download trigger
  const handleDownloadHtml = () => {
    const htmlContent = generateHtmlReportContent();
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SolarKit_Hotechnikai_Jegyzokonyv_${buildingData.location || 'survey'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Cloud Export to Google Drive using REST endpoint
  const handleGoogleDriveExport = async () => {
    if (!driveToken) {
      setDriveError('Kérjük adjon meg egy érvényes Google Drive hozzáférési tokent!');
      return;
    }
    setIsDriveExporting(true);
    setDriveError('');
    setDriveExportSuccess(null);

    const reportHtml = generateHtmlReportContent();

    try {
      const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${driveToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `SolarKit_Hotechnika_Jegyzokonyv_${buildingData.ownerName || 'Sizing'}.html`,
          mimeType: 'text/html',
        }),
      });

      if (!createResponse.ok) {
        throw new Error(`Google API hiba: ${createResponse.statusText}`);
      }

      const fileData = await createResponse.json();
      const fileId = fileData.id;

      const uploadResponse = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${driveToken}`,
            'Content-Type': 'text/html',
          },
          body: reportHtml,
        }
      );

      if (!uploadResponse.ok) {
        throw new Error(`Feltöltési hiba: ${uploadResponse.statusText}`);
      }

      setDriveExportSuccess(true);
    } catch (err: any) {
      console.error(err);
      setDriveError(err.message || 'Drive lekérdezési hiba. Ellenőrizze a tokent!');
      setDriveExportSuccess(false);
    } finally {
      setIsDriveExporting(false);
    }
  };

  // Investment details for UI
  const discountPct = buildingData.productDiscountPct ?? 0;
    const baseDevicePrice = selectedModel ? selectedModel.estimatedPriceHuf : 1800000;
    const discountedDevicePrice = baseDevicePrice * (1 - discountPct / 100);
  const totalInvestmentCost = baseDevicePrice + 2500000 + 1000000;

  return (
    <div className={`rounded border shadow-lg overflow-hidden animate-fadeIn ${isDark ? 'bg-slate-900 text-slate-100 border-slate-950' : 'bg-white text-slate-800 border-slate-200'}`} id="report-export-workspace">
      
      {/* Title block - aesthetics */}
      <div className={`px-4 py-2 border-b flex items-center justify-between ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex items-center gap-2">
          <FileDown className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className={`font-extrabold text-[11px] uppercase tracking-wider ${isDark ? 'text-slate-100' : 'text-slate-700'}`}>
            FELMÉRÉSI ÉS AJÁNLATADÁSI JEGYZŐKÖNYV (EXPERT SLA PLANNER)
          </span>
        </div>
        <span className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold ${isDark ? 'bg-emerald-950 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
          ADAPTIVE THEME
        </span>
      </div>

      <div className="p-3.5 space-y-3">
        
        {/* Dynamic Graphic Dashboard Card instead of boring narrative texts */}
        <div className={`p-3 rounded-lg border space-y-3.5 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
          <div className={`flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b pb-2 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <div>
              <span className={`text-[9px] font-bold uppercase tracking-wider block ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>MÉRETEZETT TULAJDONOS</span>
              <h3 className="text-sm font-extrabold text-blue-500 flex items-center gap-1.5 mt-0.5">
                <User className="w-4 h-4" />
                {buildingData.ownerName || 'Nincs megadva (Helyszíni felmérés ügyfél)'}
              </h3>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">FELMÉRÉS HELYSZÍNE</span>
              <h4 className="text-xs font-bold text-slate-200 mt-0.5 flex items-center sm:justify-end gap-1">
                <MapPin className="w-3.5 h-3.5 text-blue-500" />
                {buildingData.address || 'Kecskemét / Helyszíni felmérés'}
              </h4>
            </div>
          </div>

          {/* Minimal Gorgeous HUD Graphic Dashboard */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className={`p-2.5 rounded border ${isDark ? 'bg-slate-900 border-slate-850' : 'bg-white border-slate-200'}`}>
              <span className="text-[8px] text-slate-500 block uppercase font-bold text-slate-400">Beépített Alapterület</span>
              <span className="text-lg font-black font-mono text-slate-200 mt-1 block">{buildingData.heatedArea} m²</span>
            </div>

            <div className={`p-2.5 rounded border ${isDark ? 'bg-slate-900 border-slate-850' : 'bg-white border-slate-200'}`}>
              <span className="text-[8px] text-slate-500 block uppercase font-bold text-indigo-400">Transzmissziós Csúcs</span>
              <span className="text-lg font-black font-mono text-indigo-400 mt-1 block">{calcResults.heatLossKw.total} kW</span>
            </div>

            <div className={`p-2.5 rounded border ${isDark ? 'bg-slate-900 border-slate-850' : 'bg-white border-slate-200'}`}>
              <span className="text-[8px] text-slate-500 block uppercase font-bold text-emerald-400">Szezonális Szükséglet</span>
              <span className="text-lg font-black font-mono text-emerald-400 mt-1 block">{calcResults.yearlyEnergyKwh} kWh</span>
            </div>

            <div className={`p-2.5 rounded border ${isDark ? 'bg-slate-900 border-slate-850' : 'bg-white border-slate-200'}`}>
              <span className="text-[8px] text-slate-500 block uppercase font-bold text-orange-400">Kiválasztott fűtőfej</span>
              <span className="text-[10px] font-bold text-slate-100 mt-1 block overflow-hidden text-ellipsis whitespace-nowrap">
                {selectedModel ? selectedModel.name : 'Nincs kiválasztva'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Panel to Print/Download */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          
          {/* Printing action widget */}
          <div className={`p-3.5 rounded-lg border flex flex-col justify-between space-y-4 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="space-y-1">
              <span className="bg-emerald-950 text-emerald-400 border border-emerald-900 font-black text-[8px] px-1.5 py-0.2 rounded uppercase tracking-wider inline-block">
                A4 optimalizált PDF
              </span>
              <h3 className="text-xs font-bold tracking-tight text-slate-100 uppercase">Mérnöki Jegyzőkönyv Letöltése és Nyomtatása</h3>
              <p className="text-[10px] text-slate-450 leading-normal">
                Generáljon egy teljesen tiszta, professzionális, nyomtatható energetikai és hidraulikai kalkulációs jegyzőkönyvet. Mentse el közvetlenül PDF-ben a böngésző print funkciójával, vagy töltsön le egy önálló HTML fájlt.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1.5">
              <button
                onClick={handlePrint}
                className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow border border-emerald-700 uppercase"
              >
                <Printer className="w-3.5 h-3.5" />
                Személyes nyomtatás / PDF
              </button>
              <button
                onClick={handleDownloadHtml}
                className={`px-3 py-2 rounded text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${isDark ? 'bg-slate-900 hover:bg-slate-850 text-slate-300 border-slate-800' : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-300'}`}
              >
                <FileDown className="w-3.5 h-3.5" />
                HTML Fájl
              </button>
            </div>
          </div>

          {/* Drive cloud integration */}
          <div className={`p-3.5 rounded-lg border flex flex-col justify-between space-y-3.5 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="space-y-1">
              <span className="bg-blue-950 text-blue-400 border border-blue-900 font-black text-[8px] px-1.5 py-0.2 rounded uppercase tracking-wider inline-block">
                Drive szinkronizáció
              </span>
              <h3 className="text-xs font-bold tracking-tight text-slate-100 uppercase">Feltöltés közvetlenül Google Drive fiókjába</h3>
              <p className="text-[10px] text-slate-450 leading-normal">
                Másolja be a Google Drive OAuth hozzáférési tokent az alábbi mezőbe az azonnali, biztonságos és automatizált felhőtárhelyes feltöltéshez.
              </p>
            </div>

            <div className="space-y-2 pt-1.5 border-t border-slate-900">
              <div className="space-y-0.5">
                <label className="text-[8.5px] font-bold text-slate-500 uppercase block">Drive OAuth Access Token</label>
                <input
                  type="password"
                  value={driveToken}
                  onChange={(e) => setDriveToken(e.target.value)}
                  placeholder="Kezdés: paste Google Drive token..."
                  className={`w-full px-2 py-1.5 border rounded font-mono text-[10px] focus:outline-none focus:border-emerald-500 ${isDark ? 'bg-slate-900 border-slate-800 text-slate-200 focus:bg-slate-950' : 'bg-white border-slate-300 text-slate-800 focus:bg-slate-50'}`}
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleGoogleDriveExport}
                  disabled={isDriveExporting}
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded text-[11px] font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-blue-700 uppercase"
                >
                  {isDriveExporting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-300" />
                      Feltöltés folyamatban...
                    </>
                  ) : (
                    <>
                      <Cloud className="w-3.5 h-3.5" />
                      Exportálás Drive-ra
                    </>
                  )}
                </button>
              </div>

              {/* Status and feedback block */}
              {driveExportSuccess === true && (
                <div className="p-1 px-2.5 bg-emerald-950/40 border border-emerald-900 text-emerald-400 text-[10px] rounded flex items-center gap-1.5 font-bold">
                  <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                  Sikeres és verifikált Google Drive exportálás!
                </div>
              )}
              {driveError && (
                <div className="p-1.5 bg-red-950/40 border border-red-900 text-red-400 text-[9px] rounded font-semibold leading-relaxed">
                  {driveError}
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Security / Compliance note */}
        <div className={`p-2.5 border rounded flex items-start gap-2 font-medium ${isDark ? 'bg-slate-950 border-slate-850 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
          <ShieldCheck className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
          <p className="text-[9px] leading-relaxed text-justify">
            A Solar-Kit mérnöki modul az adatvédelmi jogszabályoknak (GDPR) megfelelően nem küldi el, nem tárolja és nem elemzi a megrendelők adatait külső felhőszerverekben. Az egész adatkezelés teljesen lokális, a Drive export közvetlenül az Ön böngészőjéből a Google API-kra irányul titkosított HTTPS protokollon keresztül.
          </p>
        </div>


        {/* Hidden SystemDiagram for safe light-mode printing */}
        <div id="print-diagram-container" className="hidden">
          <SystemDiagram 
            selectedModel={selectedModel} 
            hydraulicResults={hydraulicResults} 
            hydraulicState={hydraulicState} 
            theme="light" 
          />
        </div>
      </div>
    </div>
  );
};