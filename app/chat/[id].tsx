// app/chat/[id].tsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Alert,
  Modal
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { authClient, BACKEND_URL } from '../../src/lib/auth-client';
import { useSocket } from '../../src/context/SocketContext';

import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Clipboard from 'expo-clipboard';
import * as Notifications from 'expo-notifications';

import { db } from '../../src/db/localDb';
import { localMessages } from '../../src/db/localSchema';
import { eq, and, ne, desc } from 'drizzle-orm';

// ==========================================
// 🚀 UTILITY FUNCTIONS 
// ==========================================
const safeParseDate = (dateInput: any) => {
  if (!dateInput || dateInput === '{}' || dateInput === '[object Object]') return null;
  let d = new Date(dateInput);
  if (!isNaN(d.getTime())) return d;
  if (typeof dateInput === 'string') {
    d = new Date(dateInput.replace(' ', 'T') + (dateInput.includes('Z') ? '' : 'Z'));
    if (!isNaN(d.getTime())) return d;
    if (/^\d+$/.test(dateInput)) {
      d = new Date(parseInt(dateInput, 10));
      if (!isNaN(d.getTime())) return d;
    }
  }
  return null;
};

const sanitizeDateToISO = (val: any) => {
  const d = safeParseDate(val);
  return d ? d.toISOString() : new Date().toISOString();
};

const formatTime = (dateInput: any) => {
  const d = safeParseDate(dateInput);
  if (!d) return ''; 
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; 
  const minutesStr = minutes < 10 ? '0' + minutes : minutes;
  return `${hours}:${minutesStr} ${ampm}`;
};

const formatDatePill = (dateInput: any) => {
  const d = safeParseDate(dateInput);
  if (!d) return ''; 
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
};

const getTick = (status: string) => {
  if (status === 'sent') return '✓';
  if (status === 'delivered') return '✓✓';
  if (status === 'read') return '✓✓';
  if (status === 'failed') return '❌';
  return '🕒';
};

