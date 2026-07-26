import { Check, Clock, Loader, ShieldCheck, TriangleAlert, X, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { STATE_COLORS, STATE_LABELS, TraelFonts, type ReadingState } from '@/constants/theme';
import { ACTIVITY, PROJECTS } from '@/data/trael';
import { useTheme } from '@/hooks/use-theme';

const ICONS: Record<ReadingState, LucideIcon> = {
  pending: Clock,
  processing: Loader,
  success: Check,
  lowconf: TriangleAlert,
  mismatch: X,
  validated: ShieldCheck,
};

export default function ActivityScreen() {
  const theme = useTheme();
  const [fState, setFState] = useState<'all' | ReadingState>('all');
  const [fProj, setFProj] = useState<'all' | string>('all');
  const chip = (label: string, active: boolean, onPress: () => void) => (
    <Pressable
      key={label}
      onPress={onPress}
      style={{
        height: 32,
        paddingHorizontal: 12,
        borderRadius: 16,
        borderWidth: 1,
        justifyContent: 'center',
        borderColor: active ? theme.brandPrimary : theme.border,
        backgroundColor: active ? theme.brandSurface : theme.surface1,
      }}>
      <Text style={{ fontFamily: TraelFonts.sansMed, fontSize: 12, color: active ? theme.text1 : theme.text2 }}>{label}</Text>
    </Pressable>
  );
  const stateOpts: ['all' | ReadingState, string][] = [
    ['all', 'Todos'],
    ['mismatch', 'Divergência'],
    ['success', 'Confirmada'],
    ['validated', 'Validada'],
    ['lowconf', 'Baixa conf.'],
  ];
  const rows = ACTIVITY.filter((a) => (fState === 'all' || a.state === fState) && (fProj === 'all' || a.projId === fProj));
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 16, gap: 12 }}>
      <Text style={{ fontFamily: TraelFonts.sansBold, fontSize: 24, color: theme.text1, paddingHorizontal: 16 }}>Atividade</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 16 }}>
        {stateOpts.map(([k, l]) => chip(l, fState === k, () => setFState(k)))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 16 }}>
        {chip('Todos os lotes', fProj === 'all', () => setFProj('all'))}
        {PROJECTS.slice(0, 3).map((p) => chip(p.lote, fProj === p.id, () => setFProj(p.id)))}
      </ScrollView>
      <View style={{ borderTopWidth: 1, borderTopColor: theme.border }}>
        {rows.map((a) => {
          const Icon = ICONS[a.state];
          return (
            <View
              key={a.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
                minHeight: 48,
              }}>
              <View
                style={{ width: 26, height: 26, borderRadius: 6, backgroundColor: theme.soft[a.state], alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={13} color={STATE_COLORS[a.state]} strokeWidth={1.8} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: TraelFonts.monoSemi, fontSize: 12, color: theme.text1 }}>{a.serial}</Text>
                <Text style={{ fontFamily: TraelFonts.sans, fontSize: 10, color: theme.text3, marginTop: 1 }}>
                  {PROJECTS.find((p) => p.id === a.projId)!.lote} · {a.cam} · leitura automática
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontFamily: TraelFonts.mono, fontSize: 10, color: theme.text3 }}>{a.ts}</Text>
                <Text style={{ fontFamily: TraelFonts.sansSemi, fontSize: 10, color: STATE_COLORS[a.state], marginTop: 1 }}>
                  {STATE_LABELS[a.state]}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
