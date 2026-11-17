import React from 'react';

/**
 * Kidolgozott készülék-rajzok a React Flow node-okhoz.
 * Minden rajz a node TÉNYLEGES w×h méretére készül (viewBox = 0 0 w h),
 * így arányosan kitölti a keretet — nem torzul, nem marad kicsi.
 * Minden kapcsolásban ugyanaz az ábrázolás.
 */

interface ArtProps { w: number; h: number; color: string; dark: boolean; data: any }
const P = (w: number, h: number) => ({ fg: 'currentColor', cx: w / 2 });
const txt = (dark: boolean) => dark ? '#cbd5e1' : '#334155';

/** Hőszivattyú: kültéri egység ventilátorral + külön belső szivattyú ikon */
function HeatPumpArt({ w, h, color, dark }: ArtProps) {
  const pad = Math.max(6, w * 0.08);
  const bodyH = h * 0.62;
  const fanR = Math.min(w, bodyH) * 0.34;
  const fcx = w / 2, fcy = pad + bodyH * 0.45;
  const py = pad + bodyH + (h - pad - bodyH) * 0.55;
  const pr = Math.min(h - bodyH - pad, w * 0.16) * 0.4;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%">
      <rect x={pad} y={pad} width={w - 2 * pad} height={bodyH} rx={w * 0.06}
        fill={dark ? '#1e293b' : '#eef2ff'} stroke={color} strokeWidth="2" />
      <circle cx={fcx} cy={fcy} r={fanR} fill="none" stroke={color} strokeWidth="1.5" />
      <circle cx={fcx} cy={fcy} r={fanR * 0.12} fill={color} />
      {[0, 72, 144, 216, 288].map(a => (
        <line key={a} x1={fcx} y1={fcy}
          x2={fcx + fanR * 0.9 * Math.cos(a * Math.PI / 180)}
          y2={fcy + fanR * 0.9 * Math.sin(a * Math.PI / 180)}
          stroke={color} strokeWidth={Math.max(2, fanR * 0.14)} strokeLinecap="round" />
      ))}
      {/* kompresszor sáv */}
      <rect x={pad * 1.6} y={pad + bodyH * 0.82} width={(w - 2 * pad) * 0.68} height={bodyH * 0.09}
        rx={bodyH * 0.04} fill={color} opacity="0.35" />
      {/* belső szivattyú a node alján */}
      <circle cx={w * 0.26} cy={py} r={pr} fill="none" stroke={color} strokeWidth="1.5" />
      <path d={`M ${w * 0.26} ${py - pr} A ${pr} ${pr} 0 0 1 ${w * 0.26 + pr} ${py} L ${w * 0.26} ${py} Z`} fill={color} opacity="0.7" />
      <text x={w * 0.62} y={py + 3} fontSize={Math.max(6, w * 0.055)} fill={txt(dark)} textAnchor="middle">belső szivattyú</text>
    </svg>
  );
}

/** HMV tartály csőkígyóval — a tartály a node magasságát követi */
function DhwArt({ w, h, color, dark, data }: ArtProps) {
  const vol = data?.vol || 200;
  const pad = Math.max(6, w * 0.14);
  const tw = w - 2 * pad, th = h * 0.84;
  const cx = w / 2;
  const coilX1 = cx - tw * 0.22, coilX2 = cx + tw * 0.22;
  const coilTop = h * 0.14, step = th * 0.12;
  let coil = `M ${coilX1} ${coilTop}`;
  for (let i = 0; i < 5; i++) {
    const y = coilTop + i * step;
    coil += ` h ${coilX2 - coilX1} v ${step * 0.8} h ${-(coilX2 - coilX1)} v ${step * 0.8}`;
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%">
      <rect x={pad} y={h * 0.04} width={tw} height={th} rx={tw * 0.38}
        fill={dark ? '#1e293b' : '#fffbeb'} stroke={color} strokeWidth="2" />
      <path d={coil} fill="none" stroke="#dc2626" strokeWidth={Math.max(1.5, w * 0.022)} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={coilX1} cy={h * 0.1} r={w * 0.025} fill="#3b82f6" />
      <circle cx={coilX2} cy={h * 0.1} r={w * 0.025} fill="#dc2626" />
      <text x={cx} y={h * 0.96} fontSize={Math.max(8, w * 0.12)} fill={txt(dark)} textAnchor="middle" fontWeight="bold">{vol} L</text>
    </svg>
  );
}

