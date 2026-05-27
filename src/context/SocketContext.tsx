// src/context/SocketContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { AppState } from 'react-native';
import { useAuth } from './AuthContext';
import { BACKEND_URL } from '../lib/auth-client';

const SocketContext = createContext<{ socket: Socket | null }>({ socket: null });

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    let currentSocket: Socket | null = null;
    const token = session?.session?.token;

    const connectSocket = () => {
      if (token && !currentSocket) {
        const socketUrl = BACKEND_URL.replace('/api/v1', '');
        currentSocket = io(socketUrl, {
          auth: { token },
          transports: ['websocket'],
        });

        currentSocket.on('connect', () => console.log('✅ Global Socket Connected'));
        setSocket(currentSocket);
      }
    };

    const disconnectSocket = () => {
      if (currentSocket) {
        console.log('❌ Global Socket Disconnected (App Backgrounded or Logged Out)');
        currentSocket.disconnect();
        currentSocket = null;
        setSocket(null);
      }
    };

    // 1. Initial Check: Only connect if the app is actively on screen
    if (AppState.currentState === 'active') {
      connectSocket();
    }

    // 2. The AppState Listener: Watch for the user minimizing the app
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // App is back on screen! Reconnect to get live updates.
        connectSocket();
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App is minimized! Kill the socket so the backend sends a Native Push Notification.
        disconnectSocket();
      }
    });

    // 3. Cleanup on unmount or token change
    return () => {
      subscription.remove();
      disconnectSocket();
    };
  }, [session?.session?.token]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);