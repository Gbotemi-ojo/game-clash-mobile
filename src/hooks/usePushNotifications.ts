import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

// Tells the OS how to handle notifications when the app is OPEN
// Tells the OS how to handle notifications when the app is OPEN
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,  // Kept for backwards compatibility 
    shouldShowBanner: false, // ✅ NEW: Suppresses the native drop-down banner
    shouldShowList: false,   // ✅ NEW: Suppresses it from the notification center list
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>();

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        console.log("✅ EXPO PUSH TOKEN GENERATED: ", token);
        setExpoPushToken(token);
      }
    });
  }, []);

  return { expoPushToken };
}

async function registerForPushNotificationsAsync() {
  let token;

  // Android requires a specific channel to be created
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#38bdf8', // Your app's theme blue!
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    // If we don't have permission, ask for it!
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Permission not granted to get push token!');
      return;
    }
    
    // Generate the token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}
