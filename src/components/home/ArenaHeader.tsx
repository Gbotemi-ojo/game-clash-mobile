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
      <TouchableOpacity
        style={styles.iconButton}
        onPress={onOpenMenu}
        hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
        accessibilityRole="button"
        accessibilityLabel="Open menu"
      >
        <Ionicons name="menu" size={23} color="#e4e4e7" />
      </TouchableOpacity>
      
      <View style={styles.brandBlock}>
        <View style={styles.brandTitleRow}>
          <View style={styles.brandMark}>
            <Ionicons name="flash" size={14} color="#09090b" />
          </View>
          <Text style={styles.headerLogo}>GAME CLASH</Text>
        </View>
        <Text style={styles.headerSubtitle}>DREAM LEAGUE SOCCER</Text>
      </View>
      
      <View style={styles.headerRight}>
        <View style={styles.ticketPill}>
          <FontAwesome5 name="ticket-alt" size={14} color="#f59e0b" />
          <Text style={styles.ticketCount}>{ticketCount}</Text>
        </View>
        
        <TouchableOpacity 
          style={[styles.iconButton, styles.bellContainer]}
          onPress={() => router.push('/notifications')}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
        >
          <Ionicons name="notifications-outline" size={21} color="#e4e4e7" />
          
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
    paddingHorizontal: 18,
    paddingVertical: 12,
    minHeight: 68,
    backgroundColor: '#101116',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1b21',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  brandBlock: { flex: 1, marginLeft: 12 },
  brandTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  brandMark: {
    width: 21,
    height: 21,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22d3ee',
  },
  headerLogo: {
    fontSize: 16,
    fontWeight: '900',
    color: '#f4f4f5',
    letterSpacing: 1.1,
  },
  headerSubtitle: {
    color: '#71717a',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.35,
    marginTop: 3,
    marginLeft: 28,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  ticketPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.10)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 7,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  ticketCount: {
    color: '#f4f4f5',
    fontWeight: '800',
    fontSize: 13,
  },
  bellContainer: {
    position: 'relative',
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
    borderColor: '#101116',
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
  }
});
