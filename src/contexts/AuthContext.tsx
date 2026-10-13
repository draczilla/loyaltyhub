import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

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
  trial_ends_at: string | null;
  tenant_id: string | null;
  is_tenant_admin: boolean;
  email_verified: boolean;
  phone: string | null;
  phone_verified: boolean;
  onboarding_status: string;
  onboarding_completed_at: string | null;
  vat_number: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  country: string | null;
  contact_phone: string | null;
  website: string | null;
}

interface Tenant {
  id: string;
  company_name: string;
  logo_url: string | null;
  primary_color: string;
  admin_user_id: string;
  created_at: string;
  vat_number: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  country: string | null;
  contact_phone: string | null;
  website: string | null;
}

interface AuthContextType {
  user: User | null;
  business: Business | null;
  tenant: Tenant | null;
  session: Session | null;
  loading: boolean;
  isSuperAdmin: boolean;
  isTenantAdmin: boolean;
  signUp: (email: string, password: string, companyName: string, tierId: string) => Promise<{ error: { message: string } | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  refreshBusiness: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isTenantAdmin, setIsTenantAdmin] = useState(false);

  const updateAuthState = useCallback((data: {
    user_type?: string;
    data?: Business | null;
    tenant?: Tenant | null;
  }, userId: string) => {
    if (data.user_type === 'super_admin') {
      setBusiness(null);
      setTenant(null);
      setIsSuperAdmin(true);
      setIsTenantAdmin(false);
    } else if (data.user_type === 'business') {
      setBusiness(data.data ?? null);
      setTenant(data.tenant || null);
      setIsSuperAdmin(false);
      setIsTenantAdmin(data.data?.is_tenant_admin || false);
    }

    const cacheData = {
      user: { id: userId },
      business: data.user_type === 'business' ? data.data : null,
      tenant: data.tenant || null,
      isSuperAdmin: data.user_type === 'super_admin',
      isTenantAdmin: data.data?.is_tenant_admin || false
    };
    sessionStorage.setItem('auth_state', JSON.stringify(cacheData));
    sessionStorage.setItem('auth_timestamp', Date.now().toString());
  }, []);

  const createBusinessForOAuthUser = useCallback(async (userId: string) => {
    try {
      // First check if this user is a super admin
      const { data: superAdminCheck } = await supabase
        .from('super_admins')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (superAdminCheck) {
        logger.log('User is a super admin - not creating business record');
        setBusiness(null);
        setTenant(null);
        setIsSuperAdmin(true);
        setIsTenantAdmin(false);
        return;
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        logger.error('Error fetching user:', userError);
        throw userError;
      }

      if (!user || !user.email) {
        logger.error('Cannot create business: no user email found', { user });
        // Instead of returning, throw an error so we can retry
        throw new Error('User email not available');
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
        setTenant(null);
        setIsSuperAdmin(false);
        setIsTenantAdmin(false);
        return;
      }

      const companyName = user.user_metadata?.full_name || user.email.split('@')[0];

      // Check if business already exists
      const { data: existingBusiness } = await supabase
        .from('businesses')
        .select('*, tenants(*)')
        .eq('id', userId)
        .maybeSingle();

      // If business already exists, just set the state and return
      if (existingBusiness) {
        console.log('Business already exists for OAuth user:', existingBusiness);
        setBusiness(existingBusiness);
        setTenant(existingBusiness.tenants || null);
        setIsSuperAdmin(false);
        setIsTenantAdmin(existingBusiness.is_tenant_admin || false);
        return;
      }

      // Check if tenant already exists for this user
      const { data: existingTenant } = await supabase
        .from('tenants')
        .select('*')
        .eq('admin_user_id', userId)
        .maybeSingle();

      let tenantToUse = existingTenant;

      // Create tenant only if it doesn't exist
      if (!existingTenant) {
        const { data: newTenant, error: tenantError } = await supabase
          .from('tenants')
          .insert({
            company_name: companyName,
            admin_user_id: userId,
          })
          .select()
          .single();

        if (tenantError) {
          console.error('Error creating tenant for OAuth user:', tenantError);
          setBusiness(null);
          setTenant(null);
          setIsSuperAdmin(false);
          setIsTenantAdmin(false);
          return;
        }

        tenantToUse = newTenant;
      }

      if (!tenantToUse) {
        console.error('No tenant available for OAuth user');
        setBusiness(null);
        setTenant(null);
        setIsSuperAdmin(false);
        setIsTenantAdmin(false);
        return;
      }

      // Create business linked to tenant
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
          tenant_id: tenantToUse.id,
          is_tenant_admin: true,
          email_verified: false,
          phone_verified: false,
          onboarding_status: 'completed',
          credits_remaining: 0,
        })
        .select()
        .single();

      if (businessError) {
        console.error('Error creating business for OAuth user:', businessError);
        setBusiness(null);
        setTenant(null);
        setIsSuperAdmin(false);
        setIsTenantAdmin(false);
      } else if (newBusiness) {
        console.log('Created business for OAuth user:', newBusiness);
        setBusiness(newBusiness);
        setTenant(tenantToUse);
        setIsSuperAdmin(false);
        setIsTenantAdmin(true);

        // Create tenant member record
        await supabase.from('tenant_members').insert({
          tenant_id: tenantToUse.id,
          user_id: userId,
          role: 'admin',
          status: 'active',
          accepted_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Exception creating business for OAuth user:', error);
      setBusiness(null);
      setTenant(null);
      setIsSuperAdmin(false);
      setIsTenantAdmin(false);
    }
  }, []);

  const loadBusiness = useCallback(async (userId: string, retryCount = 0) => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000;

    try {
      const { data, error } = await supabase.rpc('get_user_auth_data', { user_id_param: userId });

      if (error) {
        logger.error('Error loading auth data:', error);

        if (error.message?.includes('Failed to fetch') && retryCount < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          return loadBusiness(userId, retryCount + 1);
        }

        await createBusinessForOAuthUser(userId);
        return;
      }

      if (!data) {
        await createBusinessForOAuthUser(userId);
        return;
      }

      updateAuthState(data, userId);

      if (data.user_type === 'none') {
        await createBusinessForOAuthUser(userId);
      }
    } catch (error) {
      logger.error('Exception loading business:', error);

      if (error instanceof Error && error.message?.includes('Failed to fetch') && retryCount < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return loadBusiness(userId, retryCount + 1);
      }

      setBusiness(null);
      setTenant(null);
      setIsSuperAdmin(false);
      setIsTenantAdmin(false);
    } finally {
      setLoading(false);
    }
  }, [createBusinessForOAuthUser, updateAuthState]);

