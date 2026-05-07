// app/_layout.tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        {/* We will add logic here later to switch between (auth) and (tabs) */}
        <Stack.Screen name="(auth)" />
      </Stack>
    </>
  );
}
