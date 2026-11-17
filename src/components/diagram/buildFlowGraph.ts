import { Edge, Node } from '@xyflow/react';
import type { HydraulicInput, HydraulicResults, HeatPumpModel } from '../../types';
import { normalizeCouplingType } from '../../types';

/* ─── Típusok ─────────────────────────────────────────────────────────── */
type Port = { id: string; side: 'left' | 'right' | 'top' | 'bottom'; offset: number; dir: 'in' | 'out' };
type PipeStyle = 'primary' | 'secondary' | 'dhw';

const SIZES: Record<string, [number, number]> = {
  'heat-pump': [140, 200], 'bivalent-boiler': [90, 170], 'primary-pump': [34, 34],
  'three-way-dhw': [48, 48], 'dhw-tank': [100, 180],
  'buffer-tank': [80, 200], 'low-loss-header': [80, 200], 'heat-exchanger': [60, 140],
  'three-way-valve': [44, 44], 'secondary-pump': [40, 40], 'manifold': [150, 70],
  'circulator-pump': [34, 34], 'emitter-circuit': [100, 36], 'expansion-vessel': [40, 40],
};
const C = { primary: '#dc2626', return: '#2563eb', secondary: '#059669', dhw: '#d97706' };
const COLORS: Record<string, string> = {
  'heat-pump': '#4f46e5', 'bivalent-boiler': '#dc2626', 'dhw-tank': '#d97706',
  'buffer-tank': '#7c3aed', 'low-loss-header': '#0284c7', 'heat-exchanger': '#0d9488',
  'manifold': '#475569', 'emitter-circuit': '#059669', 'three-way-valve': '#d97706',
  'three-way-dhw': '#d97706', 'circulator-pump': '#2563eb', 'secondary-pump': '#059669',
  'primary-pump': '#2563eb', 'expansion-vessel': '#475569',
};
function edgeColor(style: PipeStyle, isReturn?: boolean) {
  if (style === 'dhw') return C.dhw;
  if (isReturn) return C.return;
  return style === 'secondary' ? C.secondary : C.primary;
}
const p = (id: string, side: Port['side'], offset: number, dir: Port['dir']): Port => ({ id, side, offset, dir });

/** A 4 kapcsolási mód 4 fő portja — szemantikusan azonos, csak az ID-k khácoznak. */
const COUPLING_PORTS: Record<string, { fi: string; fo: string; ri: string; ro: string; bi: string; bo: string } | null> = {
  'buffer-dhw': { fi: 'b-fi', fo: 'b-fo', ri: 'b-ri', ro: 'b-ro', bi: 'b-bi', bo: 'b-bo' },
  'low-loss-header': { fi: 'llh-pi', fo: 'llh-po', ri: 'llh-ri', ro: 'llh-ro', bi: 'llh-bi', bo: 'llh-bo' },
  'heat-exchanger': { fi: 'hx-pi', fo: 'hx-so', ri: 'hx-si', ro: 'hx-po', bi: 'hx-bi', bo: 'hx-bo' },
  'direct': null,
};

const couplingNodeType: Record<string, string> = {
  'buffer-dhw': 'buffer-tank', 'low-loss-header': 'low-loss-header', 'heat-exchanger': 'heat-exchanger',
};

