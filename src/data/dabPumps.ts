/**
 * DAB Evosta keringtető szivattyúk adatbázisa.
 * Forrás: DAB Pumps Evosta 2 / Evosta 3 műszaki katalógus (H[m] @ Q[m³/h]).
 *
 * A „40-70" / „80" a névleges max. emelőmagasság-tartományt jelenti dm-ben.
 * A szivattyú kiválasztásánál a rendelkezésre álló emelőmagasságot (pumpHead)
 * hasonlítjuk össze a kiválasztott modell görbéjével.
 */
export interface DabPump {
  id: string;
  name: string;
  /** Maximális emelőmagasság [m] (zéro áramlásnál) */
  maxHeadM: number;
  /** Maximális térfogatáram [m³/h] */
  maxFlowM3h: number;
  /** Q-H görbe pontjai: [Q m³/h, H m] */
  curve: [number, number][];
  /** Ajánlott felhasználás */
  note: string;
}

/** Q-H pontok: Evosta 2 40-70 (H: 6.9, 5.8, 5.1, 3.4, 2.4, 1.6, 0.8 @ Q: 0, 0.6, 0.9, 1.8, 2.4, 3.0, 3.6) */
const E2_40_70: [number, number][] = [[0, 6.9], [0.6, 5.8], [0.9, 5.1], [1.8, 3.4], [2.4, 2.4], [3.0, 1.6], [3.6, 0.8]];
/** Evosta 2 80: magasabb emelőmagasság (H: 8.0 ... ) */
const E2_80: [number, number][] = [[0, 8.0], [0.6, 6.9], [0.9, 6.0], [1.8, 4.3], [2.4, 3.3], [3.0, 2.2], [3.6, 1.2], [4.2, 0.5]];
/** Evosta 3 40: alacsony emelő (H: 4.0, 3.0, 2.4, 1.6, 1.0, 0.6 @ Q: 0, 0.6, 1.2, 1.8, 2.4, 2.9) */
const E3_40: [number, number][] = [[0, 4.0], [0.6, 3.0], [1.2, 2.4], [1.8, 1.6], [2.4, 1.0], [2.9, 0.6]];
/** Evosta 3 60: (H: 6.0, 4.4, 3.8, 2.8, 2.3, 1.5, 0.7 @ Q: 0, 0.6, 1.2, 1.5, 2.1, 2.4, 3.0, 3.6) */
const E3_60: [number, number][] = [[0, 6.0], [0.6, 4.4], [1.2, 3.8], [1.5, 3.8], [2.1, 2.8], [2.4, 2.3], [3.0, 1.5], [3.6, 0.7]];
/** Evosta 3 80: (H: 8.0 ... ) */
const E3_80: [number, number][] = [[0, 8.0], [0.6, 6.5], [0.9, 5.7], [1.8, 4.3], [2.4, 3.5], [3.0, 2.4], [3.6, 1.3], [4.2, 0.5]];

export const DAB_PUMPS: DabPump[] = [
  {
    id: 'auto',
    name: 'Auto (ajánlott kiválasztás)',
    maxHeadM: 0,
    maxFlowM3h: 0,
    curve: [],
    note: 'A számított emelőmagasság és áramlás alapján a program választja ki a legkisebb megfelelő modellt.',
  },
  {
    id: 'e2-40-70-180',
    name: 'DAB Evosta 2 40-70/180 (6.9 m, 3.6 m³/h)',
    maxHeadM: 6.9,
    maxFlowM3h: 3.6,
    curve: E2_40_70,
    note: 'A-osztályú, nagy hatékonyságú. Kis- és közepes rendszerekhez, alap választás.',
  },
  {
    id: 'e2-80-180',
    name: 'DAB Evosta 2 80/180 (8.0 m, 4.2 m³/h)',
    maxHeadM: 8.0,
    maxFlowM3h: 4.2,
    curve: E2_80,
    note: 'Magasabb emelőmagasságú változat nagyobb nyomásveszteségű rendszerekhez.',
  },
  {
    id: 'e3-40-180',
    name: 'DAB Evosta 3 40/180 (4.0 m, 2.9 m³/h)',
    maxHeadM: 4.0,
    maxFlowM3h: 2.9,
    curve: E3_40,
    note: 'Kisebb teljesítményű, alacsony nyomásigényű rendszerekhez, alacsonyabb fogyasztás.',
  },
  {
    id: 'e3-60-180',
    name: 'DAB Evosta 3 60/180 (6.0 m, 3.6 m³/h)',
    maxHeadM: 6.0,
    maxFlowM3h: 3.6,
    curve: E3_60,
    note: 'Korszerű A-osztályú modell, közepes emelőmagasság, univerzális választás.',
  },
  {
    id: 'e3-80-180',
    name: 'DAB Evosta 3 80/180 (8.0 m, 4.2 m³/h)',
    maxHeadM: 8.0,
    maxFlowM3h: 4.2,
    curve: E3_80,
    note: 'A legerősebb Evosta 3 modell, nagy emelőmagasságú, több zónás rendszerekhez.',
  },
];

/** Adott áramlásnál (m³/h) a szivattyú által biztosított emelőmagasság [m] a Q-H görbe alapján. */
export function pumpHeadAtFlow(pump: DabPump, flowM3h: number): number {
  if (pump.curve.length === 0) return 0;
  const pts = pump.curve;
  if (flowM3h <= pts[0][0]) return pts[0][1];
  if (flowM3h >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
  for (let i = 0; i < pts.length - 1; i++) {
    const [q1, h1] = pts[i];
    const [q2, h2] = pts[i + 1];
    if (flowM3h >= q1 && flowM3h <= q2) {
      const ratio = (flowM3h - q1) / (q2 - q1);
      return h1 + ratio * (h2 - h1);
    }
  }
  return pts[pts.length - 1][1];
}

/** Kiválasztja a legkisebb olyan szivattyút, amely biztosítja a kívánt emelőmagasságot az áramlásnál. */
export function selectAutoPump(flowM3h: number, requiredHeadM: number): DabPump {
  const candidates = DAB_PUMPS.filter(p => p.id !== 'auto')
    .filter(p => pumpHeadAtFlow(p, flowM3h) >= requiredHeadM)
    .sort((a, b) => a.maxHeadM - b.maxHeadM);
  return candidates[0] ?? DAB_PUMPS[DAB_PUMPS.length - 1];
}