/** Osztó-gyűjtő — vízszintes gerendák, kimeneti ágak */
function ManifoldArt({ w, h, color, dark, data }: ArtProps) {
  const n = Math.max(1, data?.n || 1);
  const top = h * 0.32, bot = h * 0.62;
  const x1 = w * 0.08, x2 = w * 0.92;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%">
      <rect x={x1} y={top} width={x2 - x1} height={h * 0.11} rx={h * 0.045} fill="#dc2626" />
      <rect x={x1} y={bot} width={x2 - x1} height={h * 0.11} rx={h * 0.045} fill="#2563eb" />
      {Array.from({ length: n }).map((_, i) => {
        const x = x1 + (x2 - x1) * (i + 1) / (n + 1);
        return (
          <g key={i}>
            <path d={`M ${x} ${top + h * 0.11} v ${h * 0.1}`} stroke="#dc2626" strokeWidth="2" />
            <path d={`M ${x + w * 0.04} ${bot} v ${h * 0.1}`} stroke="#2563eb" strokeWidth="2" />
          </g>
        );
      })}
      <text x={w / 2} y={h * 0.18} fontSize={Math.max(7, w * 0.06)} fill={txt(dark)} textAnchor="middle">osztó-gyűjtő · {n} kör</text>
    </svg>
  );
}

/** Puffer / hidrováltó — rétegzett tartály */
function TankArt({ w, h, color, dark, data, isLLH }: ArtProps & { isLLH?: boolean }) {
  const pad = Math.max(6, w * 0.16);
  const tw = w - 2 * pad, th = h * 0.88;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%">
      <rect x={pad} y={h * 0.04} width={tw} height={th} rx={tw * 0.14}
        fill={dark ? '#1e293b' : '#f5f3ff'} stroke={color} strokeWidth="2" />
      {isLLH ? (
        <>
          {[0.3, 0.5, 0.7].map(p => <line key={p} x1={pad + tw * 0.15} y1={h * p} x2={pad + tw * 0.85} y2={h * p} stroke={color} strokeWidth="1.5" opacity="0.5" />)}
          <text x={w / 2} y={h * 0.55} fontSize={Math.max(7, w * 0.11)} fill={txt(dark)} textAnchor="middle" fontWeight="bold">LLH</text>
        </>
      ) : (
        <>
          <rect x={pad + 3} y={h * 0.06} width={tw - 6} height={th * 0.4} rx={tw * 0.1} fill="#dc2626" opacity="0.18" />
          <rect x={pad + 3} y={h * 0.54} width={tw - 6} height={th * 0.4} rx={tw * 0.1} fill="#2563eb" opacity="0.18" />
          <text x={w / 2} y={h * 0.53} fontSize={Math.max(8, w * 0.14)} fill={txt(dark)} textAnchor="middle" fontWeight="bold">{data?.vol || 100} L</text>
        </>
      )}
    </svg>
  );
}

/** Hőcserélő — lemezes */
function HxArt({ w, h, color, dark, data }: ArtProps) {
  const pad = Math.max(4, w * 0.12);
  const bw = w - 2 * pad, bh = h * 0.8;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%">
      <rect x={pad} y={h * 0.08} width={bw} height={bh} rx={w * 0.06}
        fill={dark ? '#1e293b' : '#f0fdfa'} stroke={color} strokeWidth="2" />
      {[0.2, 0.35, 0.5, 0.65, 0.8].map(p => <line key={p} x1={pad + 2} y1={h * p} x2={pad + bw - 2} y2={h * p} stroke={color} strokeWidth="1" opacity="0.5" />)}
      <text x={w / 2} y={h * 0.95} fontSize={Math.max(7, w * 0.13)} fill={txt(dark)} textAnchor="middle">{data?.a || 'HX'}</text>
    </svg>
  );
}

