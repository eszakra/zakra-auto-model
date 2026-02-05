import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../services/supabaseClient';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  plan_type: 'free' | 'starter' | 'creator' | 'pro' | 'studio';
  credits: number;
  total_generations: number;
  is_admin: boolean;
  email_verified: boolean;
  trial_ends_at: string | null;
  subscription_status: 'active' | 'inactive' | 'cancelled' | 'past_due';
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: UserProfile | null;
  session: any;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any } | { error: null }>;
  signIn: (email: string, password: string) => Promise<{ error: any } | { error: null }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  useCredits: (amount: number, description?: string) => Promise<boolean>;
  hasEnoughCredits: (amount?: number) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        setUser(null);
      } else {
        setUser(data);
      }
    } catch (error) {
      console.error('Error:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        return { error };
      }

      // Detect duplicate email: Supabase returns a "fake" user with empty identities
      // when email confirmation is enabled and the email already exists
      if (data?.user?.identities && data.user.identities.length === 0) {
        return {
          error: { message: 'This email is already registered. Please sign in instead.' }
        };
      }

      // Profile will be created automatically by the trigger
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      // Session and user will be set automatically by the onAuthStateChange listener
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const refreshUser = async () => {
    if (user?.id) {
      await fetchUserProfile(user.id);
    }
  };

  const useCredits = async (amount: number = 1, description?: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc('use_credits', {
        p_user_id: user.id,
        p_amount: amount,
        p_description: description || 'Image generation',
      });

      if (error) {
        console.error('Error using credits:', error);
        return false;
      }

      // Refresh user to get updated credits
      await refreshUser();
      return data;
    } catch (error) {
      console.error('Error:', error);
      return false;
    }
  };

  const hasEnoughCredits = (amount: number = 1): boolean => {
    if (!user) return false;
    return user.credits >= amount;
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    refreshUser,
    useCredits,
    hasEnoughCredits,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
