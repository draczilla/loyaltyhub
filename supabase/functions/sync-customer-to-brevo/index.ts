import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SyncRequest {
  customerId: string;
  businessId: string;
  listIds?: string[];
}

interface BrevoContactPayload {
  attributes: {
    SMS: string;
    FIRSTNAME?: string;
    LASTNAME?: string;
  };
  listIds: number[];
  updateEnabled: boolean;
  smsBlacklisted: boolean;
  emailBlacklisted?: boolean;
  email?: string;
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
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    if (!brevoApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Brevo API key not configured. Please set BREVO_API_KEY in Supabase secrets.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { customerId, businessId, listIds }: SyncRequest = await req.json();

    if (!customerId || !businessId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "customerId and businessId are required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("*, businesses!inner(tenant_id)")
      .eq("id", customerId)
      .eq("business_id", businessId)
      .maybeSingle();

    if (customerError || !customer) {
      console.error("Error fetching customer:", customerError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Customer not found",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!customer.phone) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Customer does not have a phone number",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let finalListIds = listIds || [];
    if (finalListIds.length === 0) {
      const { data: platformSettings } = await supabase
        .from("platform_settings")
        .select("brevo_default_list_id")
        .maybeSingle();

      if (platformSettings?.brevo_default_list_id) {
        finalListIds = [platformSettings.brevo_default_list_id];
      }
    }

    const brevoPayload: BrevoContactPayload = {
      attributes: {
        SMS: customer.phone,
        FIRSTNAME: customer.first_name || undefined,
        LASTNAME: customer.last_name || undefined,
      },
      listIds: finalListIds.map((id: string) => parseInt(id, 10)).filter((id: number) => !isNaN(id)),
      updateEnabled: true,
      smsBlacklisted: !customer.opted_in_sms,
    };

    if (customer.email) {
      brevoPayload.email = customer.email;
      brevoPayload.emailBlacklisted = false;
    }

    const logEntry = {
      customer_id: customerId,
      business_id: businessId,
      tenant_id: customer.businesses.tenant_id,
      sync_status: "pending",
      request_payload: brevoPayload,
    };

    const { data: syncLog, error: logError } = await supabase
      .from("brevo_sync_logs")
      .insert(logEntry)
      .select()
      .single();

    if (logError) {
      console.error("Error creating sync log:", logError);
    }

    const brevoResponse = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(brevoPayload),
    });

    const responseText = await brevoResponse.text();
    let brevoData;
    try {
      brevoData = responseText ? JSON.parse(responseText) : {};
    } catch {
      brevoData = { rawResponse: responseText };
    }

    if (!brevoResponse.ok) {
      console.error("Brevo API error:", brevoResponse.status, brevoData);

      if (syncLog) {
        await supabase
          .from("brevo_sync_logs")
          .update({
            sync_status: "failed",
            response_payload: brevoData,
            error_message: brevoData.message || `HTTP ${brevoResponse.status}`,
          })
          .eq("id", syncLog.id);
      }

      await supabase
        .from("customers")
        .update({
          brevo_sync_status: "failed",
        })
        .eq("id", customerId);

      return new Response(
        JSON.stringify({
          success: false,
          error: brevoData.message || "Failed to sync contact to Brevo",
          details: brevoData,
          statusCode: brevoResponse.status,
        }),
        {
          status: brevoResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const brevoContactId = brevoData.id?.toString() || null;

    if (syncLog) {
      await supabase
        .from("brevo_sync_logs")
        .update({
          sync_status: "success",
          brevo_contact_id: brevoContactId,
          brevo_list_ids: finalListIds,
          response_payload: brevoData,
        })
        .eq("id", syncLog.id);
    }

    await supabase
      .from("customers")
      .update({
        brevo_contact_id: brevoContactId,
        brevo_synced_at: new Date().toISOString(),
        brevo_sync_status: "synced",
        brevo_list_ids: finalListIds,
      })
      .eq("id", customerId);

    return new Response(
      JSON.stringify({
        success: true,
        brevoContactId,
        listIds: finalListIds,
        message: "Customer successfully synced to Brevo",
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