import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Check, Clock, Loader, ShieldCheck, TriangleAlert, X, type LucideIcon } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { projectStats } from '@/components/project-card';
import { SegmentedProgress } from '@/components/segmented-progress';
import { STATE_COLORS, STATE_LABELS, TraelFonts, type ReadingState } from '@/constants/theme';
import { PROJECTS } from '@/data/trael';
import { useTheme } from '@/hooks/use-theme';

const ICONS: Record<ReadingState, LucideIcon> = {
  pending: Clock,
  processing: Loader,
  success: Check,
  lowconf: TriangleAlert,
  mismatch: X,
  validated: ShieldCheck,
};

export default function ProjectDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = PROJECTS.find((x) => x.id === id)!;
  const { c, done, segments } = projectStats(p);
  const kpi = (label: string, v: number, color: string) => (
    <View style={{ flex: 1, backgroundColor: theme.surface1, borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 11 }}>
      <Text
        style={{
          fontFamily: TraelFonts.sansSemi,
          fontSize: 10,
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: theme.text3,
        }}>
        {label}
      </Text>
      <Text style={{ fontFamily: TraelFonts.monoSemi, fontSize: 19, color, marginTop: 2 }}>{v}</Text>
    </View>
  );
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable
          onPress={() => router.back()}
          style={{ width: 40, height: 40, marginLeft: -8, alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={19} color={theme.text1} strokeWidth={1.8} />
        </Pressable>
        <View>
          <Text style={{ fontFamily: TraelFonts.sansBold, fontSize: 16, color: theme.text1 }}>{p.lote}</Text>
          <Text style={{ fontFamily: TraelFonts.sans, fontSize: 11, color: theme.text2 }}>{p.desc}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {kpi('Lidos', done, STATE_COLORS.success)}
        {kpi('Pendentes', c.pending + c.processing, theme.text2)}
        {kpi('Diverg.', c.mismatch, STATE_COLORS.mismatch)}
      </View>
      <SegmentedProgress segments={segments} total={p.units.length} height={10} />
      <Text
        style={{ fontFamily: TraelFonts.sansSemi, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: theme.text3 }}>
        Locais de leitura · {p.units.length}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {p.units.map((u) => {
          const Icon = ICONS[u.state];
          const color = u.state === 'pending' ? theme.text3 : STATE_COLORS[u.state];
          return (
            <Pressable
              key={u.n}
              onPress={() => router.push(`/projects/${p.id}/unit/${u.n}`)}
              style={{
                width: '22.5%',
                aspectRatio: 1,
                minHeight: 48,
                borderRadius: 8,
                borderWidth: 1,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                borderColor: u.state === 'pending' ? theme.border : color + '66',
                backgroundColor: u.state === 'pending' ? theme.surface2 : theme.soft[u.state],
              }}>
              <Icon size={16} color={color} strokeWidth={1.8} />
              <Text style={{ fontFamily: TraelFonts.mono, fontSize: 10, color }}>{('0' + u.n).slice(-2)}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {(Object.keys(STATE_LABELS) as ReadingState[]).map((k) => (
          <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: STATE_COLORS[k] }} />
            <Text style={{ fontFamily: TraelFonts.sans, fontSize: 10, color: theme.text2 }}>{STATE_LABELS[k]}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
