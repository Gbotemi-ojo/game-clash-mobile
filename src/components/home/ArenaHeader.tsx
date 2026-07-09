import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSocket } from '../../context/SocketContext';
import { authClient, BACKEND_URL } from '../../lib/auth-client';

export default function ArenaHeader({ onOpenMenu, ticketCount = 0 }: { onOpenMenu: () => void, ticketCount?: number }) {
  const router = useRouter();
  const { socket } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const { data, error } = await authClient.$fetch<any>(`${BACKEND_URL}/api/v1/notifications?_t=${Date.now()}`);
      if (!error && Array.isArray(data)) {
        const unread = data.filter((n: any) => !n.isRead).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.log("Failed to fetch unread count");
    }
  }, []);

  // Auto-fetch unread notifications when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchUnreadCount();
    }, [fetchUnreadCount])
  );

  // Listen to global sockets to update the badge in real-time
  useEffect(() => {
    if (socket) {
      const handleAppUpdate = () => fetchUnreadCount();
      
      // Optimistically increment so the badge instantly collects the new notification
      const handleNewMessage = () => {
        setUnreadCount(prev => prev + 1);
      };

      // Re-sync when messages are read so the ghost notifications clear!
      const handleMessagesRead = () => fetchUnreadCount();

      socket.on('app_update', handleAppUpdate);
      socket.on('new_message', handleNewMessage);
      socket.on('messages_read', handleMessagesRead);

      return () => {
        socket.off('app_update', handleAppUpdate);
        socket.off('new_message', handleNewMessage);
        socket.off('messages_read', handleMessagesRead);
      };
    }
  }, [socket, fetchUnreadCount]);

  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onOpenMenu} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
        <Ionicons name="menu" size={28} color="#fff" />
      </TouchableOpacity>
      
      <Text style={styles.headerLogo}>DLS HUB</Text>
      
      <View style={styles.headerRight}>
        <View style={styles.ticketPill}>
          <FontAwesome5 name="ticket-alt" size={14} color="#f59e0b" />
          <Text style={styles.ticketCount}>{ticketCount}</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.bellContainer} 
          onPress={() => router.push('/notifications')}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
        >
          <Ionicons name="notifications-outline" size={24} color="#fff" />
          
          {/* The Unread Badge */}
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f25'
  },
  headerLogo: {
    fontSize: 22,
    fontWeight: '800',
    color: '#93c5fd',
    letterSpacing: 1
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16
  },
  ticketPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#272730',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6
  },
  ticketCount: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14
  },
  bellContainer: {
    position: 'relative',
    padding: 2,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    backgroundColor: '#ef4444',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#0f0f13'
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
  }
});
