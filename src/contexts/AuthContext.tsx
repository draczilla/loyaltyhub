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
  tenant_id: string | null;
  is_tenant_admin: boolean;
  email_verified: boolean;
  phone: string | null;
  phone_verified: boolean;
  onboarding_status: string;
  onboarding_completed_at: string | null;
}

interface Tenant {
  id: string;
  company_name: string;
  logo_url: string | null;
  primary_color: string;
  admin_user_id: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  business: Business | null;
  tenant: Tenant | null;
  session: Session | null;
  loading: boolean;
  isSuperAdmin: boolean;
  isTenantAdmin: boolean;
  signUp: (email: string, password: string, companyName: string, tierId: string) => Promise<{ error: AuthError | null }>;
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

  const updateAuthState = (data: any, userId: string) => {
    if (data.user_type === 'super_admin') {
      setBusiness(null);
      setTenant(null);
      setIsSuperAdmin(true);
      setIsTenantAdmin(false);
    } else if (data.user_type === 'business') {
      setBusiness(data.data);
      setTenant(data.tenant || null);
      setIsSuperAdmin(false);
      setIsTenantAdmin(data.data?.is_tenant_admin || false);
    }

    // Cache the auth state
    const cacheData = {
      user: { id: userId },
      business: data.user_type === 'business' ? data.data : null,
      tenant: data.tenant || null,
      isSuperAdmin: data.user_type === 'super_admin',
      isTenantAdmin: data.data?.is_tenant_admin || false
    };
    sessionStorage.setItem('auth_state', JSON.stringify(cacheData));
    sessionStorage.setItem('auth_timestamp', Date.now().toString());
  };

  const loadAuthDataInBackground = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_user_auth_data', { user_id_param: userId });

