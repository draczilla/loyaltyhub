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

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Check cache first, but only if we have a valid session
          const cachedAuthState = sessionStorage.getItem('auth_state');
          const cachedTimestamp = sessionStorage.getItem('auth_timestamp');

          if (cachedAuthState && cachedTimestamp) {
            const age = Date.now() - parseInt(cachedTimestamp);
            if (age < 30000) {
              try {
                const cached = JSON.parse(cachedAuthState);
                if (cached.user && cached.user.id === session.user.id) {
                  // Use cached data for instant UI
                  setBusiness(cached.business);
                  setTenant(cached.tenant);
                  setIsSuperAdmin(cached.isSuperAdmin);
                  setIsTenantAdmin(cached.isTenantAdmin);
                  setLoading(false);
                  // Refresh in background
                  loadAuthDataInBackground(session.user.id);
                  return;
                }
              } catch (e) {
                console.warn('Invalid cached auth state');
                sessionStorage.removeItem('auth_state');
                sessionStorage.removeItem('auth_timestamp');
              }
            }
          }
          // No valid cache, load fresh data
          await loadBusiness(session.user.id);
        } else {
          // Clear any stale cache
          sessionStorage.removeItem('auth_state');
          sessionStorage.removeItem('auth_timestamp');
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
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
      subscription.unsubscribe();
    };
  }, []);

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

  const loadBusiness = async (userId: string) => {
    try {
      console.log('Loading business data for user:', userId);

      // Use the combined RPC function for better performance
      const { data, error } = await supabase.rpc('get_user_auth_data', { user_id_param: userId });

      if (error) {
        console.error('Error loading auth data:', error);
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
      setBusiness(null);
      setTenant(null);
      setIsSuperAdmin(false);
      setIsTenantAdmin(false);
    } finally {
      console.log('Finished loading business, setting loading to false');
      setLoading(false);
    }
  };

  const loadTenant = async (tenantId: string) => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .maybeSingle();

      if (error) {
        console.error('Error loading tenant:', error);
        setTenant(null);
      } else if (data) {
        console.log('Loaded tenant data:', data);
        setTenant(data);
      }
    } catch (error) {
      console.error('Exception loading tenant:', error);
      setTenant(null);
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

      const { data: { user } } = await supabase.auth.getUser();

      if (!user || !user.email) {
        console.error('Cannot create business: no user email found');
        setBusiness(null);
        setTenant(null);
        setIsSuperAdmin(false);
        setIsTenantAdmin(false);
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
        setTenant(null);
        setIsSuperAdmin(false);
        setIsTenantAdmin(false);
        return;
      }

      const companyName = user.user_metadata?.full_name || user.email.split('@')[0];

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
          email_verified: true,
          phone_verified: true,
          onboarding_status: 'completed',
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

  const signUp = async (email: string, password: string, companyName: string, tierId: string) => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError || !authData.user) {
      return { error: authError };
    }

    // Check if tenant already exists for this user
    const { data: existingTenant } = await supabase
      .from('tenants')
      .select('*')
      .eq('admin_user_id', authData.user.id)
      .maybeSingle();

    let tenantToUse = existingTenant;

    // Create tenant only if it doesn't exist
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
        return { error: tenantError as any };
      }

      tenantToUse = newTenant;
    }

    const { data: existingBusiness } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (!tenantToUse) {
      return { error: { message: 'Failed to create or find tenant' } as any };
    }

    // Create business only if it doesn't exist
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
          email_verified: true,
          phone_verified: true,
          onboarding_status: 'completed',
        });

      if (businessError) {
        return { error: businessError as any };
      }

      // Create tenant member record
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
        console.error('Error creating tenant member:', memberError);
      }
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
