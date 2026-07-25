import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { STATE_COLORS, TraelFonts, type ReadingState } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// KPI com count-up (750ms, ease-out) ao montar.
export function StatTile({
  label,
  value,
  unit,
  state,
  decimals = 0,
}: {
  label: string;
  value: number;
  unit?: string;
  state?: ReadingState;
  decimals?: number;
}) {
  const theme = useTheme();
  const [n, setN] = useState(0);
  const raf = useRef<number | undefined>(undefined);
  useEffect(() => {
    const t0 = Date.now();
    const step = () => {
      const k = Math.min(1, (Date.now() - t0) / 750);
      const e = 1 - Math.pow(1 - k, 3);
      setN(Math.round(value * e * Math.pow(10, decimals)) / Math.pow(10, decimals));
      if (k < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [value, decimals]);
  return (
    <View style={{ flex: 1, backgroundColor: theme.surface1, borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 12 }}>
      <Text style={{ fontFamily: TraelFonts.sansSemi, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: theme.text3 }}>
        {label}
      </Text>
      <Text
        style={{
          fontFamily: TraelFonts.monoSemi,
          fontSize: 22,
          marginTop: 4,
          color: state ? STATE_COLORS[state] : theme.text1,
        }}>
        {n.toLocaleString('pt-BR')}
        {unit ?? ''}
      </Text>
    </View>
  );
}
