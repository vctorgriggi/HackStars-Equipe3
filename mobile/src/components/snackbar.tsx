import { Undo2 } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { TraelFonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useOccurrences } from '@/state/occurrences-context';

export function Snackbar() {
  const theme = useTheme();
  const { snack } = useOccurrences();
  if (!snack) return null;
  return (
    <View
      style={{
        position: 'absolute',
        left: 14,
        right: 14,
        bottom: 100,
        backgroundColor: theme.surface3,
        borderWidth: 1,
        borderColor: theme.borderStrong,
        borderRadius: 8,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        elevation: 8,
      }}>
      <Text style={{ flex: 1, fontFamily: TraelFonts.sans, fontSize: 12, color: theme.text1 }}>{snack.msg}</Text>
      <Undo2 size={13} color={theme.accent} strokeWidth={2} />
    </View>
  );
}
