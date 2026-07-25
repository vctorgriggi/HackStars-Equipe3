import { Text, View } from 'react-native';

import { STATE_COLORS, TraelFonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Limiar padrão: >=98 confirmada · >=85 baixa conf. · <85 divergência
export function ConfidenceMeter({ value, width = 170 }: { value: number; width?: number }) {
  const theme = useTheme();
  const color = value >= 98 ? STATE_COLORS.success : value >= 85 ? STATE_COLORS.lowconf : STATE_COLORS.mismatch;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ width, height: 6, borderRadius: 3, backgroundColor: theme.surface3, overflow: 'hidden' }}>
        <View style={{ width: `${value}%`, height: 6, backgroundColor: color, borderRadius: 3 }} />
      </View>
      <Text style={{ fontFamily: TraelFonts.monoSemi, fontSize: 12, color }}>{String(value).replace('.', ',')}%</Text>
    </View>
  );
}