/** Bivalens kazán / elektromos betét */
function BoilerArt({ w, h, color, dark, data }: ArtProps) {
  const pad = Math.max(6, w * 0.12);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%">
      <rect x={pad} y={h * 0.06} width={w - 2 * pad} height={h * 0.8} rx={w * 0.08}
        fill={dark ? '#1e293b' : '#fef2f2'} stroke={color} strokeWidth="2" />
      <path d={`M ${w / 2} ${h * 0.72} C ${w * 0.3} ${h * 0.55}, ${w * 0.3} ${h * 0.32}, ${w / 2} ${h * 0.2} C ${w * 0.7} ${h * 0.32}, ${w * 0.7} ${h * 0.55}, ${w / 2} ${h * 0.72} Z`}
        fill={color} opacity="0.6" />
      <path d={`M ${w / 2} ${h * 0.64} C ${w * 0.4} ${h * 0.5}, ${w * 0.4} ${h * 0.36}, ${w / 2} ${h * 0.3} C ${w * 0.6} ${h * 0.36}, ${w * 0.6} ${h * 0.5}, ${w / 2} ${h * 0.64} Z`}
        fill="#f59e0b" />
      <text x={w / 2} y={h * 0.96} fontSize={Math.max(7, w * 0.1)} fill={txt(dark)} textAnchor="middle">{data?.kw || ''}</text>
    </svg>
  );
}

/** Hőleadó kör — lapos node-hoz */
function EmitterArt({ w, h, color, dark, data }: ArtProps) {
  const isFloor = data?.type === 'floor';
  const temp = data?.flowTempC ?? (isFloor ? 35 : 55);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%">
      {isFloor ? (
        <path d={`M ${w * 0.06} ${h * 0.78} h ${w * 0.1} v ${-h * 0.5} h ${w * 0.16} v ${h * 0.5} h ${w * 0.16} v ${-h * 0.5} h ${w * 0.16} v ${h * 0.5} h ${w * 0.1}`}
          fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <>
          <rect x={w * 0.08} y={h * 0.2} width={w * 0.84} height={h * 0.6} rx={h * 0.1} fill="none" stroke={color} strokeWidth="2" />
          {[0.2, 0.35, 0.5, 0.65, 0.8].map(p => <line key={p} x1={w * p} y1={h * 0.24} x2={w * p} y2={h * 0.76} stroke={color} strokeWidth="1.5" />)}
        </>
      )}
      <text x={w / 2} y={h * 0.98} fontSize={Math.max(7, h * 0.22)} fill={txt(dark)} textAnchor="middle" fontWeight="bold">{temp}°C</text>
    </svg>
  );
}

/** Szivattyú / szelep / egyéb — arányos ikon */
function GenericArt({ nodeType, w, h, color }: ArtProps & { nodeType: string }) {
  const isPump = /pump/.test(nodeType);
  const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.34;
  if (isPump) {
    return (
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="2" />
        <path d={`M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - r * 0.7} ${cy + r * 0.7}`} fill="none" stroke={color} strokeWidth="2" />
        <line x1={cx} y1={cy} x2={cx + r * 0.9} y2={cy} stroke={color} strokeWidth="2" />
      </svg>
    );
  }
  if (/valve|three-way/.test(nodeType)) {
    return (
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%">
        <path d={`M ${w * 0.15} ${cy} L ${w * 0.85} ${cy} M ${w * 0.5} ${cy} L ${w * 0.78} ${h * 0.2} M ${w * 0.5} ${cy} L ${w * 0.78} ${h * 0.8}`}
          fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%">
      <circle cx={cx} cy={cy} r={r * 0.6} fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
}

export function DeviceArt({ nodeType, w, h, color, dark, data }: ArtProps & { nodeType: string }) {
  if (nodeType === 'heat-pump') return <HeatPumpArt w={w} h={h} color={color} dark={dark} data={data} />;
  if (nodeType === 'dhw-tank') return <DhwArt w={w} h={h} color={color} dark={dark} data={data} />;
  if (nodeType === 'manifold') return <ManifoldArt w={w} h={h} color={color} dark={dark} data={data} />;
  if (nodeType === 'buffer-tank') return <TankArt w={w} h={h} color={color} dark={dark} data={data} />;
  if (nodeType === 'low-loss-header') return <TankArt w={w} h={h} color={color} dark={dark} data={data} isLLH />;
  if (nodeType === 'heat-exchanger') return <HxArt w={w} h={h} color={color} dark={dark} data={data} />;
  if (nodeType === 'bivalent-boiler') return <BoilerArt w={w} h={h} color={color} dark={dark} data={data} />;
  if (nodeType === 'emitter-circuit') return <EmitterArt w={w} h={h} color={color} dark={dark} data={data} />;
  return <GenericArt nodeType={nodeType} w={w} h={h} color={color} dark={dark} data={data} />;
}
