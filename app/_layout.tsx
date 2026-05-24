import { useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { SocketProvider } from '../src/context/SocketContext';
import { usePushNotifications } from '../src/hooks/usePushNotifications'; 

function AppContent() {
  const { expoPushToken } = usePushNotifications(); 
  const { session } = useAuth();
  
  const hasAttemptedSend = useRef(false); 

  useEffect(() => {
    if (expoPushToken && session?.user?.id && !hasAttemptedSend.current) {
      hasAttemptedSend.current = true; // Lock it

      const sendTokenToBackend = async () => {
        try {
          console.log(`[PUSH] Sending token to backend...`);
          const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.43.131:5000'; 

          let token = session?.session?.token;

          if (!token) {
            await new Promise(resolve => setTimeout(resolve, 500));
            token = await SecureStore.getItemAsync("better-auth.session_token");
          }
          
          if (!token) {
            console.error("[PUSH] Error: Token was still null!");
            hasAttemptedSend.current = false;
            return;
          }

          // ✅ Strip any invisible quotes or spaces Expo might have added
          const cleanToken = token.replace(/['"]+/g, '').trim();

          const res = await fetch(`${apiUrl}/api/v1/users/push-token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${cleanToken}`,
              'Origin': 'gameclashmobile://' 
            },
            body: JSON.stringify({
              pushToken: expoPushToken,
              userId: session.user.id
            }),
          });

          if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Status ${res.status}: ${errorText}`);
          }
          
          console.log("[PUSH] Token saved to DB successfully! 🎉");

        } catch (err: any) {
          console.error("[PUSH] Failed to save token:", err.message);
          hasAttemptedSend.current = false; 
        }
      };

      sendTokenToBackend();
    }
  }, [expoPushToken, session?.user?.id]); 

  return (
    <SocketProvider>
      <Stack screenOptions={{ headerShown: false }} /> 
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