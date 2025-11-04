import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PhoneVerificationRequest {
  businessId: string;
  phone: string;
  companyName: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    if (!brevoApiKey) {
      throw new Error("BREVO_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { businessId, phone, companyName }: PhoneVerificationRequest = await req.json();

    if (!businessId || !phone || !companyName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: business } = await supabase
      .from("businesses")
      .select("email_verified, onboarding_status")
      .eq("id", businessId)
      .maybeSingle();

    if (!business || !business.email_verified) {
      return new Response(
        JSON.stringify({
          error: "Email not verified",
          message: "Please verify your email address first",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: rateLimit } = await supabase
      .rpc("check_verification_rate_limit", {
        p_identifier: phone,
        p_verification_type: "phone",
        p_time_window_minutes: 60,
        p_max_attempts: 3,
      })
      .single();

    if (rateLimit && !rateLimit.allowed) {
      const waitMinutes = Math.ceil(
        (new Date(rateLimit.next_allowed_at).getTime() - Date.now()) / 60000
      );

      await supabase.from("verification_attempts").insert({
        business_id: businessId,
        verification_type: "phone",
        identifier: phone,
        attempt_result: "rate_limited",
        metadata: { attempts_count: rateLimit.attempts_count },
      });

      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          message: `Too many verification attempts. Please try again in ${waitMinutes} minutes.`,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    await supabase
      .from("businesses")
      .update({ phone: phone })
      .eq("id", businessId);

    const { data: tokenData, error: tokenError } = await supabase
      .rpc("generate_verification_token", {
        p_business_id: businessId,
        p_verification_type: "phone",
        p_expiry_hours: 0.25,
      })
      .single();

    if (tokenError || !tokenData) {
      throw new Error(`Failed to generate verification token: ${tokenError?.message}`);
    }

    const verificationToken = tokenData;
    const appUrl = Deno.env.get("APP_URL") || "http://localhost:5173";
    const verificationUrl = `${appUrl}/verify-phone?token=${verificationToken}`;

    const smsMessage = `${companyName}: Complete your account setup by verifying your phone. Click: ${verificationUrl} (Expires in 15 min)`;

    const brevoResponse = await fetch("https://api.brevo.com/v3/transactionalSMS/sms", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "transactional",
        sender: "LoyaltyApp",
        recipient: phone,
        content: smsMessage,
      }),
    });

    if (!brevoResponse.ok) {
      const errorData = await brevoResponse.text();
      throw new Error(`Brevo SMS API error: ${errorData}`);
    }

    await supabase.from("verification_attempts").insert({
      business_id: businessId,
      verification_type: "phone",
      identifier: phone,
      attempt_result: "sent",
    });

    await supabase.from("communication_logs").insert({
      business_id: businessId,
      type: "sms",
      recipient: phone,
      message: smsMessage,
      status: "sent",
      provider: "brevo",
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Verification SMS sent successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error sending phone verification:", error);

    return new Response(
      JSON.stringify({
        error: "Failed to send verification SMS",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
