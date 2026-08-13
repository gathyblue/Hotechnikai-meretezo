import React, { useMemo } from 'react';
import type { HydraulicInput, HydraulicResults } from '../../types';
import { buildTopology, getPortPos, type LayoutParams } from './layout';
import type { DiagramNode, Connection, PipeStyle } from './types';

interface Props {
  selectedModel?: { name?: string; capacityA7W35?: number } | null;
  hydraulicState: HydraulicInput;
  hydraulicResults: HydraulicResults;
  theme?: 'light' | 'dark';
  peakLoadKw: number;
  flowTemp: number;
}

const C = {
  f: '#dc2626', r: '#2563eb', d: '#d97706', s: '#059669',
  w: { l: '#94a3b8', d: '#475569' },
  g: { l: '#f1f5f9', d: '#1e293b' },
  sub: { l: '#64748b', d: '#94a3b8' },
  fg: { l: '#1e293b', d: '#e2e8f0' },
};
function id(t: string) { return t === 'dark'; }
function col(style: PipeStyle, ret?: boolean) {
  if (style === 'dhw') return C.d; if (ret) return C.r; return style === 'secondary' ? C.s : C.f;
}

function Ppath(x1: number, y1: number, x2: number, y2: number) {
  const dx = Math.abs(x1 - x2), dy = Math.abs(y1 - y2);
  if (dy < 0.5) return `M ${x1},${y1} H ${x2}`;
  if (dx < 0.5) return `M ${x1},${y1} V ${y2}`;
  const mx = (x1 + x2) / 2;
  return `M ${x1},${y1} H ${mx} V ${y2} H ${x2}`;
}

function FlowArrow({ x, y, d, c }: { x: number; y: number; d: string; c: string }) {
  const s = 5;
  let p;
  if (d === 'r') p = `${x - s},${y - s} ${x + s},${y} ${x - s},${y + s}`;
  else if (d === 'l') p = `${x + s},${y - s} ${x - s},${y} ${x + s},${y + s}`;
  else if (d === 'u') p = `${x - s},${y + s} ${x},${y - s} ${x + s},${y + s}`;
  else p = `${x - s},${y - s} ${x},${y + s} ${x + s},${y - s}`;
  return <polygon points={p} fill={c} opacity={0.85} />;
}

// ── Symbol components ──

function HeatPumpSvg({ x, y, w, h, fg, wl, sb, nd }: any) {
  const fy = nd.ports.find((p: any) => p.id === 'hp-f');
  const ry = nd.ports.find((p: any) => p.id === 'hp-r');
  const yy = fy ? y + h * fy.offset : y + 42;
  const rr = ry ? y + h * ry.offset : y + 178;
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={0} y={0} width={w} height={h} rx={6} fill="white" stroke={fg} strokeWidth={2} />
      <circle cx={w / 2} cy={55} r={24} fill="none" stroke={fg} strokeWidth={1.5} />
      <circle cx={w / 2} cy={55} r={17} fill="none" stroke={wl} strokeWidth={1} strokeDasharray="4,3" />
      <g transform={`translate(${w / 2},55)`}>
        <line x1={-13} y1={0} x2={13} y2={0} stroke={fg} strokeWidth={1} />
        <line x1={0} y1={-13} x2={0} y2={13} stroke={fg} strokeWidth={1} />
        <circle cx={0} cy={0} r={3.5} fill="none" stroke={fg} strokeWidth={1.5} />
      </g>
      <text x={w / 2} y={110} fill={fg} fontSize={10} fontWeight="bold" textAnchor="middle">HŐSZIVATTYÚ</text>
      <text x={w / 2} y={122} fill={sb} fontSize={6.5} textAnchor="middle">R290 monoblokk</text>
      {nd.data?.label && <text x={w / 2} y={95} fill="#16a34a" fontSize={6} fontFamily="monospace" textAnchor="middle">{nd.data.label}</text>}
      <line x1={w} y1={yy} x2={w + 10} y2={yy} stroke={C.f} strokeWidth={2.5} />
      <line x1={w} y1={rr} x2={w + 10} y2={rr} stroke={C.r} strokeWidth={2.5} />
      <text x={w + 12} y={yy + 4} fill={C.f} fontSize={7} fontWeight="bold">E</text>
      <text x={w + 12} y={rr + 4} fill={C.r} fontSize={7} fontWeight="bold">V</text>
    </g>
  );
}

