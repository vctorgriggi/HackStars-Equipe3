import { useRouter } from 'expo-router';
import { Check, ZoomIn } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { ConfidenceMeter } from '@/components/confidence-meter';
import { SerialNumber } from '@/components/serial-number';
import { StateBadge } from '@/components/state-badge';
import { STATE_COLORS, TraelFonts } from '@/constants/theme';
import { PROJECTS } from '@/data/trael';
import { useTheme } from '@/hooks/use-theme';
import { useOccurrences } from '@/state/occurrences-context';

// Fila de ocorrências: checagem abaixo do limiar PARA a linha; a resolução é
// sempre correção física (serigrafia/repintura) + nova foto para releitura.
export default function OccurrencesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { queue, pendingSync } = useOccurrences();
  const o = queue[0];
  if (!o) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <View
          style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: theme.soft.success, alignItems: 'center', justifyContent: 'center' }}>
          <Check size={40} color={STATE_COLORS.success} strokeWidth={2} />
        </View>
        <Text style={{ fontFamily: TraelFonts.sansSemi, fontSize: 16, color: theme.text1 }}>Nenhuma ocorrência</Text>
        <Text style={{ fontFamily: TraelFonts.sans, fontSize: 12, color: theme.text2 }}>Linhas operando normalmente.</Text>
      </View>
    );
  }
  const proj = PROJECTS.find((p) => p.id === o.projId)!;
  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text style={{ fontFamily: TraelFonts.sansBold, fontSize: 19, color: theme.text1 }}>Ocorrências</Text>
          <Text style={{ fontFamily: TraelFonts.sans, fontSize: 11, color: theme.text3, marginTop: 1 }}>
            Checagem abaixo do limiar para a linha · {queue.length} pendentes
          </Text>
        </View>
        {pendingSync > 0 && <Text style={{ fontFamily: TraelFonts.sans, fontSize: 10, color: theme.text2 }}>sincronizando…</Text>}
      </View>
      <View style={{ flex: 1, backgroundColor: theme.surface1, borderWidth: 1, borderColor: theme.border, borderRadius: 12, overflow: 'hidden' }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 9,
            padding: 12,
            backgroundColor: theme.soft.mismatch,
            borderBottomWidth: 1,
            borderBottomColor: STATE_COLORS.mismatch + '59',
          }}>
          <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: STATE_COLORS.mismatch }} />
          <Text style={{ flex: 1, fontFamily: TraelFonts.sansSemi, fontSize: 12, color: STATE_COLORS.mismatch }}>
            {o.line} parada — aguardando correção
          </Text>
          <Text style={{ fontFamily: TraelFonts.mono, fontSize: 11, color: STATE_COLORS.mismatch }}>{o.stopped}</Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 12,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}>
          <Text style={{ fontFamily: TraelFonts.mono, fontSize: 11, color: theme.text2 }}>
            {o.cam} · {o.ts}
          </Text>
          <StateBadge state={o.state} />
        </View>
        <Pressable style={{ height: 180, backgroundColor: theme.inset, alignItems: 'center', justifyContent: 'center' }}>
          <Text
            style={{ fontFamily: TraelFonts.monoSemi, fontSize: 30, letterSpacing: 5, color: '#cfd8e0', transform: [{ rotate: '-2deg' }] }}>
            {o.read}
          </Text>
          <View style={{ position: 'absolute', right: 10, top: 8, backgroundColor: 'rgba(0,0,0,0.78)', borderRadius: 4, padding: 4 }}>
            <ZoomIn size={13} color={'#e7edf3'} strokeWidth={1.8} />
          </View>
          <Text
            style={{
              position: 'absolute',
              left: 10,
              bottom: 8,
              backgroundColor: 'rgba(0,0,0,0.78)',
              color: '#e7edf3',
              fontFamily: TraelFonts.mono,
              fontSize: 10,
              borderRadius: 4,
              paddingHorizontal: 7,
              paddingVertical: 3,
            }}>
            {proj.lote} · local {o.unit}
          </Text>
        </Pressable>
        <View style={{ flex: 1, padding: 13, gap: 12 }}>
          <SerialNumber label={'Lido pela IA'} value={o.read} expected={o.expected} size={'lg'} />
          <SerialNumber label={'Esperado'} value={o.expected} size={'md'} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text
              style={{ fontFamily: TraelFonts.sansSemi, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: theme.text3 }}>
              Confiança
            </Text>
            <ConfidenceMeter value={o.conf} />
          </View>
        </View>
        <View style={{ padding: 13, borderTopWidth: 1, borderTopColor: theme.border }}>
          <Pressable
            onPress={() => router.push('/occurrences/correction')}
            style={({ pressed }) => ({
              height: 48,
              borderRadius: 8,
              backgroundColor: pressed ? '#00542d' : theme.brandPrimary,
              alignItems: 'center',
              justifyContent: 'center',
            })}>
            <Text style={{ fontFamily: TraelFonts.sansSemi, fontSize: 14, color: '#fff' }}>Registrar correção física</Text>
          </Pressable>
        </View>
      </View>
      <Text style={{ textAlign: 'center', fontFamily: TraelFonts.sans, fontSize: 10, color: theme.text3 }}>
        Corrigir na peça (serigrafia/repintura) e enviar nova foto para releitura
      </Text>
    </View>
  );
}
