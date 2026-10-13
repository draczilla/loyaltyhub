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

    const { data: superAdmin, error: superAdminError } = await supabaseAdmin
      .from("super_admins")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (superAdminError || !superAdmin) {
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

    const { data: existingBusiness, error: businessCheckError } = await supabaseAdmin
      .from("businesses")
      .select("id, email, company_name")
      .eq("email", email.trim())
      .maybeSingle();

    if (businessCheckError) {
      return new Response(
        JSON.stringify({ success: false, error: "Failed to check for an existing business" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingBusiness) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `A business with email ${email.trim()} already exists: ${existingBusiness.company_name}`,
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: { users }, error: authListError } = await supabaseAdmin.auth.admin.listUsers();

    if (authListError) {
      return new Response(
        JSON.stringify({ success: false, error: "Failed to check for an existing login" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const orphanedAuthUser = users?.find(u => u.email === email.trim());

    if (orphanedAuthUser) {
      const { data: correspondingBusiness } = await supabaseAdmin
        .from("businesses")
        .select("id")
        .eq("id", orphanedAuthUser.id)
        .maybeSingle();

      if (!correspondingBusiness) {
        console.log(`Found orphaned auth user for ${email.trim()}, cleaning up...`);
        const { error: cleanupError } = await supabaseAdmin.auth.admin.deleteUser(orphanedAuthUser.id);

        if (cleanupError) {
          console.error("Failed to clean up orphaned auth user:", cleanupError);
          return new Response(
            JSON.stringify({
              success: false,
              error: `Orphaned auth user exists for ${email.trim()} but cleanup failed. Please contact support.`,
              details: cleanupError.message,
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`Successfully cleaned up orphaned auth user for ${email.trim()}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
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

    const { data: tenantData, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .insert({
        id: authData.user.id,
        company_name: companyName.trim(),
        admin_user_id: authData.user.id,
      })
      .select()
      .single();

    if (tenantError) {
      console.error("Tenant creation error:", tenantError);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to create tenant: ${tenantError.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: businessError } = await supabaseAdmin.from("businesses").insert({
      id: authData.user.id,
      company_name: companyName.trim(),
      email: email.trim(),
      phone: phone?.trim() || null,
      tier_id: tierId,
      subscription_status: "trial",
      tenant_id: tenantData.id,
      email_verified: true,
      phone_verified: false,
      onboarding_status: "completed",
      onboarding_completed_at: new Date().toISOString(),
      is_tenant_admin: true,
    });

    if (businessError) {
      console.error("Business creation error:", businessError);
      await supabaseAdmin.from("tenants").delete().eq("id", tenantData.id);
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
