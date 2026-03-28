import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import 'react-native-reanimated';

import { AdProvider } from '../game/AdContext';
import { GlobalBanner } from '../game/GlobalBanner';

export default function RootLayout() {
  return (
    <AdProvider>
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="game" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="howto" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
          </Stack>
        </View>
        <GlobalBanner />
      </View>
      <StatusBar style="light" />
    </AdProvider>
  );
}