// ==========================================
// 🚀 OPTIMIZED MESSAGE ITEM
// ==========================================
const MessageItem = React.memo(({ item, isLastItem, olderMessage, currentUserId, opponentName, repliedMessage, isHighlighted, onLongPress, onReply, onPressReplyBlock }: any) => {
  const swipeableRef = useRef<Swipeable>(null);
  const isMe = currentUserId && item.senderId === currentUserId;
  
  const currentDate = safeParseDate(item.createdAt);
  const olderDate = olderMessage ? safeParseDate(olderMessage.createdAt) : null;
  
  let showDateSeparator = false;
  if (isLastItem && currentDate) {
     showDateSeparator = true;
  } else if (currentDate && olderDate) {
     showDateSeparator = currentDate.toDateString() !== olderDate.toDateString();
  }

  const timeString = formatTime(item.createdAt);

  const renderLeftActions = () => (
    <View style={styles.swipeReplyContainer}>
      <View style={styles.swipeReplyCircle}>
        <Ionicons name="arrow-undo" size={20} color="#fff" />
      </View>
    </View>
  );

  return (
    <View>
      {showDateSeparator && (
        <View style={styles.datePillContainer}>
          <Text style={styles.datePillText}>{formatDatePill(item.createdAt)}</Text>
        </View>
      )}
      
      <Swipeable 
        ref={swipeableRef}
        renderLeftActions={renderLeftActions}
        overshootLeft={false}
        onSwipeableOpen={() => {
          onReply(item);
          swipeableRef.current?.close(); 
        }}
      >
        <TouchableOpacity 
          activeOpacity={0.7} 
          onLongPress={() => onLongPress(item)}
          style={[styles.messageWrapper, isMe ? styles.messageWrapperMe : styles.messageWrapperThem]}
        >
          <View style={[
            styles.messageBubble, 
            isMe ? styles.messageBubbleMe : styles.messageBubbleThem,
            isHighlighted && styles.messageBubbleHighlighted,
            item.status === 'failed' && { opacity: 0.7 }
          ]}>
            
            {item.replyToId && (
              <TouchableOpacity 
                activeOpacity={0.6}
                onPress={() => onPressReplyBlock(item.replyToId)}
                style={[styles.repliedMessageBlock, isMe ? styles.repliedMessageBlockMe : styles.repliedMessageBlockThem]}
              >
                <Text style={[styles.repliedMessageName, isMe ? { color: '#e0f2fe' } : { color: '#38bdf8' }]} numberOfLines={1}>
                  {repliedMessage ? (repliedMessage.senderId === currentUserId ? 'You' : opponentName) : 'Original message'}
                </Text>
                <Text style={styles.repliedMessageText} numberOfLines={2}>
                  {repliedMessage ? (repliedMessage.content || repliedMessage.text) : '...'}
                </Text>
              </TouchableOpacity>
            )}

            <Text style={styles.messageText}>{item.content || item.text}</Text>
            
            <View style={styles.messageMetaRow}>
              {item.isEdited && (
                <Text style={[styles.messageTime, { fontStyle: 'italic', marginRight: 4 }]}>Edited</Text>
              )}
              {timeString !== '' && <Text style={styles.messageTime}>{timeString}</Text>}
              {isMe && <Text style={[
                styles.tickText, 
                item.status === 'read' && { color: '#38bdf8' },
                item.status === 'failed' && { color: '#ef4444' }
              ]}>{getTick(item.status)}</Text>}
            </View>
            
          </View>
        </TouchableOpacity>
      </Swipeable>
    </View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.item.localId === nextProps.item.localId &&
    prevProps.item.status === nextProps.item.status &&
    prevProps.item.content === nextProps.item.content &&
    prevProps.item.isEdited === nextProps.item.isEdited &&
    prevProps.isHighlighted === nextProps.isHighlighted && 
    prevProps.isLastItem === nextProps.isLastItem && 
    prevProps.opponentName === nextProps.opponentName &&
    prevProps.olderMessage?.localId === nextProps.olderMessage?.localId &&
    prevProps.repliedMessage?.id === nextProps.repliedMessage?.id &&
    prevProps.repliedMessage?.isEdited === nextProps.repliedMessage?.isEdited &&
    prevProps.repliedMessage?.content === nextProps.repliedMessage?.content
  );
});


