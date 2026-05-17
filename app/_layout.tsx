// app/_layout.tsx
import { Slot } from 'expo-router';
import { AuthProvider } from '../src/context/AuthContext';
import { SocketProvider } from '../src/context/SocketContext'; // ✅ Imported SocketProvider

export default function RootLayout() {
  return (
    <AuthProvider>
      <SocketProvider>
        {/* <Slot /> renders whatever screen the user is currently on */}
        <Slot /> 
      </SocketProvider>
    </AuthProvider>
  );
}