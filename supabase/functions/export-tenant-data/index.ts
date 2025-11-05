import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ExportRequest {
  tenant_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the user from the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify user is super admin
    const { data: superAdmin, error: superAdminError } = await supabase
      .from("super_admins")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (superAdminError || !superAdmin) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Super admin access required" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const { tenant_id }: ExportRequest = await req.json();

    if (!tenant_id) {
      return new Response(
        JSON.stringify({ error: "tenant_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Call the database function to get tenant data export
    const { data: exportData, error: exportError } = await supabase.rpc(
      "get_tenant_data_export",
      { tenant_uuid: tenant_id }
    );

    if (exportError) {
      console.error("Export error:", exportError);
      return new Response(
        JSON.stringify({
          error: "Failed to export tenant data",
          details: exportError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!exportData) {
      return new Response(
        JSON.stringify({ error: "Tenant not found or no data available" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Add summary information
    const summary = {
      tenant_name: exportData.tenant?.company_name || "Unknown",
      export_date: new Date().toISOString(),
      data_counts: {
        businesses: Array.isArray(exportData.businesses) ? exportData.businesses.length : 0,
        customers: Array.isArray(exportData.customers) ? exportData.customers.length : 0,
        loyalty_programs: Array.isArray(exportData.loyalty_programs) ? exportData.loyalty_programs.length : 0,
        rewards: Array.isArray(exportData.rewards) ? exportData.rewards.length : 0,
        transactions: Array.isArray(exportData.transactions) ? exportData.transactions.length : 0,
        qr_codes: Array.isArray(exportData.qr_codes) ? exportData.qr_codes.length : 0,
        onboarding_forms: Array.isArray(exportData.onboarding_forms) ? exportData.onboarding_forms.length : 0,
        campaigns: Array.isArray(exportData.campaigns) ? exportData.campaigns.length : 0,
        integrations: Array.isArray(exportData.integrations) ? exportData.integrations.length : 0,
        sms_logs: Array.isArray(exportData.sms_logs) ? exportData.sms_logs.length : 0,
        sms_templates: Array.isArray(exportData.sms_templates) ? exportData.sms_templates.length : 0,
        email_templates: Array.isArray(exportData.email_templates) ? exportData.email_templates.length : 0,
        communication_logs: Array.isArray(exportData.communication_logs) ? exportData.communication_logs.length : 0,
        tenant_members: Array.isArray(exportData.tenant_members) ? exportData.tenant_members.length : 0,
        tenant_invitations: Array.isArray(exportData.tenant_invitations) ? exportData.tenant_invitations.length : 0,
      }
    };

    const response = {
      success: true,
      summary,
      data: exportData,
    };

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});