// ==========================================
// MAIN SCREEN
// ==========================================
export default function ChatScreen() {
  const { id: targetUserId, name: paramName } = useLocalSearchParams();
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
  
  // 🔴 NEW STATE: Tracks if we should show the scroll-to-bottom button
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const isSendingRef = useRef(false);
  const [isSending, setIsSending] = useState(false); 

  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [isOptionsModalVisible, setOptionsModalVisible] = useState(false);
  
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    };
  }, []);

  const messageMap = useMemo(() => {
    const map = new Map();
    messages.forEach(m => {
      if (m.id) map.set(m.id, m);
    });
    return map;
  }, [messages]);

  const messagesRef = useRef<any[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

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

  const loadLocalMessages = async (currentRoomId: number) => {
    const localMsgs = await db.select()
      .from(localMessages)
      .where(eq(localMessages.chatRoomId, currentRoomId))
      .orderBy(desc(localMessages.createdAt));
    
    setMessages(localMsgs);

    if (currentUser?.id) {
      const unreadMessages = localMsgs.filter(m => m.senderId !== currentUser.id && m.status !== 'read');
      if (unreadMessages.length > 0) {
        const unreadIds = unreadMessages.map(m => m.id).filter(id => typeof id === 'number');
        if (unreadIds.length > 0) {
          socket?.emit('mark_read', { messageIds: unreadIds, senderId: unreadMessages[0].senderId });
          unreadIds.forEach(id => {
            db.update(localMessages).set({ status: 'read' }).where(eq(localMessages.id, id));
          });
          setMessages(prev => prev.map(m => unreadIds.includes(m.id) ? { ...m, status: 'read' } : m));
        }
      }
    }
  };

  useEffect(() => {
    const initializeChat = async () => {
      try {
        const meRes = await authClient.$fetch<any>(`${BACKEND_URL}/api/v1/users/me`);
        if (meRes.data) setCurrentUser(meRes.data);
        
        const targetRes = await authClient.$fetch<any>(`${BACKEND_URL}/api/v1/users/${targetUserId}/profile`);
        if (targetRes.data) setChatUser(targetRes.data);
        
        const roomRes = await authClient.$fetch<any>(`${BACKEND_URL}/api/v1/chat/rooms/1v1`, { method: 'POST', body: { targetUserId } });
        
        if (roomRes.data && roomRes.data.roomId) {
          const currentRoomId = roomRes.data.roomId;
          setRoomId(currentRoomId);
          await loadLocalMessages(currentRoomId);
          setIsLoading(false); 

          const historyRes = await authClient.$fetch<any[]>(`${BACKEND_URL}/api/v1/chat/rooms/${currentRoomId}/messages`);
          
          if (historyRes.data) {
            await db.delete(localMessages).where(and(eq(localMessages.chatRoomId, currentRoomId), ne(localMessages.status, 'pending')));
            for (const msg of historyRes.data) {
              const safeLocalId = msg.localId || `srv_${msg.id}`; 
              const safeIsoDate = sanitizeDateToISO(msg.createdAt); 
              await db.insert(localMessages).values({
                localId: safeLocalId, id: msg.id, chatRoomId: currentRoomId, senderId: msg.senderId,
                content: msg.content || msg.text, status: msg.status, isEdited: msg.isEdited || false, 
                replyToId: msg.replyToId || null, createdAt: safeIsoDate 
              }).onConflictDoUpdate({
                target: localMessages.localId,
                set: { id: msg.id, status: msg.status, content: msg.content || msg.text, isEdited: msg.isEdited || false, replyToId: msg.replyToId || null, createdAt: safeIsoDate }
              });
            }
            await loadLocalMessages(currentRoomId);
          }
        }
      } catch (err) {
        setIsLoading(false); 
      }
    };
    initializeChat();
  }, [targetUserId]);

  useEffect(() => {
    if (!socket || !roomId || !currentUser || messages.length === 0) return;

    const unreadMessages = messages.filter(m => m.senderId !== currentUser.id && m.status !== 'read');
    if (unreadMessages.length > 0) {
      const unreadIds = unreadMessages.map(m => m.id).filter(id => typeof id === 'number');
      if (unreadIds.length > 0) {
        unreadIds.forEach(async (id) => {
          await db.update(localMessages).set({ status: 'read' }).where(eq(localMessages.id, id));
        });
        
        socket.emit('mark_read', { messageIds: unreadIds, senderId: unreadMessages[0].senderId });

        Notifications.setBadgeCountAsync(0).catch(() => {});
        Notifications.dismissAllNotificationsAsync().catch(() => {});
      }
    } else {
      Notifications.setBadgeCountAsync(0).catch(() => {});
      Notifications.dismissAllNotificationsAsync().catch(() => {});
    }
  }, [messages, currentUser, socket, roomId]);

  useEffect(() => {
    if (!socket || !roomId || !currentUser) return;

    const handleNewMessage = async (msg: any) => {
      if ((msg.chatRoomId || msg.chat_room_id) !== roomId) return;

      const safeLocalId = msg.localId || `srv_${msg.id}`;
      const safeIsoDate = sanitizeDateToISO(msg.createdAt);
      
      const newMsgObj = {
        localId: safeLocalId, id: msg.id, chatRoomId: roomId, senderId: msg.senderId,
        content: msg.content || msg.text, status: msg.status, replyToId: msg.replyToId || null,
        isEdited: msg.isEdited || false, createdAt: safeIsoDate
      };

      await db.insert(localMessages).values(newMsgObj)
        .onConflictDoUpdate({ target: localMessages.localId, set: newMsgObj });

      setMessages(prev => {
        const existsIndex = prev.findIndex(m => m.localId === safeLocalId || m.id === msg.id);
        if (existsIndex !== -1) {
          const next = [...prev];
          next[existsIndex] = { ...next[existsIndex], ...newMsgObj };
          return next;
        }
        return [newMsgObj, ...prev]; 
      });

      if (msg.senderId !== currentUser.id && msg.status !== 'read') {
        socket.emit('mark_read', { messageIds: [msg.id], senderId: msg.senderId });
        await db.update(localMessages).set({ status: 'read' }).where(eq(localMessages.id, msg.id));
      }
    };

    const handleStatus = async (data: { id?: number, status: string, localId?: string }) => {
      if (data.localId) await db.update(localMessages).set({ status: data.status }).where(eq(localMessages.localId, data.localId));
      else if (data.id) await db.update(localMessages).set({ status: data.status }).where(eq(localMessages.id, data.id));

      setMessages(prev => prev.map(m => 
        (m.localId === data.localId || m.id === data.id) ? { ...m, status: data.status } : m
      ));
    };

    const handleRead = async (data: { messageIds: number[] }) => {
      for (const msgId of data.messageIds) {
        await db.update(localMessages).set({ status: 'read' }).where(eq(localMessages.id, msgId));
      }
      setMessages(prev => prev.map(m => data.messageIds.includes(m.id) ? { ...m, status: 'read' } : m));
    };

    const handleEdited = async (data: { id: number, content: string, isEdited: boolean }) => {
      await db.update(localMessages).set({ content: data.content, isEdited: data.isEdited }).where(eq(localMessages.id, data.id));
      setMessages(prev => prev.map(m => m.id === data.id ? { ...m, content: data.content, isEdited: data.isEdited } : m));
    };

    const handleDeleted = async (data: { id: number }) => {
      await db.delete(localMessages).where(eq(localMessages.id, data.id));
      setMessages(prev => prev.filter(m => m.id !== data.id));
    };

    socket.on('new_message', handleNewMessage);
    socket.on('self_message_sync', handleNewMessage);
    socket.on('message_status', handleStatus);
    socket.on('messages_read', handleRead);
    socket.on('message_edited', handleEdited);
    socket.on('message_deleted', handleDeleted);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('self_message_sync', handleNewMessage);
      socket.off('message_status', handleStatus);
      socket.off('messages_read', handleRead);
      socket.off('message_edited', handleEdited);
      socket.off('message_deleted', handleDeleted);
    };
  }, [socket, roomId, currentUser]);

  const handleSendMessage = async () => {
    if (isSendingRef.current) return;
    if (!inputText.trim() || !currentUser || !roomId || !socket) return;
    
    isSendingRef.current = true;
    setIsSending(true);
    const newMsgText = inputText.trim();
    setInputText('');

    if (editingMessage) {
      const oldContent = editingMessage.content;
      
      setMessages(prev => prev.map(m => m.id === editingMessage.id ? { ...m, content: newMsgText, isEdited: true } : m));

      try {
        await db.update(localMessages).set({ content: newMsgText, isEdited: true }).where(eq(localMessages.id, editingMessage.id));
        socket.emit('edit_message', { messageId: editingMessage.id, newContent: newMsgText, roomId });
      } catch (error) {
        setMessages(prev => prev.map(m => m.id === editingMessage.id ? { ...m, content: oldContent, isEdited: editingMessage.isEdited } : m));
        Alert.alert("Error", "Could not edit message. Are you offline?");
      }

      setEditingMessage(null);
      isSendingRef.current = false;
      setIsSending(false);
      return;
    }

    const localId = `local_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const createdAt = new Date().toISOString(); 
    const targetReplyId = replyingTo?.id || null;
    
    const newMsgObj = {
      localId, id: null, chatRoomId: roomId, senderId: currentUser.id, 
      content: newMsgText, status: 'pending', replyToId: targetReplyId, 
      createdAt: createdAt, isEdited: false
    };

    setMessages(prev => [newMsgObj, ...prev]);

    try {
      await db.insert(localMessages).values(newMsgObj as any);
      socket.emit('send_message', { roomId, content: newMsgText, localId, replyToId: targetReplyId });
      
      setTimeout(() => {
        setMessages(current => {
          const msg = current.find(m => m.localId === localId);
          if (msg && msg.status === 'pending') {
            db.update(localMessages).set({status: 'failed'}).where(eq(localMessages.localId, localId));
            return current.map(m => m.localId === localId ? { ...m, status: 'failed' } : m);
          }
          return current;
        });
      }, 10000);

    } catch (error) {
      setMessages(prev => prev.map(m => m.localId === localId ? { ...m, status: 'failed' } : m));
    }

    setReplyingTo(null); 
    setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }), 100);
    
    isSendingRef.current = false;
    setIsSending(false);
  };

  const handleMessageLongPress = useCallback((msg: any) => {
    Keyboard.dismiss();
    setSelectedMessage(msg);
    setOptionsModalVisible(true);
  }, []);

  const handleMessageReply = useCallback((msg: any) => {
    setReplyingTo(msg);
  }, []);

  const handleScrollToMessage = useCallback((replyId: number) => {
    const index = messagesRef.current.findIndex(m => m.id === replyId);
    
    if (index !== -1) {
      flatListRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.5 
      });
      
      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
      setHighlightedMessageId(replyId);
      highlightTimeoutRef.current = setTimeout(() => {
        setHighlightedMessageId(null);
      }, 1500); 
    } else {
      Alert.alert("Message Not Found", "This message might be too old to display.");
    }
  }, []);

  // 🔴 NEW UX FIX: Scroll tracking to show/hide the jump-to-bottom button
  const handleScroll = useCallback((event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowScrollToBottom(offsetY > 200); // Only shows if they scroll up more than 200 pixels
  }, []);

  const scrollToBottom = () => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const handleCopy = async () => {
    if (selectedMessage) {
      await Clipboard.setStringAsync(selectedMessage.content || selectedMessage.text);
      setOptionsModalVisible(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedMessage) return;

    if (!selectedMessage.id) {
      await db.delete(localMessages).where(eq(localMessages.localId, selectedMessage.localId));
      setMessages(prev => prev.filter(m => m.localId !== selectedMessage.localId));
      setOptionsModalVisible(false);
      return;
    }

    socket?.emit('delete_message', { messageId: selectedMessage.id, roomId });
    await db.delete(localMessages).where(eq(localMessages.localId, selectedMessage.localId));
    setMessages(prev => prev.filter(m => m.localId !== selectedMessage.localId));
    setOptionsModalVisible(false);
  };

  const handleEditSelected = () => {
    setEditingMessage(selectedMessage);
    setInputText(selectedMessage.content || selectedMessage.text);
    setOptionsModalVisible(false);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </SafeAreaView>
    );
  }

  const paramNameStr = Array.isArray(paramName) ? paramName[0] : paramName;
  const resolvedOpponentName = chatUser?.profile?.teamName || chatUser?.teamName || chatUser?.name || chatUser?.user?.name || paramNameStr || 'Opponent';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <KeyboardAvoidingView 
          style={styles.keyboardView} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
                <Text style={styles.headerName}>{resolvedOpponentName}</Text>
                
                {chatUser?.isOnline && (
                  <View style={styles.activeStatusRow}>
                    <View style={styles.activeDot} />
                    <Text style={styles.activeText}>Active now</Text>
                  </View>
                )}
                
              </View>
            </View>
          </View>

          {/* 🔴 WRAPPER: Helps isolate the FlatList so we can float the button over it */}
          <View style={{ flex: 1 }}>
            <FlatList
              ref={flatListRef}
              inverted
              data={messages}
              keyExtractor={(item) => item.localId || item.id?.toString()}
              removeClippedSubviews={Platform.OS === 'android'}
              initialNumToRender={15}
              maxToRenderPerBatch={5}
              windowSize={5}
              onScroll={handleScroll}       // 🔴 Added scroll tracker
              scrollEventThrottle={16}      // 🔴 Fires scroll event at 60fps for smoothness
              onScrollToIndexFailed={(info) => {
                const wait = new Promise(resolve => setTimeout(resolve, 500));
                wait.then(() => {
                  flatListRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.5 });
                });
              }}
              renderItem={({ item, index }) => {
                const repliedMessage = item.replyToId ? messageMap.get(item.replyToId) : null;

                return (
                  <MessageItem 
                    item={item} 
                    isLastItem={index === messages.length - 1} 
                    olderMessage={index !== messages.length - 1 ? messages[index + 1] : null} 
                    currentUserId={currentUser?.id}
                    opponentName={resolvedOpponentName} 
                    repliedMessage={repliedMessage}
                    isHighlighted={item.id === highlightedMessageId} 
                    onLongPress={handleMessageLongPress}
                    onReply={handleMessageReply}
                    onPressReplyBlock={handleScrollToMessage} 
                  />
                );
              }}
              contentContainerStyle={styles.chatCanvas}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />

            {/* 🔴 THE FLOATING JUMP BUTTON */}
            {showScrollToBottom && (
              <TouchableOpacity 
                style={styles.scrollToBottomBtn} 
                onPress={scrollToBottom}
                activeOpacity={0.8}
              >
                <Ionicons name="chevron-down" size={24} color="#a1a1aa" />
              </TouchableOpacity>
            )}
          </View>

          {(replyingTo || editingMessage) && (
            <View style={styles.replyPreviewBar}>
              <View style={{ flex: 1, borderLeftWidth: 3, borderLeftColor: '#38bdf8', paddingLeft: 10 }}>
                <Text style={{ color: '#38bdf8', fontSize: 13, fontWeight: 'bold', marginBottom: 2 }}>
                  {editingMessage 
                    ? 'Editing Message' 
                    : `Replying to ${replyingTo?.senderId === currentUser?.id ? 'yourself' : resolvedOpponentName}`
                  }
                </Text>
                <Text style={{ color: '#a1a1aa', fontSize: 13 }} numberOfLines={1}>
                  {(replyingTo || editingMessage)?.content || (replyingTo || editingMessage)?.text || 'Message'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => { setReplyingTo(null); setEditingMessage(null); setInputText(''); }} style={{ padding: 5 }}>
                <Ionicons name="close-circle" size={24} color="#71717a" />
              </TouchableOpacity>
            </View>
          )}

          <View style={[styles.footer, { paddingBottom: isKeyboardVisible ? 12 : Math.max(insets.bottom, 12) }]}>
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
                onFocus={() => {
                  if (messages.length > 0) {
                    setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }), 100);
                  }
                }}
              />
            </View>
            {inputText.trim() ? (
              <TouchableOpacity 
                style={[styles.sendBtn, isSending && { opacity: 0.7 }]} 
                onPress={handleSendMessage}
                disabled={isSending}
              >
                <Ionicons name={editingMessage ? "checkmark" : "send"} size={18} color="#fff" style={{ marginLeft: editingMessage ? 0 : 3 }} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.micBtn}>
                <Ionicons name="mic" size={22} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>

        <Modal visible={isOptionsModalVisible} transparent animationType="fade">
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setOptionsModalVisible(false)}>
            <View style={styles.bottomSheet}>
              <View style={styles.sheetHandle} />
              <TouchableOpacity style={styles.sheetAction} onPress={() => { setReplyingTo(selectedMessage); setOptionsModalVisible(false); }}>
                <Ionicons name="arrow-undo-outline" size={22} color="#fff" />
                <Text style={styles.sheetActionText}>Reply</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetAction} onPress={handleCopy}>
                <Ionicons name="copy-outline" size={22} color="#fff" />
                <Text style={styles.sheetActionText}>Copy text</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetAction} onPress={() => { Alert.alert('Forward', 'Select user to forward to.'); setOptionsModalVisible(false); }}>
                <Ionicons name="arrow-redo-outline" size={22} color="#fff" />
                <Text style={styles.sheetActionText}>Forward</Text>
              </TouchableOpacity>
              {selectedMessage?.senderId === currentUser?.id && (
                <>
                  <TouchableOpacity style={styles.sheetAction} onPress={handleEditSelected}>
                    <Ionicons name="pencil-outline" size={22} color="#fff" />
                    <Text style={styles.sheetActionText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.sheetAction, { borderBottomWidth: 0 }]} onPress={handleDelete}>
                    <Ionicons name="trash-outline" size={22} color="#ef4444" />
                    <Text style={[styles.sheetActionText, { color: '#ef4444' }]}>Delete</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
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
  chatCanvas: { paddingHorizontal: 16, paddingVertical: 20 },
  datePillContainer: { alignItems: 'center', marginBottom: 20, marginTop: 10 },
  datePillText: { backgroundColor: '#1f1f25', color: '#a1a1aa', fontSize: 12, fontWeight: 'bold', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, overflow: 'hidden' },
  
  swipeReplyContainer: { justifyContent: 'center', alignItems: 'flex-start', width: 60, paddingLeft: 10, marginBottom: 16 },
  swipeReplyCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1f1f25', justifyContent: 'center', alignItems: 'center' },
  messageWrapper: { marginBottom: 16, flexDirection: 'row' },
  messageWrapperMe: { justifyContent: 'flex-end' },
  messageWrapperThem: { justifyContent: 'flex-start' },
  messageBubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10 },
  messageBubbleMe: { backgroundColor: '#3b82f6', borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomLeftRadius: 16, borderBottomRightRadius: 4 },
  messageBubbleThem: { backgroundColor: '#27272a', borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomLeftRadius: 4, borderBottomRightRadius: 16 },
  
  messageBubbleHighlighted: { 
    borderWidth: 2, 
    borderColor: '#22d3ee', 
    shadowColor: '#22d3ee', 
    shadowOffset: { width: 0, height: 0 }, 
    shadowOpacity: 0.8, 
    shadowRadius: 10, 
    elevation: 5 
  },

  messageText: { color: '#fff', fontSize: 15, lineHeight: 22 },
  messageMetaRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4, gap: 4 },
  messageTime: { color: 'rgba(255,255,255,0.6)', fontSize: 10 },
  tickText: { color: 'rgba(255,255,255,0.6)', fontSize: 10 },

  repliedMessageBlock: { padding: 8, borderRadius: 6, marginBottom: 6, borderLeftWidth: 3 },
  repliedMessageBlockMe: { backgroundColor: 'rgba(255,255,255,0.15)', borderLeftColor: '#bae6fd' },
  repliedMessageBlockThem: { backgroundColor: '#3f3f46', borderLeftColor: '#10b981' },
  repliedMessageName: { fontSize: 12, fontWeight: 'bold', marginBottom: 2 },
  repliedMessageText: { color: '#d4d4d8', fontSize: 12 },
  
  replyPreviewBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181b', padding: 12, borderTopWidth: 1, borderTopColor: '#27272a' },
  
  // 🔴 THE BUTTON STYLE: Precisely floats above the bottom edge of the FlatList!
  scrollToBottomBtn: {
    position: 'absolute',
    bottom: 12,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1f1f25',
    borderWidth: 1,
    borderColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10
  },

  footer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181b', paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#27272a', ...(Platform.OS === 'android' && { borderTopWidth: 0 }) },
  attachBtn: { padding: 4, marginRight: 8 },
  inputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#222225', borderRadius: 24, paddingLeft: 16, paddingRight: 8, minHeight: 44, maxHeight: 100 },
  textInput: { flex: 1, color: '#fff', fontSize: 15, paddingTop: 10, paddingBottom: 10 },
  micBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#222225', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#18181b', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  sheetHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#3f3f46', alignSelf: 'center', marginBottom: 20 },
  sheetAction: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#27272a' },
  sheetActionText: { color: '#fff', fontSize: 16, marginLeft: 16, fontWeight: '500' }
});
