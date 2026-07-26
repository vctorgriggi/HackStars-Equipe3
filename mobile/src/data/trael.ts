import { ReadingState } from '@/constants/theme';

export interface Unit {
  n: number;
  state: ReadingState;
  serial: string;
}
export interface Project {
  id: string;
  lote: string;
  desc: string;
  base: number;
  units: Unit[];
  eta: string;
}
export interface Occurrence {
  id: string;
  projId: string;
  cam: string;
  line: string;
  ts: string;
  stopped: string;
  expected: string;
  read: string;
  conf: number;
  unit: number;
  state: ReadingState;
}
export interface Camera {
  id: string;
  label: string;
  state: ReadingState;
  serial: string;
  conf: number;
  online: boolean;
  last: string;
}
export interface ActivityRow {
  id: string;
  projId: string;
  state: ReadingState;
  serial: string;
  cam: string;
  ts: string;
}
export interface Attempt {
  timestamp: string;
  value?: string;
  confidence?: number;
  state: ReadingState;
  by?: string;
  note?: string;
}

const mkUnits = (base: number, total: number, pattern: ReadingState[]): Unit[] =>
  Array.from({ length: total }, (_, i) => ({ n: i + 1, state: pattern[i % pattern.length], serial: 'T-' + (base + i) }));

export const PROJECTS: Project[] = [
  {
    id: 'p1',
    lote: 'Lote 2416',
    desc: 'TR 300 kVA · CEMIG-D',
    base: 458820,
    eta: 'previsão 28/07',
    units: mkUnits(458820, 24, [
      'success', 'success', 'validated', 'success', 'mismatch', 'success', 'lowconf', 'success',
      'success', 'processing', 'pending', 'pending', 'success', 'success', 'mismatch', 'success',
      'success', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending',
    ]),
  },
  {
    id: 'p2',
    lote: 'Lote 2409',
    desc: 'TR 150 kVA · Equatorial',
    base: 457210,
    eta: 'previsão 31/07',
    units: mkUnits(457210, 36, [
      'success', 'success', 'success', 'validated', 'success', 'success', 'success', 'lowconf',
      'success', 'success', 'success', 'success', 'mismatch', 'success', 'success', 'success',
      'success', 'success', 'success', 'success', 'processing', 'pending', 'pending', 'pending',
      'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending',
      'pending', 'pending', 'pending', 'pending',
    ]),
  },
  {
    id: 'p3',
    lote: 'Lote 2421',
    desc: 'TR 500 kVA · Neoenergia',
    base: 459105,
    eta: 'iniciado hoje',
    units: mkUnits(459105, 12, [
      'success', 'processing', 'pending', 'pending', 'pending', 'pending',
      'pending', 'pending', 'pending', 'pending', 'pending', 'pending',
    ]),
  },
  {
    id: 'p4',
    lote: 'Lote 2398',
    desc: 'TR 75 kVA · Energisa',
    base: 456030,
    eta: 'concluído 22/07',
    units: mkUnits(456030, 48, [
      'success', 'success', 'success', 'validated', 'success', 'success',
      'success', 'success', 'validated', 'success', 'success', 'success',
    ]),
  },
];

export const LINES: Record<string, string> = {
  'CAM-01': 'Linha 1',
  'CAM-02': 'Linha 1',
  'CAM-03': 'Linha 2',
  'CAM-04': 'Linha 2',
  'CAM-05': 'Linha 3',
  'CAM-06': 'Linha 3',
  'CAM-07': 'Pátio B',
  'CAM-08': 'Pátio C',
};

const occ = (
  id: string,
  projId: string,
  cam: string,
  ts: string,
  expected: string,
  read: string,
  conf: number,
  unit: number,
  stopped: string,
): Occurrence => ({
  id,
  projId,
  cam,
  ts,
  expected,
  read,
  conf,
  unit,
  stopped,
  line: LINES[cam],
  state: conf < 85 ? 'mismatch' : 'lowconf',
});

