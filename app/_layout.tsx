import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

export default function RootLayout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="game" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="howto" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}
