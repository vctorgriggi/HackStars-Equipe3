import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { SerialNumber } from '@/components/serial-number';
import { StateBadge } from '@/components/state-badge';
import { STATE_COLORS, STATE_LABELS, TraelFonts } from '@/constants/theme';
import { attemptsFor, PROJECTS } from '@/data/trael';
import { useTheme } from '@/hooks/use-theme';

export default function UnitTimelineScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id, n } = useLocalSearchParams<{ id: string; n: string }>();
  const p = PROJECTS.find((x) => x.id === id)!;
  const unit = p.units.find((u) => u.n === Number(n))!;
  const attempts = attemptsFor(unit);
  const subtitle = p.lote + ' · ' + p.desc;
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable
          onPress={() => router.back()}
          style={{ width: 40, height: 40, marginLeft: -8, alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={19} color={theme.text1} strokeWidth={1.8} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: TraelFonts.sansBold, fontSize: 16, color: theme.text1 }}>
            Local {('0' + unit.n).slice(-2)}
          </Text>
          <Text style={{ fontFamily: TraelFonts.sans, fontSize: 11, color: theme.text2 }}>{subtitle}</Text>
        </View>
        <StateBadge state={unit.state} />
      </View>
      <View style={{ backgroundColor: theme.surface1, borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 14 }}>
        <SerialNumber label={'Nº de série esperado'} value={unit.serial} size={'lg'} />
      </View>
      <Text
        style={{ fontFamily: TraelFonts.sansSemi, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: theme.text3 }}>
        Tentativas de leitura
      </Text>
      <View style={{ backgroundColor: theme.surface1, borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 14, gap: 0 }}>
        {attempts.map((a, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ alignItems: 'center' }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: STATE_COLORS[a.state], marginTop: 4 }} />
              {i < attempts.length - 1 && <View style={{ width: 1, flex: 1, backgroundColor: theme.border }} />}
            </View>
            <View style={{ flex: 1, paddingBottom: i < attempts.length - 1 ? 16 : 0 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: TraelFonts.sansSemi, fontSize: 12, color: STATE_COLORS[a.state] }}>
                  {STATE_LABELS[a.state]}
                </Text>
                <Text style={{ fontFamily: TraelFonts.mono, fontSize: 10, color: theme.text3 }}>{a.timestamp}</Text>
              </View>
              {a.value ? (
                <Text style={{ fontFamily: TraelFonts.monoSemi, fontSize: 14, color: theme.text1, marginTop: 2 }}>
                  {a.value}
                  {a.confidence != null ? '  ·  ' + a.confidence + '%' : ''}
                </Text>
              ) : null}
              <Text style={{ fontFamily: TraelFonts.sans, fontSize: 11, color: theme.text2, marginTop: 2 }}>
                {a.by}
                {a.note ? ' — ' + a.note : ''}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
