import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface WelcomeEmailRequest {
  businessId: string;
  email: string;
  companyName: string;
  tierName: string;
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

    const { businessId, email, companyName, tierName }: WelcomeEmailRequest = await req.json();

    if (!businessId || !email || !companyName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: rateLimit } = await supabase
      .rpc("check_verification_rate_limit", {
        p_identifier: email,
        p_verification_type: "email",
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
        verification_type: "email",
        identifier: email,
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

    const { data: tokenData, error: tokenError } = await supabase
      .rpc("generate_verification_token", {
        p_business_id: businessId,
        p_verification_type: "email",
        p_expiry_hours: 24,
      })
      .single();

    if (tokenError || !tokenData) {
      throw new Error(`Failed to generate verification token: ${tokenError?.message}`);
    }

    const verificationToken = tokenData;
    const appUrl = Deno.env.get("APP_URL") || "http://localhost:5173";
    const verificationUrl = `${appUrl}/verify-email?token=${verificationToken}`;

    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #ff6b35 0%, #ff8855 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Welcome to Your Loyalty Platform!</h1>
        </div>

        <div style="padding: 30px; background-color: #f9f9f9; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #333333; line-height: 1.6;">
            Hi <strong>${companyName}</strong>,
          </p>

          <p style="font-size: 16px; color: #333333; line-height: 1.6;">
            Welcome to the platform! We're thrilled to have you join our community of businesses creating amazing loyalty experiences.
          </p>

          <p style="font-size: 16px; color: #333333; line-height: 1.6;">
            You've signed up for the <strong>${tierName}</strong> tier, which includes access to powerful tenant management features, team collaboration, and comprehensive loyalty program tools.
          </p>

          <div style="background-color: #fff3e0; border-left: 4px solid #ff6b35; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #333333; font-size: 14px;">
              <strong>Important:</strong> To complete your account setup and access the platform, please verify your email address by clicking the button below.
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}"
               style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #ff6b35 0%, #ff8855 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold;">
              Verify Email Address
            </a>
          </div>

          <p style="font-size: 14px; color: #666666; line-height: 1.6;">
            If the button doesn't work, copy and paste this link into your browser:
          </p>
          <p style="font-size: 12px; color: #999999; word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 5px;">
            ${verificationUrl}
          </p>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e0e0e0;">
            <h3 style="color: #ff6b35; font-size: 18px;">What's Next?</h3>
            <ul style="color: #333333; font-size: 14px; line-height: 1.8;">
              <li>Verify your email address (this step)</li>
              <li>Verify your phone number for account security</li>
              <li>Access your dashboard and explore tenant features</li>
              <li>Invite team members to collaborate</li>
              <li>Create your first loyalty program</li>
            </ul>
          </div>

          <p style="font-size: 14px; color: #666666; line-height: 1.6; margin-top: 20px;">
            This verification link will expire in <strong>24 hours</strong> for security purposes.
          </p>

          <p style="font-size: 14px; color: #666666; line-height: 1.6;">
            If you didn't create this account, please ignore this email or contact our support team.
          </p>

          <p style="font-size: 16px; color: #333333; line-height: 1.6; margin-top: 30px;">
            Best regards,<br>
            <strong>The Loyalty Platform Team</strong>
          </p>
        </div>

        <div style="text-align: center; padding: 20px; color: #999999; font-size: 12px;">
          <p>This is an automated message, please do not reply to this email.</p>
        </div>
      </div>
    `;

    const fromEmail = Deno.env.get("EMAIL_FROM") || "noreply@loyaltyhub.no";
    const fromName = Deno.env.get("EMAIL_FROM_NAME") || "LoyaltyHub";

    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: fromName,
          email: fromEmail,
        },
        to: [
          {
            email: email,
            name: companyName,
          },
        ],
        subject: "Welcome! Please Verify Your Email",
        htmlContent: emailBody,
      }),
    });

    if (!brevoResponse.ok) {
      const errorData = await brevoResponse.text();
      throw new Error(`Brevo API error: ${errorData}`);
    }

    await supabase.from("verification_attempts").insert({
      business_id: businessId,
      verification_type: "email",
      identifier: email,
      attempt_result: "sent",
      metadata: { tier: tierName },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Welcome email sent successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error sending welcome verification email:", error);

    return new Response(
      JSON.stringify({
        error: "Failed to send verification email",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
