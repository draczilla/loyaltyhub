import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please configure:');
  console.error('- VITE_SUPABASE_URL');
  console.error('- VITE_SUPABASE_ANON_KEY');
  console.error('');
  console.error('For Netlify deployments, add these in:');
  console.error('Site settings → Environment variables');
  console.error('');
  console.error('Current values:', {
    url: supabaseUrl ? 'Set' : 'Missing',
    key: supabaseAnonKey ? 'Set' : 'Missing'
  });

  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type Database = {
  public: {
    Tables: {
      subscription_tiers: {
        Row: {
          id: string;
          name: string;
          max_customers: number;
          max_programs: number;
          max_sms_monthly: number;
          price_monthly: number;
          features: Record<string, boolean>;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['subscription_tiers']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['subscription_tiers']['Insert']>;
      };
      businesses: {
        Row: {
          id: string;
          company_name: string;
          email: string;
          logo_url: string | null;
          primary_color: string;
          tier_id: string;
          subscription_status: 'active' | 'trial' | 'expired' | 'cancelled';
          usage_customers: number;
          usage_sms_monthly: number;
          usage_reset_date: string;
          tenant_id: string | null;
          is_tenant_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['businesses']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['businesses']['Insert']>;
      };
      tenants: {
        Row: {
          id: string;
          company_name: string;
          logo_url: string | null;
          primary_color: string;
          admin_user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['tenants']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['tenants']['Insert']>;
      };
      tenant_members: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          role: 'admin' | 'member';
          status: 'active' | 'inactive';
          invited_at: string;
          accepted_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['tenant_members']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['tenant_members']['Insert']>;
      };
      tenant_invitations: {
        Row: {
          id: string;
          tenant_id: string;
          email: string;
          token: string;
          invited_by: string | null;
          role: 'admin' | 'member';
          status: 'pending' | 'accepted' | 'expired' | 'revoked';
          expires_at: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['tenant_invitations']['Row'], 'id' | 'token' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['tenant_invitations']['Insert']>;
      };
      customers: {
        Row: {
          id: string;
          business_id: string;
          unique_customer_id: string;
          email: string | null;
          phone: string | null;
          first_name: string | null;
          last_name: string | null;
          birthday: string | null;
          custom_fields: Record<string, any>;
          opted_in_sms: boolean;
          opted_in_email: boolean;
          total_points: number;
          lifetime_points_earned: number;
          total_visits: number;
          last_visit_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['customers']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['customers']['Insert']>;
      };
      loyalty_programs: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          type: 'points' | 'stamp_card' | 'rebate_code' | 'discount' | 'free_item';
          status: 'active' | 'paused' | 'archived';
          config: Record<string, any>;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['loyalty_programs']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['loyalty_programs']['Insert']>;
      };
      rewards: {
        Row: {
          id: string;
          program_id: string;
          business_id: string;
          name: string;
          description: string | null;
          type: 'point_redemption' | 'stamp_completion' | 'rebate' | 'discount' | 'free_item';
          cost_points: number;
          cost_stamps: number;
          config: Record<string, any>;
          active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['rewards']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['rewards']['Insert']>;
      };
      transactions: {
        Row: {
          id: string;
          business_id: string;
          customer_id: string;
          program_id: string | null;
          type: 'points_earned' | 'points_redeemed' | 'stamp_added' | 'reward_claimed' | 'manual_adjustment';
          points_change: number;
          stamps_change: number;
          description: string | null;
          metadata: Record<string, any>;
          created_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['transactions']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>;
      };
      qr_codes: {
        Row: {
          id: string;
          business_id: string;
          code: string;
          location_name: string | null;
          scan_count: number;
          signup_count: number;
          active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['qr_codes']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['qr_codes']['Insert']>;
      };
      onboarding_forms: {
        Row: {
          id: string;
          business_id: string;
          form_config: any[];
          welcome_message: string;
          thank_you_message: string;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['onboarding_forms']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['onboarding_forms']['Insert']>;
      };
      campaigns: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          type: 'sms' | 'email' | 'both';
          status: 'draft' | 'scheduled' | 'sent' | 'completed';
          message_template: string | null;
          scheduled_for: string | null;
          sent_at: string | null;
          recipient_count: number;
          opened_count: number;
          clicked_count: number;
          config: Record<string, any>;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['campaigns']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['campaigns']['Insert']>;
      };
      integrations: {
        Row: {
          id: string;
          business_id: string;
          service: 'mailchimp' | 'vonage';
          credentials: Record<string, any>;
          settings: Record<string, any>;
          active: boolean;
          last_sync_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['integrations']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['integrations']['Insert']>;
      };
      sms_logs: {
        Row: {
          id: string;
          business_id: string;
          campaign_id: string | null;
          customer_id: string | null;
          recipient_phone: string;
          message: string;
          status: 'pending' | 'sent' | 'delivered' | 'failed';
          error_message: string | null;
          provider_message_id: string | null;
          segments: number;
          cost: number | null;
          sent_at: string;
          delivered_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['sms_logs']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['sms_logs']['Insert']>;
      };
      sms_templates: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          trigger_type: 'welcome' | 'reward_earned' | 'points_milestone' | 'birthday' | 'custom';
          message_template: string;
          active: boolean;
          config: Record<string, any>;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['sms_templates']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['sms_templates']['Insert']>;
      };
    };
  };
};
