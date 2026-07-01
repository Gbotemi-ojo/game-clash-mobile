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
      <Stack screenOptions={{ headerShown: false }} /> 
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
