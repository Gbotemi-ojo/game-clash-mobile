import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../context/AuthContext';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
  const { session } = useAuth();

  const hasAttemptedSend = useRef(false);

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        console.log("✅ EXPO PUSH TOKEN GENERATED: ", token);
        setExpoPushToken(token);
      }
    });
  }, []);

  useEffect(() => {
    if (!expoPushToken || !session?.user?.id || hasAttemptedSend.current) return;

    hasAttemptedSend.current = true;

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
  }, [expoPushToken, session?.user?.id]);

  return { expoPushToken };
}

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#38bdf8',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Permission not granted to get push token!');
      return;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}
