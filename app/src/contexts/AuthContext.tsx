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
        console.error('[AuthContext] API admin check failed:', response.status);
        return false;
      }
      
      const data = await response.json();
      console.log('[AuthContext] API admin check result:', data);
      return data.isAdmin === true;
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
          console.error('[AuthContext] Session error:', error);
          setUser(null);
          setIsAdmin(false);
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
        console.error('[AuthContext] Error initializing auth:', err);
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

  return (
    <AuthContext.Provider value={{ user, loading, supabase, signOut, isAdmin }}>
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

