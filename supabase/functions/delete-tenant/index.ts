import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DeleteRequest {
  tenant_id: string;
  reason?: string;
  data_exported: boolean;
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

    const { tenant_id, reason, data_exported }: DeleteRequest = await req.json();

    if (!tenant_id) {
      return new Response(
        JSON.stringify({ error: "tenant_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (data_exported === undefined || data_exported === null) {
      return new Response(
        JSON.stringify({ error: "data_exported confirmation is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: businesses, error: businessError } = await supabase
      .from("businesses")
      .select("id")
      .eq("tenant_id", tenant_id);

    if (businessError) {
      console.error("Error fetching businesses:", businessError);
    }

    const businessIds = businesses?.map(b => b.id) || [];

    const { data: deleteResult, error: deleteError } = await supabase.rpc(
      "delete_tenant_and_data",
      {
        tenant_uuid: tenant_id,
        admin_uuid: user.id,
        deletion_reason: reason || null,
        data_was_exported: data_exported
      }
    );

    if (deleteError) {
      console.error("Deletion error:", deleteError);
      return new Response(
        JSON.stringify({
          error: "Failed to delete tenant",
          details: deleteError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let authUsersDeleted = 0;
    for (const businessId of businessIds) {
      try {
        const { error: authDeleteError } = await supabase.auth.admin.deleteUser(businessId);
        if (!authDeleteError) {
          authUsersDeleted++;
        } else {
          console.error(`Failed to delete auth user ${businessId}:`, authDeleteError);
        }
      } catch (authError) {
        console.error(`Error deleting auth user ${businessId}:`, authError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Tenant and all associated data successfully deleted",
        result: deleteResult,
        authUsersDeleted,
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
