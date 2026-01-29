// ==========================================================================
// Auth Context - React Context for Authentication State
// ==========================================================================

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import {
  supabase,
  signInWithGoogle as supabaseSignInWithGoogle,
  signOut as supabaseSignOut,
  getSession,
  setupDeepLinkListener,
  onAuthStateChange,
} from '../services/supabase';

// ==========================================================================
// Types
// ==========================================================================
interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

interface AuthProviderProps {
  children: ReactNode;
}

// ==========================================================================
// Context
// ==========================================================================
const AuthContext = createContext<AuthContextType | null>(null);

// ==========================================================================
// Provider Component
// ==========================================================================
export function AuthProvider({ children }: AuthProviderProps): ReactNode {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Handle session changes (from deep link callback)
  const handleSessionChange = useCallback((newSession: Session | null) => {
    console.log('[AuthContext] Session changed:', newSession?.user?.email ?? 'null');
    setSession(newSession);
    setUser(newSession?.user ?? null);
    setIsLoading(false);
    setError(null);
  }, []);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;

    async function initAuth() {
      try {
        console.log('[AuthContext] Initializing auth...');
        
        // Get existing session
        const existingSession = await getSession();
        if (mounted) {
          handleSessionChange(existingSession);
          console.log('[AuthContext] Initial session:', existingSession?.user?.email ?? 'none');
        }
        
        // Set up deep link listener for OAuth callbacks
        await setupDeepLinkListener(handleSessionChange);
        
        // Subscribe to auth state changes
        unsubscribe = onAuthStateChange(handleSessionChange);
        
      } catch (err) {
        console.error('[AuthContext] Init error:', err);
        if (mounted) {
          setError('Failed to initialize authentication');
          setIsLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      mounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [handleSessionChange]);

  // Sign in with Google
  const signInWithGoogle = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('[AuthContext] Starting Google sign-in...');
      const { error: signInError } = await supabaseSignInWithGoogle();
      
      if (signInError) {
        console.error('[AuthContext] Sign-in error:', signInError);
        setError(signInError.message);
        setIsLoading(false);
      }
      // Note: Loading will be set to false when deep link callback is received
      
    } catch (err) {
      console.error('[AuthContext] Unexpected sign-in error:', err);
      setError('An unexpected error occurred');
      setIsLoading(false);
    }
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('[AuthContext] Signing out...');
      const { error: signOutError } = await supabaseSignOut();
      
      if (signOutError) {
        console.error('[AuthContext] Sign-out error:', signOutError);
        setError(signOutError.message);
      } else {
        setSession(null);
        setUser(null);
      }
      
    } catch (err) {
      console.error('[AuthContext] Unexpected sign-out error:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    isAuthenticated: !!session && !!user,
    error,
    signInWithGoogle,
    signOut,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ==========================================================================
// Hook
// ==========================================================================
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

// ==========================================================================
// Export supabase client for direct access when needed
// ==========================================================================
export { supabase };