/* ─── Fő gráfépítő ────────────────────────────────────────────────────── */
export function buildFlowGraph(
  hs: HydraulicInput,
  r: HydraulicResults,
  theme: 'light' | 'dark',
  selectedModel?: HeatPumpModel | null
): { nodes: Node[]; edges: Edge[] } {
  const isDark = theme === 'dark';
  const coupling = normalizeCouplingType(hs.couplingType);
  const N = (hs.secondaryCircuits ?? []).length;
  const hasDhw = !!hs.includeDhwTank;
  const bivalent = !!hs.bivalentSource && hs.bivalentSource !== 'none';
  const CP = COUPLING_PORTS[coupling];
  const couplingId = coupling === 'buffer-dhw' ? 'buffer' : coupling === 'low-loss-header' ? 'llh' : 'hx';
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const node = (id: string, nodeType: string, ports: Port[], x: number, y: number,
    label = '', sub = '', tooltip = '', deviceData: Record<string, any> = {}) => {
    const [w, h] = SIZES[nodeType] ?? [40, 40];
    nodes.push({
      id, type: 'system', position: { x, y }, draggable: true,
      data: { nodeType, w, h, ports, label, sub, tooltip, isDark, deviceData },
    });
  };
  const edge = (fromNode: string, fromPort: string, toNode: string, toPort: string,
    style: PipeStyle, isReturn = false, label = '') => {
    const color = edgeColor(style, isReturn);
    edges.push({
      id: `e-${edges.length}`, source: fromNode, sourceHandle: fromPort,
      target: toNode, targetHandle: toPort,
      type: 'smoothstep', animated: true,
      style: { stroke: color, strokeWidth: 2 },
      markerEnd: { type: 'arrowclosed' as any, color, width: 10, height: 10 },
      label, labelStyle: { fill: isDark ? '#cbd5e1' : '#475569', fontSize: 8, fontWeight: 600 },
      labelBgStyle: { fill: isDark ? '#0f172a' : '#ffffff', fillOpacity: 0.9 },
      labelBgPadding: [4, 2] as [number, number], labelBgBorderRadius: 4,
    } as Edge);
  };
  const nm = selectedModel?.name || 'Hőszivattyú';
  const cap = selectedModel?.capacityA7W35 ? `${selectedModel.capacityA7W35} kW` : '';

  /* ── Hőszivattyú ── */
  node('hp', 'heat-pump', [p('hp-f', 'right', 0.22, 'out'), p('hp-r', 'right', 0.78, 'in')],
    20, 340, nm, cap, nm, { label: nm, cap });

  /* ── Bivalens kazán + primer szivattyú ── */
  if (bivalent) {
    node('boiler', 'bivalent-boiler', [p('boiler-f', 'right', 0.3, 'out'), p('boiler-r', 'right', 0.7, 'in')],
      20, 20, hs.bivalentSource === 'gas-boiler' ? 'Gázkazán' : 'Elektromos betét',
      hs.bivalentBoilerPowerKw ? `${hs.bivalentBoilerPowerKw} kW` : '',
      undefined, { kw: hs.bivalentBoilerPowerKw ? `${hs.bivalentBoilerPowerKw} kW` : '' });
    node('biv-pump', 'primary-pump', [p('bp-l', 'left', 0.5, 'in'), p('bp-r', 'right', 0.5, 'out')], 130, 54, 'Kazán pumpa', undefined, undefined, { label: 'Kp' });
  }

  /* ── HMV + 3-járatú szelep (mindig a pufferek ELŐTT) ── */
  if (hasDhw) {
    node('twv', 'three-way-dhw', [p('twv-in', 'left', 0.5, 'in'), p('twv-out', 'right', 0.5, 'out'), p('twv-dhw', 'top', 0.5, 'out')],
      190, 360, '3-járatú', 'HMV prioritás');
    node('dhw', 'dhw-tank', [p('dhw-in', 'left', 0.28, 'in'), p('dhw-out', 'left', 0.72, 'out')],
      330, 20, `HMV ${hs.dhwVolumeL || 200} L`, '3-járatú', undefined, { vol: hs.dhwVolumeL || 200, connection: 'three-way-valve' });
  }

  /* ── Kapcsolási elem ── */
  if (CP) {
    const type = couplingNodeType[coupling];
    const ports = coupling === 'heat-exchanger'
      ? [p('hx-pi', 'left', 0.2, 'in'), p('hx-po', 'left', 0.8, 'out'), p('hx-so', 'right', 0.2, 'out'), p('hx-si', 'right', 0.8, 'in'), p('hx-bi', 'top', 0.35, 'in'), p('hx-bo', 'bottom', 0.65, 'out')]
      : [
          p(CP.fi, 'left', 0.18, 'in'), p(CP.fo, 'right', 0.18, 'out'),
          p(CP.ri, 'right', 0.82, 'in'), p(CP.ro, 'left', 0.82, 'out'),
          p(CP.bi, 'top', 0.35, 'in'), p(CP.bo, 'bottom', 0.65, 'out'),
        ];
    const label = coupling === 'buffer-dhw' ? `Puffer ${hs.bufferVolumeL || 100} L`
      : coupling === 'low-loss-header' ? (r.llhRecommendedDiam || 'Hidrováltó')
        : (r.heatExchangerAreaM2 ? `${r.heatExchangerAreaM2} m²` : 'Hőcserélő');
    node(couplingId, type, ports, coupling === 'heat-exchanger' ? 340 : 330, coupling === 'heat-exchanger' ? 360 : 340,
      label, coupling === 'low-loss-header' ? `${r.llhFlowRateLh || 0} L/h` : '', undefined,
      { vol: coupling === 'buffer-dhw' ? (hs.bufferVolumeL || 100) : (hs.bufferVolumeL || 0), diam: r.llhRecommendedDiam, q: `${r.llhFlowRateLh || 0} L/h`, a: r.heatExchangerAreaM2 ? `${r.heatExchangerAreaM2} m²` : '' });
  }

  /* ── Biválens keverő (csak direct + bivalens) ── */
  if (bivalent && coupling === 'direct') {
    node('bivmix', 'three-way-valve', [p('bm-hi', 'left', 0.5, 'in'), p('bm-ho', 'right', 0.5, 'out'), p('bm-bi', 'top', 0.5, 'in'), p('bm-bo', 'bottom', 0.5, 'out')],
      330, 360, 'Keverő');
  }

  /* ── Szekunder szivattyú — CSAK leválasztott módban ── */
  if (coupling !== 'direct') {
    node('sec-pump', 'secondary-pump', [p('ps-l', 'left', 0.5, 'in'), p('ps-r', 'right', 0.5, 'out')],
      470, 366, 'Szekunder pumpa', r.secondaryPumpModel?.substring(0, 22) || '', undefined, { model: r.secondaryPumpModel?.substring(0, 22) });
  }

  /* ── Osztó + körök ── */
  const manPorts: Port[] = [p('man-fi', 'left', 0.18, 'in'), p('man-ro', 'left', 0.82, 'out')];
  if (N > 1) {
    for (let i = 0; i < N; i++) {
      const off = (12 + i * 76 / (N - 1)) / 100;
      manPorts.push(p(`man-fo-${i}`, 'right', off, 'out'), p(`man-ri-${i}`, 'right', off, 'in'));
    }
    node('manifold', 'manifold', manPorts, 580, 320, 'Osztó-gyűjtő', `${N} kör`, undefined, { n: N });
  }
  for (let i = 0; i < N; i++) {
    const c = hs.secondaryCircuits![i];
    const cx = 760, cy = 320 + i * 80;
    if (N > 1) {
      node(`cp-${i}`, 'circulator-pump', [p(`cpi-l`, 'left', 0.5, 'in'), p(`cpi-r`, 'right', 0.5, 'out')], cx, cy, c.type === 'floor' ? 'PF' : 'RAD', undefined, undefined, { label: c.type === 'floor' ? 'PF' : 'RAD' });
      if (c.type === 'floor') {
        node(`mix-${i}`, 'three-way-valve', [p('mixi-l', 'left', 0.5, 'in'), p('mixi-r', 'right', 0.5, 'out'), p('mixi-b', 'bottom', 0.5, 'in')], 700, 314 + i * 80, 'Keverő');
      }
    }
    node(`c-${i}`, 'emitter-circuit', [p('ci-in', 'bottom', 0.5, 'in'), p('ci-out', 'bottom', 0.5, 'out')],
      N > 1 ? 870 : 740, N > 1 ? 310 + i * 80 : 360, c.label || `${i + 1}. kör`, `${c.flowTempC ?? 55}°C`, undefined,
      { type: c.type, flowTempC: c.flowTempC ?? 55 });
  }

  /* ── Tágulási tartály ── */
  node('exp', 'expansion-vessel', [p('exp-t', 'top', 0.5, 'in')], 250, 520,
    r.vesselSizeL ? `${r.vesselSizeL} L` : '', undefined, undefined, { vol: r.vesselSizeL ? `${r.vesselSizeL} L` : '' });

  /* ═══════════════════════════════════════════════════════════════════════
     ÉLEK — közvetlenül, átugrás nélkül
     ═══════════════════════════════════════════════════════════════════════ */
  const flowIn = CP ? `${couplingId}.${CP.fi}` : (bivalent ? 'bivmix.bm-hi' : (coupling !== 'direct' ? 'sec-pump.ps-l' : (N > 1 ? 'manifold.man-fi' : 'c-0.ci-in')));
  const heatOut = CP ? `${couplingId}.${CP.fo}` : null;
  const heatRet = CP ? `${couplingId}.${CP.ri}` : null;
  const priRet = CP ? `${couplingId}.${CP.ro}` : (bivalent ? 'bivmix.bm-bo' : 'hp.hp-r');

  // 1. HP előremenő → szelep / fűtési ág
  if (hasDhw) edge('hp', 'hp-f', 'twv', 'twv-in', 'primary', false, `E ${r.primaryFlowTempC}°C`);
  else edge('hp', 'hp-f', flowIn.split('.')[0], flowIn.split('.')[1], 'primary', false, `E ${r.primaryFlowTempC}°C`);

  // 2. HMV ág — legkorábbi lecsatlakozás, közvetlenül a HP visszatérőre
  if (hasDhw) {
    edge('twv', 'twv-dhw', 'dhw', 'dhw-in', 'dhw', false, `${r.primaryFlowTempC}°C`);
    edge('dhw', 'dhw-out', 'hp', 'hp-r', 'dhw', true, `${r.primaryReturnTempC}°C`);
    edge('twv', 'twv-out', flowIn.split('.')[0], flowIn.split('.')[1], 'primary');
  }

  // 3. Bivalens kazán csatlakozása
  if (bivalent) {
    edge('boiler', 'boiler-f', 'biv-pump', 'bp-l', 'primary');
    if (CP) {
      edge('biv-pump', 'bp-r', couplingId, CP.bi, 'primary');
      edge(couplingId, CP.bo, 'boiler', 'boiler-r', 'primary', true);
    } else {
      edge('biv-pump', 'bp-r', 'bivmix', 'bm-bi', 'primary');
      edge('bivmix', 'bm-bo', 'boiler', 'boiler-r', 'primary', true);
    }
  }

  // 4. Leválasztott mód: coupling → szekunder pumpa → osztó/kör
  if (coupling !== 'direct' && heatOut) {
    edge(couplingId, CP!.fo, 'sec-pump', 'ps-l', 'secondary');
    if (N > 1) edge('sec-pump', 'ps-r', 'manifold', 'man-fi', 'secondary', false, `${r.secondaryFlowTempC}°C | ${r.secondaryFlowRateLh} L/h`);
    else edge('sec-pump', 'ps-r', 'c-0', 'ci-in', 'secondary', false, `${r.secondaryFlowTempC}°C | ${r.secondaryFlowRateLh} L/h`);
  }

  // 5. Körök
  if (N > 1) {
    for (let i = 0; i < N; i++) {
      const c = hs.secondaryCircuits![i];
      const target = c.type === 'floor' ? `mix-${i}.mixi-l` : `cp-${i}.cpi-l`;
      edge('manifold', `man-fo-${i}`, target.split('.')[0], target.split('.')[1], 'secondary');
      if (c.type === 'floor') edge(`mix-${i}`, 'mixi-r', `cp-${i}`, 'cpi-l', 'primary');
      edge(`cp-${i}`, 'cpi-r', `c-${i}`, 'ci-in', 'primary', false, `${c.type === 'floor' ? 'PF' : 'RAD'} ${c.label}`);
      edge(`c-${i}`, 'ci-out', 'manifold', `man-ri-${i}`, 'secondary', true);
    }
    // osztó visszatérő → primer oldal
    if (heatRet) edge('manifold', 'man-ro', couplingId, CP!.ri, 'secondary', true);
    else edge('manifold', 'man-ro', 'hp', 'hp-r', 'primary', true);
  } else {
    // 1 kör: közvetlenül a primer oldalra
    if (heatRet) edge('c-0', 'ci-out', couplingId, CP!.ri, 'secondary', true);
    else edge('c-0', 'ci-out', 'hp', 'hp-r', 'primary', true);
  }

  // 6. Primer visszatérő → HP + tágulási tartály
  if (heatRet) {
    edge(couplingId, CP!.ro, 'hp', 'hp-r', 'primary', true, `${r.primaryReturnTempC}°C`);
    edge(couplingId, CP!.ro, 'exp', 'exp-t', 'primary');
  } else if (!hasDhw) {
    edge('hp', 'hp-r', 'exp', 'exp-t', 'primary');
  }

  return { nodes, edges };
}
