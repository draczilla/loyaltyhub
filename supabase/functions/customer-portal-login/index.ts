import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

// Rate limiting store (in-memory, will reset on function cold start)
const loginAttempts = new Map<string, { count: number; lastAttempt: number; lockedUntil?: number }>();

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW = 5 * 60 * 1000; // 5 minutes

function checkRateLimit(phone: string): { allowed: boolean; message?: string } {
  const now = Date.now();
  const attempts = loginAttempts.get(phone);

  if (!attempts) {
    loginAttempts.set(phone, { count: 1, lastAttempt: now });
    return { allowed: true };
  }

  // Check if account is locked
  if (attempts.lockedUntil && attempts.lockedUntil > now) {
    const minutesLeft = Math.ceil((attempts.lockedUntil - now) / 60000);
    return { 
      allowed: false, 
      message: `Account locked due to too many failed attempts. Try again in ${minutesLeft} minutes.`
    };
  }

  // Reset if attempt window expired
  if (now - attempts.lastAttempt > ATTEMPT_WINDOW) {
    loginAttempts.set(phone, { count: 1, lastAttempt: now });
    return { allowed: true };
  }

  // Check if max attempts exceeded
  if (attempts.count >= MAX_ATTEMPTS) {
    attempts.lockedUntil = now + LOCKOUT_DURATION;
    loginAttempts.set(phone, attempts);
    return { 
      allowed: false, 
      message: 'Too many failed attempts. Account locked for 15 minutes.'
    };
  }

  // Increment attempt count
  attempts.count++;
  attempts.lastAttempt = now;
  loginAttempts.set(phone, attempts);
  
  return { allowed: true };
}

function resetRateLimit(phone: string) {
  loginAttempts.delete(phone);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { phone, pin } = await req.json();

    if (!phone || !pin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Phone and PIN are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean phone number
    const cleanPhone = phone.replace(/\D/g, '');

    // Check rate limit
    const rateCheck = checkRateLimit(cleanPhone);
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ success: false, error: rateCheck.message }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch customer data
    const { data: customer, error: queryError } = await supabase
      .from('customers')
      .select('id, first_name, last_name, email, auth_pin, portal_enabled, business_id')
      .eq('auth_phone', cleanPhone)
      .maybeSingle();

    if (queryError) {
      console.error('Database error:', queryError);
      return new Response(
        JSON.stringify({ success: false, error: 'An error occurred. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!customer) {
      return new Response(
        JSON.stringify({ success: false, error: 'Phone number not found. Please check and try again.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!customer.portal_enabled) {
      return new Response(
        JSON.stringify({ success: false, error: 'Portal access is disabled. Please contact the business.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify PIN (constant-time comparison would be better, but PIN is numeric)
    if (customer.auth_pin !== pin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid PIN. Please try again.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Successful login - reset rate limit
    resetRateLimit(cleanPhone);

    // Update last login timestamp
    await supabase
      .from('customers')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', customer.id);

    // Generate a session token (simple implementation)
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store session in database
    await supabase
      .from('customer_sessions')
      .insert({
        customer_id: customer.id,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      });

    return new Response(
      JSON.stringify({
        success: true,
        session: {
          token: sessionToken,
          customerId: customer.id,
          businessId: customer.business_id,
          name: `${customer.first_name} ${customer.last_name}`,
          phone: cleanPhone,
          expiresAt: expiresAt.toISOString()
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Login error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'An error occurred. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});