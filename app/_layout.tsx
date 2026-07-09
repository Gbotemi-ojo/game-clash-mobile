import { Stack } from 'expo-router';
import { AuthProvider } from '../src/context/AuthContext';
import { SocketProvider } from '../src/context/SocketContext';
import { usePushNotifications } from '../src/hooks/usePushNotifications'; 
import GlobalChatToast from '../src/components/GlobalChatToast'; 

import { initializeLocalDatabase } from '../src/db/localDb';
initializeLocalDatabase();

function AppContent() {
  usePushNotifications();

  return (
    <SocketProvider>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Existing Tab and Auth Stacks */}
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        
        {/* Full-Screen Pushes */}
        <Stack.Screen name="withdrawal" />
        <Stack.Screen name="leagues" />
        <Stack.Screen name="create-tournament" />
        
        {/* Modal Overlay for Tiers - Shared across tabs */}
        <Stack.Screen 
          name="tiers" 
          options={{ 
            presentation: 'modal', 
            animation: 'slide_from_bottom' 
          }} 
        />
      </Stack>
      <GlobalChatToast />
    </SocketProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
