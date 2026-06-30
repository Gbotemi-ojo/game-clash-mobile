// app/(tabs)/_layout.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Tabs, usePathname } from 'expo-router';
import { View, StyleSheet, Text, Animated } from 'react-native';
import { FontAwesome5, Ionicons, Foundation } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

import { authClient, BACKEND_URL } from '../../src/lib/auth-client';
import { useSocket } from '../../src/context/SocketContext';

const bannerAdUnitId = __DEV__ ? TestIds.BANNER : 'ca-app-pub-xxxxxxxxxxxxxxxx/zzzzzzzzzz';

export default function TabLayout() {
  const insets = useSafeAreaInsets(); 
  const { socket } = useSocket();
  const pathname = usePathname(); // Tracks navigation changes
  
  const [unreadChatsCount, setUnreadChatsCount] = useState(0);
  const [needsSetup, setNeedsSetup] = useState(false); // 🔴 Tracks if they need to link Game ID
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  const tabBarHeight = 65 + insets.bottom;

  // ✅ Auto-fetch unread chats
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const { data, error } = await authClient.$fetch<any[]>(`${BACKEND_URL}/api/v1/chat/rooms?_t=${Date.now()}`);
        if (!error && Array.isArray(data)) {
          const total = data.reduce((sum, room) => sum + (room.unreadCount || 0), 0);
          setUnreadChatsCount(total);
        }
      } catch (err) {}
    };

    fetchUnreadCount();

    if (socket) {
      socket.on('new_message', fetchUnreadCount);
      socket.on('messages_read', fetchUnreadCount);
      socket.on('room_updated', fetchUnreadCount);
      
      return () => {
        socket.off('new_message', fetchUnreadCount);
        socket.off('messages_read', fetchUnreadCount);
        socket.off('room_updated', fetchUnreadCount);
      };
    }
  }, [socket]);

  // 🔴 NEW: Check if profile setup is required whenever they navigate
  useEffect(() => {
    const checkProfile = async () => {
      try {
        const { data } = await authClient.$fetch<any>(`${BACKEND_URL}/api/v1/users/me`);
        if (data && (!data.profile || !data.profile.dlsPlayerId)) {
          setNeedsSetup(true);
        } else {
          setNeedsSetup(false);
        }
      } catch (err) {}
    };
    checkProfile();
  }, [pathname]);

  // 🔴 NEW: The pulsing glow animation for the Profile Tab
  useEffect(() => {
    if (needsSetup) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [needsSetup]);

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#121212',
            borderTopColor: '#222',
            height: tabBarHeight, 
            paddingBottom: 8 + insets.bottom, 
            paddingTop: 8,
          },
          tabBarActiveTintColor: '#3b82f6', 
          tabBarInactiveTintColor: '#888',
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 4 }
        }}>
        
        <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <Foundation name="home" size={26} color={color} /> }} />
        <Tabs.Screen name="tournaments" options={{ title: 'Arena', tabBarIcon: ({ color }) => <Ionicons name="trophy-outline" size={24} color={color} /> }} />
        <Tabs.Screen name="stats" options={{ title: 'Stats', tabBarIcon: ({ color }) => <Ionicons name="bar-chart-outline" size={24} color={color} /> }} />

        <Tabs.Screen
          name="chats"
          options={{
            title: 'Chats',
            tabBarIcon: ({ color }) => (
              <View style={styles.iconContainer}>
                <Ionicons name="chatbubbles-outline" size={24} color={color} />
                {unreadChatsCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadChatsCount > 99 ? '99+' : unreadChatsCount}</Text>
                  </View>
                )}
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => (
              // 🔴 THE FIX: Animated Wrapper applies the glow if Setup is needed
              <Animated.View style={[
                styles.iconContainer, 
                needsSetup && { 
                  transform: [{ scale: pulseAnim }], 
                  shadowColor: '#22d3ee', shadowRadius: 10, shadowOpacity: 0.8, elevation: 10,
                  backgroundColor: 'rgba(34, 211, 238, 0.15)', borderRadius: 20, padding: 6, marginTop: -6 
                }
              ]}>
                <FontAwesome5 name="user" size={needsSetup ? 20 : 22} color={needsSetup ? '#22d3ee' : color} />
                {needsSetup && <View style={styles.alertDot} />}
              </Animated.View>
            ),
          }}
        />
      </Tabs>

      <View style={[styles.adContainer, { bottom: tabBarHeight }]}>
        <BannerAd unitId={bannerAdUnitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} requestOptions={{ requestNonPersonalizedAdsOnly: true }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative', backgroundColor: '#0f0f13' },
  adContainer: { position: 'absolute', width: '100%', alignItems: 'center', backgroundColor: '#0f0f13', borderTopWidth: 1, borderTopColor: '#1f1f25' },
  iconContainer: { position: 'relative', justifyContent: 'center', alignItems: 'center' },
  badge: { position: 'absolute', top: -4, right: -8, backgroundColor: '#ef4444', minWidth: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 1.5, borderColor: '#121212' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  alertDot: { position: 'absolute', top: -2, right: -4, width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444', borderWidth: 1, borderColor: '#121212' }
});