  useEffect(() => {
    let mounted = true;

    console.log('[AuthContext] Initializing authentication');

    const timeoutId = setTimeout(() => {
      if (mounted) {
        logger.error('Auth initialization timeout - forcing loading to false');
        setLoading(false);
      }
    }, 5000);

    const initAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          logger.error('Error fetching session:', sessionError);
        }

        if (!mounted) return;

        clearTimeout(timeoutId);

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await loadBusiness(session.user.id);
        } else {
          sessionStorage.removeItem('auth_state');
          sessionStorage.removeItem('auth_timestamp');
          setLoading(false);
        }
      } catch (error) {
        logger.error('Error initializing auth:', error);
        clearTimeout(timeoutId);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        loadBusiness(session.user.id);
      } else {
        setBusiness(null);
        setTenant(null);
        setIsSuperAdmin(false);
        setIsTenantAdmin(false);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [loadBusiness]);

  const signUp = async (email: string, password: string, companyName: string, tierId: string) => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError || !authData.user) {
      logger.error('Signup auth error:', authError);
      return { error: authError };
    }

    const { data: existingTenant } = await supabase
      .from('tenants')
      .select('*')
      .eq('admin_user_id', authData.user.id)
      .maybeSingle();

    let tenantToUse = existingTenant;

    if (!existingTenant) {
      const { data: newTenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          company_name: companyName,
          admin_user_id: authData.user.id,
        })
        .select()
        .single();

      if (tenantError) {
        logger.error('Tenant creation error:', tenantError);
        return { error: tenantError };
      }

      tenantToUse = newTenant;
    }

    const { data: existingBusiness } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (!tenantToUse) {
      logger.error('No tenant available');
      return { error: { message: 'Failed to create or find tenant' } };
    }

    if (!existingBusiness) {
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
          tenant_id: tenantToUse.id,
          is_tenant_admin: true,
          email_verified: false,
          phone_verified: false,
          onboarding_status: 'completed',
          credits_remaining: 0,
        });

      if (businessError) {
        logger.error('Business creation error:', businessError);
        return { error: businessError };
      }

      const { error: memberError } = await supabase
        .from('tenant_members')
        .insert({
          tenant_id: tenantToUse.id,
          user_id: authData.user.id,
          role: 'admin',
          status: 'active',
          accepted_at: new Date().toISOString(),
        });

      if (memberError) {
        logger.error('Tenant member creation error:', memberError);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      await loadBusiness(authData.user.id);
    } else {
      await loadBusiness(authData.user.id);
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
    setTenant(null);
    setIsSuperAdmin(false);
    setIsTenantAdmin(false);
    setSession(null);
    // Clear cached auth state
    sessionStorage.removeItem('auth_state');
    sessionStorage.removeItem('auth_timestamp');
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
        tenant,
        session,
        loading,
        isSuperAdmin,
        isTenantAdmin,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        resetPassword,
        refreshBusiness: () => user?.id && loadBusiness(user.id),
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
