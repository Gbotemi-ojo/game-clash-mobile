import { Stack } from 'expo-router';
import { AuthProvider } from '../src/context/AuthContext';
import { SocketProvider } from '../src/context/SocketContext';
import GlobalChatToast from '../src/components/GlobalChatToast';

export default function RootLayout() {
  return (
    <AuthProvider>
      <SocketProvider>
        
        {/* ✅ Restored Stack navigation to fix the hamburger menu and routing context */}
        <Stack screenOptions={{ headerShown: false }} /> 

        {/* ✅ This sits transparently on top of everything, waiting for a socket event! */}
        <GlobalChatToast />
        
      </SocketProvider>
    </AuthProvider>
  );
}