      if (!error && data) {
        updateAuthState(data, userId);
      }
    } catch (error) {
      console.error('Background auth refresh failed:', error);
    }
  };

  const createBusinessForOAuthUser = async (userId: string) => {
    try {
      // First check if this user is a super admin
      const { data: superAdminCheck } = await supabase
        .from('super_admins')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (superAdminCheck) {
        console.log('User is a super admin - not creating business record');
        setBusiness(null);
        setTenant(null);
        setIsSuperAdmin(true);
        setIsTenantAdmin(false);
        return;
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        console.error('Error fetching user:', userError);
        throw userError;
      }

      if (!user || !user.email) {
        console.error('Cannot create business: no user email found', { user });
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
  };

  const loadBusiness = async (userId: string, retryCount = 0) => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000;

    try {
      console.log('Loading business data for user:', userId, `(attempt ${retryCount + 1})`);

      // Use the combined RPC function for better performance
      const { data, error } = await supabase.rpc('get_user_auth_data', { user_id_param: userId });

      if (error) {
        console.error('Error loading auth data:', error);

        // If it's a network error and we haven't exceeded retries, retry
        if (error.message?.includes('Failed to fetch') && retryCount < MAX_RETRIES) {
          console.log(`Retrying in ${RETRY_DELAY}ms...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          return loadBusiness(userId, retryCount + 1);
        }

        // Fallback to creating business for OAuth users
        await createBusinessForOAuthUser(userId);
        return;
      }

      if (!data) {
        console.warn('No auth data returned for user:', userId);
        await createBusinessForOAuthUser(userId);
        return;
      }

      console.log('Auth data loaded:', data);
      updateAuthState(data, userId);

      // If no user record found, create one for OAuth users
      if (data.user_type === 'none') {
        console.log('No user record found, creating business for OAuth user');
        await createBusinessForOAuthUser(userId);
      }
    } catch (error) {
      console.error('Exception loading business:', error);

      // Retry on network errors
      if (error instanceof Error && error.message?.includes('Failed to fetch') && retryCount < MAX_RETRIES) {
        console.log(`Retrying in ${RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return loadBusiness(userId, retryCount + 1);
      }

      setBusiness(null);
      setTenant(null);
      setIsSuperAdmin(false);
      setIsTenantAdmin(false);
    } finally {
      console.log('Finished loading business, setting loading to false');
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;
    const startTime = performance.now();

    console.log('[AuthContext] Initializing authentication');

    const initAuth = async () => {
      try {
        // No cache or expired, fetch session
        console.log('[AuthContext] Fetching session from Supabase');
        const sessionStartTime = performance.now();
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log(`[AuthContext] Session fetch took ${(performance.now() - sessionStartTime).toFixed(2)}ms`);

        if (sessionError) {
          console.error('[AuthContext] Error fetching session:', sessionError);
        }

        if (!mounted) {
          console.log('[AuthContext] Component unmounted, aborting');
          return;
        }

        // Clear timeout as we got a response
        clearTimeout(timeoutId);

        console.log('[AuthContext] Session:', session ? 'User logged in' : 'No session');
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Load fresh data
          console.log('[AuthContext] Loading business data');
          const businessStartTime = performance.now();
          await loadBusiness(session.user.id);
          console.log(`[AuthContext] Business data load took ${(performance.now() - businessStartTime).toFixed(2)}ms`);
        } else {
          // No session
          console.log('[AuthContext] No session, clearing state');
          sessionStorage.removeItem('auth_state');
          sessionStorage.removeItem('auth_timestamp');
          setLoading(false);
        }
        console.log(`[AuthContext] Total auth initialization took ${(performance.now() - startTime).toFixed(2)}ms`);
      } catch (error) {
        console.error('[AuthContext] Error initializing auth:', error);
        clearTimeout(timeoutId);
        if (mounted) {
          console.log('[AuthContext] Setting loading to false due to error');
          setLoading(false);
        }
      }
    };

    // Increased timeout to 5 seconds to allow for business data loading
    timeoutId = setTimeout(() => {
      if (mounted) {
        console.error('[AuthContext] Auth initialization timeout - forcing loading to false');
        setLoading(false);
      }
    }, 5000);

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      console.log('[AuthContext] Auth state changed:', _event);
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
      console.log('[AuthContext] Cleaning up auth subscription');
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, companyName: string, tierId: string) => {
    console.log('[AuthContext] Starting signup process');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError || !authData.user) {
      console.error('[AuthContext] Signup auth error:', authError);
      return { error: authError };
    }

    console.log('[AuthContext] Auth user created:', authData.user.id);

    // Check if tenant already exists for this user
    console.log('[AuthContext] Checking for existing tenant');
    const { data: existingTenant } = await supabase
      .from('tenants')
      .select('*')
      .eq('admin_user_id', authData.user.id)
      .maybeSingle();

    let tenantToUse = existingTenant;

    // Create tenant only if it doesn't exist
    if (!existingTenant) {
      console.log('[AuthContext] Creating new tenant');
      const { data: newTenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          company_name: companyName,
          admin_user_id: authData.user.id,
        })
        .select()
        .single();

      if (tenantError) {
        console.error('[AuthContext] Tenant creation error:', tenantError);
        return { error: tenantError as any };
      }

      console.log('[AuthContext] Tenant created:', newTenant.id);
      tenantToUse = newTenant;
    } else {
      console.log('[AuthContext] Using existing tenant:', existingTenant.id);
    }

    const { data: existingBusiness } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (!tenantToUse) {
      console.error('[AuthContext] No tenant available');
      return { error: { message: 'Failed to create or find tenant' } as any };
    }

    // Create business only if it doesn't exist
    if (!existingBusiness) {
      console.log('[AuthContext] Creating business record');
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
        console.error('[AuthContext] Business creation error:', businessError);
        return { error: businessError as any };
      }

      console.log('[AuthContext] Business created successfully');

      // Create tenant member record
      console.log('[AuthContext] Creating tenant member record');
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
        console.error('[AuthContext] Tenant member creation error:', memberError);
      } else {
        console.log('[AuthContext] Tenant member created successfully');
      }

      // Wait a moment for the database to fully commit
      console.log('[AuthContext] Waiting for database commit...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Force a fresh load of business data
      console.log('[AuthContext] Loading fresh business data after signup');
      await loadBusiness(authData.user.id);
    } else {
      console.log('[AuthContext] Business already exists, loading data');
      await loadBusiness(authData.user.id);
    }

    console.log('[AuthContext] Signup process completed successfully');
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
