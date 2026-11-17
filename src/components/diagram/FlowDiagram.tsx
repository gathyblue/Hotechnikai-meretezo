import React, { useEffect, useRef } from 'react';
import {
  ReactFlow, Background, Controls, Handle, Position, ConnectionMode,
  useNodesState, useEdgesState,
  type Node, type Edge, type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { HydraulicInput, HydraulicResults, HeatPumpModel } from '../../types';
import { DeviceArt } from './DeviceArt';
import { buildFlowGraph } from './buildFlowGraph';

interface Props {
  hydraulicState: HydraulicInput;
  hydraulicResults: HydraulicResults;
  selectedModel?: HeatPumpModel | null;
  peakLoadKw: number;
  flowTemp: number;
  theme?: 'light' | 'dark';
}

/* ─── Készülék színek ─────────────────────────────────────────────────── */
const COLOR: Record<string, string> = {
  'heat-pump': '#4f46e5', 'bivalent-boiler': '#dc2626', 'dhw-tank': '#d97706',
  'buffer-tank': '#7c3aed', 'low-loss-header': '#0284c7', 'heat-exchanger': '#0d9488',
  'manifold': '#475569', 'emitter-circuit': '#059669', 'three-way-valve': '#d97706',
  'three-way-dhw': '#d97706', 'circulator-pump': '#2563eb', 'secondary-pump': '#059669',
  'primary-pump': '#2563eb', 'expansion-vessel': '#475569', 'building-boundary': '#94a3b8',
  'junction': '#94a3b8', 'cascade-unit': '#4f46e5',
};
const DEV_COLOR = (t: string) => COLOR[t] ?? '#64748b';

/* ─── Egyedi node renderer ────────────────────────────────────────────── */
function SystemNode({ data, selected }: NodeProps) {
  const d = data as any;
  const color = DEV_COLOR(d.nodeType);
  return (
    <div
      title={d.tooltip || undefined}
      className="rounded-xl border-2 shadow-md transition-all"
      style={{
        width: d.w, height: d.h, borderColor: color,
        background: d.isDark ? '#1e293b' : '#ffffff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 2,
        boxShadow: selected ? `0 0 0 3px ${color}66` : `0 2px 8px ${color}30`,
      }}>
      {d.ports.map((pt: any) => <Port key={pt.id} p={pt} w={d.w} h={d.h} />)}
      <div style={{ width: '100%', height: '100%', padding: 6, boxSizing: 'border-box' }}>
        <DeviceArt nodeType={d.nodeType} w={d.w} h={d.h} color={color} dark={d.isDark} data={{ ...d, ...d.deviceData }} />
      </div>
      {d.label && d.w < 100 && (
        <span className="leading-tight font-bold text-center"
          style={{ fontSize: 7, color: d.isDark ? '#e2e8f0' : '#1e293b', position: 'absolute', bottom: -14, whiteSpace: 'nowrap' }}>
          {d.label}
        </span>
      )}
    </div>
  );
}

function Port({ p, w, h }: { p: any; w: number; h: number; key?: any }) {
  return <Handle type="source" position={posOf(p.side)} id={p.id} style={handleStyle(p, w, h)} />;
}
function posOf(side: string) {
  return side === 'left' ? Position.Left : side === 'right' ? Position.Right
    : side === 'top' ? Position.Top : Position.Bottom;
}
function handleStyle(p: any, w: number, h: number): React.CSSProperties {
  const base: React.CSSProperties = { width: 7, height: 7, background: '#64748b', border: '2px solid #fff', borderRadius: '50%' };
  const off = Math.max(2, Math.min(98, p.offset * 100));
  if (p.side === 'left') return { ...base, left: 0, top: `${off}%`, transform: 'translate(-50%, -50%)' };
  if (p.side === 'right') return { ...base, right: 0, top: `${off}%`, transform: 'translate(50%, -50%)' };
  if (p.side === 'top') return { ...base, top: 0, left: `${off}%`, transform: 'translate(-50%, -50%)' };
  return { ...base, bottom: 0, left: `${off}%`, transform: 'translate(-50%, 50%)' };
}
const nodeTypes = { system: SystemNode };

/* ─── Fő komponens ───────────────────────────────────────────────────── */
export const FlowDiagram: React.FC<Props> = (props) => {
  const isDark = props.theme === 'dark';
  const initial = React.useMemo(() => buildFlowGraph(
    props.hydraulicState, props.hydraulicResults, props.theme as 'light' | 'dark', props.selectedModel
  ), []); // eslint-disable-line react-hooks/exhaustive-deps

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initial.nodes as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initial.edges as Edge[]);
  const posRef = useRef<Record<string, { x: number; y: number }>>({});
  const firstRef = useRef(true);

  // A felhasználó által húzott pozíciók megőrzése props változásakor
  useEffect(() => {
    if (firstRef.current) {
      nodes.forEach(n => { posRef.current[n.id] = { ...n.position }; });
      firstRef.current = false;
      return;
    }
    const fresh = buildFlowGraph(props.hydraulicState, props.hydraulicResults, props.theme as 'light' | 'dark', props.selectedModel);
    const merged = (fresh.nodes as Node[]).map(n => posRef.current[n.id] ? { ...n, position: posRef.current[n.id] } : n);
    setNodes(merged);
    setEdges(fresh.edges as Edge[]);
  }, [props.hydraulicState, props.hydraulicResults, props.selectedModel]); // eslint-disable-line react-hooks/exhaustive-deps

  const onNodeDragStop = React.useCallback((_: any, node: Node) => {
    posRef.current[node.id] = { ...node.position };
  }, []);

  return (
    <div style={{
      height: 560, width: '100%', borderRadius: 12, overflow: 'hidden',
      border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
      background: isDark ? '#0f172a' : '#f8fafc',
      ['--xy-background-color' as any]: isDark ? '#0f172a' : '#f8fafc',
      ['--xy-background-pattern-color' as any]: isDark ? '#334155' : '#dbe3ec',
      ['--xy-edge-label-bg' as any]: isDark ? '#0f172a' : '#ffffff',
    } as React.CSSProperties}>
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onNodeDragStop={onNodeDragStop}
        connectionMode={ConnectionMode.Loose}
        fitView fitViewOptions={{ padding: 0.12 }} minZoom={0.3} maxZoom={2}
        proOptions={{ hideAttribution: true }}>
        <Background color={isDark ? '#334155' : '#dbe3ec'} gap={18} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
};

export default FlowDiagram;
