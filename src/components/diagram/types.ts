export type NodeType =
  | 'heat-pump'
  | 'ball-valve'
  | 'pressure-gauge'
  | 'air-vent'
  | 'safety-valve'
  | 'non-return-valve'
  | 'three-way-valve'
  | 'three-way-dhw'        // HMV 3-járatú váltószelep (dedikált)
  | 'y-filter'
  | 'circulator-pump'
  | 'secondary-pump'       // szekunder keringtető (váltó/puffer UTÁN)
  | 'primary-pump'         // primer szivattyú (HP-n kívül, LLH/puffer előtt)
  | 'expansion-vessel'
  | 'heat-exchanger'
  | 'low-loss-header'      // hidraulikus váltó
  | 'bivalent-boiler'      // gázkazán / elektromos betét (biválens)
  | 'cascade-unit'         // további HP egység (master/slave) — jövőbeli kaskád
  | 'dhw-tank'
  | 'buffer-tank'
  | 'manifold'
  | 'emitter-circuit'
  | 'junction'           // láthatatlan hajlítási pont a vonalaknak (pl. DHW elkerülése)
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
