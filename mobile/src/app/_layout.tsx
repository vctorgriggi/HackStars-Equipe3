import { IBMPlexMono_500Medium, IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AppHeader } from '@/components/app-header';
import { Snackbar } from '@/components/snackbar';
import { OccurrencesProvider } from '@/state/occurrences-context';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
  });

  // Splash nativa (preventAutoHideAsync acima) só é liberada dentro de
  // AnimatedSplashOverlay — não monta essa árvore até as fontes carregarem.
  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <OccurrencesProvider>
          <AnimatedSplashOverlay />
          <View style={{ flex: 1 }}>
            <AppHeader />
            <View style={{ flex: 1 }}>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="activity" options={{ presentation: 'modal' }} />
              </Stack>
            </View>
            <Snackbar />
          </View>
        </OccurrencesProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
