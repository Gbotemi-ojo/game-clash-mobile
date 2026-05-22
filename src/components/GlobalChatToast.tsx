import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  TouchableOpacity, 
  Platform 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSocket } from '../context/SocketContext';

interface ToastData {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
}

export default function GlobalChatToast() {
  const { socket } = useSocket();
  const router = useRouter();
  const pathname = usePathname(); 
  const insets = useSafeAreaInsets();

  const [toast, setToast] = useState<ToastData | null>(null);
  const slideAnim = useRef(new Animated.Value(-150)).current; 
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg: any) => {
      if (pathname.includes(`/chat/${msg.senderId}`)) {
        return; 
      }

      setToast({
        id: msg.id || Date.now().toString(),
        senderId: msg.senderId,
        senderName: msg.senderName || 'New Message',
        content: msg.content || msg.text || 'Sent an attachment',
      });

      Animated.spring(slideAnim, {
        toValue: Platform.OS === 'ios' ? insets.top + 10 : 20, 
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        hideToast();
      }, 4000);
    };

    socket.on('new_message', handleNewMessage);

    return () => {
      socket.off('new_message', handleNewMessage);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [socket, pathname, insets.top]);

  const hideToast = () => {
    Animated.timing(slideAnim, {
      toValue: -150,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setToast(null);
    });
  };

  const handlePress = () => {
    if (!toast) return;
    
    // 1. Instantly kill the 4-second delay
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    const targetId = toast.senderId;
    
    // 2. Erase the toast instantly without waiting for animations
    setToast(null);
    slideAnim.setValue(-150); 
    
    // 3. Navigate immediately
    router.push({ 
      pathname: '/chat/[id]', 
      params: { id: targetId } 
    });
  };

  if (!toast) return null;

  return (
    <Animated.View style={[styles.toastContainer, { transform: [{ translateY: slideAnim }] }]}>
      <TouchableOpacity style={styles.toastContent} activeOpacity={0.9} onPress={handlePress}>
        <View style={styles.iconBox}>
          <Ionicons name="chatbubble-ellipses" size={24} color="#3b82f6" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.senderName}>{toast.senderName}</Text>
          <Text style={styles.messageContent} numberOfLines={2}>{toast.content}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toastContainer: { position: 'absolute', top: 0, left: 16, right: 16, zIndex: 9999, elevation: 9999 },
  toastContent: { flexDirection: 'row', backgroundColor: '#18181b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#27272a', borderLeftWidth: 4, borderLeftColor: '#3b82f6', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 15 },
  iconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(59, 130, 246, 0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  textContainer: { flex: 1, justifyContent: 'center' },
  senderName: { color: '#fff', fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  messageContent: { color: '#a1a1aa', fontSize: 13, lineHeight: 18 }
});
