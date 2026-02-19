"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, SupabaseClient } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  supabase: SupabaseClient;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  refreshAdminStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [supabase] = useState(() => createClient());

  // Check admin status via API (more reliable, bypasses RLS)
  const checkAdminViaAPI = async (userId: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/admin-status', {
        credentials: 'include', // Important: include cookies for auth
      });

      if (!response.ok) {
        // 401 means not authenticated - this is expected, not an error
        if (response.status === 401) {
          console.log('[AuthContext] User not authenticated (401)');
        } else {
          // Other errors (500, etc.) are actual problems
          console.error('[AuthContext] API admin check failed:', response.status);
          try {
            const errorData = await response.json();
            console.error('[AuthContext] API error details:', errorData);
          } catch (e) {
            console.error('[AuthContext] Could not parse error response');
          }
        }
        return false;
      }

      const data = await response.json();
      console.log('[AuthContext] API admin check result:', data);

      // Debug: Log the actual values
      if (data.debug) {
        console.log('[AuthContext] Debug info:', data.debug);
      }

      // Check both isAdmin boolean and role string
      const isAdminResult = data.isAdmin === true || data.role === 'admin';
      console.log('[AuthContext] Final admin status:', isAdminResult, '(from isAdmin:', data.isAdmin, ', role:', data.role, ')');

      return isAdminResult;
    } catch (error) {
      console.error('[AuthContext] API admin check error:', error);
      return false;
    }
  };

  useEffect(() => {
    // Safety timeout - reduced to 3s for faster initial render
    const timeoutId = setTimeout(() => {
      console.warn('[AuthContext] Safety timeout - forcing loading to false');
      setLoading(false);
    }, 3000);

    const initializeAuth = async () => {
      try {
        console.log('[AuthContext] Initializing authentication...');
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          // Handle refresh token errors gracefully
          if (error.message?.includes('refresh_token') || error.message?.includes('Refresh Token')) {
            console.warn('[AuthContext] Invalid refresh token detected, clearing session:', error.message);
            // Clear the invalid session
            await supabase.auth.signOut();
            setUser(null);
            setIsAdmin(false);
          } else {
            console.error('[AuthContext] Session error:', error);
            setUser(null);
            setIsAdmin(false);
          }
          setLoading(false);
          clearTimeout(timeoutId);
          return;
        } else if (session?.user) {
          console.log('[AuthContext] Session found:', session.user.email);
          setUser(session.user);
          setLoading(false); // Set loading false immediately for better UX

          // Check admin via API asynchronously (non-blocking)
          checkAdminViaAPI(session.user.id).then((adminStatus) => {
            setIsAdmin(adminStatus);
            console.log('[AuthContext] Admin status set to:', adminStatus);
          }).catch((err) => {
            console.error('[AuthContext] Error checking admin status:', err);
            setIsAdmin(false);
          });
        } else {
          console.log('[AuthContext] No session found');
          setUser(null);
          setIsAdmin(false);
        }
      } catch (err) {
        // Handle any unexpected errors, including refresh token errors
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (errorMessage.includes('refresh_token') || errorMessage.includes('Refresh Token')) {
          console.warn('[AuthContext] Invalid refresh token in catch block, clearing session:', errorMessage);
          try {
            await supabase.auth.signOut();
          } catch (signOutError) {
            // Ignore sign out errors
          }
        } else {
          console.error('[AuthContext] Error initializing auth:', err);
        }
        setUser(null);
        setIsAdmin(false);
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
        console.log('[AuthContext] Initialization complete');
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          console.log('[AuthContext] Auth state changed:', event, session?.user?.email);

          if (session?.user) {
            setUser(session.user);

            // Check admin via API
            const adminStatus = await checkAdminViaAPI(session.user.id);
            setIsAdmin(adminStatus);
            console.log('[AuthContext] Auth change - Admin status:', adminStatus);
          } else {
            setUser(null);
            setIsAdmin(false);
          }
        } catch (err) {
          // Handle errors in auth state change, including refresh token errors
          const errorMessage = err instanceof Error ? err.message : String(err);
          if (errorMessage.includes('refresh_token') || errorMessage.includes('Refresh Token')) {
            console.warn('[AuthContext] Invalid refresh token in auth state change, clearing session:', errorMessage);
            try {
              await supabase.auth.signOut();
            } catch (signOutError) {
              // Ignore sign out errors
            }
            setUser(null);
            setIsAdmin(false);
          } else {
            console.error('[AuthContext] Error in auth state change:', err);
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signOut = async () => {
    console.log('[AuthContext] Signing out...');
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
  };

  const refreshAdminStatus = async () => {
    if (user) {
      console.log('[AuthContext] Manually refreshing admin status...');
      const adminStatus = await checkAdminViaAPI(user.id);
      setIsAdmin(adminStatus);
      console.log('[AuthContext] Admin status refreshed:', adminStatus);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, supabase, signOut, isAdmin, refreshAdminStatus }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

