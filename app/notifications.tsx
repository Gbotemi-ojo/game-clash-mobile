import React, { useState, useCallback, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator, 
  RefreshControl 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { authClient, BACKEND_URL } from '../src/lib/auth-client';
import { useSocket } from '../src/context/SocketContext';
import { styles } from '../src/styles/notifications.styles';

type FilterType = 'all' | 'unread' | 'system' | 'match' | 'social';

export default function NotificationsScreen() {
  const router = useRouter();
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const fetchNotifications = async (silent = false) => {
    try {
      const { data, error } = await authClient.$fetch<any>(`${BACKEND_URL}/api/v1/notifications?_t=${Date.now()}`);
      if (!error && Array.isArray(data)) {
        setNotifications(data);
      }
    } catch (err) {
      console.log("Failed to fetch notifications");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [])
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchNotifications();
  };

  // ✅ Listen for real-time socket updates to push new notifications to the top
  useEffect(() => {
    if (!socket) return;
    const handleAppUpdate = () => fetchNotifications(true);
    socket.on('app_update', handleAppUpdate);
    return () => {
      socket.off('app_update', handleAppUpdate);
    };
  }, [socket]);

  const handleMarkAsRead = async (id: number, type: string, relatedId?: string) => {
    // Optimistic UI update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    
    // Tell backend
    await authClient.$fetch(`${BACKEND_URL}/api/v1/notifications/${id}/read`, { method: 'POST' });

    // Auto-navigate based on notification type
    if (type === 'chat' && relatedId) {
      router.push({ pathname: '/chat/[id]', params: { id: relatedId } });
    } else if (type === 'match') {
      router.push('/tournaments');
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    // Implement a /read-all endpoint on your backend for this to work permanently
    await authClient.$fetch(`${BACKEND_URL}/api/v1/notifications/read-all`, { method: 'POST' });
  };

  const getIconConfig = (type: string) => {
    switch (type) {
      case 'match': return { name: 'football', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' };
      case 'system': return { name: 'warning', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' };
      case 'chat': return { name: 'chatbubble-ellipses', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' };
      case 'achievement': return { name: 'medal', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' };
      default: return { name: 'notifications', color: '#a1a1aa', bg: 'rgba(161, 161, 170, 0.15)' };
    }
  };

  const filteredData = notifications.filter(n => {
    if (activeFilter === 'unread') return !n.isRead;
    if (activeFilter !== 'all') return n.type === activeFilter;
    return true;
  });

  const renderItem = ({ item }: { item: any }) => {
    const icon = getIconConfig(item.type);
    return (
      <TouchableOpacity 
        style={[styles.notificationCard, !item.isRead && styles.notificationCardUnread]}
        onPress={() => handleMarkAsRead(item.id, item.type, item.relatedId)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: icon.bg }]}>
          <Ionicons name={icon.name as any} size={22} color={icon.color} />
        </View>
        
        <View style={styles.textContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.time}>{new Date(item.createdAt || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric' })}</Text>
          </View>
          <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
        </View>

        {!item.isRead && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ✅ Updated Header with Back Button */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="#93c5fd" />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>INBOX</Text>
        </View>
        <TouchableOpacity onPress={handleMarkAllRead}>
          <Text style={styles.markAllText}>Mark all as read</Text>
        </TouchableOpacity>
      </View>

      <View>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          data={['all', 'unread', 'match', 'chat', 'system']}
          keyExtractor={item => item}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.filterChip, activeFilter === item && styles.filterChipActive]}
              onPress={() => setActiveFilter(item as FilterType)}
            >
              <Text style={[styles.filterText, activeFilter === item && styles.filterTextActive]}>
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={filteredData}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#38bdf8" />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="mail-open-outline" size={64} color="#27272a" />
            <Text style={styles.emptyStateText}>You're all caught up</Text>
            <Text style={styles.emptyStateSub}>No {activeFilter !== 'all' ? activeFilter : 'new'} notifications here.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
