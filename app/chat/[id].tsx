import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  FlatList, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  Keyboard,
  Alert 
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { authClient, BACKEND_URL } from '../../src/lib/auth-client';
import { useSocket } from '../../src/context/SocketContext';

export default function ChatScreen() {
  const { id: targetUserId } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const { socket } = useSocket();

  const [isLoading, setIsLoading] = useState(true);
  const [chatUser, setChatUser] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [roomId, setRoomId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    
    const showSubscription = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    const initializeChat = async () => {
      try {
        const meRes = await authClient.$fetch<any>(`${BACKEND_URL}/api/v1/users/me`);
        if (meRes.data) setCurrentUser(meRes.data);

        const targetRes = await authClient.$fetch<any>(`${BACKEND_URL}/api/v1/users/${targetUserId}/profile`);
        if (targetRes.data) setChatUser(targetRes.data);

        const roomRes = await authClient.$fetch<any>(`${BACKEND_URL}/api/v1/chat/rooms/1v1`, {
          method: 'POST',
          body: { targetUserId }
        });

        if (roomRes.data && roomRes.data.roomId) {
          const currentRoomId = roomRes.data.roomId;
          setRoomId(currentRoomId);

          const historyRes = await authClient.$fetch<any>(`${BACKEND_URL}/api/v1/chat/rooms/${currentRoomId}/messages`);
          if (historyRes.data) {
            setMessages(historyRes.data);
          }
        } else {
          Alert.alert("Server Error", "Could not initialize the chat room.");
        }
      } catch (err) {
        Alert.alert("Network Error", "Failed to connect to chat services.");
      } finally {
        setIsLoading(false);
      }
    };

    initializeChat();
  }, [targetUserId]);

  useEffect(() => {
    if (!socket || !roomId) return;

    const handleNewMessage = (msg: any) => {
      const incomingRoomId = msg.chatRoomId || msg.chat_room_id;
      
      if (incomingRoomId === roomId) {
        setMessages((prev) => {
          if (msg.localId) {
             const index = prev.findIndex(m => m.localId === msg.localId);
             if (index !== -1) {
                const newArr = [...prev];
                newArr[index] = msg;
                return newArr;
             }
          }
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, msg]; // We keep array in chronological order internally
        });
      }
    };

    const handleStatus = (data: { id: number, status: string, localId?: string }) => {
      setMessages((prev) => prev.map(m => 
        (m.id === data.id || (data.localId && m.localId === data.localId)) 
          ? { ...m, status: data.status } 
          : m
      ));
    };

    const handleRead = (data: { messageIds: number[] }) => {
      setMessages((prev) => prev.map(m => data.messageIds.includes(m.id) ? { ...m, status: 'read' } : m));
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_status', handleStatus);
    socket.on('messages_read', handleRead);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('message_status', handleStatus);
      socket.off('messages_read', handleRead);
    };
  }, [socket, roomId]);

  useEffect(() => {
    if (!socket || !currentUser || !roomId) return;
    
    const unreadMessages = messages.filter(m => m.senderId !== currentUser.id && m.status !== 'read');
    
    if (unreadMessages.length > 0) {
      const unreadIds = unreadMessages.map(m => m.id).filter(id => typeof id === 'number'); 

      if (unreadIds.length > 0) {
        setMessages((prev) => prev.map(m => unreadIds.includes(m.id) ? { ...m, status: 'read' } : m));
        socket.emit('mark_read', { messageIds: unreadIds, senderId: unreadMessages[0].senderId });
      }
    }
  }, [messages, currentUser, socket, roomId]);

  const handleSendMessage = () => {
    if (!inputText.trim() || !currentUser || !roomId || !socket) return;
    
    const localId = `local_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const newMsgText = inputText.trim();
    
    const optimisticMessage = {
      id: localId,
      localId,
      content: newMsgText,
      senderId: currentUser.id,
      status: 'sent',
      createdAt: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    setInputText('');
    
    socket.emit('send_message', { roomId, content: newMsgText, localId });
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getTick = (status: string) => {
    if (status === 'sent') return '✓';
    if (status === 'delivered') return '✓✓';
    if (status === 'read') return '✓✓'; 
    return null;
  };

  // ✅ Reverse the messages just for rendering so the list is inverted natively
  const reversedMessages = [...messages].reverse();

  const renderMessage = ({ item, index }: { item: any, index: number }) => {
    const isMe = currentUser && item.senderId === currentUser.id;
    
    // In an inverted list, index 0 is the bottom (newest) message.
    // We show a date separator if this is the last message in the list (oldest),
    // OR if the next message down (which is chronologically older) is from a different day.
    const isLastItem = index === reversedMessages.length - 1;
    const olderMessage = !isLastItem ? reversedMessages[index + 1] : null;
    
    const showDateSeparator = isLastItem || 
      new Date(item.createdAt).toDateString() !== new Date(olderMessage.createdAt).toDateString();

    return (
      <View>
        <View style={[styles.messageWrapper, isMe ? styles.messageWrapperMe : styles.messageWrapperThem]}>
          <View style={[styles.messageBubble, isMe ? styles.messageBubbleMe : styles.messageBubbleThem]}>
            <Text style={styles.messageText}>{item.content || item.text}</Text>
            <View style={styles.messageMetaRow}>
              <Text style={styles.messageTime}>{formatTime(item.createdAt)}</Text>
              {isMe && <Text style={[styles.tickText, item.status === 'read' && { color: '#38bdf8' }]}>{getTick(item.status)}</Text>}
            </View>
          </View>
        </View>
        
        {/* Because it's inverted, placing this BELOW the bubble in code actually renders it ABOVE the bubble visually! */}
        {showDateSeparator && (
          <View style={styles.datePillContainer}>
            <Text style={styles.datePillText}>
              {new Date(item.createdAt).toDateString() === new Date().toDateString() 
                ? 'Today' 
                : new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </Text>
          </View>
        )}
      </View>
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
              <Ionicons name="chevron-back" size={26} color="#fff" />
            </TouchableOpacity>
            <View style={styles.avatarContainer}>
              <FontAwesome5 name="user-astronaut" size={20} color="#38bdf8" />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerName}>{chatUser?.profile?.teamName || chatUser?.name || 'Opponent'}</Text>
              <View style={styles.activeStatusRow}>
                <View style={styles.activeDot} />
                <Text style={styles.activeText}>Active now</Text>
              </View>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconBtn}><Ionicons name="call-outline" size={22} color="#fff" /></TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn}><Ionicons name="videocam-outline" size={22} color="#fff" /></TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn}><Ionicons name="ellipsis-vertical" size={22} color="#fff" /></TouchableOpacity>
          </View>
        </View>

        {/* ✅ INVERTED FLATLIST: Always perfectly glued to the bottom */}
        <FlatList
          ref={flatListRef}
          inverted
          data={reversedMessages}
          keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
          renderItem={renderMessage}
          contentContainerStyle={styles.chatCanvas}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />

        <View style={[styles.footer, { paddingBottom: 12 }]}>
          <TouchableOpacity style={styles.attachBtn}>
            <Ionicons name="add" size={28} color="#a1a1aa" />
          </TouchableOpacity>

          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder="Type a message"
              placeholderTextColor="#71717a"
              value={inputText}
              onChangeText={setInputText}
              multiline
            />
          </View>

          {inputText.trim() ? (
            <TouchableOpacity style={styles.sendBtn} onPress={handleSendMessage}>
              <Ionicons name="send" size={18} color="#fff" style={{ marginLeft: 3 }} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.micBtn}>
              <Ionicons name="mic" size={22} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
        
        {!isKeyboardVisible && <View style={{ height: insets.bottom }} />}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, backgroundColor: '#0f0f13', justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#0f0f13' },
  keyboardView: { flex: 1 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#18181b', paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#27272a' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { padding: 6 },
  avatarContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1f1f25', borderWidth: 1, borderColor: '#38bdf8', justifyContent: 'center', alignItems: 'center', marginHorizontal: 8 },
  headerTextContainer: { justifyContent: 'center' },
  headerName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  activeStatusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981', marginRight: 4 },
  activeText: { color: '#10b981', fontSize: 12, fontWeight: '500' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },

  chatCanvas: { paddingHorizontal: 16, paddingVertical: 20 },
  datePillContainer: { alignItems: 'center', marginBottom: 20, marginTop: 10 },
  datePillText: { backgroundColor: '#1f1f25', color: '#a1a1aa', fontSize: 12, fontWeight: 'bold', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, overflow: 'hidden' },
  
  messageWrapper: { marginBottom: 16, flexDirection: 'row' },
  messageWrapperMe: { justifyContent: 'flex-end' },
  messageWrapperThem: { justifyContent: 'flex-start' },
  
  messageBubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10 },
  messageBubbleMe: { backgroundColor: '#3b82f6', borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomLeftRadius: 16, borderBottomRightRadius: 4 },
  messageBubbleThem: { backgroundColor: '#27272a', borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomLeftRadius: 4, borderBottomRightRadius: 16 },
  
  messageText: { color: '#fff', fontSize: 15, lineHeight: 22 },
  messageMetaRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4, gap: 4 },
  messageTime: { color: 'rgba(255,255,255,0.6)', fontSize: 10 },
  tickText: { color: 'rgba(255,255,255,0.6)', fontSize: 10 },

  footer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181b', paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#27272a' },
  attachBtn: { padding: 4, marginRight: 8 },
  
  inputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#222225', borderRadius: 24, paddingLeft: 16, paddingRight: 8, minHeight: 44, maxHeight: 100 },
  textInput: { flex: 1, color: '#fff', fontSize: 15, paddingTop: 10, paddingBottom: 10 },
  
  micBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#222225', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
});
