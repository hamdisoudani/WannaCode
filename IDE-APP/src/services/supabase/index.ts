// ==========================================================================
// Supabase Client Service - Google OAuth for Tauri
// ==========================================================================

import { createClient, Session, User } from '@supabase/supabase-js';
import { onOpenUrl } from '@tauri-apps/plugin-deep-link';

// ==========================================================================
// IMPORTANT: Replace these with your actual Supabase credentials
// You can find these in your Supabase project settings
// ==========================================================================
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

// The redirect URL for OAuth - matches our custom URL scheme
const REDIRECT_URL = 'codesurf://auth/callback';

// ==========================================================================
// Supabase Client Configuration
// ==========================================================================
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false, // We handle deep links manually
        flowType: 'pkce', // More secure for desktop apps
    },
});

// ==========================================================================
// Auth Types
// ==========================================================================
export interface AuthState {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    error: string | null;
}

// ==========================================================================
// Deep Link Handler for OAuth Callbacks
// ==========================================================================
let deepLinkListenerSetup = false;

/**
 * Sets up the deep link listener to handle OAuth redirects.
 * This should be called once when the app starts.
 */
export async function setupDeepLinkListener(
    onAuthStateChange: (session: Session | null) => void
): Promise<void> {
    if (deepLinkListenerSetup) {
        console.log('[Auth] Deep link listener already set up');
        return;
    }

    try {
        await onOpenUrl(async (urls: string[]) => {
            console.log('[Auth] Deep link received:', urls);

            for (const url of urls) {
                // Check if this is an auth callback
                if (url.startsWith('codesurf://auth/callback')) {
                    await handleAuthCallback(url, onAuthStateChange);
                }
            }
        });

        deepLinkListenerSetup = true;
        console.log('[Auth] Deep link listener set up successfully');
    } catch (error) {
        console.error('[Auth] Failed to set up deep link listener:', error);
    }
}

/**
 * Handles the OAuth callback URL from Google.
 * With PKCE flow, we receive a 'code' that needs to be exchanged for tokens.
 */
async function handleAuthCallback(
    url: string,
    onAuthStateChange: (session: Session | null) => void
): Promise<void> {
    try {
        console.log('[Auth] Handling auth callback:', url);

        // Parse the URL to extract the code or tokens
        const urlObj = new URL(url);

        // Check for errors first
        const error = urlObj.searchParams.get('error');
        const errorDescription = urlObj.searchParams.get('error_description');
        if (error) {
            console.error('[Auth] OAuth error:', error, errorDescription);
            return;
        }

        // With PKCE flow, Supabase returns a 'code' in query params
        const code = urlObj.searchParams.get('code');

        if (code) {
            console.log('[Auth] Received auth code, exchanging for session...');

            // Exchange the code for a session
            const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

            if (exchangeError) {
                console.error('[Auth] Failed to exchange code for session:', exchangeError);
                return;
            }

            console.log('[Auth] Session created successfully, user:', data.session?.user?.email);
            onAuthStateChange(data.session);
            return;
        }

        // Fallback: Check for tokens in URL fragment (implicit flow)
        const hashIndex = url.indexOf('#');
        if (hashIndex !== -1) {
            const fragment = url.substring(hashIndex + 1);
            const params = new URLSearchParams(fragment);

            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');

            if (accessToken && refreshToken) {
                const { data, error: setError } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                });

                if (setError) {
                    console.error('[Auth] Failed to set session:', setError);
                    return;
                }

                console.log('[Auth] Session set successfully, user:', data.session?.user?.email);
                onAuthStateChange(data.session);
                return;
            }
        }

        console.error('[Auth] No code or tokens found in callback URL');

    } catch (error) {
        console.error('[Auth] Error handling auth callback:', error);
    }
}

// ==========================================================================
// Auth Functions
// ==========================================================================

/**
 * Initiates Google OAuth sign-in.
 * Opens the user's default browser to the Google login page.
 */
export async function signInWithGoogle(): Promise<{ error: Error | null }> {
    try {
        console.log('[Auth] Initiating Google sign-in...');

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: REDIRECT_URL,
                skipBrowserRedirect: false, // Let Supabase open the browser
            },
        });

        if (error) {
            console.error('[Auth] Google sign-in error:', error);
            return { error };
        }

        console.log('[Auth] OAuth initiated, URL:', data.url);
        return { error: null };

    } catch (error) {
        console.error('[Auth] Unexpected error during sign-in:', error);
        return { error: error as Error };
    }
}

/**
 * Signs out the current user.
 */
export async function signOut(): Promise<{ error: Error | null }> {
    try {
        const { error } = await supabase.auth.signOut();

        if (error) {
            console.error('[Auth] Sign out error:', error);
            return { error };
        }

        console.log('[Auth] Signed out successfully');
        return { error: null };

    } catch (error) {
        console.error('[Auth] Unexpected error during sign-out:', error);
        return { error: error as Error };
    }
}

/**
 * Gets the current session.
 */
export async function getSession(): Promise<Session | null> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        return session;
    } catch (error) {
        console.error('[Auth] Error getting session:', error);
        return null;
    }
}

/**
 * Gets the current user.
 */
export async function getUser(): Promise<User | null> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    } catch (error) {
        console.error('[Auth] Error getting user:', error);
        return null;
    }
}

/**
 * Subscribe to auth state changes.
 * Returns an unsubscribe function.
 */
export function onAuthStateChange(
    callback: (session: Session | null) => void
): () => void {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, session) => {
            callback(session);
        }
    );

    return () => subscription.unsubscribe();
}