function BallValveSvg({ x, y, w, h, fg, onR }: any) {
  const r = Math.min(w, h) / 2 - 1;
  const cx = w / 2, cy = h / 2;
  const c = onR ? C.r : C.f;
  return (
    <g transform={`translate(${x},${y})`}>
      <circle cx={cx} cy={cy} r={r} fill="white" stroke={c} strokeWidth={1.5} />
      <line x1={cx - r + 1} y1={cy - r + 1} x2={cx + r - 1} y2={cy + r - 1} stroke={c} strokeWidth={1.5} />
    </g>
  );
}

function ThreeWayValveSvg({ x, y, w, h, fg, nd }: any) {
  const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 1;
  const isMix = nd.id.startsWith('m');
  const c = C.f;
  if (isMix) {
    return (
      <g transform={`translate(${x},${y})`}>
        <circle cx={cx} cy={cy} r={r} fill="white" stroke={c} strokeWidth={1.5} />
        <line x1={cx - 5} y1={cy - 4} x2={cx + 5} y2={cy + 4} stroke={c} strokeWidth={1.2} />
        <line x1={cx} y1={cy} x2={cx} y2={h} stroke={c} strokeWidth={1.2} />
      </g>
    );
  }
  return (
    <g transform={`translate(${x},${y})`}>
      <circle cx={cx} cy={cy} r={r} fill="white" stroke={c} strokeWidth={1.5} />
      <line x1={cx - r + 1} y1={cy} x2={cx + r - 1} y2={cy} stroke={c} strokeWidth={1.2} />
      <line x1={cx} y1={cy - r + 1} x2={cx} y2={cy + r - 1} stroke={c} strokeWidth={1.2} />
      <circle cx={cx} cy={cy} r={1.8} fill={c} />
    </g>
  );
}

function PressureGaugeSvg({ x, y, w, h, fg }: any) {
  const cx = w / 2, cy = h / 2;
  return (
    <g transform={`translate(${x},${y})`}>
      <circle cx={cx} cy={cy} r={cx - 1} fill="white" stroke={fg} strokeWidth={1.5} />
      <line x1={cx - 3} y1={cy + 2} x2={cx + 3} y2={cy - 3} stroke={fg} strokeWidth={1.2} />
      <circle cx={cx} cy={cy} r={1.2} fill={fg} />
    </g>
  );
}

function AirVentSvg({ x, y, w, h, fg }: any) {
  const cx = w / 2;
  return (
    <g transform={`translate(${x},${y})`}>
      <path d={`M2,3 Q${cx},${-2} ${w - 2},3`} fill="none" stroke={fg} strokeWidth={1.5} />
      <line x1={cx} y1={3} x2={cx} y2={h - 3} stroke={fg} strokeWidth={1.5} />
      <circle cx={cx} cy={h - 1} r={1.5} fill={fg} />
    </g>
  );
}

function SafetyValveSvg({ x, y, w, h, fg, nd }: any) {
  const cx = w / 2, cy = h / 2;
  return (
    <g transform={`translate(${x},${y})`}>
      <circle cx={cx} cy={cy} r={cx - 1} fill="white" stroke={C.f} strokeWidth={1.5} />
      <line x1={cx - 3} y1={cy - 3} x2={cx + 3} y2={cy + 3} stroke={C.f} strokeWidth={1.5} />
      <polygon points={`${cx},${cy + 1} ${cx},${h + 2} ${cx + 5},${h - 3}`} fill="none" stroke={C.f} strokeWidth={1} />
      <text x={cx} y={h + 10} fill={C.sub.l} fontSize={4.5} textAnchor="middle">Bizt.</text>
    </g>
  );
}

function YFilterSvg({ x, y, w, h, fg, onR }: any) {
  const c = onR ? C.r : C.f;
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={0} y={0} width={w} height={h} rx={2} fill="white" stroke={c} strokeWidth={1.5} />
      <path d={`M3,3 L${w - 3},${h - 3} M3,${h - 3} L${w - 3},3`} stroke={c} strokeWidth={1} />
      <text x={w / 2} y={h + 10} fill={C.sub.l} fontSize={4.5} textAnchor="middle">Szűrő</text>
    </g>
  );
}

