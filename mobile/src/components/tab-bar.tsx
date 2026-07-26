import type { TabListProps, TabTriggerSlotProps } from 'expo-router/ui';
import { TriangleAlert, type LucideIcon } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TraelFonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useOccurrences } from '@/state/occurrences-context';

// Nav inferior: 2 abas | ação central (Ocorrências, badge) | 2 abas. Atividade fica no header.
export function TabBar({ children, ...props }: TabListProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      {...props}
      style={{
        flexDirection: 'row',
        alignItems: 'stretch',
        backgroundColor: theme.surface1,
        borderTopWidth: 1,
        borderTopColor: theme.border,
        paddingTop: 6,
        paddingBottom: 12 + insets.bottom,
        paddingHorizontal: 2,
      }}>
      {children}
    </View>
  );
}

type TabBarItemProps = TabTriggerSlotProps & { icon: LucideIcon; label: string };

export function TabBarItem({ icon: Icon, label, isFocused, ...props }: TabBarItemProps) {
  const theme = useTheme();
  return (
    <Pressable {...props} style={{ flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', gap: 3 }}>
      <View
        style={{
          position: 'absolute',
          top: -7,
          width: 26,
          height: 3,
          borderBottomLeftRadius: 3,
          borderBottomRightRadius: 3,
          backgroundColor: theme.accent,
          opacity: isFocused ? 1 : 0,
        }}
      />
      <Icon size={20} color={isFocused ? theme.text1 : theme.text3} strokeWidth={1.8} />
      <Text
        style={{
          fontFamily: isFocused ? TraelFonts.sansSemi : TraelFonts.sansMed,
          fontSize: 10,
          color: isFocused ? theme.text1 : theme.text3,
        }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function FabItem(props: TabTriggerSlotProps) {
  const theme = useTheme();
  const { queue } = useOccurrences();
  return (
    <View style={{ width: 72, alignItems: 'center' }}>
      <Pressable
        {...props}
        style={{
          marginTop: -26,
          width: 54,
          height: 54,
          borderRadius: 27,
          borderWidth: 4,
          borderColor: theme.bgCanvas,
          backgroundColor: theme.brandPrimary,
          alignItems: 'center',
          justifyContent: 'center',
          elevation: 6,
        }}>
        <TriangleAlert size={22} color={'#fff'} strokeWidth={1.8} />
        {queue.length > 0 && (
          <View
            style={{
              position: 'absolute',
              top: -4,
              right: -6,
              minWidth: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: theme.accent,
              borderWidth: 2,
              borderColor: theme.surface1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 4,
            }}>
            <Text style={{ fontFamily: TraelFonts.monoSemi, fontSize: 11, color: theme.brandInk }}>{queue.length}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}
