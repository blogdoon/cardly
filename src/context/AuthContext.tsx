import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile } from '../types/user';
import { loginWithGoogle, logoutUser, subscribeToAuth } from '../services/authService';
import { isSupabaseConfigured } from '../services/supabase';
import { SignInModal } from '../components/SignInModal';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isAuthActive: boolean;
  signInWithGoogle: () => Promise<void>;
  /** Opens the email/password + Google sign-in dialog. */
  openSignIn: () => void;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [signInOpen, setSignInOpen] = useState(false);

  useEffect(() => {
    const unsub = subscribeToAuth((profile) => {
      setUser(profile);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleGoogleSignIn = async () => {
    // Redirects to Google and back; the session arrives via subscribeToAuth on
    // reload, so there is no profile to set here.
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setLoading(false);
      console.error(err);
      throw err;
    }
  };

  const handleSignOut = async () => {
    await logoutUser();
    setUser(null);
  };

  // `role` is resolved from the `app_metadata.is_admin` flag on the Supabase
  // JWT (the same field the RLS `is_admin()` reads). Re-checking here would
  // duplicate a server-controlled decision.
  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthActive: isSupabaseConfigured,
        signInWithGoogle: handleGoogleSignIn,
        openSignIn: () => setSignInOpen(true),
        signOut: handleSignOut,
        isAdmin,
      }}
    >
      {children}
      {signInOpen && !user && (
        <SignInModal onClose={() => setSignInOpen(false)} onGoogle={handleGoogleSignIn} />
      )}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
