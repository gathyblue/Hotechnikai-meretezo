import type { DiagramNode, Connection, SystemTopology, Port } from './types';
import type { HydraulicInput, HydraulicResults } from '../../types';

function port(id: string, s: Port['side'], o: number, d: Port['dir'], l?: string): Port {
  return { id, side: s, offset: o / 100, dir: d, label: l };
}

export interface LayoutParams {
  peakLoadKw: number;
  flowTemp: number;
  hydraulicState: HydraulicInput;
  hydraulicResults: HydraulicResults;
  selectedModel?: { name?: string; capacityA7W35?: number } | null;
}

export function getPortPos(n: DiagramNode, pid: string) {
  const p = n.ports.find(pr => pr.id === pid);
  if (!p) return { x: n.x + n.w / 2, y: n.y + n.h / 2 };
  if (p.side === 'left')   return { x: n.x, y: n.y + n.h * p.offset };
  if (p.side === 'right')  return { x: n.x + n.w, y: n.y + n.h * p.offset };
  if (p.side === 'top')    return { x: n.x + n.w * p.offset, y: n.y };
  return { x: n.x + n.w * p.offset, y: n.y + n.h };
}

export function buildTopology(p: LayoutParams): SystemTopology {
  const hs = p.hydraulicState;
  const r = p.hydraulicResults;
  const circs = hs.secondaryCircuits ?? [];
  const N = circs.length;
  const isHX = hs.includeHeatExchanger;
  const hasBuf = !isHX && (hs.additionalWaterVolumeL ?? 0) >= 50;
  const hasDhw = hs.includeDhwTank;

  const nodes: DiagramNode[] = [];
  const conns: Connection[] = [];
  const FY = 265; const RY = 440;
  const MX = 650; const WX = 170;
  const SZ = 14;

  // ── Building wall ──
  nodes.push({ id: 'wall', type: 'building-boundary', x: WX, y: 20, w: 8, h: 480, ports: [], data: {} });

  // ── Heat pump ──
  const hpY = 230;
  nodes.push({
    id: 'hp', type: 'heat-pump', x: 25, y: hpY, w: 110, h: 220,
    ports: [port('hp-f', 'right', 19, 'out'), port('hp-r', 'right', 81, 'in')],
    data: { label: p.selectedModel?.name?.substring(0, 16) ?? 'R290 HP', cap: p.selectedModel?.capacityA7W35 ?? '' },
  });

  // ── Primary flow components ──
  const FC: [string, string, number][] = [
    ['bv1', 'ball-valve', WX + 8],
    ['twv', 'three-way-valve', WX + 36],
    ['gauge', 'pressure-gauge', WX + 68],
    ['air', 'air-vent', WX + 96],
    ['safety', 'safety-valve', WX + 128],
  ];
  for (const [id, type, x] of FC) {
    const extra = type === 'three-way-valve' ? 2 : 0;
    const ports: Port[] = [port(`${id}-l`, 'left', 50, 'in'), port(`${id}-r`, 'right', 50, 'out')];
    if (type === 'three-way-valve') ports.push(port(`${id}-u`, 'top', 50, 'out'));
    nodes.push({
      id, type: type as any, x, y: FY - SZ / 2, w: SZ, h: SZ + extra,
      ports,
      data: id === 'safety' ? { pr: `${hs.safetyValvePressure ?? 3} bar` } : {},
    });
  }

  conns.push({ id: 'c0', fromNode: 'hp', fromPort: 'hp-f', toNode: 'bv1', toPort: 'bv1-l', style: 'primary', label: `E ${r.primaryFlowTempC}°C` });
  conns.push({ id: 'c1', fromNode: 'bv1', fromPort: 'bv1-r', toNode: 'twv', toPort: 'twv-l', style: 'primary' });
  conns.push({ id: 'c2', fromNode: 'twv', fromPort: 'twv-r', toNode: 'gauge', toPort: 'gauge-l', style: 'primary' });
  conns.push({ id: 'c3', fromNode: 'gauge', fromPort: 'gauge-r', toNode: 'air', toPort: 'air-l', style: 'primary' });
  conns.push({ id: 'c4', fromNode: 'air', fromPort: 'air-r', toNode: 'safety', toPort: 'safety-l', style: 'primary', label: `${r.primaryFlowRateLh} L/h` });

  // ── DHW tank ──
  if (hasDhw) {
    nodes.push({
      id: 'dhw', type: 'dhw-tank', x: 270, y: 40, w: 75, h: 135,
      ports: [port('dhw-in', 'left', 28, 'in'), port('dhw-out', 'left', 72, 'out')],
      data: { vol: hs.dhwTankVolumeL ?? 200 },
    });
    conns.push({ id: 'c-dhw-f', fromNode: 'twv', fromPort: 'twv-u', toNode: 'dhw', toPort: 'dhw-in', style: 'dhw', label: `${r.primaryFlowTempC}°C` });
    nodes.push({
      id: 'nrv', type: 'non-return-valve', x: 280, y: RY - SZ / 2, w: SZ, h: SZ + 6,
      ports: [port('nrv-r', 'right', 50, 'in'), port('nrv-l', 'left', 50, 'out')],
      data: {},
    });
    conns.push({ id: 'c-dhw-r', fromNode: 'dhw', fromPort: 'dhw-out', toNode: 'nrv', toPort: 'nrv-r', style: 'dhw', isReturn: true, label: `${r.primaryReturnTempC}°C` });
    conns.push({ id: 'c-nrv-ret', fromNode: 'nrv', fromPort: 'nrv-l', toNode: 'bv2', toPort: 'bv2-r', style: 'dhw', isReturn: true });
  }

  // ── Primary return components ──
  const RC: [string, string, number][] = [
    ['yf', 'y-filter', 320],
    ['bv2', 'ball-valve', WX + 42],
  ];
  for (const [id, type, x] of RC) {
    nodes.push({
      id, type: type as any, x, y: RY - SZ / 2, w: SZ, h: SZ,
      ports: [port(`${id}-l`, 'left', 50, 'in'), port(`${id}-r`, 'right', 50, 'out')],
      data: {},
    });
  }

  // Expansion vessel
  nodes.push({
    id: 'exp', type: 'expansion-vessel', x: 230, y: RY - 15, w: 20, h: 30,
    ports: [port('exp-t', 'top', 50, 'in')],
    data: { vol: isHX ? `${r.primaryVesselSizeL} L` : `${r.vesselSizeL} L`, p: `p₀=${r.prechargeCalculated} / pₑ=${r.finalCalculated} bar` },
  });

  // ── Coupling zone ──
  if (isHX) {
    const hxX = 380;
    nodes.push({
      id: 'hx', type: 'heat-exchanger', x: hxX, y: FY + 20, w: 32, h: 90,
      ports: [
        port('hx-pi', 'top', 20, 'in'), port('hx-po', 'bottom', 20, 'out'),
        port('hx-so', 'top', 80, 'out'), port('hx-si', 'bottom', 80, 'in'),
      ],
      data: { m: r.recommendedExchangerModel?.substring(0, 28), a: `${r.heatExchangerAreaM2} m²` },
    });
    conns.push({ id: 'c-hx-pi', fromNode: 'safety', fromPort: 'safety-r', toNode: 'hx', toPort: 'hx-pi', style: 'primary' });
    conns.push({ id: 'c-hx-po', fromNode: 'hx', fromPort: 'hx-po', toNode: 'yf', toPort: 'yf-r', style: 'primary', isReturn: true, label: `${r.primaryReturnTempC}°C` });
    conns.push({ id: 'c-hx-exp', fromNode: 'hx', fromPort: 'hx-po', toNode: 'exp', toPort: 'exp-t', style: 'primary' });

    nodes.push({
      id: 'pump-sec', type: 'circulator-pump', x: 500, y: FY - 12, w: 26, h: 24,
      ports: [port('ps-l', 'left', 50, 'in'), port('ps-r', 'right', 50, 'out')],
      data: { label: 'Szekunder\nszivattyú' },
    });
    conns.push({ id: 'c-hx-so', fromNode: 'hx', fromPort: 'hx-so', toNode: 'pump-sec', toPort: 'ps-l', style: 'secondary' });
    conns.push({ id: 'c-ps-m', fromNode: 'pump-sec', fromPort: 'ps-r', toNode: 'manifold', toPort: 'man-fi', style: 'secondary', label: `${r.secondaryFlowTempC}°C | ${r.secondaryFlowRateLh} L/h` });
    conns.push({ id: 'c-m-hx-si', fromNode: 'manifold', fromPort: 'man-ro', toNode: 'hx', toPort: 'hx-si', style: 'secondary', isReturn: true });
  } else if (hasBuf) {
    nodes.push({
      id: 'buffer', type: 'buffer-tank', x: 370, y: FY - 40, w: 55, h: 190,
      ports: [
        port('b-fi', 'left', 20, 'in'), port('b-fo', 'right', 20, 'out'),
        port('b-ri', 'right', 80, 'in'), port('b-ro', 'left', 80, 'out'),
      ],
      data: { vol: hs.additionalWaterVolumeL },
    });
    conns.push({ id: 'c-b-fi', fromNode: 'safety', fromPort: 'safety-r', toNode: 'buffer', toPort: 'b-fi', style: 'primary', label: `${r.primaryFlowTempC}°C` });
    conns.push({ id: 'c-b-fo', fromNode: 'buffer', fromPort: 'b-fo', toNode: 'manifold', toPort: 'man-fi', style: 'primary' });
    conns.push({ id: 'c-b-ro', fromNode: 'buffer', fromPort: 'b-ro', toNode: 'yf', toPort: 'yf-r', style: 'primary', isReturn: true, label: `${r.primaryReturnTempC}°C` });
    conns.push({ id: 'c-m-b-ri', fromNode: 'manifold', fromPort: 'man-ro', toNode: 'buffer', toPort: 'b-ri', style: 'primary', isReturn: true });
    conns.push({ id: 'c-b-exp', fromNode: 'buffer', fromPort: 'b-ro', toNode: 'exp', toPort: 'exp-t', style: 'primary' });
  } else {
    conns.push({ id: 'c-dir-f', fromNode: 'safety', fromPort: 'safety-r', toNode: 'manifold', toPort: 'man-fi', style: 'primary', label: `${r.primaryFlowTempC}°C | ${r.primaryFlowRateLh} L/h` });
    conns.push({ id: 'c-dir-r', fromNode: 'manifold', fromPort: 'man-ro', toNode: 'yf', toPort: 'yf-r', style: 'primary', isReturn: true });
    conns.push({ id: 'c-dir-exp', fromNode: 'yf', fromPort: 'yf-r', toNode: 'exp', toPort: 'exp-t', style: 'primary' });
  }

  // ── Return line final ──
  conns.push({ id: 'c-yf-bv2', fromNode: 'yf', fromPort: 'yf-l', toNode: 'bv2', toPort: 'bv2-r', style: 'primary', isReturn: true });
  conns.push({ id: 'c-bv2-hp', fromNode: 'bv2', fromPort: 'bv2-l', toNode: 'hp', toPort: 'hp-r', style: 'primary', isReturn: true, label: `${r.primaryReturnTempC}°C` });

  // ── Manifold ──
  const mh = Math.max(50, N * 60 + 20);
  const my = Math.round(220 + (260 - mh) / 2);
  const mports: Port[] = [
    port('man-fi', 'left', 18, 'in'),
    port('man-ro', 'left', 82, 'out'),
  ];
  for (let i = 0; i < N; i++) {
    const pct = N > 1 ? 12 + i * 76 / (N - 1) : 50;
    mports.push(port(`man-fo-${i}`, 'right', Math.round(pct), 'out'));
    mports.push(port(`man-ri-${i}`, 'right', Math.round(pct), 'in'));
  }
  nodes.push({ id: 'manifold', type: 'manifold', x: MX, y: my, w: 28, h: mh, ports: mports, data: { n: N } });

  // ── Circuits ──
  for (let i = 0; i < N; i++) {
    const c = circs[i];
    const cid = `c${i}`;
    const pct = N > 1 ? 12 + i * 76 / (N - 1) : 50;
    const cy = Math.round(my + mh * pct / 100);
    const isFloor = c.type === 'floor';
    const cx = MX + 28 + 26;

    const pumpId = `p${i}`;
    nodes.push({
      id: pumpId, type: 'circulator-pump', x: cx, y: cy - 12, w: 24, h: 24,
      ports: [port(`${pumpId}-l`, 'left', 50, 'in'), port(`${pumpId}-r`, 'right', 50, 'out')],
      data: { label: isFloor ? 'PF' : 'RAD' },
    });

    if (isFloor) {
      const mixId = `m${i}`;
      nodes.push({
        id: mixId, type: 'three-way-valve', x: cx - 18, y: cy - 8, w: 16, h: 16,
        ports: [port(`${mixId}-l`, 'left', 50, 'in'), port(`${mixId}-r`, 'right', 50, 'out'), port(`${mixId}-b`, 'bottom', 50, 'in')],
        data: { label: 'Keverő' },
      });
      conns.push({ id: `c-man-${i}-mix`, fromNode: 'manifold', fromPort: `man-fo-${i}`, toNode: mixId, toPort: `${mixId}-l`, style: 'primary' });
      conns.push({ id: `c-mix-${i}-p`, fromNode: mixId, fromPort: `${mixId}-r`, toNode: pumpId, toPort: `${pumpId}-l`, style: 'primary' });
    } else {
      conns.push({ id: `c-man-${i}-p`, fromNode: 'manifold', fromPort: `man-fo-${i}`, toNode: pumpId, toPort: `${pumpId}-l`, style: 'primary' });
    }

    const emy = 85;
    nodes.push({
      id: cid, type: 'emitter-circuit', x: cx + 24, y: emy, w: 80, h: 22,
      ports: [port(`${cid}-in`, 'bottom', 50, 'in'), port(`${cid}-out`, 'bottom', 50, 'out')],
      data: { label: c.label, type: c.type, flowTempC: c.flowTempC, circuit: c },
    });

    conns.push({
      id: `c-p-${i}-up`, fromNode: pumpId, fromPort: `${pumpId}-r`, toNode: cid, toPort: `${cid}-in`,
      style: 'primary', label: `${c.type === 'floor' ? 'PF' : 'RAD'} ${c.label}`,
    });

    conns.push({
      id: `c-${i}-ret`, fromNode: cid, fromPort: `${cid}-out`, toNode: 'manifold', toPort: `man-ri-${i}`,
      style: 'primary', isReturn: true,
    });
  }

  return { nodes, connections: conns };
}
