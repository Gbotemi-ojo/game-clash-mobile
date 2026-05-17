// src/lib/auth-client.ts
import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";

export const BACKEND_URL = "http://192.168.43.131:5000";

export const authClient = createAuthClient({
    baseURL: BACKEND_URL,
    
    // 1. Add the Expo plugin to handle the missing "cookie jar"
    plugins: [
        expoClient({
            scheme: "gameclashmobile",
            storage: SecureStore, 
        }),
    ],

    // 2. Keep your existing custom fetch implementation for CORS safety!
    fetchOptions: {
        customFetchImpl: async (url, init) => {
            // Safely reconstruct the headers object so we don't wipe out the Content-Type
            const headers = new Headers(init?.headers);
            
            // Manually inject the Origin header for Android
            headers.set('Origin', 'gameclashmobile://');
            
            // Explicitly force JSON in case React Native gets confused
            if (!headers.has('Content-Type')) {
                headers.set('Content-Type', 'application/json');
            }

            return fetch(url, {
                ...init,
                headers, 
            });
        },
    },
});
