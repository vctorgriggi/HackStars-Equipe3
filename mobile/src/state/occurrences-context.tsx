import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

import { OCCURRENCES, type Occurrence } from '@/data/trael';

interface Snack {
  msg: string;
}

interface OccurrencesState {
  queue: Occurrence[];
  resolveFront: () => void;
  pendingSync: number;
  snack: Snack | null;
  dismissSnack: () => void;
}

const Ctx = createContext<OccurrencesState | null>(null);

export function useOccurrences() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useOccurrences must be used within OccurrencesProvider');
  return ctx;
}

export function OccurrencesProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Occurrence[]>(OCCURRENCES);
  const [pendingSync, setPendingSync] = useState(0);
  const [snack, setSnack] = useState<Snack | null>(null);

  const resolveFront = useCallback(() => {
    setQueue((q) => {
      const front = q[0];
      if (front) {
        setSnack({ msg: 'Leitura confirmada — ' + front.line + ' liberada' });
        setTimeout(() => setSnack(null), 5000);
      }
      return q.slice(1);
    });
    // fila local offline-first: a ação entra em sincronização e resolve quando a conexão volta
    setPendingSync((n) => n + 1);
    setTimeout(() => setPendingSync((n) => Math.max(0, n - 1)), 2600);
  }, []);

  return (
    <Ctx.Provider
      value={{ queue, resolveFront, pendingSync, snack, dismissSnack: () => setSnack(null) }}>
      {children}
    </Ctx.Provider>
  );
}
