import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { projectStats } from '@/components/project-card';
import { SegmentedProgress, type SegmentGroup } from '@/components/segmented-progress';
import { StateBadge } from '@/components/state-badge';
import { TraelFonts, type ReadingState } from '@/constants/theme';
import { PROJECTS, type Project } from '@/data/trael';
import { useTheme } from '@/hooks/use-theme';

export default function ClientsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const byClient: Record<string, Project[]> = {};
  PROJECTS.forEach((p) => {
    const name = p.desc.split('·')[1].trim();
    (byClient[name] = byClient[name] || []).push(p);
  });
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontFamily: TraelFonts.sansBold, fontSize: 24, color: theme.text1 }}>Clientes</Text>
      <View style={{ gap: 10 }}>
        {Object.entries(byClient).map(([name, prs]) => {
          let done = 0;
          let total = 0;
          let mis = 0;
          const segMap: Partial<Record<ReadingState, number>> = {};
          prs.forEach((p) => {
            const st = projectStats(p);
            done += st.done;
            total += p.units.length;
            mis += st.c.mismatch;
            st.segments.forEach((g) => {
              const state = g.state as ReadingState;
              segMap[state] = (segMap[state] || 0) + g.count;
            });
          });
          const segments: SegmentGroup[] = Object.entries(segMap).map(([state, count]) => ({
            state: state as ReadingState,
            count: count as number,
          }));
          return (
            <Pressable
              key={name}
              onPress={() => router.push({ pathname: '/projects', params: { q: name } })}
              style={({ pressed }) => ({
                backgroundColor: pressed ? theme.surface2 : theme.surface1,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 8,
                padding: 13,
                gap: 9,
              })}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontFamily: TraelFonts.sansSemi, fontSize: 14, color: theme.text1 }}>{name}</Text>
                  <Text style={{ fontFamily: TraelFonts.sans, fontSize: 11, color: theme.text2, marginTop: 1 }}>
                    {prs.length}
                    {prs.length === 1 ? ' lote ativo' : ' lotes ativos'}
                  </Text>
                </View>
                <Text style={{ fontFamily: TraelFonts.mono, fontSize: 12, color: theme.text2 }}>
                  {done}/{total}
                </Text>
              </View>
              <SegmentedProgress segments={segments} total={total} />
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {mis > 0 && <StateBadge state={'mismatch'} label={mis + (mis === 1 ? ' divergência' : ' divergências')} />}
                <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontFamily: TraelFonts.sansMed, fontSize: 11, color: theme.brandMedium }}>Ver lotes</Text>
                  <ChevronRight size={13} color={theme.brandMedium} strokeWidth={1.8} />
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