function CheckValveSvg({ x, y, w, h, fg }: any) {
  const cy = h / 2;
  return (
    <g transform={`translate(${x},${y})`}>
      <line x1={0} y1={cy} x2={w} y2={cy} stroke={fg} strokeWidth={1.5} />
      <polygon points={`${w / 2 - 3},${cy - 4} ${w / 2 + 4},${cy} ${w / 2 - 3},${cy + 4}`} fill="none" stroke={fg} strokeWidth={1.5} />
    </g>
  );
}

function PumpSvg({ x, y, w, h, fg, nd }: any) {
  const cx = w / 2, cy = h / 2, r = cx - 1;
  const isSec = nd.id === 'pump-sec' || nd.id.startsWith('pump-sec') || nd.type === 'secondary-pump';
  const isBoiler = nd.type === 'primary-pump' || nd.id === 'pump-boiler';
  const isCirc = nd.id.startsWith('p') && !isSec && !isBoiler;
  const c = isSec ? C.s : (isBoiler ? C.d : (isCirc ? C.f : C.r));
  return (
    <g transform={`translate(${x},${y})`}>
      <circle cx={cx} cy={cy} r={r} fill="white" stroke={c} strokeWidth={1.5} />
      <polygon points={`${cx - 5},${cy - 4} ${cx + 5},${cy} ${cx - 5},${cy + 4}`} fill={c} />
      {nd.data?.label && <text x={cx} y={h + 8} fill={c} fontSize={4.5} fontWeight="bold" textAnchor="middle">{nd.data.label}</text>}
    </g>
  );
}

function ExpVesselSvg({ x, y, w, h, fg, sb, nd }: any) {
  const mid = w / 2;
  const isSec = nd.id === 'exp-sec';
  const c = isSec ? C.s : C.r;
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={0} y={0} width={w} height={h} rx={w / 2} fill="white" stroke={c} strokeWidth={1.5} />
      <line x1={mid} y1={0} x2={mid} y2={-8} stroke={c} strokeWidth={1.5} />
      <line x1={2} y1={h * 0.4} x2={w - 2} y2={h * 0.4} stroke={c} strokeWidth={0.8} />
      <line x1={2} y1={h * 0.6} x2={w - 2} y2={h * 0.6} stroke={c} strokeWidth={0.8} />
      <text x={mid} y={h + 9} fill={c} fontSize={5} textAnchor="middle">Tágulási</text>
      {nd.data?.vol && <text x={mid} y={h + 17} fill={fg} fontSize={5.5} fontWeight="bold" textAnchor="middle">{nd.data.vol}</text>}
    </g>
  );
}

function HXSvg({ x, y, w, h, fg, sb, nd }: any) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={0} y={0} width={w} height={h} rx={3} fill="white" stroke={fg} strokeWidth={1.5} />
      <line x1={7} y1={4} x2={7} y2={h - 4} stroke={fg} strokeWidth={1.2} />
      <line x1={w / 2} y1={4} x2={w / 2} y2={h - 4} stroke={C.sub.l} strokeWidth={0.8} />
      <line x1={w - 7} y1={4} x2={w - 7} y2={h - 4} stroke={C.s} strokeWidth={1.2} />
      <text x={w / 2} y={-4} fill={C.s} fontSize={5.5} fontWeight="bold" textAnchor="middle">HŐCSERÉLŐ</text>
      {nd.data?.a && <text x={w / 2} y={h + 10} fill={sb} fontSize={5} textAnchor="middle">{nd.data.a}</text>}
    </g>
  );
}

