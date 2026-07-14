export type NodeType =
  | 'heat-pump'
  | 'ball-valve'
  | 'pressure-gauge'
  | 'air-vent'
  | 'safety-valve'
  | 'non-return-valve'
  | 'three-way-valve'
  | 'y-filter'
  | 'circulator-pump'
  | 'expansion-vessel'
  | 'heat-exchanger'
  | 'dhw-tank'
  | 'buffer-tank'
  | 'manifold'
  | 'emitter-circuit'
  | 'building-boundary';

export type PipeStyle = 'primary' | 'secondary' | 'dhw';

export interface Port {
  id: string;
  side: 'left' | 'right' | 'top' | 'bottom';
  offset: number;
  dir: 'in' | 'out';
  label?: string;
}

export interface DiagramNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  w: number;
  h: number;
  ports: Port[];
  data: Record<string, any>;
}

export interface Connection {
  id: string;
  fromNode: string;
  fromPort: string;
  toNode: string;
  toPort: string;
  style: PipeStyle;
  isReturn?: boolean;
  label?: string;
  sublabel?: string;
}

export interface SystemTopology {
  nodes: DiagramNode[];
  connections: Connection[];
}
