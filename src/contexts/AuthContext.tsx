import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface Business {
  id: string;
  company_name: string;
  email: string;
  logo_url: string | null;
  primary_color: string;
  tier_id: string;
  subscription_status: string;
  usage_customers: number;
  usage_sms_monthly: number;
  is_super_admin: boolean;
  credits_remaining: number;
  stripe_price_id: string | null;
  subscription_period_end: string | null;
}

interface AuthContextType {
  user: User | null;
  business: Business | null;
  session: Session | null;
  loading: boolean;
  isSuperAdmin: boolean;
  signUp: (email: string, password: string, companyName: string, tierId: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const sessionTimeout = setTimeout(() => {
      console.warn('Session check timed out');
      setLoading(false);
    }, 5000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(sessionTimeout);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadBusiness(session.user.id);
      } else {
        setLoading(false);
      }
    }).catch((error) => {
      clearTimeout(sessionTimeout);
      console.error('Error getting session:', error);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadBusiness(session.user.id);
        } else {
          setBusiness(null);
          setIsSuperAdmin(false);
          setLoading(false);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadBusiness = async (userId: string) => {
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout')), 10000)
      );

      const superAdminPromise = supabase
        .from('super_admins')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      const { data: superAdminData, error: superAdminError } = await Promise.race([superAdminPromise, timeoutPromise]);

      if (!superAdminError && superAdminData) {
        console.log('Loaded super admin data:', superAdminData);
        setBusiness(null);
        setIsSuperAdmin(true);
        setLoading(false);
        return;
      }

      const queryPromise = supabase
        .from('businesses')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      if (error) {
        console.error('Error loading business:', error);
        setBusiness(null);
        setIsSuperAdmin(false);
      } else if (data) {
        console.log('Loaded business data:', data);
        setBusiness(data);
        setIsSuperAdmin(false);
      } else {
        console.warn('No business record found for user:', userId);
        await createBusinessForOAuthUser(userId);
      }
    } catch (error) {
      console.error('Exception loading business:', error);
      setBusiness(null);
      setIsSuperAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const createBusinessForOAuthUser = async (userId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user || !user.email) {
        console.error('Cannot create business: no user email found');
        setBusiness(null);
        setIsSuperAdmin(false);
        return;
      }

      const { data: tierData } = await supabase
        .from('subscription_tiers')
        .select('id')
        .eq('name', 'Free')
        .maybeSingle();

      const tierId = tierData?.id;

      if (!tierId) {
        console.error('Cannot create business: free tier not found');
        setBusiness(null);
        setIsSuperAdmin(false);
        return;
      }

      const companyName = user.user_metadata?.full_name || user.email.split('@')[0];

      const { data: newBusiness, error: businessError } = await supabase
        .from('businesses')
        .insert({
          id: userId,
          company_name: companyName,
          email: user.email,
          tier_id: tierId,
          subscription_status: 'trial',
          usage_customers: 0,
          usage_sms_monthly: 0,
        })
        .select()
        .single();

      if (businessError) {
        console.error('Error creating business for OAuth user:', businessError);
        setBusiness(null);
        setIsSuperAdmin(false);
      } else if (newBusiness) {
        console.log('Created business for OAuth user:', newBusiness);
        setBusiness(newBusiness);
        setIsSuperAdmin(false);
      }
    } catch (error) {
      console.error('Exception creating business for OAuth user:', error);
      setBusiness(null);
      setIsSuperAdmin(false);
    }
  };

  const signUp = async (email: string, password: string, companyName: string, tierId: string) => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError || !authData.user) {
      return { error: authError };
    }

    const { error: businessError } = await supabase
      .from('businesses')
      .insert({
        id: authData.user.id,
        company_name: companyName,
        email,
        tier_id: tierId,
        subscription_status: 'trial',
        usage_customers: 0,
        usage_sms_monthly: 0,
      });

    if (businessError) {
      return { error: businessError as any };
    }

    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setBusiness(null);
    setIsSuperAdmin(false);
    setSession(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        business,
        session,
        loading,
        isSuperAdmin,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        resetPassword,
      }}
    >
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
