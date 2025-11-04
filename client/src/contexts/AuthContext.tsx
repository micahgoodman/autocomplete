import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updateProfile: (updates: { email?: string; password?: string; data?: Record<string, any> }) => Promise<{ error: AuthError | null }>;
  requestAuth: () => void;
  showAuthModal: boolean;
  isAuthenticating: boolean;
  handleAuthConfirm: () => Promise<void>;
  handleAuthCancel: () => void;
  showSignInModal: boolean;
  requestSignIn: () => void;
  closeSignInModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Check Gmail authentication on startup
    const checkAuth = async () => {
      if (window.electron?.checkGmailAuth) {
        try {
          const isAuthenticated = await window.electron.checkGmailAuth();
          if (!isAuthenticated) {
            setShowAuthModal(true);
          }
        } catch (error) {
          console.error('[AuthContext] Error checking Gmail auth:', error);
        }
      }
    };

    checkAuth();
  }, []);

  const signUp = async (email: string, password: string, metadata?: Record<string, any>) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: window.location.origin,
        },
      });
      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  const updateProfile = async (updates: { email?: string; password?: string; data?: Record<string, any> }) => {
    try {
      const { error } = await supabase.auth.updateUser(updates);
      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  const requestAuth = () => {
    setShowAuthModal(true);
  };

  const handleAuthConfirm = async () => {
    setIsAuthenticating(true);
    let started = false;
    try {
      await window.electron.triggerGmailAuth();
      started = true;
    } catch (error) {
      console.error('[AuthContext] Authentication start failed:', error);
      // Continue to poll; the browser may still open and complete
    }

    const timeoutMs = 180000;
    const intervalMs = 1000;
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      try {
        const isAuthenticated = await window.electron.checkGmailAuth();
        if (isAuthenticated) {
          setShowAuthModal(false);
          alert('Gmail authentication successful! You can now use the Autocomplete feature.');
          setIsAuthenticating(false);
          return;
        }
      } catch (e) {
        console.error('[AuthContext] Error polling Gmail auth:', e);
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }

    alert('Gmail authentication was not completed. Please try again.');
    setShowAuthModal(false);
    setIsAuthenticating(false);
  };

  const handleAuthCancel = () => {
    // Allow user to re-open and retry immediately
    setIsAuthenticating(false);
    setShowAuthModal(false);
  };

  const requestSignIn = () => {
    setShowSignInModal(true);
  };

  const closeSignInModal = () => {
    setShowSignInModal(false);
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile,
    requestAuth,
    showAuthModal,
    isAuthenticating,
    handleAuthConfirm,
    handleAuthCancel,
    showSignInModal,
    requestSignIn,
    closeSignInModal,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
