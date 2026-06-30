// app/(tabs)/chats.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { authClient, BACKEND_URL } from '../../src/lib/auth-client';
import { useSocket } from '../../src/context/SocketContext';

// IMPORT LOCAL DB AND DRIZZLE TOOLS
import { db } from '../../src/db/localDb';
import { localChatRooms } from '../../src/db/localSchema';
import { desc, eq } from 'drizzle-orm';

export default function ChatsListScreen() {
  const router = useRouter();
  const { socket } = useSocket();
  const [searchQuery, setSearchQuery] = useState('');
  const [chatRooms, setChatRooms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchChats = async () => {
    try {
      // 1. INSTANT LOCAL LOAD
      const localData = await db.select().from(localChatRooms).orderBy(desc(localChatRooms.updatedAt));
      if (localData.length > 0) {
        setChatRooms(localData);
        setIsLoading(false); 
      } else if (localData.length === 0 && !isRefreshing) {
        setIsLoading(true);
      }

      // 2. BACKGROUND SYNC WITH SERVER
      const { data, error } = await authClient.$fetch<any[]>(`${BACKEND_URL}/api/v1/chat/rooms`);
      
      if (!error && data) {
        for (const room of data) {
          const roomName = room.title || room.name || 'Opponent';
          
          // 🛡️ Safely handle both string dates and objects parsed by better-fetch
          let validBackendDate: string | null = null;
          if (room.lastMessageAt) {
            if (typeof room.lastMessageAt === 'string' && room.lastMessageAt.length > 5 && room.lastMessageAt !== '[object Object]' && room.lastMessageAt !== '{}') {
              validBackendDate = room.lastMessageAt;
            } else if (typeof room.lastMessageAt === 'object' && room.lastMessageAt instanceof Date) {
              validBackendDate = room.lastMessageAt.toISOString();
            }
          }
          
          let safeMessage = null;
          if (room.lastMessage && typeof room.lastMessage === 'string' && room.lastMessage !== '[object Object]' && room.lastMessage !== '{}') {
            safeMessage = room.lastMessage;
          }

          const [existingRoom] = await db.select().from(localChatRooms).where(eq(localChatRooms.id, room.id));
          
          const timeToSave = validBackendDate || existingRoom?.updatedAt || new Date().toISOString();
          
          await db.insert(localChatRooms).values({
            id: room.id || Math.floor(Math.random() * 100000), 
            type: room.type || '1v1',
            name: roomName,
            targetUserId: room.targetUserId,
            lastMessage: safeMessage,
            lastMessageAt: validBackendDate,
            unreadCount: room.unreadCount || 0,
            updatedAt: timeToSave 
          }).onConflictDoUpdate({
            target: localChatRooms.id,
            set: {
              name: roomName,
              lastMessage: safeMessage,
              lastMessageAt: validBackendDate,
              unreadCount: room.unreadCount || 0,
              updatedAt: timeToSave 
            }
          });
        }

        // 3. RE-QUERY FOR SEAMLESS UI UPDATE
        const freshLocalData = await db.select().from(localChatRooms).orderBy(desc(localChatRooms.updatedAt));
        setChatRooms(freshLocalData);
      }
    } catch (err) {
      console.log("Failed to sync chat rooms", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchChats();
    }, [])
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchChats();
  };

  useEffect(() => {
    if (!socket) return;
    const handleNewMessage = () => fetchChats(); 
    socket.on('new_message', handleNewMessage);
    return () => {
      socket.off('new_message', handleNewMessage);
    };
  }, [socket]);

  const filteredChats = chatRooms.filter(room => 
    (room.name || room.title)?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (room.lastMessage || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 🔴 THE FIX: Vanilla JS Date Parser (Hermes-Proof)
  const formatTime = (dateInput?: string | number | Date | null) => {
    if (!dateInput || dateInput === '{}' || dateInput === '[object Object]') return ''; 
    
    let d = new Date(dateInput);
    
    if (isNaN(d.getTime()) && typeof dateInput === 'string') {
      d = new Date(dateInput.replace(' ', 'T') + (dateInput.includes('Z') ? '' : 'Z'));
    }
    if (isNaN(d.getTime()) && typeof dateInput === 'string' && /^\d+$/.test(dateInput)) {
      d = new Date(parseInt(dateInput, 10));
    }

    if (isNaN(d.getTime())) return '';

    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();

    if (isToday) {
      // Manually construct the time to bypass Android Hermes crashes
      let hours = d.getHours();
      const minutes = d.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // 0 should be 12
      const minutesStr = minutes < 10 ? '0' + minutes : minutes;
      return `${hours}:${minutesStr} ${ampm}`;
    } else {
      // Manually construct the date (e.g., "May 28")
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[d.getMonth()]} ${d.getDate()}`;
    }
  };

  const renderChatItem = ({ item }: { item: any }) => {
    const isUnread = item.unreadCount > 0;
    const validDate = item.lastMessageAt || item.updatedAt;

    return (
      <TouchableOpacity 
        style={styles.chatRow}
        activeOpacity={0.7}
        onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.targetUserId } })}
      >
        <View style={styles.avatar}>
          <FontAwesome5 name="user-astronaut" size={20} color="#38bdf8" />
        </View>

        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName} numberOfLines={1}>{item.name || item.title || 'Opponent'}</Text>
            
            <Text style={[styles.timeText, isUnread && styles.timeTextUnread]}>
              {formatTime(validDate)}
            </Text>
          </View>
          
          <View style={styles.chatFooter}>
            <Text style={[styles.lastMessage, isUnread && styles.lastMessageUnread]} numberOfLines={1}>
              {item.lastMessage && item.lastMessage !== '{}' && item.lastMessage !== '[object Object]' ? item.lastMessage : 'Tap to view messages...'}
            </Text>
            {isUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unreadCount > 99 ? '99+' : item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>CHATS</Text>
        <TouchableOpacity style={styles.newChatBtn}>
          <Ionicons name="create-outline" size={24} color="#93c5fd" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#71717a" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          placeholderTextColor="#71717a"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <FlatList
          data={filteredChats}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          renderItem={renderChatItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#38bdf8" />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={64} color="#27272a" />
              <Text style={styles.emptyText}>No active conversations</Text>
              <Text style={styles.emptySubtext}>Message a player from the arena to start a chat.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f13' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
  headerTitle: { color: '#93c5fd', fontSize: 24, fontWeight: '900', letterSpacing: 1 },
  newChatBtn: { padding: 4 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181b', marginHorizontal: 20, marginBottom: 15, borderRadius: 12, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: '#27272a' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: '#fff', fontSize: 15 },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  chatRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181b', padding: 16, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#27272a' },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#1f1f25', borderWidth: 1, borderColor: '#38bdf8', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  chatInfo: { flex: 1, justifyContent: 'center' },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  chatName: { color: '#fff', fontSize: 16, fontWeight: 'bold', flex: 1, marginRight: 10 },
  timeText: { color: '#71717a', fontSize: 12, fontWeight: '500' },
  timeTextUnread: { color: '#38bdf8', fontWeight: 'bold' },
  chatFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMessage: { color: '#a1a1aa', fontSize: 14, flex: 1, paddingRight: 10 },
  lastMessageUnread: { color: '#fff', fontWeight: 'bold' },
  unreadBadge: { backgroundColor: '#3b82f6', minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 16 },
  emptySubtext: { color: '#71717a', fontSize: 14, marginTop: 8, textAlign: 'center', paddingHorizontal: 40 }
});
