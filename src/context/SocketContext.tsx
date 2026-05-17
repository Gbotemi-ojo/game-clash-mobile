import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { BACKEND_URL } from '../lib/auth-client';

const SocketContext = createContext<{ socket: Socket | null }>({ socket: null });

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const token = session?.session?.token;

    if (token) {
      // Strip /api/v1 from the BACKEND_URL for the socket connection
      const socketUrl = BACKEND_URL.replace('/api/v1', '');
      
      const newSocket = io(socketUrl, {
        auth: { token },
        transports: ['websocket'],
      });

      newSocket.on('connect', () => {
        console.log('✅ Global Socket Connected:', newSocket.id);
      });

      setSocket(newSocket);

      // Cleanup: Disconnect when token changes or component unmounts
      return () => {
        console.log('❌ Global Socket Disconnected');
        newSocket.disconnect();
      };
    } else if (socket) {
      // If user logs out (token becomes null), kill the socket
      socket.disconnect();
      setSocket(null);
    }
  }, [session?.session?.token]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
}

// Custom hook for screens to easily consume the socket
export const useSocket = () => useContext(SocketContext);
