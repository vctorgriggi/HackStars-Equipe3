import { View } from 'react-native';

import { STATE_COLORS, type ReadingState } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface SegmentGroup {
  state: ReadingState | 'empty';
  count: number;
}

export function SegmentedProgress({
  segments,
  total,
  height = 8,
}: {
  segments: SegmentGroup[];
  total: number;
  height?: number;
}) {
  const theme = useTheme();
  const counted = segments.reduce((a, g) => a + g.count, 0);
  const all: SegmentGroup[] = counted < total ? [...segments, { state: 'empty', count: total - counted }] : segments;
  return (
    <View style={{ flexDirection: 'row', gap: 2, height, borderRadius: 3, overflow: 'hidden' }}>
      {all.map((g, i) => (
        <View
          key={i}
          style={{
            flex: g.count,
            backgroundColor: g.state === 'empty' ? theme.surface3 : STATE_COLORS[g.state],
            borderRadius: 2,
          }}
        />
      ))}
    </View>
  );
}
