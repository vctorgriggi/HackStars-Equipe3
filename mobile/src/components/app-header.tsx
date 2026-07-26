import { LinearGradient } from 'expo-linear-gradient';
import { usePathname, useRouter } from 'expo-router';
import { ArrowLeft, History } from 'lucide-react-native';
import { Image, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TraelFonts } from '@/constants/theme';
import { useOccurrences } from '@/state/occurrences-context';

export function AppHeader() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { pendingSync } = useOccurrences();
  const onActivity = pathname === '/activity';

  return (
    <LinearGradient
      colors={['#006536', '#2f8a46', '#5AA646']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0.4 }}
      style={{
        paddingTop: insets.top + 4,
        paddingBottom: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Image
          source={require('@/assets/images/logo-trael.png')}
          style={{ height: 15, width: 86, resizeMode: 'contain' }}
        />
        <Text
          style={{
            fontFamily: TraelFonts.sansSemi,
            fontSize: 10,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.75)',
            borderLeftWidth: 1,
            borderLeftColor: 'rgba(255,255,255,0.3)',
            paddingLeft: 10,
          }}>
          Vision
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {pendingSync > 0 && (
          <Text
            style={{
              fontFamily: TraelFonts.mono,
              fontSize: 10,
              color: 'rgba(255,255,255,0.85)',
              backgroundColor: 'rgba(0,0,0,0.22)',
              borderRadius: 10,
              paddingHorizontal: 9,
              paddingVertical: 4,
            }}>
            sinc.
          </Text>
        )}
        <Pressable
          onPress={() => (onActivity ? router.back() : router.push('/activity'))}
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            backgroundColor: 'rgba(0,0,0,0.18)',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          {onActivity ? (
            <ArrowLeft size={16} color={'#fff'} strokeWidth={1.8} />
          ) : (
            <History size={16} color={'#fff'} strokeWidth={1.8} />
          )}
        </Pressable>
      </View>
    </LinearGradient>
  );
}
