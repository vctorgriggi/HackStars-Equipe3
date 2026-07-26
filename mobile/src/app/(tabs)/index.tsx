import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { ProjectCard } from '@/components/project-card';
import { StatTile } from '@/components/stat-tile';
import { STATE_COLORS, TraelFonts } from '@/constants/theme';
import { PROJECTS } from '@/data/trael';
import { useTheme } from '@/hooks/use-theme';
import { useOccurrences } from '@/state/occurrences-context';

export default function DashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { queue } = useOccurrences();
  const [refreshing, setRefreshing] = useState(false);
  const [tick, setTick] = useState(0); // re-monta os KPIs p/ novo count-up
  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      setTick((t) => t + 1);
    }, 900);
  };
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 16, gap: 18 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} colors={[theme.accent]} />
      }>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View>
          <Text
            style={{
              fontFamily: TraelFonts.sansSemi,
              fontSize: 10,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: theme.text3,
            }}>
            Turno B · 25/07/2026
          </Text>
          <Text style={{ fontFamily: TraelFonts.sansBold, fontSize: 24, color: theme.text1, marginTop: 2 }}>Hoje</Text>
        </View>
      </View>
      <View key={tick} style={{ flexDirection: 'row', gap: 8 }}>
        <StatTile label={'Leituras hoje'} value={342} />
        <StatTile label={'Taxa de sucesso'} value={97.2} unit={'%'} state={'success'} decimals={1} />
        <StatTile label={'Ocorrências'} value={queue.length} state={'mismatch'} />
      </View>
      <View style={{ gap: 10 }}>
        <Text
          style={{
            fontFamily: TraelFonts.sansSemi,
            fontSize: 11,
            letterSpacing: 1,
            textTransform: 'uppercase',
            color: theme.text3,
          }}>
          Projetos ativos
        </Text>
        {PROJECTS.slice(0, 3).map((p) => (
          <ProjectCard key={p.id} project={p} onPress={() => router.push(`/projects/${p.id}`)} />
        ))}
      </View>
      <View style={{ gap: 10 }}>
        <Text
          style={{
            fontFamily: TraelFonts.sansSemi,
            fontSize: 11,
            letterSpacing: 1,
            textTransform: 'uppercase',
            color: theme.text3,
          }}>
          Alertas recentes
        </Text>
        <View style={{ backgroundColor: theme.surface1, borderWidth: 1, borderColor: theme.border, borderRadius: 8, overflow: 'hidden' }}>
          {queue
            .filter((o) => o.state === 'mismatch')
            .slice(0, 3)
            .map((o) => (
              <Pressable
                key={o.id}
                onPress={() => router.push('/occurrences')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  padding: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border,
                  minHeight: 48,
                }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: STATE_COLORS.mismatch }} />
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ fontFamily: TraelFonts.sans, fontSize: 12, color: theme.text1 }}>
                    {o.line} parada — local {o.unit}
                  </Text>
                  <Text style={{ fontFamily: TraelFonts.mono, fontSize: 10, color: theme.text3, marginTop: 1 }}>
                    {o.read} ≠ {o.expected} · {o.cam}
                  </Text>
                </View>
                <Text style={{ fontFamily: TraelFonts.mono, fontSize: 10, color: theme.text3 }}>{o.ts}</Text>
              </Pressable>
            ))}
        </View>
      </View>
    </ScrollView>
  );
}
