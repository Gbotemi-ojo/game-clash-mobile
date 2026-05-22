import React, { useState, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Text } from 'react-native';
import { FontAwesome5, Ionicons, Foundation } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

import { authClient, BACKEND_URL } from '../../src/lib/auth-client';
import { useSocket } from '../../src/context/SocketContext';

// Use Google's Test ID for development
const bannerAdUnitId = __DEV__ ? TestIds.BANNER : 'ca-app-pub-xxxxxxxxxxxxxxxx/zzzzzzzzzz';

export default function TabLayout() {
  const insets = useSafeAreaInsets(); 
  const { socket } = useSocket();
  const [unreadChatsCount, setUnreadChatsCount] = useState(0);
  
  // Calculate the height of your tab bar to position the ad perfectly above it
  const tabBarHeight = 65 + insets.bottom;

  // ✅ Auto-fetch total unread messages across all rooms
useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const { data, error } = await authClient.$fetch<any[]>(`${BACKEND_URL}/api/v1/chat/rooms?_t=${Date.now()}`);
        if (!error && Array.isArray(data)) {
          const total = data.reduce((sum, room) => sum + (room.unreadCount || 0), 0);
          setUnreadChatsCount(total);
        }
      } catch (err) {
        console.log("Failed to fetch total unread chats");
      }
    };

    fetchUnreadCount();

    if (socket) {
      // ✅ Listen for incoming messages
      socket.on('new_message', fetchUnreadCount);
      
      // ✅ Listen for when messages are marked as read (locally or by the other user)
      socket.on('messages_read', fetchUnreadCount);
      
      // ✅ Listen for room updates (like room initialization)
      socket.on('room_updated', fetchUnreadCount);
      
      return () => {
        socket.off('new_message', fetchUnreadCount);
        socket.off('messages_read', fetchUnreadCount);
        socket.off('room_updated', fetchUnreadCount);
      };
    }
  }, [socket]);

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
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            marginTop: 4,
          }
        }}>
        
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <Foundation name="home" size={26} color={color} />,
          }}
        />

        <Tabs.Screen
          name="tournaments"
          options={{
            title: 'Arena',
            tabBarIcon: ({ color }) => <Ionicons name="trophy-outline" size={24} color={color} />,
          }}
        />

        <Tabs.Screen
          name="stats"
          options={{
            title: 'Stats',
            tabBarIcon: ({ color }) => <Ionicons name="bar-chart-outline" size={24} color={color} />,
          }}
        />

        {/* ✅ CHATS TAB WITH UNREAD BADGE */}
        <Tabs.Screen
          name="chats"
          options={{
            title: 'Chats',
            tabBarIcon: ({ color }) => (
              <View style={styles.iconContainer}>
                <Ionicons name="chatbubbles-outline" size={24} color={color} />
                {unreadChatsCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadChatsCount > 99 ? '99+' : unreadChatsCount}
                    </Text>
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
            tabBarIcon: ({ color }) => <FontAwesome5 name="user" size={22} color={color} />,
          }}
        />
      </Tabs>

      {/* ✅ GLOBAL BANNER AD: Anchored permanently above the Tab Bar */}
      <View style={[styles.adContainer, { bottom: tabBarHeight }]}>
        <BannerAd
          unitId={bannerAdUnitId}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{
            requestNonPersonalizedAdsOnly: true,
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#0f0f13',
  },
  adContainer: {
    position: 'absolute',
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#0f0f13',
    borderTopWidth: 1,
    borderTopColor: '#1f1f25',
  },
  // Badge Styles
  iconContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#ef4444', // Red notification color
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#121212', // Matches the tab bar background to create a neat "cutout" effect
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  }
});
