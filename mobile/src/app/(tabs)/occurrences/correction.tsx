import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check, Clock, Loader } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { SerialNumber } from '@/components/serial-number';
import { STATE_COLORS, TraelFonts } from '@/constants/theme';
import { PROJECTS } from '@/data/trael';
import { useTheme } from '@/hooks/use-theme';
import { useOccurrences } from '@/state/occurrences-context';

type Phase = 'idle' | 'photo' | 'reading';

// Fluxo: corrigir nº na peça → capturar nova foto → releitura automática → linha liberada.
export default function CorrectionScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { queue, resolveFront } = useOccurrences();
  const [phase, setPhase] = useState<Phase>('idle');
  const [type, setType] = useState<'serigrafia' | 'repintura'>('serigrafia');
  const o = queue[0];
  if (!o) {
    router.back();
    return null;
  }
  const proj = PROJECTS.find((p) => p.id === o.projId)!;
  const sendReread = () => {
    setPhase('reading');
    setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      resolveFront();
      router.back();
    }, 1800);
  };
  const step = (label: string, done: boolean, active: boolean) => {
    const Icon = done ? Check : active ? Loader : Clock;
    const color = done ? STATE_COLORS.success : active ? STATE_COLORS.processing : theme.text3;
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: done ? theme.soft.success : active ? theme.soft.processing : theme.surface2,
          }}>
          <Icon size={11} color={color} strokeWidth={2.2} />
        </View>
        <Text style={{ fontFamily: TraelFonts.sans, fontSize: 12, color: done || active ? theme.text1 : theme.text3 }}>{label}</Text>
      </View>
    );
  };
  const chip = (k: 'serigrafia' | 'repintura', label: string) => (
    <Pressable
      key={k}
      onPress={() => setType(k)}
      style={{
        flex: 1,
        minHeight: 48,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderColor: type === k ? theme.brandPrimary : theme.border,
        backgroundColor: type === k ? theme.brandSurface : theme.surface1,
      }}>
      <Text style={{ fontFamily: TraelFonts.sansSemi, fontSize: 12, color: type === k ? theme.text1 : theme.text2 }}>{label}</Text>
    </Pressable>
  );
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable
          onPress={() => router.back()}
          style={{ width: 40, height: 40, marginLeft: -8, alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={19} color={theme.text1} strokeWidth={1.8} />
        </Pressable>
        <View>
          <Text style={{ fontFamily: TraelFonts.sansBold, fontSize: 16, color: theme.text1 }}>Correção física</Text>
          <Text style={{ fontFamily: TraelFonts.sans, fontSize: 11, color: theme.text2 }}>
            {o.line} · {proj.lote} · local {o.unit}
          </Text>
        </View>
      </View>
      <View style={{ height: 88, borderRadius: 8, backgroundColor: theme.inset, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <Text
          style={{ fontFamily: TraelFonts.monoSemi, fontSize: 34, letterSpacing: 5, color: '#cfd8e0', transform: [{ rotate: '-1.5deg' }] }}>
          {phase === 'idle' ? o.read : o.expected}
        </Text>
        <Text
          style={{
            position: 'absolute',
            left: 10,
            bottom: 6,
            backgroundColor: 'rgba(0,0,0,0.78)',
            color: '#e7edf3',
            fontFamily: TraelFonts.mono,
            fontSize: 10,
            borderRadius: 4,
            paddingHorizontal: 7,
            paddingVertical: 3,
          }}>
          {phase === 'idle' ? 'foto original · ' + o.cam : 'nova foto · captura manual'}
        </Text>
      </View>
      <SerialNumber label={'Lido vs. esperado'} value={o.read} expected={o.expected} size={'lg'} />
      <Text
        style={{ fontFamily: TraelFonts.sansSemi, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: theme.text3 }}>
        Tipo de correção
      </Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {chip('serigrafia', 'Serigrafia')}
        {chip('repintura', 'Repintura')}
      </View>
      <View style={{ backgroundColor: theme.surface1, borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 12, gap: 8 }}>
        {step('Corrigir nº de série na peça (' + type + ')', phase !== 'idle', phase === 'idle')}
        {step('Capturar nova foto do local', phase === 'photo' || phase === 'reading', false)}
        {step('Releitura automática pela IA/OCR', false, phase === 'reading')}
      </View>
      {phase === 'idle' && (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setPhase('photo');
          }}
          style={{ height: 48, borderRadius: 8, backgroundColor: theme.brandPrimary, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: TraelFonts.sansSemi, fontSize: 14, color: '#fff' }}>Capturar nova foto</Text>
        </Pressable>
      )}
      {phase === 'photo' && (
        <Pressable
          onPress={sendReread}
          style={{ height: 48, borderRadius: 8, backgroundColor: theme.brandPrimary, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: TraelFonts.sansSemi, fontSize: 14, color: '#fff' }}>Enviar para releitura</Text>
        </Pressable>
      )}
      {phase === 'reading' && (
        <View
          style={{
            height: 48,
            borderRadius: 8,
            backgroundColor: theme.surface2,
            borderWidth: 1,
            borderColor: theme.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text style={{ fontFamily: TraelFonts.sansSemi, fontSize: 14, color: theme.text2 }}>Aguardando releitura…</Text>
        </View>
      )}
      <Pressable onPress={() => router.back()} style={{ height: 40, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: TraelFonts.sansMed, fontSize: 13, color: theme.text2 }}>Cancelar</Text>
      </Pressable>
    </ScrollView>
  );
}