function DhwTankSvg({ x, y, w, h, fg, sb, nd }: any) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={0} y={0} width={w} height={h} rx={6} fill="white" stroke={fg} strokeWidth={2} />
      <text x={w / 2} y={18} fill={fg} fontSize={8} fontWeight="bold" textAnchor="middle">HMV</text>
      <text x={w / 2} y={28} fill={sb} fontSize={6.5} textAnchor="middle">{nd.data?.vol ?? 200}L</text>
      <path d={`M${w * 0.2},45 Q${w * 0.8},50 ${w * 0.7},68 Q${w * 0.2},86 ${w * 0.7},104 L${w * 0.2},100`}
        fill="none" stroke={fg} strokeWidth={1.5} strokeDasharray="3,2" />
    </g>
  );
}

function BufferTankSvg({ x, y, w, h, fg, nd }: any) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={0} y={0} width={w} height={h} rx={6} fill="white" stroke={fg} strokeWidth={2} />
      <text x={w / 2} y={h * 0.35} fill={fg} fontSize={7} fontWeight="bold" textAnchor="middle">PUFFER</text>
      <text x={w / 2} y={h * 0.48} fill={fg} fontSize={7} fontWeight="bold" textAnchor="middle">TARTÁLY</text>
      <text x={w / 2} y={h * 0.78} fill={fg} fontSize={8} fontWeight="bold" textAnchor="middle">{nd.data?.vol ?? ''}</text>
    </g>
  );
}

function LowLossHeaderSvg({ x, y, w, h, fg, sb, nd }: any) {
  // Hidraulikus váltó: 4-csonkos függőleges henger (a szekunder szivattyú a váltó UTÁN van!)
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={0} y={0} width={w} height={h} rx={w / 2} fill="white" stroke={C.s} strokeWidth={2} />
      <text x={w / 2} y={h * 0.22} fill={C.s} fontSize={6} fontWeight="bold" textAnchor="middle">HIDR.</text>
      <text x={w / 2} y={h * 0.34} fill={C.s} fontSize={6} fontWeight="bold" textAnchor="middle">VÁLTÓ</text>
      {nd.data?.diam && <text x={w / 2} y={h * 0.78} fill={fg} fontSize={7} fontWeight="bold" textAnchor="middle">{nd.data.diam}</text>}
      {nd.data?.q && <text x={w / 2} y={h * 0.9} fill={sb} fontSize={4.5} textAnchor="middle">{nd.data.q}</text>}
    </g>
  );
}

function BoilerSvg({ x, y, w, h, fg, sb, nd }: any) {
  // Biválens kazán (gázkazán) vagy elektromos betét — Topológia 4
  const isGas = nd.data?.label === 'Gázkazán' || !nd.data?.label;
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={0} y={0} width={w} height={h} rx={6} fill="white" stroke={C.d} strokeWidth={2} />
      <text x={w / 2} y={22} fill={C.d} fontSize={8} fontWeight="bold" textAnchor="middle">KAZÁN</text>
      {isGas ? (
        <g transform={`translate(${w / 2}, ${h * 0.55})`}>
          <path d={`M-9,14 Q-9,4 -2,6 Q2,-2 8,2 Q14,8 8,12 Q3,8 -2,14 Z`} fill="none" stroke={C.d} strokeWidth={1.4} />
          <line x1={-12} y1={16} x2={12} y2={16} stroke={C.d} strokeWidth={1.5} />
        </g>
      ) : (
        <g transform={`translate(${w / 2}, ${h * 0.55})`}>
          <rect x={-9} y={-6} width={18} height={12} rx={1.5} fill="none" stroke={C.d} strokeWidth={1.4} />
          <line x1={-4} y1={-1} x2={4} y2={-1} stroke={C.d} strokeWidth={1} />
          <line x1={-4} y1={2} x2={4} y2={2} stroke={C.d} strokeWidth={1} />
        </g>
      )}
      <text x={w / 2} y={h - 6} fill={fg} fontSize={7} fontWeight="bold" textAnchor="middle">{nd.data?.label}</text>
      {nd.data?.kw && <text x={w / 2} y={h - 14} fill={sb} fontSize={5.5} textAnchor="middle">{nd.data.kw}</text>}
    </g>
  );
}

