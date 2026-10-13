// src/lib/auth-client.ts
import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";

export const BACKEND_URL = "http://192.168.0.197:5000";

const AUTH_FETCH_TIMEOUT_MS = 15_000;

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

            const controller = new AbortController();
            const callerSignal = init?.signal;
            let timedOut = false;
            const timeoutId = setTimeout(() => {
                timedOut = true;
                controller.abort();
            }, AUTH_FETCH_TIMEOUT_MS);
            const abortFromCaller = () => controller.abort();

            if (callerSignal?.aborted) {
                controller.abort();
            } else {
                callerSignal?.addEventListener('abort', abortFromCaller, { once: true });
            }

            try {
                return await fetch(url, {
                    ...init,
                    headers,
                    signal: controller.signal,
                });
            } catch (error) {
                if (timedOut) {
                    throw new Error(`Request to ${String(url)} timed out after ${AUTH_FETCH_TIMEOUT_MS}ms`);
                }

                if (callerSignal?.aborted || (error instanceof Error && error.name === 'AbortError')) {
                    throw error;
                }

                console.error(`[AUTH FETCH] Request to ${String(url)} failed:`, error);
                throw error;
            } finally {
                clearTimeout(timeoutId);
                callerSignal?.removeEventListener('abort', abortFromCaller);
            }
        },
    },
});