export const OCCURRENCES: Occurrence[] = [
  occ('r1', 'p1', 'CAM-03', '14:21:44', 'T-458824', 'T-458024', 62, 5, 'há 04:12'),
  occ('r2', 'p1', 'CAM-03', '14:08:12', 'T-458826', 'T-458826', 91, 7, 'há 17:44'),
  occ('r3', 'p2', 'CAM-05', '13:52:30', 'T-457222', 'T-457272', 58, 13, 'há 33:26'),
  occ('r4', 'p1', 'CAM-04', '13:40:05', 'T-458834', 'T-458834', 88, 15, 'há 45:51'),
  occ('r5', 'p2', 'CAM-05', '13:11:47', 'T-457217', 'T-451217', 71, 8, 'há 1h14'),
];

export const CAMERAS: Camera[] = [
  { id: 'CAM-01', label: 'Linha 1 · Solda', state: 'success', serial: 'T-458838', conf: 99, online: true, last: '14:22:01' },
  { id: 'CAM-02', label: 'Linha 1 · Pintura', state: 'processing', serial: 'T-458839', conf: 0, online: true, last: '14:21:44' },
  { id: 'CAM-03', label: 'Linha 2 · Pintura', state: 'mismatch', serial: 'T-458024', conf: 62, online: true, last: '14:21:44' },
  { id: 'CAM-04', label: 'Linha 2 · Expedição', state: 'success', serial: 'T-458834', conf: 98, online: true, last: '14:19:10' },
  { id: 'CAM-05', label: 'Linha 3 · Pintura', state: 'lowconf', serial: 'T-457272', conf: 58, online: true, last: '14:17:52' },
  { id: 'CAM-06', label: 'Linha 3 · Expedição', state: 'pending', serial: '', conf: 0, online: true, last: '14:02:33' },
  { id: 'CAM-07', label: 'Pátio · Portão B', state: 'success', serial: 'T-459106', conf: 97, online: true, last: '13:58:20' },
  { id: 'CAM-08', label: 'Pátio · Portão C', state: 'pending', serial: '', conf: 0, online: false, last: '09:14:07' },
];

const ACT_STATES: ReadingState[] = [
  'success', 'success', 'validated', 'mismatch', 'success', 'lowconf',
  'success', 'success', 'mismatch', 'success', 'validated', 'success',
];
export const ACTIVITY: ActivityRow[] = Array.from({ length: 24 }, (_, i) => {
  const pj = PROJECTS[i % 3];
  const h = 14 - Math.floor(i / 3);
  const m = (59 - i * 7 + 60) % 60;
  const pad = (n: number) => ('0' + n).slice(-2);
  return {
    id: 'a' + i,
    projId: pj.id,
    state: ACT_STATES[i % ACT_STATES.length],
    serial: 'T-' + (pj.base + (i * 5) % pj.units.length),
    cam: 'CAM-0' + (1 + (i % 7)),
    ts: pad(h) + ':' + pad(m) + ':' + pad((i * 13) % 60),
  };
});

export function attemptsFor(u: Unit): Attempt[] {
  const base: Attempt[] = [{ timestamp: '2026-07-25 09:12:40', state: 'pending', by: 'IA', note: 'aguardando posicionamento' }];
  if (u.state === 'pending') return base;
  if (u.state === 'processing') return [...base, { timestamp: '2026-07-25 14:21:02', state: 'processing', by: 'IA', note: 'leitura em andamento' }];
  const bad: Attempt = { timestamp: '2026-07-25 11:47:18', value: u.serial.replace('8', '0'), confidence: 61, state: 'mismatch', by: 'IA' };
  const good: Attempt = {
    timestamp: '2026-07-25 11:52:55',
    value: u.serial,
    confidence: u.state === 'lowconf' ? 87 : 97,
    state: u.state === 'lowconf' ? 'lowconf' : 'success',
    by: 'IA',
  };
  if (u.state === 'mismatch') return [...base, bad];
  if (u.state === 'validated') {
    return [...base, bad, { timestamp: '2026-07-25 12:04:31', value: u.serial, state: 'validated', by: 'C. Menezes', note: 'correção física validada' }];
  }
  return [...base, bad, good];
}
