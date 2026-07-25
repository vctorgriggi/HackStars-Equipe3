import { ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { TraelFonts, type ReadingState } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Project } from '@/data/trael';

import { SegmentedProgress, type SegmentGroup } from './segmented-progress';
import { StateBadge } from './state-badge';

export function projectStats(p: Project) {
  const c: Record<ReadingState, number> = { pending: 0, processing: 0, success: 0, lowconf: 0, mismatch: 0, validated: 0 };
  p.units.forEach((u) => c[u.state]++);
  const done = c.success + c.validated + c.lowconf + c.mismatch;
  const order: ReadingState[] = ['success', 'validated', 'lowconf', 'mismatch', 'processing', 'pending'];
  const segments: SegmentGroup[] = order.filter((s) => c[s]).map((s) => ({ state: s, count: c[s] }));
  return { c, done, segments };
}

export function ProjectCard({ project, onPress }: { project: Project; onPress: () => void }) {
  const theme = useTheme();
  const { c, done, segments } = projectStats(project);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? theme.surface2 : theme.surface1,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 8,
        padding: 13,
        gap: 9,
      })}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: TraelFonts.sansSemi, fontSize: 14, color: theme.text1 }}>{project.lote}</Text>
          <Text style={{ fontFamily: TraelFonts.sans, fontSize: 11, color: theme.text2, marginTop: 1 }}>{project.desc}</Text>
        </View>
        <Text style={{ fontFamily: TraelFonts.mono, fontSize: 12, color: theme.text2 }}>
          {done}/{project.units.length}
        </Text>
        <ChevronRight size={16} color={theme.text3} strokeWidth={1.8} />
      </View>
      <SegmentedProgress segments={segments} total={project.units.length} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {c.mismatch > 0 && <StateBadge state={'mismatch'} label={c.mismatch + (c.mismatch === 1 ? ' divergência' : ' divergências')} />}
        {c.processing > 0 && <StateBadge state={'processing'} label={'lendo agora'} pulse />}
        <Text style={{ marginLeft: 'auto', fontFamily: TraelFonts.sans, fontSize: 11, color: theme.text3 }}>{project.eta}</Text>
      </View>
    </Pressable>
  );
}
