import { VideoOff } from 'lucide-react-native';
import { ScrollView, Text, View } from 'react-native';

import { STATE_COLORS_HC, TraelFonts } from '@/constants/theme';
import { CAMERAS } from '@/data/trael';
import { useTheme } from '@/hooks/use-theme';

export default function CamerasScreen() {
  const theme = useTheme();
  const online = CAMERAS.filter((c) => c.online).length;
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <Text style={{ fontFamily: TraelFonts.sansBold, fontSize: 24, color: theme.text1 }}>Câmeras</Text>
        <Text style={{ fontFamily: TraelFonts.mono, fontSize: 11, color: theme.text2 }}>
          {online}/{CAMERAS.length} online
        </Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {CAMERAS.map((c) => (
          <View key={c.id} style={{ width: '47.8%', gap: 6 }}>
            {c.online ? (
              <View style={{ aspectRatio: 4 / 3, borderRadius: 8, backgroundColor: theme.inset, overflow: 'hidden', justifyContent: 'flex-end' }}>
                {c.serial ? (
                  <View
                    style={{
                      position: 'absolute',
                      top: '34%',
                      left: '20%',
                      right: '16%',
                      bottom: '36%',
                      borderWidth: 2,
                      borderColor: STATE_COLORS_HC[c.state],
                      borderRadius: 3,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Text style={{ fontFamily: TraelFonts.monoSemi, fontSize: 11, letterSpacing: 2, color: '#cfd8e0' }}>{c.serial}</Text>
                  </View>
                ) : null}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 6 }}>
                  <Text
                    style={{
                      backgroundColor: 'rgba(0,0,0,0.78)',
                      color: '#e7edf3',
                      fontFamily: TraelFonts.mono,
                      fontSize: 9,
                      borderRadius: 3,
                      paddingHorizontal: 5,
                      paddingVertical: 2,
                    }}>
                    {c.id}
                  </Text>
                  {c.conf > 0 && (
                    <Text
                      style={{
                        backgroundColor: 'rgba(0,0,0,0.78)',
                        color: STATE_COLORS_HC[c.state],
                        fontFamily: TraelFonts.mono,
                        fontSize: 9,
                        borderRadius: 3,
                        paddingHorizontal: 5,
                        paddingVertical: 2,
                      }}>
                      {c.conf}%
                    </Text>
                  )}
                </View>
              </View>
            ) : (
              <View
                style={{
                  aspectRatio: 4 / 3,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderStyle: 'dashed',
                  borderColor: theme.borderStrong,
                  backgroundColor: theme.inset,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}>
                <VideoOff size={20} color={theme.text3} strokeWidth={1.8} />
                <Text style={{ fontFamily: TraelFonts.mono, fontSize: 10, color: theme.text3 }}>{c.id} · offline</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 }}>
              <Text numberOfLines={1} style={{ flex: 1, fontFamily: TraelFonts.sans, fontSize: 11, color: theme.text2 }}>
                {c.label}
              </Text>
              <Text style={{ fontFamily: TraelFonts.mono, fontSize: 10, color: theme.text3 }}>{c.last}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
