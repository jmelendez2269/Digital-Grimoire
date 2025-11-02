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

  useEffect(() => {
    // Safety timeout - ensure loading never gets stuck
    const timeoutId = setTimeout(() => {
      console.warn('[AuthContext] Safety timeout - forcing loading to false');
      setLoading(false);
    }, 5000);

    // Get initial session
    const initializeAuth = async () => {
      try {
        console.log('[AuthContext] Initializing authentication...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[AuthContext] Session error:', error);
          setUser(null);
          setIsAdmin(false);
        } else if (session?.user) {
          console.log('[AuthContext] Session found:', session.user.email);
          setUser(session.user);
          
          // Check admin status with timeout
          try {
            // Create a timeout promise
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Admin check timeout')), 3000)
            );
            
            // Race between profile fetch and timeout
            const profilePromise = supabase
              .from('users')
              .select('role, id, email')
              .eq('id', session.user.id)
              .maybeSingle(); // Use maybeSingle to handle missing records gracefully
            
            try {
              const { data: profile, error: profileError } = await Promise.race([
                profilePromise,
                timeoutPromise
              ]) as any;
              
              if (profileError) {
                console.error('[AuthContext] Error fetching user profile:', {
                  message: profileError.message,
                  code: profileError.code,
                  details: profileError.details,
                  userId: session.user.id,
                  userEmail: session.user.email
                });
                setIsAdmin(false);
              } else if (!profile) {
                console.warn('[AuthContext] User profile not found in users table', {
                  userId: session.user.id,
                  userEmail: session.user.email
                });
                setIsAdmin(false);
              } else {
                const isUserAdmin = profile?.role === 'admin';
                console.log('[AuthContext] User role:', profile?.role, 'isAdmin:', isUserAdmin, {
                  userId: profile.id,
                  email: profile.email
                });
                setIsAdmin(isUserAdmin);
              }
            } catch (raceError) {
              // Timeout or other error
              console.warn('[AuthContext] Admin check timed out or failed, defaulting to false');
              setIsAdmin(false);
            }
          } catch (err) {
            console.error('[AuthContext] Error checking admin status:', err);
            setIsAdmin(false);
          }
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
          
          // Update admin status
          try {
            const { data: profile, error: profileError } = await supabase
              .from('users')
              .select('role, id, email')
              .eq('id', session.user.id)
              .maybeSingle();
            
            if (profileError) {
              console.error('[AuthContext] Could not fetch user profile:', {
                message: profileError.message,
                code: profileError.code,
                userId: session.user.id,
                userEmail: session.user.email
              });
              setIsAdmin(false);
            } else if (!profile) {
              console.warn('[AuthContext] User profile not found in users table during auth state change');
              setIsAdmin(false);
            } else {
              const isUserAdmin = profile?.role === 'admin';
              console.log('[AuthContext] Auth state change - User role:', profile?.role, 'isAdmin:', isUserAdmin);
              setIsAdmin(isUserAdmin);
            }
          } catch (err) {
            console.error('[AuthContext] Error checking admin status:', err);
            setIsAdmin(false);
          }
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

