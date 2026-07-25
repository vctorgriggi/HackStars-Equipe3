import { Text, View } from 'react-native';

import { STATE_COLORS, STATE_LABELS, TraelFonts, type ReadingState } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function StateBadge({ state, label, pulse }: { state: ReadingState; label?: string; pulse?: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: theme.soft[state],
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 3,
        alignSelf: 'flex-start',
      }}>
      <View
        style={{
          width: 7,
          height: 7,
          borderRadius: 4,
          backgroundColor: STATE_COLORS[state],
          opacity: pulse ? 0.9 : 1,
        }}
      />
      <Text style={{ fontFamily: TraelFonts.sansSemi, fontSize: 11, color: STATE_COLORS[state] }}>
        {label ?? STATE_LABELS[state]}
      </Text>
    </View>
  );
}