function ThreeWayDhwSvg({ x, y, w, h, fg, nd }: any) {
  const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 1;
  return (
    <g transform={`translate(${x},${y})`}>
      <circle cx={cx} cy={cy} r={r} fill="white" stroke={C.d} strokeWidth={1.5} />
      <line x1={cx - r + 1} y1={cy} x2={cx + r - 1} y2={cy} stroke={C.d} strokeWidth={1.2} />
      <line x1={cx} y1={cy - r + 1} x2={cx} y2={cy + r - 1} stroke={C.d} strokeWidth={1.2} />
      <circle cx={cx} cy={cy} r={1.8} fill={C.d} />
      <line x1={cx} y1={-1} x2={cx} y2={-6} stroke={C.d} strokeWidth={1.2} />
      <rect x={cx - 3} y={-11} width={6} height={6} rx={1} fill="white" stroke={C.d} strokeWidth={1} />
      <text x={cx} y={h + 10} fill={C.d} fontSize={4.5} fontWeight="bold" textAnchor="middle">HMV</text>
    </g>
  );
}

function ManifoldSvg({ x, y, w, h, fg, sb, nd }: any) {
  const n = nd.data?.n ?? 1;
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={0} y={0} width={w} height={h} rx={3} fill="#f8fafc" stroke={fg} strokeWidth={1.8} />
      <text x={w / 2} y={h / 2} fill={fg} fontSize={5} fontWeight="bold" textAnchor="middle" transform={`rotate(-90 ${w / 2} ${h / 2})`}>OSZTÓ-GYŰJTŐ</text>
      {Array.from({ length: n }).map((_, i) => {
        const pct = n > 1 ? 12 + i * 76 / (n - 1) : 50;
        return <line key={i} x1={w} y1={h * pct / 100} x2={w + 6} y2={h * pct / 100} stroke={fg} strokeWidth={1} />;
      })}
    </g>
  );
}

function EmitterSvg({ x, y, w, h, fg, nd }: any) {
  const t = nd.data?.type as string;
  const ft = nd.data?.flowTempC as number ?? 45;
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={0} y={0} width={w} height={h} rx={3} fill="white" stroke={fg} strokeWidth={1.5} />
      {t === 'floor' ? (
        <>
          <text x={w / 2} y={h / 2 + 1} fill={fg} fontSize={6} fontWeight="bold" textAnchor="middle">{ft}°C PADLÓFŰTÉS</text>
          <line x1={5} y1={16} x2={w - 5} y2={16} stroke={fg} strokeWidth={0.5} />
          <line x1={5} y1={19} x2={w - 5} y2={19} stroke={fg} strokeWidth={0.5} />
        </>
      ) : (
        <text x={w / 2} y={h / 2 + 1} fill={fg} fontSize={6} fontWeight="bold" textAnchor="middle">{ft}°C RADIÁTOR</text>
      )}
    </g>
  );
}

// ── Main component ──

