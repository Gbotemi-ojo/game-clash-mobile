import { useRouter, useSegments, useRootNavigationState } from 'expo-router';
import React, { createContext, useContext, useEffect } from 'react';
import { authClient } from '../lib/auth-client';

const AuthContext = createContext<any>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending, refetch } = authClient.useSession();
  
  const segments = useSegments();
  const router = useRouter();
  
  // ✅ 1. Get the mounting state of the root navigator
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    // ✅ 2. Halt everything if the navigation tree isn't fully mounted yet!
    if (!rootNavigationState?.key) return;

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
    
  // ✅ 3. Add the key to the dependency array
  }, [session, isPending, segments, rootNavigationState?.key]);

  return (
    <AuthContext.Provider value={{ session, isPending, refetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
