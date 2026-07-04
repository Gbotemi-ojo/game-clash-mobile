// app/chat/[id].tsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, 
  KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard, Alert, Modal
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Clipboard from 'expo-clipboard';
import * as Notifications from 'expo-notifications';

import { authClient, BACKEND_URL } from '../../src/lib/auth-client';
import { useSocket } from '../../src/context/SocketContext';
import { db } from '../../src/db/localDb';
import { localMessages } from '../../src/db/localSchema';
import { eq, and, ne, desc } from 'drizzle-orm';

// 👉 NEW IMPORTS
import { sanitizeDateToISO } from '../../src/utils/chatHelpers';
import { MessageItem } from '../../src/components/chat/MessageItem';

export default function ChatScreen() {
  const rawParams = useLocalSearchParams();
  const targetUserId = Array.isArray(rawParams.id) ? rawParams.id[0] : rawParams.id;
  const paramNameStr = Array.isArray(rawParams.name) ? rawParams.name[0] : rawParams.name;
  const type = Array.isArray(rawParams.type) ? rawParams.type[0] : (rawParams.type || '1v1');
  const paramRoomId = Array.isArray(rawParams.roomId) ? rawParams.roomId[0] : rawParams.roomId;

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
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  
  const [participantNames, setParticipantNames] = useState<Record<string, string>>({});

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
        
        let currentRoomId = paramRoomId ? parseInt(paramRoomId as string) : null;

        if (type === '1v1') {
          const targetRes = await authClient.$fetch<any>(`${BACKEND_URL}/api/v1/users/${targetUserId}/profile`);
          if (targetRes.data) setChatUser(targetRes.data);
          
          if (!currentRoomId) {
            const roomRes = await authClient.$fetch<any>(`${BACKEND_URL}/api/v1/chat/rooms/1v1`, { method: 'POST', body: { targetUserId } });
            if (roomRes.data && roomRes.data.roomId) {
              currentRoomId = roomRes.data.roomId;
            }
          }
        } else {
          if (!currentRoomId) {
             const roomRes = await authClient.$fetch<any>(`${BACKEND_URL}/api/v1/chat/rooms/league/${targetUserId}`, { method: 'POST' });
             if (roomRes.data && roomRes.data.roomId) {
               currentRoomId = roomRes.data.roomId;
             }
          }
        }

        if (currentRoomId) {
          setRoomId(currentRoomId);
          await loadLocalMessages(currentRoomId);
          setIsLoading(false); 

          const historyRes = await authClient.$fetch<any[]>(`${BACKEND_URL}/api/v1/chat/rooms/${currentRoomId}/messages`);
          
          if (historyRes.data) {
            const fetchedNames: Record<string, string> = {};

            await db.delete(localMessages).where(and(eq(localMessages.chatRoomId, currentRoomId), ne(localMessages.status, 'pending')));
            for (const msg of historyRes.data) {
              if (msg.senderId && msg.senderName) {
                fetchedNames[msg.senderId] = msg.senderName;
              }

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
            
            setParticipantNames(prev => ({ ...prev, ...fetchedNames }));
            await loadLocalMessages(currentRoomId);
          }
        } else {
          setIsLoading(false);
        }
      } catch (err) {
        setIsLoading(false); 
      }
    };
    initializeChat();
  }, [targetUserId, type, paramRoomId]);

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
      
      if (msg.senderId && msg.senderName) {
        setParticipantNames(prev => ({...prev, [msg.senderId]: msg.senderName}));
      }

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

  const handleScroll = useCallback((event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowScrollToBottom(offsetY > 200); 
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

  const handleSenderPress = useCallback((senderId: string) => {
    router.push({ pathname: '/player/[id]', params: { id: senderId } });
  }, [router]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </SafeAreaView>
    );
  }
  
  let formattedHeaderName = paramNameStr || 'Opponent';
  if (type === 'league_division') {
    formattedHeaderName = paramNameStr?.replace('_', ' ').toUpperCase() || 'LEAGUE CHAT';
  } else {
    formattedHeaderName = chatUser?.profile?.teamName || chatUser?.teamName || chatUser?.name || chatUser?.user?.name || paramNameStr || 'Opponent';
  }

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
                <FontAwesome5 name={type === 'league_division' ? "users" : "user-astronaut"} size={20} color="#38bdf8" />
              </View>
              
              <TouchableOpacity 
                style={styles.headerTextContainer}
                activeOpacity={0.7}
                onPress={() => {
                  if (type === 'league_division') {
                    router.push('/(tabs)/tournaments');
                  } else {
                    router.push({ pathname: '/player/[id]', params: { id: targetUserId } });
                  }
                }}
              >
                <Text style={styles.headerName}>{formattedHeaderName}</Text>
                
                {chatUser?.isOnline && type !== 'league_division' && (
                  <View style={styles.activeStatusRow}>
                    <View style={styles.activeDot} />
                    <Text style={styles.activeText}>Active now</Text>
                  </View>
                )}

                {type === 'league_division' && (
                  <Text style={styles.tapToViewText}>Tap to view ladder</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

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
              onScroll={handleScroll} 
              scrollEventThrottle={16} 
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
                    opponentName={item.senderName || formattedHeaderName} 
                    repliedMessage={repliedMessage}
                    isHighlighted={item.id === highlightedMessageId} 
                    onLongPress={handleMessageLongPress}
                    onReply={handleMessageReply}
                    onPressReplyBlock={handleScrollToMessage}
                    isGroup={type === 'league_division'}
                    resolvedSenderName={participantNames[item.senderId] || item.senderName || 'Player'}
                    onPressSender={handleSenderPress}
                  />
                );
              }}
              contentContainerStyle={styles.chatCanvas}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
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
                    : `Replying to ${replyingTo?.senderId === currentUser?.id ? 'yourself' : (participantNames[replyingTo?.senderId] || replyingTo?.senderName || formattedHeaderName)}`
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
  headerTextContainer: { justifyContent: 'center', paddingVertical: 4 },
  headerName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  activeStatusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981', marginRight: 4 },
  activeText: { color: '#10b981', fontSize: 12, fontWeight: '500' },
  tapToViewText: { color: '#a1a1aa', fontSize: 11, marginTop: 2 },
  chatCanvas: { paddingHorizontal: 16, paddingVertical: 20 },
  replyPreviewBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181b', padding: 12, borderTopWidth: 1, borderTopColor: '#27272a' },
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