export default function SystemDiagram(props: Props) {
  const { hydraulicState: hs, hydraulicResults: r, theme = 'light' } = props;
  const topo = useMemo(() => buildTopology({
    peakLoadKw: props.peakLoadKw, flowTemp: props.flowTemp,
    hydraulicState: hs, hydraulicResults: r, selectedModel: props.selectedModel,
  }), [props.peakLoadKw, props.flowTemp, hs, r, props.selectedModel]);

  const fg = id(theme) ? C.fg.d : C.fg.l;
  const wl = id(theme) ? C.w.d : C.w.l;
  const sb = id(theme) ? C.sub.d : C.sub.l;
  const gr = id(theme) ? C.g.d : C.g.l;
  const FY = 265, RY = 440, MX = 650, WX = 170;

  const pp = (nid: string, pid: string) => {
    const n = topo.nodes.find(nd => nd.id === nid);
    return n ? getPortPos(n, pid) : { x: 0, y: 0 };
  };

  return (
    <svg viewBox="0 0 1100 520" className="w-full h-auto max-w-[1100px] select-none" style={{ minHeight: 380 }}>
      <rect width={1100} height={520} fill={gr} opacity="0.3" />

      {/* Building wall */}
      <rect x={WX} y={20} width={8} height={480} rx={2} fill={wl} opacity="0.35" />
      <text x={WX + 14} y={35} fill={sb} fontSize={9} fontWeight="bold">KÜLTÉR</text>
      <text x={WX + 14} y={505} fill={sb} fontSize={9} fontWeight="bold">BELTÉR</text>

      {/* Main flow pipe */}
      <line x1={150} y1={FY} x2={MX + 5} y2={FY} stroke={C.f} strokeWidth={2.5} />
      <FlowArrow x={180} y={FY} d="r" c={C.f} />
      <FlowArrow x={500} y={FY} d="r" c={C.f} />

      {/* Main return pipe */}
      <line x1={150} y1={RY} x2={MX + 5} y2={RY} stroke={C.r} strokeWidth={2.5} />
      <FlowArrow x={500} y={RY} d="l" c={C.r} />
      <FlowArrow x={180} y={RY} d="l" c={C.r} />

      {/* Pipe labels */}
      <text x={380} y={FY - 8} fill={C.f} fontSize={7} fontFamily="monospace" fontWeight="bold" textAnchor="middle">
        E {r.primaryFlowTempC}°C | {r.primaryFlowRateLh} L/h
      </text>
      <text x={380} y={RY + 18} fill={C.r} fontSize={7} fontFamily="monospace" fontWeight="bold" textAnchor="middle">
        V {r.primaryReturnTempC}°C | {r.primaryFlowRateLh} L/h
      </text>
      {hs.includeHeatExchanger && r.secondaryFlowRateLh > 0 && (
        <>
          <text x={530} y={FY - 8} fill={C.s} fontSize={7} fontFamily="monospace" fontWeight="bold" textAnchor="middle">
            SZE {r.secondaryFlowTempC}°C | {r.secondaryFlowRateLh} L/h
          </text>
          <text x={530} y={RY + 18} fill={C.s} fontSize={7} fontFamily="monospace" fontWeight="bold" textAnchor="middle">
            SZV {r.secondaryReturnTempC}°C
          </text>
        </>
      )}

      {/* Expansion vessel branch */}
      {topo.nodes.filter(n => n.type === 'expansion-vessel').map(n => {
        const cx = n.x + n.w / 2, cy = n.y;
        const isSec = n.id === 'exp-sec';
        return <line key={n.id} x1={cx} y1={cy} x2={cx} y2={RY - 1} stroke={isSec ? C.s : C.r} strokeWidth={2} />;
      })}

      {/* Connections */}
      {topo.connections.map(cn => {
        const f = pp(cn.fromNode, cn.fromPort);
        const t = pp(cn.toNode, cn.toPort);
        if (Math.abs(f.x - t.x) < 1 && Math.abs(f.y - t.y) < 1) return null;
        const color = col(cn.style, cn.isReturn);
        const dsh = cn.style === 'secondary' ? '6,4' : cn.style === 'dhw' ? '3,3' : 'none';
        const w = cn.style === 'primary' ? 2.5 : 2;
        const d = Ppath(f.x, f.y, t.x, t.y);
        const midx = (f.x + t.x) / 2;
        const midy = Math.min(f.y, t.y);
        const lblOff = cn.isReturn ? midy + 14 : midy - 4;
        return (
          <g key={cn.id}>
            <path d={d} fill="none" stroke={color} strokeWidth={w} strokeDasharray={dsh} strokeLinecap="round" />
            {cn.label && (
              <text x={midx} y={lblOff} fill={color} fontSize={6} fontFamily="monospace"
                fontWeight="bold" textAnchor="middle">{cn.label}</text>
            )}
          </g>
        );
      })}

      {/* Nodes */}
      {topo.nodes.map(nd => {
        const k = nd.id;
        const onR = Math.abs(nd.y + nd.h / 2 - RY) < 15;
        switch (nd.type) {
          case 'building-boundary': return null;
          case 'junction': return null;
          case 'heat-pump':
            return <HeatPumpSvg key={k} x={nd.x} y={nd.y} w={nd.w} h={nd.h} fg={fg} wl={wl} sb={sb} nd={nd} />;
          case 'ball-valve':
            return <BallValveSvg key={k} x={nd.x} y={nd.y} w={nd.w} h={nd.h} fg={fg} onR={onR} />;
          case 'three-way-valve':
            return <ThreeWayValveSvg key={k} x={nd.x} y={nd.y} w={nd.w} h={nd.h} fg={fg} nd={nd} />;
          case 'three-way-dhw':
            return <ThreeWayDhwSvg key={k} x={nd.x} y={nd.y} w={nd.w} h={nd.h} fg={fg} nd={nd} />;
          case 'pressure-gauge':
            return <PressureGaugeSvg key={k} x={nd.x} y={nd.y} w={nd.w} h={nd.h} fg={fg} />;
          case 'air-vent':
            return <AirVentSvg key={k} x={nd.x} y={nd.y} w={nd.w} h={nd.h} fg={fg} />;
          case 'safety-valve':
            return <SafetyValveSvg key={k} x={nd.x} y={nd.y} w={nd.w} h={nd.h} fg={fg} nd={nd} />;
          case 'y-filter':
            return <YFilterSvg key={k} x={nd.x} y={nd.y} w={nd.w} h={nd.h} fg={fg} onR={onR} />;
          case 'non-return-valve':
            return <CheckValveSvg key={k} x={nd.x} y={nd.y} w={nd.w} h={nd.h} fg={fg} />;
          case 'circulator-pump':
            return <PumpSvg key={k} x={nd.x} y={nd.y} w={nd.w} h={nd.h} fg={fg} nd={nd} />;
          case 'secondary-pump':
            return <PumpSvg key={k} x={nd.x} y={nd.y} w={nd.w} h={nd.h} fg={fg} nd={nd} />;
          case 'primary-pump':
            return <PumpSvg key={k} x={nd.x} y={nd.y} w={nd.w} h={nd.h} fg={fg} nd={nd} />;
          case 'low-loss-header':
            return <LowLossHeaderSvg key={k} x={nd.x} y={nd.y} w={nd.w} h={nd.h} fg={fg} sb={sb} nd={nd} />;
          case 'bivalent-boiler':
            return <BoilerSvg key={k} x={nd.x} y={nd.y} w={nd.w} h={nd.h} fg={fg} sb={sb} nd={nd} />;
          case 'expansion-vessel':
            return <ExpVesselSvg key={k} x={nd.x} y={nd.y} w={nd.w} h={nd.h} fg={fg} sb={sb} nd={nd} />;
          case 'heat-exchanger':
            return <HXSvg key={k} x={nd.x} y={nd.y} w={nd.w} h={nd.h} fg={fg} sb={sb} nd={nd} />;
          case 'dhw-tank':
            return <DhwTankSvg key={k} x={nd.x} y={nd.y} w={nd.w} h={nd.h} fg={fg} sb={sb} nd={nd} />;
          case 'buffer-tank':
            return <BufferTankSvg key={k} x={nd.x} y={nd.y} w={nd.w} h={nd.h} fg={fg} nd={nd} />;
          case 'manifold':
            return <ManifoldSvg key={k} x={nd.x} y={nd.y} w={nd.w} h={nd.h} fg={fg} sb={sb} nd={nd} />;
          case 'emitter-circuit':
            return <EmitterSvg key={k} x={nd.x} y={nd.y} w={nd.w} h={nd.h} fg={fg} nd={nd} />;
          default: return null;
        }
      })}

      {/* Legend */}
      <g transform="translate(10, 485)">
        <text x={0} y={0} fill={fg} fontSize={7} fontWeight="bold">Jelmagyarázat:</text>
        <line x1={0} y1={8} x2={18} y2={8} stroke={C.f} strokeWidth={2.5} />
        <text x={22} y={11} fill={sb} fontSize={5.5}>Előremenő (E)</text>
        <line x1={105} y1={8} x2={123} y2={8} stroke={C.r} strokeWidth={2.5} />
        <text x={127} y={11} fill={sb} fontSize={5.5}>Visszatérő (V)</text>
        <line x1={205} y1={8} x2={223} y2={8} stroke={C.s} strokeWidth={2} strokeDasharray="6,4" />
        <text x={227} y={11} fill={sb} fontSize={5.5}>Szekunder</text>
        <line x1={295} y1={8} x2={313} y2={8} stroke={C.d} strokeWidth={2} strokeDasharray="3,3" />
        <text x={317} y={11} fill={sb} fontSize={5.5}>HMV</text>
      </g>
    </svg>
  );
}
