// src/components/GlobalChatToast.tsx
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
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
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
  
  // Animation Values
  const slideAnim = useRef(new Animated.Value(-150)).current; 
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg: any) => {
      // Don't show toast if we are already in that specific chat
      if (pathname.includes(`/chat/${msg.senderId}`)) return; 

      setToast({
        id: msg.id || Date.now().toString(),
        senderId: msg.senderId,
        senderName: msg.senderName || 'Challenger',
        content: msg.content || msg.text || 'Sent an attachment',
      });

      // Bouncy "Pop-In" Animation
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: Platform.OS === 'ios' ? insets.top + 10 : 20, 
          friction: 6, // Lower friction = more bounce
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          useNativeDriver: true,
        })
      ]).start();

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => hideToast(), 4000);
    };

    socket.on('new_message', handleNewMessage);

    return () => {
      socket.off('new_message', handleNewMessage);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [socket, pathname, insets.top]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -150,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(() => setToast(null));
  };

  const handlePress = () => {
    if (!toast) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    const targetId = toast.senderId;
    
    setToast(null);
    slideAnim.setValue(-150); 
    
    router.push({ pathname: '/chat/[id]', params: { id: targetId } });
  };

  if (!toast) return null;

  return (
    <Animated.View style={[
      styles.toastContainer, 
      { transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }
    ]}>
      <TouchableOpacity style={styles.toastContent} activeOpacity={0.9} onPress={handlePress}>
        
        {/* Avatar Section */}
        <View style={styles.avatarBox}>
          <FontAwesome5 name="user-astronaut" size={20} color="#22d3ee" />
        </View>

        {/* Text Content */}
        <View style={styles.textContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.senderName}>{toast.senderName}</Text>
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          </View>
          <Text style={styles.messageContent} numberOfLines={1}>{toast.content}</Text>
        </View>

        {/* Reply Icon */}
        <View style={styles.actionIcon}>
          <Ionicons name="arrow-forward-circle" size={24} color="#22d3ee" />
        </View>

      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toastContainer: { 
    position: 'absolute', top: 0, left: 16, right: 16, zIndex: 9999, elevation: 9999 
  },
  toastContent: { 
    flexDirection: 'row', 
    backgroundColor: '#0b0f19', // Deep charcoal from your theme
    borderRadius: 20, 
    padding: 14, 
    alignItems: 'center',
    borderWidth: 1, 
    borderColor: '#1e293b', 
    // Neon Cyan Glow
    shadowColor: '#22d3ee', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.25, 
    shadowRadius: 12,
  },
  avatarBox: { 
    width: 46, height: 46, 
    borderRadius: 23, 
    backgroundColor: '#1f2937', 
    borderWidth: 1, borderColor: '#22d3ee',
    justifyContent: 'center', alignItems: 'center', 
    marginRight: 14 
  },
  textContainer: { flex: 1, justifyContent: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  senderName: { color: '#ffffff', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  newBadge: { backgroundColor: 'rgba(34, 211, 238, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  newBadgeText: { color: '#22d3ee', fontSize: 9, fontWeight: '900' },
  messageContent: { color: '#94a3b8', fontSize: 14, fontWeight: '500' },
  actionIcon: { paddingLeft: 10, justifyContent: 'center' }
});
