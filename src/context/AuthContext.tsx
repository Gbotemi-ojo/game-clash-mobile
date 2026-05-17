import { useRouter, useSegments } from 'expo-router';
import React, { createContext, useContext, useEffect } from 'react';
import { authClient } from '../lib/auth-client';

const AuthContext = createContext<any>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending, refetch } = authClient.useSession();
  
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // THE WIRETAP
    console.log(`[AUTH STATE] isPending: ${isPending} | session: ${session ? 'LOGGED IN' : 'NULL'} | segment: ${segments[0]}`);

    if (isPending) return;

    const inAuthGroup = segments[0] === '(auth)';
    
    if (session && inAuthGroup) {
      console.log("[ROUTER] User has session, moving to /(tabs)!");
      router.replace('/(tabs)');
    } else if (!session && !inAuthGroup) {
      console.log("[ROUTER] No session found, kicking to sign-in.");
      router.replace('/(auth)/sign-in');
    }
  }, [session, isPending, segments]);

  return (
    <AuthContext.Provider value={{ session, isPending, refetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
