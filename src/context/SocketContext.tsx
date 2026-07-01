import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { AppState } from 'react-native';
import { useAuth } from './AuthContext';
import { BACKEND_URL } from '../lib/auth-client';

const SocketContext = createContext<{ socket: Socket | null }>({ socket: null });

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const token = session?.session?.token;

    const connectSocket = () => {
      if (!token) return;

      if (socketRef.current) {
        if (!socketRef.current.connected) {
          socketRef.current.connect();
        }
        return;
      }

      const socketUrl = BACKEND_URL.replace('/api/v1', '');
      socketRef.current = io(socketUrl, {
        auth: { token },
        transports: ['websocket'],
      });

      socketRef.current.on('connect', () => console.log('✅ Global Socket Connected'));
      setSocket(socketRef.current);
    };

    const disconnectSocket = (reason: string) => {
      if (socketRef.current) {
        console.log(`❌ Global Socket Disconnected (${reason})`);
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
    };

    if (!token) {
      disconnectSocket('Logged Out');
      return;
    }

    if (AppState.currentState === 'active') {
      connectSocket();
    }

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        connectSocket();
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        if (socketRef.current?.connected) {
          disconnectSocket('App Backgrounded');
        }
      }
    });

    return () => {
      subscription.remove();
      disconnectSocket('Auth Changed');
    };
  }, [session]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
