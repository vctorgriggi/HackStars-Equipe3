import { Text, View } from 'react-native';

import { STATE_COLORS, TraelFonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Mono + diff caractere a caractere vs. valor esperado (0/O e 1/I/l nunca se confundem na IBM Plex Mono).
export function SerialNumber({
  value,
  expected,
  label,
  size = 'md',
}: {
  value: string;
  expected?: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const theme = useTheme();
  const fs = size === 'lg' ? 26 : size === 'md' ? 18 : 14;
  return (
    <View>
      {label ? (
        <Text
          style={{
            fontFamily: TraelFonts.sansSemi,
            fontSize: 10,
            letterSpacing: 1,
            textTransform: 'uppercase',
            color: theme.text3,
            marginBottom: 4,
          }}>
          {label}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row' }}>
        {value.split('').map((ch, i) => {
          const bad = expected != null && expected[i] !== ch;
          return (
            <Text
              key={i}
              style={{
                fontFamily: TraelFonts.monoSemi,
                fontSize: fs,
                letterSpacing: 2,
                color: bad ? STATE_COLORS.mismatch : theme.text1,
                backgroundColor: bad ? theme.soft.mismatch : 'transparent',
                borderRadius: 3,
              }}>
              {ch}
            </Text>
          );
        })}
      </View>
    </View>
  );
}
