import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CreateCompanyRequest {
  companyName: string;
  email: string;
  phone?: string;
  tierId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: requestingUser, error: userCheckError } = await supabaseAdmin
      .from("businesses")
      .select("is_super_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (userCheckError || !requestingUser?.is_super_admin) {
      return new Response(
        JSON.stringify({ success: false, error: "Only super admins can create companies" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { companyName, email, phone, tierId }: CreateCompanyRequest = await req.json();

    if (!companyName?.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: "Company name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!email?.trim() || !email.includes("@")) {
      return new Response(
        JSON.stringify({ success: false, error: "Valid email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!tierId) {
      return new Response(
        JSON.stringify({ success: false, error: "Subscription tier is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (phone && phone.trim()) {
      const e164Regex = /^\+[1-9]\d{1,14}$/;
      if (!e164Regex.test(phone.trim())) {
        return new Response(
          JSON.stringify({ success: false, error: "Phone must be in E.164 format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const password = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);

    const { data: authData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password: password,
      email_confirm: true,
    });

    if (createUserError) {
      console.error("Auth user creation error:", createUserError);
      return new Response(
        JSON.stringify({ success: false, error: createUserError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create user" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: businessError } = await supabaseAdmin.from("businesses").insert({
      id: authData.user.id,
      company_name: companyName.trim(),
      email: email.trim(),
      phone: phone?.trim() || null,
      tier_id: tierId,
      subscription_status: "trial",
      tenant_id: authData.user.id,
      email_verified: true,
      phone_verified: false,
      onboarding_status: "completed",
      onboarding_completed_at: new Date().toISOString(),
    });

    if (businessError) {
      console.error("Business creation error:", businessError);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ success: false, error: businessError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let brevoSynced = false;
    if (phone?.trim()) {
      try {
        const brevoApiKey = Deno.env.get("BREVO_API_KEY");
        if (brevoApiKey) {
          const { data: platformSettings } = await supabaseAdmin
            .from("platform_settings")
            .select("brevo_default_list_id")
            .maybeSingle();

          const listIds = platformSettings?.brevo_default_list_id
            ? [parseInt(platformSettings.brevo_default_list_id, 10)]
            : [];

          const brevoPayload = {
            attributes: {
              SMS: phone.trim(),
              COMPANY: companyName.trim(),
            },
            listIds: listIds.filter((id) => !isNaN(id)),
            updateEnabled: true,
            smsBlacklisted: false,
            email: email.trim(),
            emailBlacklisted: false,
          };

          const brevoResponse = await fetch("https://api.brevo.com/v3/contacts", {
            method: "POST",
            headers: {
              "api-key": brevoApiKey,
              "Content-Type": "application/json",
              "Accept": "application/json",
            },
            body: JSON.stringify(brevoPayload),
          });

          if (brevoResponse.ok) {
            brevoSynced = true;
          }
        }
      } catch (syncError) {
        console.error("Brevo sync error (non-fatal):", syncError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: authData.user.id,
          email: email.trim(),
        },
        password: password,
        brevoSynced,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "An unexpected error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
